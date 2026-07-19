import { toPng, toCanvas, getFontEmbedCSS } from 'html-to-image';
// @ts-ignore — gifenc ships ESM-only; types are inferred at runtime
import { GIFEncoder, quantize, applyPalette } from 'gifenc';
import { useAppStore } from '../store/useAppStore';
import { save } from '@tauri-apps/plugin-dialog';
import { writeFile } from '@tauri-apps/plugin-fs';
import { isTauri } from '../services/storage';

// ─────────────────────────────────────────────────────────────
// PNG Export (unchanged)
// ─────────────────────────────────────────────────────────────
export const exportToPng = async (
  containerSelector: string,
  defaultName: string,
  language: 'tr' | 'en'
): Promise<void> => {
  const node = document.querySelector(containerSelector) as HTMLElement;
  if (!node) {
    throw new Error('Diagram container not found.');
  }

  try {
    // Hide zoom controls and steps panel temporarily
    const elementsToHide = document.querySelectorAll('.react-flow__controls, .react-flow__panel, .react-flow__minimap');
    elementsToHide.forEach((el) => ((el as HTMLElement).style.display = 'none'));

    const customBg = useAppStore.getState().visualData?.canvas?.bgColor;
    const isDark = document.documentElement.classList.contains('dark');
    const bgColor = customBg || (isDark ? '#0f172a' : '#f8fafc');

    const dataUrl = await toPng(node, {
      quality: 1,
      pixelRatio: 2, // High resolution
      backgroundColor: bgColor,
    });

    // Restore hidden elements
    elementsToHide.forEach((el) => ((el as HTMLElement).style.display = ''));

    if (isTauri()) {
      const selectedPath = await save({
        title: language === 'tr' ? 'PNG Olarak Kaydet' : 'Save as PNG',
        defaultPath: defaultName,
        filters: [{ name: 'PNG Image', extensions: ['png'] }],
      });

      if (!selectedPath) return;

      const base64Data = dataUrl.split(',')[1];
      const binaryString = window.atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      await writeFile(selectedPath, bytes);
    } else {
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = defaultName;
      a.click();
    }
  } catch (error) {
    throw error;
  }
};

// ─────────────────────────────────────────────────────────────
// Shared helpers
// ─────────────────────────────────────────────────────────────

/** Fast pixel hash for frame deduplication (samples ~2000 pixels). */
const hashPixels = (data: Uint8ClampedArray): number => {
  let hash = 0;
  const step = Math.max(1, Math.floor(data.length / 2000));
  for (let i = 0; i < data.length; i += step) {
    hash = (Math.imul(hash, 31) + data[i]) | 0;
  }
  return hash;
};

/**
 * Capture the diagram node at each simulation time step.
 * Returns an array of { canvas, delay } where delay accounts for
 * any skipped static frames when skipStatic is true.
 */
const captureFrames = async (
  node: HTMLElement,
  maxDuration: number,
  fps: number,
  scale: number,
  skipStatic: boolean,
  bgColor: string,
  /** Pre-fetched font CSS — call getFontEmbedCSS(node) once before the loop. */
  fontEmbedCSS: string,
  onProgress: (pct: number) => void
): Promise<{ canvas: HTMLCanvasElement; delay: number }[]> => {
  const store = useAppStore.getState();
  const stepMs = 1000 / fps;
  const totalFrames = Math.max(1, Math.ceil(maxDuration / stepMs));

  const scaledWidth  = Math.round(node.clientWidth  * scale);
  const scaledHeight = Math.round(node.clientHeight * scale);

  const elementsToHide = document.querySelectorAll(
    '.react-flow__controls, .react-flow__panel, .react-flow__minimap'
  );
  elementsToHide.forEach((el) => ((el as HTMLElement).style.display = 'none'));

  const waitRender = () =>
    new Promise<void>((resolve) =>
      requestAnimationFrame(() => { requestAnimationFrame(() => resolve()); })
    );

  const results: { canvas: HTMLCanvasElement; delay: number }[] = [];
  let lastHash: number | null = null;

  for (let frame = 0; frame <= totalFrames; frame++) {
    const time = Math.min(frame * stepMs, maxDuration);
    store.setCurrentTime(time);
    await waitRender();
    await new Promise((r) => setTimeout(r, 10)); // let react-flow finish

    // Capture at full resolution, then scale down via drawImage for best quality.
    // fontEmbedCSS is pre-fetched once before the loop so fonts render correctly
    // on every frame without re-downloading. skipFonts is intentionally NOT used
    // here — it caused html-to-image to fall back to a system font with different
    // character metrics, making edge label text wrap at wrong break points.
    const raw = await toCanvas(node, {
      pixelRatio: 1,
      fontEmbedCSS,
      backgroundColor: bgColor,
      width: node.clientWidth,
      height: node.clientHeight,
      style: { transform: 'scale(1)', transformOrigin: 'top left' },
    });

    // Scale-down step (no-op when scale === 1)
    let target = raw;
    if (scale < 1) {
      target = document.createElement('canvas');
      target.width  = scaledWidth;
      target.height = scaledHeight;
      const ctx = target.getContext('2d')!;
      ctx.drawImage(raw, 0, 0, scaledWidth, scaledHeight);
    }

    if (skipStatic) {
      const ctx = target.getContext('2d')!;
      const imageData = ctx.getImageData(0, 0, target.width, target.height);
      const hash = hashPixels(imageData.data);

      if (lastHash !== null && hash === lastHash && results.length > 0) {
        // Identical frame — extend the last frame's delay instead
        results[results.length - 1].delay += stepMs;
      } else {
        results.push({ canvas: target, delay: stepMs });
        lastHash = hash;
      }
    } else {
      results.push({ canvas: target, delay: stepMs });
    }

    onProgress(Math.floor((frame / totalFrames) * 55));
  }

  elementsToHide.forEach((el) => ((el as HTMLElement).style.display = ''));
  return results;
};

// ─────────────────────────────────────────────────────────────
// GIF Export
// ─────────────────────────────────────────────────────────────
export const exportToGif = async (
  containerSelector: string,
  maxDuration: number,
  defaultName: string,
  language: 'tr' | 'en',
  fps: number,
  /** 1-100 user-facing quality. Maps to colour palette depth (16-256 colors). */
  quality: number,
  /** 0.25 | 0.5 | 0.75 | 1.0 — output canvas scale relative to the element */
  scale: number,
  /** When true, consecutive identical frames are merged (extends previous frame delay). */
  skipStatic: boolean,
  onProgress: (percent: number) => void
): Promise<void> => {
  const node = document.querySelector(containerSelector) as HTMLElement;
  if (!node) throw new Error('Diagram container not found.');

  const store = useAppStore.getState();
  const wasPlaying = store.isPlaying;
  const originalTime = store.currentTime;
  if (wasPlaying) store.pausePlayback();

  try {
    const customBg = useAppStore.getState().visualData?.canvas?.bgColor;
    const isDark = document.documentElement.classList.contains('dark');
    const bgColor = customBg || (isDark ? '#0f172a' : '#f8fafc');

    // Map quality 1-100 → palette depth 16-256 colors
    const numColors = Math.round(16 + (quality / 100) * 240);

    // ── Phase 1: Capture frames (0-55%) ──────────────────────
    // Pre-fetch font CSS once so each frame uses the correct web fonts.
    // The browser has already loaded fonts, so this is typically instant.
    const fontEmbedCSS = await getFontEmbedCSS(node).catch(() => '');
    const frames = await captureFrames(
      node,
      maxDuration,
      fps,
      scale,
      skipStatic,
      bgColor,
      fontEmbedCSS,
      onProgress
    );

    // ── Phase 2: Encode with gifenc (55-100%) ─────────────────
    const encoder = GIFEncoder();

    for (let i = 0; i < frames.length; i++) {
      const { canvas, delay } = frames[i];
      const ctx  = canvas.getContext('2d')!;
      const imgd = ctx.getImageData(0, 0, canvas.width, canvas.height);

      const palette = quantize(imgd.data, numColors);
      const index   = applyPalette(imgd.data, palette);

      encoder.writeFrame(index, canvas.width, canvas.height, {
        palette,
        delay: Math.max(2, Math.round(delay / 10)), // GIF delay unit = 1/100 s
        repeat: i === 0 ? 0 : undefined,            // 0 = loop forever (only written once)
        dispose: 1,
      });

      onProgress(55 + Math.floor(((i + 1) / frames.length) * 45));
    }

    encoder.finish();
    const blob = new Blob([encoder.bytesView()], { type: 'image/gif' });

    // ── Phase 3: Save ─────────────────────────────────────────
    if (isTauri()) {
      const selectedPath = await save({
        title: language === 'tr' ? 'GIF Olarak Kaydet' : 'Save as GIF',
        defaultPath: defaultName,
        filters: [{ name: 'GIF Image', extensions: ['gif'] }],
      });
      if (selectedPath) {
        const bytes = new Uint8Array(await blob.arrayBuffer());
        await writeFile(selectedPath, bytes);
      }
    } else {
      const url = URL.createObjectURL(blob);
      const a   = document.createElement('a');
      a.href     = url;
      a.download = defaultName;
      a.click();
      URL.revokeObjectURL(url);
    }
  } finally {
    store.setCurrentTime(originalTime);
    if (wasPlaying) store.startPlayback();
  }
};


// ─────────────────────────────────────────────────────────────
// Video (WebM) Export
//
// Fast path  → WebCodecs API + webm-muxer
//   Encodes frames with explicit timestamps, no real-time wait.
//   Hardware-accelerated on supported GPUs. Typically 20-50× faster
//   than the animation duration (vs. MediaRecorder which takes ≥ duration).
//
// Fallback   → MediaRecorder API
//   Used when VideoEncoder is unavailable (older browsers).
// ─────────────────────────────────────────────────────────────

/** True when the browser / Tauri WebView supports the WebCodecs API. */
const supportsWebCodecs = (): boolean =>
  typeof VideoEncoder !== 'undefined' && typeof VideoFrame !== 'undefined';

const BITRATES: Record<string, number> = {
  low:    1_000_000,
  medium: 3_000_000,
  high:   8_000_000,
};

/**
 * Fast encoding path via WebCodecs + webm-muxer.
 * Frames are submitted with explicit timestamps — no setTimeout waiting.
 * Returns the finished WebM blob.
 */
const encodeWithWebCodecs = async (
  frames: { canvas: HTMLCanvasElement; delay: number }[],
  width: number,
  height: number,
  fps: number,
  quality: 'low' | 'medium' | 'high',
  onProgress: (pct: number) => void
): Promise<Blob> => {
  const { Muxer, ArrayBufferTarget } = await import('webm-muxer');

  // Probe codec support: prefer VP9 (better compression), fall back to VP8
  type CodecPair = { enc: string; mux: 'V_VP9' | 'V_VP8' };
  const candidates: CodecPair[] = [
    { enc: 'vp09.00.41.08', mux: 'V_VP9' }, // VP9 profile 0, level 4.1
    { enc: 'vp8',           mux: 'V_VP8' },
  ];

  let codec: CodecPair | undefined;
  for (const c of candidates) {
    const probe = await VideoEncoder.isConfigSupported({
      codec: c.enc, width, height,
      bitrate: BITRATES[quality],
      framerate: fps,
    });
    if (probe.supported) { codec = c; break; }
  }
  if (!codec) throw new Error('No supported WebCodecs video codec found.');

  const target  = new ArrayBufferTarget();
  const muxer   = new Muxer({
    target,
    video: { codec: codec.mux, width, height, frameRate: fps },
    firstTimestampBehavior: 'strict',
  });

  return new Promise<Blob>((resolve, reject) => {
    const encoder = new VideoEncoder({
      output: (chunk, meta) => {
        try { muxer.addVideoChunk(chunk, meta); }
        catch (e) { reject(e); }
      },
      error: reject,
    });

    encoder.configure({
      codec:                 codec!.enc,
      width,
      height,
      bitrate:               BITRATES[quality],
      framerate:             fps,
      hardwareAcceleration:  'prefer-hardware',
      latencyMode:           'quality',
    });

    (async () => {
      try {
        let timestampUs   = 0;
        const keyInterval = Math.max(1, fps * 2); // keyframe every 2 s

        for (let i = 0; i < frames.length; i++) {
          const { canvas, delay } = frames[i];
          const durationUs = Math.round(delay * 1000); // ms → µs

          const vf = new VideoFrame(canvas, { timestamp: timestampUs, duration: durationUs });
          encoder.encode(vf, { keyFrame: i % keyInterval === 0 });
          vf.close();

          timestampUs += durationUs;
          onProgress(55 + Math.floor(((i + 1) / frames.length) * 45));

          // Yield every 10 frames so the UI stays responsive
          if (i % 10 === 0) await new Promise(r => setTimeout(r, 0));
        }

        await encoder.flush();
        muxer.finalize();
        resolve(new Blob([target.buffer], { type: 'video/webm' }));
      } catch (e) {
        reject(e);
      }
    })();
  });
};

/**
 * Fallback encoding path via MediaRecorder.
 * Must wait in real-time between frames so MediaRecorder gets correct timing.
 */
const encodeWithMediaRecorder = (
  frames: { canvas: HTMLCanvasElement; delay: number }[],
  width: number,
  height: number,
  quality: 'low' | 'medium' | 'high',
  onProgress: (pct: number) => void
): Promise<Blob> => {
  const mimeType = [
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
  ].find(t => MediaRecorder.isTypeSupported(t)) ?? 'video/webm';

  const recordCanvas = document.createElement('canvas');
  recordCanvas.width  = width;
  recordCanvas.height = height;
  const rCtx = recordCanvas.getContext('2d')!;

  const stream     = (recordCanvas as any).captureStream(0) as MediaStream;
  const videoTrack = stream.getVideoTracks()[0] as any;
  const chunks: Blob[] = [];

  const recorder = new MediaRecorder(stream, {
    mimeType,
    videoBitsPerSecond: BITRATES[quality],
  });
  recorder.ondataavailable = (e: BlobEvent) => {
    if (e.data?.size > 0) chunks.push(e.data);
  };

  return new Promise<Blob>(async (resolve, reject) => {
    recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType }));
    recorder.onerror = reject;
    recorder.start();

    for (let i = 0; i < frames.length; i++) {
      rCtx.drawImage(frames[i].canvas, 0, 0);
      if (typeof videoTrack.requestFrame === 'function') videoTrack.requestFrame();
      await new Promise(r => setTimeout(r, frames[i].delay)); // real-time wait
      onProgress(55 + Math.floor(((i + 1) / frames.length) * 45));
    }

    recorder.stop();
  });
};

export const exportToVideo = async (
  containerSelector: string,
  maxDuration: number,
  defaultName: string,
  language: 'tr' | 'en',
  fps: number,
  /** 'low' ≈ 1 Mbps | 'medium' ≈ 3 Mbps | 'high' ≈ 8 Mbps */
  quality: 'low' | 'medium' | 'high',
  onProgress: (percent: number) => void
): Promise<void> => {
  const node = document.querySelector(containerSelector) as HTMLElement;
  if (!node) throw new Error('Diagram container not found.');

  if (!supportsWebCodecs() && typeof MediaRecorder === 'undefined') {
    throw new Error(
      language === 'tr'
        ? 'Bu tarayıcı video dışa aktarmayı desteklemiyor.'
        : 'This browser does not support video export.'
    );
  }

  const store = useAppStore.getState();
  const wasPlaying  = store.isPlaying;
  const originalTime = store.currentTime;
  if (wasPlaying) store.pausePlayback();

  try {
    const customBg = useAppStore.getState().visualData?.canvas?.bgColor;
    const isDark   = document.documentElement.classList.contains('dark');
    const bgColor  = customBg || (isDark ? '#0f172a' : '#f8fafc');

    // ── Phase 1: Capture all frames (0-55%) ──────────────────
    // Pre-fetch font CSS once so each frame uses the correct web fonts.
    const fontEmbedCSS = await getFontEmbedCSS(node).catch(() => '');
    const frames = await captureFrames(
      node, maxDuration, fps,
      1,     // full resolution for video
      false, // no frame dedup — keeps smooth motion
      bgColor,
      fontEmbedCSS,
      onProgress
    );

    const { width, height } = frames[0].canvas;

    // ── Phase 2: Encode (55-100%) ─────────────────────────────
    // Try fast WebCodecs path first; fall back to MediaRecorder on failure.
    let blob: Blob;
    if (supportsWebCodecs()) {
      try {
        blob = await encodeWithWebCodecs(frames, width, height, fps, quality, onProgress);
      } catch (webCodecsErr) {
        console.warn('[Video Export] WebCodecs failed, falling back to MediaRecorder:', webCodecsErr);
        blob = await encodeWithMediaRecorder(frames, width, height, quality, onProgress);
      }
    } else {
      blob = await encodeWithMediaRecorder(frames, width, height, quality, onProgress);
    }

    // ── Phase 3: Save ─────────────────────────────────────────
    if (isTauri()) {
      const selectedPath = await save({
        title:   language === 'tr' ? 'Video Olarak Kaydet' : 'Save as Video',
        defaultPath: defaultName,
        filters: [{ name: 'WebM Video', extensions: ['webm'] }],
      });
      if (selectedPath) {
        const bytes = new Uint8Array(await blob.arrayBuffer());
        await writeFile(selectedPath, bytes);
      }
    } else {
      const url = URL.createObjectURL(blob);
      const a   = document.createElement('a');
      a.href     = url;
      a.download = defaultName;
      a.click();
      URL.revokeObjectURL(url);
    }
  } finally {
    store.setCurrentTime(originalTime);
    if (wasPlaying) store.startPlayback();
  }
};

