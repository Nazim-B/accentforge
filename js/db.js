// db.js — thin wrapper around IndexedDB. No external libraries: fewer moving
// parts, easier to debug in Safari devtools, no bundler needed.
//
// Object stores:
//   books        { id, title, audioBlob, audioMime, textContent, textType, chapters:[{id,title,segments:[{id,order,start,end,text,confirmed}]}], createdAt }
//   recordings   { id, bookId, chapterId, segmentId, blob, mime, date, duration }
//   stats        single record with key "singleton": { dailyLogs:[{dateKey,practiceSeconds,segmentsCompleted}], totalSegmentsCompleted }
'use strict';
(function () {

var AF = window.AF = window.AF || {};

AF.DB = (() => {
  const DB_NAME = 'accentforge';
  const DB_VERSION = 1;
  let dbPromise = null;

  function open() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('books')) {
          db.createObjectStore('books', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('recordings')) {
          const store = db.createObjectStore('recordings', { keyPath: 'id' });
          store.createIndex('bookId', 'bookId', { unique: false });
          store.createIndex('segmentId', 'segmentId', { unique: false });
        }
        if (!db.objectStoreNames.contains('stats')) {
          db.createObjectStore('stats', { keyPath: 'key' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return dbPromise;
  }

  function tx(storeName, mode) {
    return open().then((db) => db.transaction(storeName, mode).objectStore(storeName));
  }

  function reqToPromise(req) {
    return new Promise((resolve, reject) => {
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  return {
    // Books
    async getAllBooks() {
      const store = await tx('books', 'readonly');
      return reqToPromise(store.getAll());
    },
    async getBook(id) {
      const store = await tx('books', 'readonly');
      return reqToPromise(store.get(id));
    },
    async putBook(book) {
      const store = await tx('books', 'readwrite');
      return reqToPromise(store.put(book));
    },
    async deleteBook(id) {
      const store = await tx('books', 'readwrite');
      await reqToPromise(store.delete(id));
      const recStore = await tx('recordings', 'readwrite');
      const idx = recStore.index('bookId');
      const keys = await reqToPromise(idx.getAllKeys(id));
      for (const k of keys) {
        await reqToPromise(recStore.delete(k));
      }
    },

    // Recordings
    async addRecording(rec) {
      const store = await tx('recordings', 'readwrite');
      return reqToPromise(store.put(rec));
    },
    async getAllRecordings() {
      const store = await tx('recordings', 'readonly');
      return reqToPromise(store.getAll());
    },
    async getRecordingsForSegment(segmentId) {
      const store = await tx('recordings', 'readonly');
      const idx = store.index('segmentId');
      return reqToPromise(idx.getAll(segmentId));
    },
    async deleteRecording(id) {
      const store = await tx('recordings', 'readwrite');
      return reqToPromise(store.delete(id));
    },

    // Stats
    async getStats() {
      const store = await tx('stats', 'readonly');
      const result = await reqToPromise(store.get('singleton'));
      return result ? result.value : { dailyLogs: [], totalSegmentsCompleted: 0 };
    },
    async setStats(value) {
      const store = await tx('stats', 'readwrite');
      return reqToPromise(store.put({ key: 'singleton', value }));
    },
    async logPractice(seconds, segmentsCompleted = 1) {
      const stats = await this.getStats();
      const today = new Date();
      const dateKey = today.toISOString().slice(0, 10); // yyyy-mm-dd, local-ish enough for daily granularity
      const existing = stats.dailyLogs.find((l) => l.dateKey === dateKey);
      if (existing) {
        existing.practiceSeconds += seconds;
        existing.segmentsCompleted += segmentsCompleted;
      } else {
        stats.dailyLogs.push({ dateKey, practiceSeconds: seconds, segmentsCompleted });
      }
      stats.totalSegmentsCompleted += segmentsCompleted;
      await this.setStats(stats);
      return stats;
    },
  };
})();

// Streak calculation lives here since it's pure logic over stats data, not storage.
AF.computeStreak = function computeStreak(stats) {
  const loggedDays = new Set(stats.dailyLogs.map((l) => l.dateKey));
  const fmt = (d) => d.toISOString().slice(0, 10);
  let cursor = new Date();
  if (!loggedDays.has(fmt(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
  }
  let streak = 0;
  while (loggedDays.has(fmt(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
};
})();
