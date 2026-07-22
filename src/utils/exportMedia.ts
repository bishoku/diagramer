import { toPng, toCanvas, getFontEmbedCSS } from 'html-to-image';
// @ts-ignore — gifenc ships ESM-only; types are inferred at runtime
import { GIFEncoder, quantize, applyPalette } from 'gifenc';
import { useAppStore } from '../store/useAppStore';
import { save } from '@tauri-apps/plugin-dialog';
import { writeFile } from '@tauri-apps/plugin-fs';
import { isTauri } from '../services/storage';

// ─────────────────────────────────────────────────────────────
const EXCLUDE_SELECTOR = '.react-flow__controls, .react-flow__panel, .react-flow__minimap, .react-flow__attribution, .export-exclude';

const shouldExcludeNode = (domNode: HTMLElement): boolean => {
  if (!domNode || !domNode.classList) return false;
  return (
    domNode.classList.contains('react-flow__controls') ||
    domNode.classList.contains('react-flow__panel') ||
    domNode.classList.contains('react-flow__minimap') ||
    domNode.classList.contains('react-flow__attribution') ||
    domNode.classList.contains('export-exclude')
  );
};

const hideUIElements = () => {
  const elements = document.querySelectorAll(EXCLUDE_SELECTOR);
  elements.forEach((el) => {
    (el as HTMLElement).style.setProperty('display', 'none', 'important');
  });
  return elements;
};

const restoreUIElements = (elements: NodeListOf<Element>) => {
  elements.forEach((el) => {
    (el as HTMLElement).style.removeProperty('display');
  });
};

// ─────────────────────────────────────────────────────────────
// PNG Export
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

  const elementsToHide = hideUIElements();

  try {
    const customBg = useAppStore.getState().visualData?.canvas?.bgColor;
    const isDark = document.documentElement.classList.contains('dark');
    const bgColor = customBg || (isDark ? '#0f172a' : '#f8fafc');

    const dataUrl = await toPng(node, {
      quality: 1,
      pixelRatio: 4, // 4× supersampling for crisp text and sharp edges
      backgroundColor: bgColor,
      width: node.clientWidth,
      height: node.clientHeight,
      style: { transform: 'scale(1)', transformOrigin: 'top left' },
      filter: (domNode) => !shouldExcludeNode(domNode as HTMLElement),
    });

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
  } finally {
    restoreUIElements(elementsToHide);
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
  onProgress: (pct: number) => void,
  /**
   * Capture pixel ratio. Higher values produce sharper text via supersampling.
   * The raw canvas is `clientWidth*pixelRatio × clientHeight*pixelRatio`, then
   * scaled to `clientWidth*scale × clientHeight*scale` (the final output size).
   * Default 1 preserves legacy behaviour for GIF.
   */
  pixelRatio: number = 1
): Promise<{ canvas: HTMLCanvasElement; delay: number }[]> => {
  const store = useAppStore.getState();
  const stepMs = 1000 / fps;
  const totalFrames = Math.max(1, Math.ceil(maxDuration / stepMs));

  // H.264 requires even dimensions — round up to next even number
  const scaledWidth  = Math.round(node.clientWidth  * scale / 2) * 2;
  const scaledHeight = Math.round(node.clientHeight * scale / 2) * 2;

  const elementsToHide = hideUIElements();

  const waitRender = () =>
    new Promise<void>((resolve) =>
      requestAnimationFrame(() => { requestAnimationFrame(() => resolve()); })
    );

  const results: { canvas: HTMLCanvasElement; delay: number }[] = [];
  let lastHash: number | null = null;

  try {
    for (let frame = 0; frame <= totalFrames; frame++) {
      const time = Math.min(frame * stepMs, maxDuration);
      store.setCurrentTime(time);
      await waitRender();
      await new Promise((r) => setTimeout(r, 10)); // let react-flow finish

      // Capture at high resolution, then scale to the target output size.
      // fontEmbedCSS is pre-fetched once before the loop so fonts render correctly
      // on every frame without re-downloading. skipFonts is intentionally NOT used
      // here — it caused html-to-image to fall back to a system font with different
      // character metrics, making edge label text wrap at wrong break points.
      const raw = await toCanvas(node, {
        pixelRatio,
        fontEmbedCSS,
        backgroundColor: bgColor,
        width: node.clientWidth,
        height: node.clientHeight,
        style: { transform: 'scale(1)', transformOrigin: 'top left' },
        filter: (domNode) => !shouldExcludeNode(domNode as HTMLElement),
      });

      // Scale to target output size.
      // When pixelRatio > 1 and scale ≤ 1, this is supersampling: the higher-res
      // capture is scaled down, producing sharper text and crisper edges.
      let target = raw;
      if (raw.width !== scaledWidth || raw.height !== scaledHeight) {
        target = document.createElement('canvas');
        target.width  = scaledWidth;
        target.height = scaledHeight;
        const ctx = target.getContext('2d')!;
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
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
  } finally {
    restoreUIElements(elementsToHide);
  }

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
  onProgress: (pct: number) => void,
  scale: number = 1
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
    const effectiveBitrate = scale > 1 ? Math.round(BITRATES[quality] * scale) : BITRATES[quality];
    const probe = await VideoEncoder.isConfigSupported({
      codec: c.enc, width, height,
      bitrate: effectiveBitrate,
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

    const effectiveBitrate = scale > 1 ? Math.round(BITRATES[quality] * scale) : BITRATES[quality];
    encoder.configure({
      codec:                 codec!.enc,
      width,
      height,
      bitrate:               effectiveBitrate,
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
 * Primary encoding path: WebCodecs H.264 + mp4-muxer → MP4.
 * Works in both Tauri (WKWebView) and browsers (Chrome/Edge/Safari).
 * Hardware-accelerated — no IPC per frame, encoding stays in the WebView.
 */
const encodeWithWebCodecsMp4 = async (
  frames: { canvas: HTMLCanvasElement; delay: number }[],
  width: number,
  height: number,
  fps: number,
  quality: 'low' | 'medium' | 'high',
  onProgress: (pct: number) => void,
  scale: number = 1
): Promise<Blob> => {
  const { Muxer, ArrayBufferTarget } = await import('mp4-muxer');

  // Ensure even dimensions (H.264 requirement)
  const encWidth  = width  % 2 === 0 ? width  : width  + 1;
  const encHeight = height % 2 === 0 ? height : height + 1;

  const effectiveBitrate = scale > 1 ? Math.round(BITRATES[quality] * scale) : BITRATES[quality];

  // Probe H.264 codec support — try multiple profiles
  const h264Candidates = [
    'avc1.42001f', // Baseline L3.1 — broadest hardware support
    'avc1.4d0028', // Main L4.0 — good balance
    'avc1.640028', // High L4.0 — best compression
  ];

  let codecStr: string | undefined;
  for (const c of h264Candidates) {
    try {
      const probe = await VideoEncoder.isConfigSupported({
        codec: c, width: encWidth, height: encHeight,
        bitrate: effectiveBitrate,
        framerate: fps,
      });
      if (probe.supported) { codecStr = c; break; }
    } catch { /* some WebViews throw instead of returning unsupported */ }
  }
  if (!codecStr) throw new Error('H.264 encoding not supported.');

  const target = new ArrayBufferTarget();
  const muxer = new Muxer({
    target,
    video: { codec: 'avc', width: encWidth, height: encHeight },
    firstTimestampBehavior: 'strict',
    fastStart: 'in-memory',
  });

  // If source frames have odd dimensions, we'll pad them
  const needsPadding = encWidth !== width || encHeight !== height;
  let padCanvas: HTMLCanvasElement | null = null;
  let padCtx: CanvasRenderingContext2D | null = null;
  if (needsPadding) {
    padCanvas = document.createElement('canvas');
    padCanvas.width  = encWidth;
    padCanvas.height = encHeight;
    padCtx = padCanvas.getContext('2d')!;
  }

  return new Promise<Blob>((resolve, reject) => {
    const encoder = new VideoEncoder({
      output: (chunk, meta) => {
        try { muxer.addVideoChunk(chunk, meta); }
        catch (e) { reject(e); }
      },
      error: (e) => reject(new Error(`H.264 encode error: ${e.message}`)),
    });

    encoder.configure({
      codec:                 codecStr!,
      width:                 encWidth,
      height:                encHeight,
      bitrate:               effectiveBitrate,
      framerate:             fps,
      hardwareAcceleration:  'prefer-hardware',
      latencyMode:           'quality',
    });

    (async () => {
      try {
        let timestampUs   = 0;
        const keyInterval = Math.max(1, fps * 2);

        for (let i = 0; i < frames.length; i++) {
          const { canvas, delay } = frames[i];
          const durationUs = Math.round(delay * 1000);

          // Pad to even dimensions if needed
          const src = needsPadding ? (() => {
            padCtx!.clearRect(0, 0, encWidth, encHeight);
            padCtx!.drawImage(canvas, 0, 0);
            return padCanvas!;
          })() : canvas;

          const vf = new VideoFrame(src, { timestamp: timestampUs, duration: durationUs });
          encoder.encode(vf, { keyFrame: i % keyInterval === 0 });
          vf.close();

          timestampUs += durationUs;
          onProgress(55 + Math.floor(((i + 1) / frames.length) * 45));

          if (i % 10 === 0) await new Promise(r => setTimeout(r, 0));
        }

        await encoder.flush();
        muxer.finalize();
        resolve(new Blob([target.buffer], { type: 'video/mp4' }));
      } catch (e) {
        reject(e);
      }
    })();
  });
};

/** Simple browser download helper */
const triggerDownload = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a   = document.createElement('a');
  a.href     = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
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
  onProgress: (pct: number) => void,
  scale: number = 1
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

  const effectiveBitrate = scale > 1 ? Math.round(BITRATES[quality] * scale) : BITRATES[quality];
  const recorder = new MediaRecorder(stream, {
    mimeType,
    videoBitsPerSecond: effectiveBitrate,
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
  /** 'low' ≈ 1 Mbps | 'medium' ≈ 3 Mbps | 'high' ≈ 8 Mbps (at 1× scale) */
  quality: 'low' | 'medium' | 'high',
  onProgress: (percent: number) => void,
  /**
   * Output resolution multiplier relative to CSS element size.
   * 1 = same dimensions as on screen (supersampled for sharpness).
   * 1.5–2 = higher-res output for even crisper text at larger file size.
   */
  scale: number = 1
): Promise<void> => {
  const node = document.querySelector(containerSelector) as HTMLElement;
  if (!node) throw new Error('Diagram container not found.');

  // Browser-only validation — Tauri uses Rust-native encoding
  if (!isTauri() && !supportsWebCodecs() && typeof MediaRecorder === 'undefined') {
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
      scale,  // output resolution multiplier
      false,  // no frame dedup — keeps smooth motion
      bgColor,
      fontEmbedCSS,
      onProgress,
      2       // capture at 2× pixel ratio for sharp text (supersampling)
    );

    const { width, height } = frames[0].canvas;

    // ── Phase 2: Encode (55-100%) ─────────────────────────────
    // Strategy: try H.264/MP4 first (universal playback, HW-accelerated),
    // fall back to VP9/WebM, then MediaRecorder as last resort.
    let blob: Blob;
    let format: 'mp4' | 'webm' = 'mp4';

    if (supportsWebCodecs()) {
      try {
        blob = await encodeWithWebCodecsMp4(frames, width, height, fps, quality, onProgress, scale);
      } catch (mp4Err) {
        console.warn('[Video Export] H.264/MP4 failed, trying VP9/WebM:', mp4Err);
        format = 'webm';
        try {
          blob = await encodeWithWebCodecs(frames, width, height, fps, quality, onProgress, scale);
        } catch (webmErr) {
          console.warn('[Video Export] VP9/WebM failed, falling back to MediaRecorder:', webmErr);
          blob = await encodeWithMediaRecorder(frames, width, height, quality, onProgress, scale);
        }
      }
    } else {
      format = 'webm';
      blob = await encodeWithMediaRecorder(frames, width, height, quality, onProgress, scale);
    }

    // ── Phase 3: Save ─────────────────────────────────────────
    const ext = format === 'mp4' ? 'mp4' : 'webm';
    const filterName = format === 'mp4' ? 'MP4 Video' : 'WebM Video';
    const saveName = defaultName.replace(/\.(webm|mp4)$/i, `.${ext}`);

    if (isTauri()) {
      const selectedPath = await save({
        title:   language === 'tr' ? 'Video Olarak Kaydet' : 'Save as Video',
        defaultPath: saveName,
        filters: [{ name: filterName, extensions: [ext] }],
      });
      if (selectedPath) {
        const bytes = new Uint8Array(await blob.arrayBuffer());
        await writeFile(selectedPath, bytes);
      }
    } else {
      triggerDownload(blob, saveName);
    }
  } finally {
    store.setCurrentTime(originalTime);
    if (wasPlaying) store.startPlayback();
  }
};

