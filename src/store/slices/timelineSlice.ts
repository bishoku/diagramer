import { StateCreator } from 'zustand';
import { AppState, SequenceStep, TimelineTiming } from '../../types';

export interface TimelineSlice {
  isPlaying: boolean;
  currentTime: number;
  playbackRate: number;
  activeSequenceIds: string[];
  selectedSequenceId: string | null;
  timelineOpen: boolean;
  timelineHeight: number;
  loopPlayback: boolean;

  startPlayback: () => void;
  pausePlayback: () => void;
  stopPlayback: () => void;
  setCurrentTime: (time: number) => void;
  setPlaybackRate: (rate: number) => void;
  setSelectedSequenceId: (id: string | null) => void;
  toggleLoopPlayback: () => void;
  addSequenceStep: (step: SequenceStep, timing: TimelineTiming) => void;
  updateSequenceTiming: (seqId: string, duration: number, delay: number) => void;
  updateSequenceProcess: (seqId: string, text: string, duration: number) => void;
  deleteSequenceStep: (seqId: string) => void;
  setSequenceStepOrder: (seqId: string, stepNumber: number) => void;
  setSequenceStepRoundTrip: (seqId: string, isRoundTrip: boolean) => void;
  toggleSequenceAsync: (seqId: string) => void;
  toggleTimeline: () => void;
  setTimelineHeight: (height: number) => void;
}

export const createTimelineSlice: StateCreator<AppState, [], [], TimelineSlice> = (set) => ({
  isPlaying: false,
  currentTime: 0,
  playbackRate: 1,
  activeSequenceIds: [],
  selectedSequenceId: null,
  timelineOpen: true,
  timelineHeight: 250,
  loopPlayback: true,

  startPlayback: () => set({ isPlaying: true, selectedSequenceId: null }),
  pausePlayback: () => set({ isPlaying: false }),
  stopPlayback: () => set({ isPlaying: false, currentTime: 0, activeSequenceIds: [] }),
  toggleLoopPlayback: () => set((state) => ({ loopPlayback: !state.loopPlayback })),
  
  setCurrentTime: (time) => {
    set((state) => {
      const schedules = state.schedules;
      const activeSequenceIds: string[] = [];
      
      Object.entries(schedules).forEach(([seqId, sched]) => {
        if (time >= sched.start && time < sched.end) {
          activeSequenceIds.push(seqId);
        }
      });

      return {
        currentTime: time,
        activeSequenceIds
      };
    });
  },
  
  setPlaybackRate: (rate) => set({ playbackRate: rate }),
  setSelectedSequenceId: (id) => set({ selectedSequenceId: id }),

  addSequenceStep: (step, timing) => {
    set((state) => {
      const sequences = [...state.logicalData.sequences, step];
      const timelines = { ...state.visualData.timelines, [timing.sequenceId]: timing };
      return {
        logicalData: { ...state.logicalData, sequences },
        visualData: { ...state.visualData, timelines },
        isDirty: true
      };
    });
  },

  updateSequenceTiming: (seqId, duration, delay) => {
    set((state) => {
      const timing = state.visualData.timelines[seqId] || { sequenceId: seqId, duration: 1000, delay: 0 };
      const updatedTiming = { ...timing, duration, delay };
      const timelines = { ...state.visualData.timelines, [seqId]: updatedTiming };
      return {
        visualData: { ...state.visualData, timelines },
        isDirty: true
      };
    });
  },

  updateSequenceProcess: (seqId, text, duration) => {
    set((state) => {
      const timing = state.visualData.timelines[seqId] || { sequenceId: seqId, duration: 1000, delay: 0 };
      const updatedTiming = {
        ...timing,
        internalProcess: text ? { text, duration } : undefined
      };
      const timelines = { ...state.visualData.timelines, [seqId]: updatedTiming };
      return {
        visualData: { ...state.visualData, timelines },
        isDirty: true
      };
    });
  },

  deleteSequenceStep: (seqId) => {
    set((state) => {
      const sequences = state.logicalData.sequences.filter((s) => s.id !== seqId);
      const timelines = { ...state.visualData.timelines };
      delete timelines[seqId];
      
      const selectedSequenceId = state.selectedSequenceId === seqId ? null : state.selectedSequenceId;
      const activeSequenceIds = state.activeSequenceIds.filter((id) => id !== seqId);
      
      return {
        logicalData: { ...state.logicalData, sequences },
        visualData: { ...state.visualData, timelines },
        selectedSequenceId,
        activeSequenceIds,
        isDirty: true
      };
    });
  },

  setSequenceStepOrder: (seqId, stepNumber) => {
    set((state) => {
      const sequences = state.logicalData.sequences.map((s) => 
        s.id === seqId ? { ...s, stepNumber } : s
      );
      return {
        logicalData: { ...state.logicalData, sequences },
        isDirty: true
      };
    });
  },

  setSequenceStepRoundTrip: (seqId, isRoundTrip) => {
    set((state) => {
      const sequences = state.logicalData.sequences.map((s) => 
        s.id === seqId ? { ...s, isRoundTrip } : s
      );
      return {
        logicalData: { ...state.logicalData, sequences },
        isDirty: true
      };
    });
  },

  toggleSequenceAsync: (seqId) => {
    set((state) => {
      const sequences = state.logicalData.sequences.map((s) => 
        s.id === seqId ? { ...s, isAsync: !s.isAsync } : s
      );
      return {
        logicalData: { ...state.logicalData, sequences },
        isDirty: true
      };
    });
  },

  toggleTimeline: () => set((state) => ({ timelineOpen: !state.timelineOpen })),
  setTimelineHeight: (height) => set({ timelineHeight: height })
});
