// segmenter.js — proposes segment boundaries via energy-based silence detection.
// Same honest limitation as the Swift version: this is NOT real VAD or speech
// recognition. It works reasonably on clean audiobook narration and gets
// confused by music beds, long whispered pauses, or noisy recordings.
// These boundaries are a STARTING POINT — always shown to the user for manual
// confirmation before being used in Shadowing. Do not skip that step.
'use strict';

var AF = window.AF || {};
window.AF = AF;

AF.AudioSegmenter = {
  config: {
    silenceThreshold: 0.02,      // linear RMS amplitude (0..1) below which a window counts as silence
    minSilenceDuration: 0.5,     // seconds — shorter gaps (breathing) are ignored
    minSegmentDuration: 2.0,     // seconds — segments shorter than this get merged into a neighbor
    windowDuration: 0.05,        // seconds — analysis window size
  },

  /**
   * @param {ArrayBuffer} arrayBuffer raw bytes of the audio file
   * @returns {Promise<{start:number, end:number}[]>}
   */
  async proposeSegments(arrayBuffer) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioContextClass();
    let audioBuffer;
    try {
      // decodeAudioData mutates/detaches the buffer in some engines, so pass a copy.
      audioBuffer = await ctx.decodeAudioData(arrayBuffer.slice(0));
    } finally {
      // Don't leak audio contexts — close it once decoding (the only thing we needed it for) is done.
      ctx.close().catch(() => {});
    }

    const sampleRate = audioBuffer.sampleRate;
    const channelCount = audioBuffer.numberOfChannels;
    const totalFrames = audioBuffer.length;
    const windowFrames = Math.max(1, Math.round(this.config.windowDuration * sampleRate));

    const channels = [];
    for (let c = 0; c < channelCount; c++) {
      channels.push(audioBuffer.getChannelData(c));
    }

    const isSilentWindow = [];
    for (let start = 0; start < totalFrames; start += windowFrames) {
      const end = Math.min(start + windowFrames, totalFrames);
      let sumSquares = 0;
      let sampleCount = 0;
      for (const channel of channels) {
        for (let i = start; i < end; i++) {
          const s = channel[i];
          sumSquares += s * s;
          sampleCount++;
        }
      }
      const rms = sampleCount > 0 ? Math.sqrt(sumSquares / sampleCount) : 0;
      isSilentWindow.push(rms < this.config.silenceThreshold);
    }

    if (isSilentWindow.length === 0) return [];

    const windowsPerMinSilence = Math.max(1, Math.round(this.config.minSilenceDuration / this.config.windowDuration));

    const boundaries = [0];
    let silentRun = 0;
    for (let i = 0; i < isSilentWindow.length; i++) {
      if (isSilentWindow[i]) {
        silentRun++;
      } else {
        if (silentRun >= windowsPerMinSilence) {
          const runStartWindow = i - silentRun;
          const midWindow = runStartWindow + Math.floor(silentRun / 2);
          boundaries.push(midWindow * this.config.windowDuration);
        }
        silentRun = 0;
      }
    }

    const totalDuration = totalFrames / sampleRate;
    boundaries.push(totalDuration);

    const rawSegments = [];
    for (let i = 0; i < boundaries.length - 1; i++) {
      rawSegments.push({ start: boundaries[i], end: boundaries[i + 1] });
    }

    const merged = [];
    for (const seg of rawSegments) {
      if (merged.length > 0 && (seg.end - merged[merged.length - 1].start) < this.config.minSegmentDuration) {
        merged[merged.length - 1].end = seg.end;
      } else if ((seg.end - seg.start) < this.config.minSegmentDuration && merged.length > 0) {
        merged[merged.length - 1].end = seg.end;
      } else {
        merged.push(seg);
      }
    }

    return merged;
  },
};
