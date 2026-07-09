// audioEngine.js — thin wrapper around a native <audio> element.
// Uses the browser's built-in pitch-preserving playbackRate (Safari/Chrome both
// default preservesPitch=true), so no time-stretching library is needed —
// this is simpler and more reliable than the manual AVAudioEngine approach
// the native version needed.
'use strict';

var AF = window.AF || {};
window.AF = AF;

AF.AudioEngine = class AudioEngine {
  constructor(audioElement) {
    this.el = audioElement;
    this.el.preservesPitch = true;
    this.el.mozPreservesPitch = true;
    this.el.webkitPreservesPitch = true;
    this.loopRange = null;
    this.pendingStopTime = null;
    this._onTimeUpdate = this._onTimeUpdate.bind(this);
    this.el.addEventListener('timeupdate', this._onTimeUpdate);
  }

  async loadObjectUrl(url) {
    this.clearLoop();
    this.pendingStopTime = null;
    this.el.src = url;
    this.el.load();
    await new Promise((resolve, reject) => {
      const onLoaded = () => { cleanup(); resolve(); };
      const onError = () => { cleanup(); reject(new Error('Не удалось загрузить аудио')); };
      const cleanup = () => {
        this.el.removeEventListener('loadedmetadata', onLoaded);
        this.el.removeEventListener('error', onError);
      };
      this.el.addEventListener('loadedmetadata', onLoaded);
      this.el.addEventListener('error', onError);
    });
  }

  get duration() {
    return this.el.duration || 0;
  }

  get currentTime() {
    return this.el.currentTime;
  }

  get rate() {
    return this.el.playbackRate;
  }

  set rate(value) {
    this.el.playbackRate = value;
  }

  play(fromTime) {
    if (typeof fromTime === 'number') {
      this.el.currentTime = fromTime;
    }
    return this.el.play();
  }

  pause() {
    this.el.pause();
  }

  stop() {
    this.el.pause();
    this.el.currentTime = 0;
    this.clearLoop();
    this.pendingStopTime = null;
  }

  seek(time) {
    this.el.currentTime = Math.max(0, Math.min(time, this.duration || time));
  }

  setLoop(start, end) {
    this.loopRange = { start, end };
  }

  clearLoop() {
    this.loopRange = null;
  }

  /** Plays [start, end) once, then pauses. Does not loop. */
  playRange(start, end) {
    this.clearLoop();
    this.pendingStopTime = end;
    this.play(start);
  }

  _onTimeUpdate() {
    const t = this.el.currentTime;
    if (this.pendingStopTime !== null && t >= this.pendingStopTime) {
      this.el.pause();
      this.pendingStopTime = null;
      return;
    }
    if (this.loopRange && t >= this.loopRange.end) {
      this.el.currentTime = this.loopRange.start;
      // Some browsers pause briefly on currentTime jumps while already playing;
      // play() is a no-op if already playing but guarantees resume if it paused.
      this.el.play().catch(() => {});
    }
  }

  destroy() {
    this.el.removeEventListener('timeupdate', this._onTimeUpdate);
  }
};
