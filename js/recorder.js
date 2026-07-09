// recorder.js — records the user's microphone via MediaRecorder.
// Separate from AudioEngine on purpose, same reasoning as the Swift version:
// recording and playback have different lifecycle/permission concerns and
// mixing them is a common source of bugs.
'use strict';

var AF = window.AF || {};
window.AF = AF;

AF.Recorder = class Recorder {
  constructor() {
    this.mediaRecorder = null;
    this.stream = null;
    this.chunks = [];
    this.isRecording = false;
    this.startedAt = null;
    this.onTick = null; // optional callback(elapsedSeconds)
    this._tickInterval = null;
  }

  static pickMimeType() {
    // iOS Safari (14.3+) supports audio/mp4; Chrome/Firefox prefer audio/webm.
    const candidates = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm', 'audio/ogg'];
    for (const type of candidates) {
      if (window.MediaRecorder && MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }
    return ''; // let the browser pick a default
  }

  async start() {
    if (this.isRecording) return;
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mimeType = Recorder.pickMimeType();
    this.mediaRecorder = mimeType
      ? new MediaRecorder(this.stream, { mimeType })
      : new MediaRecorder(this.stream);
    this.chunks = [];

    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) this.chunks.push(e.data);
    };

    this.mediaRecorder.start();
    this.isRecording = true;
    this.startedAt = performance.now();

    this._tickInterval = setInterval(() => {
      if (this.onTick) this.onTick((performance.now() - this.startedAt) / 1000);
    }, 100);
  }

  /** @returns {Promise<{blob: Blob, mime: string, duration: number}>} */
  stop() {
    return new Promise((resolve, reject) => {
      if (!this.isRecording || !this.mediaRecorder) {
        reject(new Error('Запись не была начата'));
        return;
      }
      const duration = (performance.now() - this.startedAt) / 1000;
      this.mediaRecorder.onstop = () => {
        clearInterval(this._tickInterval);
        this._tickInterval = null;
        this.isRecording = false;
        const mime = this.mediaRecorder.mimeType || 'audio/webm';
        const blob = new Blob(this.chunks, { type: mime });
        this._releaseStream();
        resolve({ blob, mime, duration });
      };
      this.mediaRecorder.stop();
    });
  }

  cancel() {
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.onstop = null;
      this.mediaRecorder.stop();
    }
    clearInterval(this._tickInterval);
    this._tickInterval = null;
    this.isRecording = false;
    this._releaseStream();
  }

  _releaseStream() {
    if (this.stream) {
      this.stream.getTracks().forEach((t) => t.stop());
      this.stream = null;
    }
  }
};
