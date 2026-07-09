// app.js — UI glue. Vanilla JS, no framework: fewer moving parts to debug
// without a build step, and the whole app is small enough that a framework
// would add more risk than it removes.
'use strict';
(function () {

var AF = window.AF = window.AF || {};

AF.state = {
  tab: 'warmup',      // warmup | library | recordings | stats
  subview: null,       // null | {name:'import'} | {name:'segments', bookId} | {name:'shadowing', bookId}
};

const root = document.getElementById('app-root');
const audioEl = document.getElementById('shared-audio');
const engine = new AF.AudioEngine(audioEl);
const recorder = new AF.Recorder();

let currentObjectUrl = null;
function setAudioSource(blob) {
  if (currentObjectUrl) URL.revokeObjectURL(currentObjectUrl);
  currentObjectUrl = URL.createObjectURL(blob);
  return engine.loadObjectUrl(currentObjectUrl);
}

function render() {
  root.innerHTML = '';
  if (AF.state.subview?.name === 'import') {
    renderImportView();
  } else if (AF.state.subview?.name === 'segments') {
    renderSegmentsView(AF.state.subview.bookId);
  } else if (AF.state.subview?.name === 'shadowing') {
    renderShadowingView(AF.state.subview.bookId);
  } else {
    switch (AF.state.tab) {
      case 'warmup': renderWarmupView(); break;
      case 'library': renderLibraryView(); break;
      case 'recordings': renderRecordingsView(); break;
      case 'stats': renderStatsView(); break;
    }
  }
  updateTabBar();
}

function updateTabBar() {
  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.tab === AF.state.tab && !AF.state.subview);
  });
}

function goTab(tab) {
  AF.state.tab = tab;
  AF.state.subview = null;
  render();
}

function goSubview(subview) {
  AF.state.subview = subview;
  render();
}

// ---------- Warmup ----------

function renderWarmupView() {
  const exercises = AF.getWarmupSessionSet();
  let index = 0;

  const container = el('div', { class: 'view' });
  const progress = el('div', { class: 'progress-bar' });
  const progressFill = el('div', { class: 'progress-fill' });
  progress.appendChild(progressFill);
  container.appendChild(progress);

  const card = el('div', { class: 'card' });
  container.appendChild(card);

  const nav = el('div', { class: 'row space-between' });
  const skipBtn = el('button', { class: 'btn btn-secondary', text: 'Пропустить' });
  const nextBtn = el('button', { class: 'btn btn-primary' });
  nav.appendChild(skipBtn);
  nav.appendChild(nextBtn);
  container.appendChild(nav);

  function draw() {
    const ex = exercises[index];
    progressFill.style.width = `${(index / exercises.length) * 100}%`;
    card.innerHTML = '';
    card.appendChild(el('div', { class: 'eyebrow', text: ex.category }));
    card.appendChild(el('h2', { text: ex.title }));
    card.appendChild(el('p', { text: ex.text }));
    card.appendChild(el('div', { class: 'muted small', text: `⏱ ${ex.duration} сек` }));
    nextBtn.textContent = index === exercises.length - 1 ? 'Готово, к чтению' : 'Дальше';
  }

  function advance() {
    if (index < exercises.length - 1) {
      index += 1;
      draw();
    } else {
      goTab('library');
    }
  }

  skipBtn.onclick = advance;
  nextBtn.onclick = advance;
  draw();

  root.appendChild(container);
}

// ---------- Library ----------

async function renderLibraryView() {
  const container = el('div', { class: 'view' });
  const header = el('div', { class: 'row space-between' });
  header.appendChild(el('h2', { text: 'Книги' }));
  const addBtn = el('button', { class: 'btn btn-primary', text: '+ Добавить' });
  addBtn.onclick = () => goSubview({ name: 'import' });
  header.appendChild(addBtn);
  container.appendChild(header);

  const list = el('div', { class: 'list' });
  container.appendChild(list);
  root.appendChild(container);

  const books = await AF.DB.getAllBooks();
  if (books.length === 0) {
    list.appendChild(el('p', { class: 'muted', text: 'Пока нет книг. Нажмите «Добавить».' }));
    return;
  }

  for (const book of books) {
    const segments = book.chapters?.[0]?.segments || [];
    const confirmedCount = segments.filter((s) => s.confirmed).length;

    const item = el('div', { class: 'card' });
    item.appendChild(el('h3', { text: book.title }));
    item.appendChild(el('div', { class: 'muted small', text: `${confirmedCount}/${segments.length} фрагментов размечено` }));

    const row = el('div', { class: 'row' });
    const editBtn = el('button', { class: 'btn btn-secondary', text: 'Разметка' });
    editBtn.onclick = () => goSubview({ name: 'segments', bookId: book.id });
    row.appendChild(editBtn);

    const readBtn = el('button', { class: 'btn btn-primary', text: 'Читать (shadowing)' });
    readBtn.disabled = confirmedCount === 0;
    readBtn.onclick = () => goSubview({ name: 'shadowing', bookId: book.id });
    row.appendChild(readBtn);

    const delBtn = el('button', { class: 'btn btn-danger', text: 'Удалить' });
    delBtn.onclick = async () => {
      if (confirm(`Удалить «${book.title}» вместе со всеми записями?`)) {
        await AF.DB.deleteBook(book.id);
        renderLibraryView();
      }
    };
    row.appendChild(delBtn);

    item.appendChild(row);
    list.appendChild(item);
  }
}

// ---------- Import ----------

function renderImportView() {
  const container = el('div', { class: 'view' });
  container.appendChild(backHeader('Новая книга', () => goTab('library')));

  const form = el('div', { class: 'card' });

  const titleInput = el('input', { class: 'input', placeholder: 'Например: Harry Potter — Stephen Fry' });
  form.appendChild(labeled('Название', titleInput));

  const audioInput = el('input', { type: 'file', accept: 'audio/*' });
  form.appendChild(labeled('Аудиофайл', audioInput));

  const textInput = el('input', { type: 'file', accept: '.pdf,.txt,text/plain,application/pdf' });
  form.appendChild(labeled('Текст (PDF или TXT)', textInput));

  const status = el('div', { class: 'muted small' });
  form.appendChild(status);

  const submitBtn = el('button', { class: 'btn btn-primary', text: 'Импортировать' });
  form.appendChild(submitBtn);

  submitBtn.onclick = async () => {
    const title = titleInput.value.trim();
    const audioFile = audioInput.files[0];
    const textFile = textInput.files[0];
    if (!title || !audioFile || !textFile) {
      status.textContent = 'Заполните название и выберите оба файла.';
      status.classList.add('error');
      return;
    }
    submitBtn.disabled = true;
    status.classList.remove('error');
    status.textContent = 'Читаю аудио и определяю паузы (может занять до минуты на длинных файлах)…';

    try {
      const textType = textFile.name.toLowerCase().endsWith('.pdf') ? 'pdf' : 'txt';
      const audioArrayBuffer = await audioFile.arrayBuffer();
      const ranges = await AF.AudioSegmenter.proposeSegments(audioArrayBuffer);

      status.textContent = 'Извлекаю текст…';
      const fullText = await AF.TextExtractor.extractText(textFile, textType);

      const segments = ranges.map((r, i) => ({
        id: crypto.randomUUID(),
        order: i,
        start: r.start,
        end: r.end,
        text: '',
        confirmed: false,
      }));

      const book = {
        id: crypto.randomUUID(),
        title,
        audioBlob: audioFile,
        audioMime: audioFile.type,
        textContent: fullText,
        textType,
        chapters: [{ id: crypto.randomUUID(), title: 'Глава 1', segments }],
        createdAt: new Date().toISOString(),
      };

      await AF.DB.putBook(book);
      status.textContent = `Готово: ${segments.length} фрагментов предложено. Перейдите к разметке.`;
      status.classList.add('success');
      setTimeout(() => goSubview({ name: 'segments', bookId: book.id }), 600);
    } catch (err) {
      console.error(err);
      status.textContent = `Ошибка импорта: ${err.message}`;
      status.classList.add('error');
      submitBtn.disabled = false;
    }
  };

  container.appendChild(form);
  root.appendChild(container);
}

// ---------- Segment editor ----------

async function renderSegmentsView(bookId) {
  const container = el('div', { class: 'view' });
  container.appendChild(backHeader('Разметка', () => goTab('library')));
  root.appendChild(container);

  const book = await AF.DB.getBook(bookId);
  if (!book) {
    container.appendChild(el('p', { class: 'error', text: 'Книга не найдена' }));
    return;
  }

  await setAudioSource(book.audioBlob);

  const toolbar = el('div', { class: 'row space-between' });
  toolbar.appendChild(el('h3', { text: book.title }));
  const fullTextBtn = el('button', { class: 'btn btn-secondary', text: 'Текст книги' });
  toolbar.appendChild(fullTextBtn);
  container.appendChild(toolbar);

  const fullTextPanel = el('div', { class: 'card full-text hidden' });
  fullTextPanel.appendChild(el('pre', { text: book.textContent }));
  container.appendChild(fullTextPanel);
  fullTextBtn.onclick = () => fullTextPanel.classList.toggle('hidden');

  const list = el('div', { class: 'list' });
  container.appendChild(list);

  const segments = book.chapters[0].segments;

  async function persist() {
    await AF.DB.putBook(book);
  }

  segments.forEach((segment) => {
    const row = el('div', { class: 'card segment-row' });

    const head = el('div', { class: 'row space-between' });
    const playBtn = el('button', { class: 'icon-btn', text: '▶' });
    playBtn.onclick = () => engine.playRange(segment.start, segment.end);
    head.appendChild(playBtn);
    head.appendChild(el('span', { class: 'muted small mono', text: `${segment.start.toFixed(1)}s – ${segment.end.toFixed(1)}s (${(segment.end - segment.start).toFixed(1)}s)` }));

    const confirmLabel = el('label', { class: 'checkbox-label' });
    const confirmCheckbox = el('input', { type: 'checkbox' });
    confirmCheckbox.checked = segment.confirmed;
    confirmCheckbox.onchange = async () => {
      segment.confirmed = confirmCheckbox.checked;
      row.classList.toggle('dim', !segment.confirmed);
      await persist();
    };
    confirmLabel.appendChild(confirmCheckbox);
    confirmLabel.appendChild(document.createTextNode(' подтверждено'));
    head.appendChild(confirmLabel);
    row.appendChild(head);

    const adjustRow = el('div', { class: 'row wrap adjust-row' });
    const timeLabel = head.querySelector('.mono');
    function redrawTime() {
      timeLabel.textContent = `${segment.start.toFixed(1)}s – ${segment.end.toFixed(1)}s (${(segment.end - segment.start).toFixed(1)}s)`;
    }
    const adjustBtn = (label, fn) => {
      const b = el('button', { class: 'btn btn-tiny', text: label });
      b.onclick = async () => { fn(); redrawTime(); await persist(); };
      return b;
    };
    adjustRow.appendChild(adjustBtn('начало −0.5с', () => { segment.start = Math.max(0, segment.start - 0.5); }));
    adjustRow.appendChild(adjustBtn('начало +0.5с', () => { segment.start += 0.5; }));
    adjustRow.appendChild(adjustBtn('конец −0.5с', () => { segment.end = Math.max(segment.start + 0.2, segment.end - 0.5); }));
    adjustRow.appendChild(adjustBtn('конец +0.5с', () => { segment.end += 0.5; }));
    row.appendChild(adjustRow);

    const textArea = el('textarea', { class: 'textarea', placeholder: 'Вставьте сюда текст, соответствующий этому фрагменту' });
    textArea.value = segment.text;
    let saveTimeout = null;
    textArea.oninput = () => {
      segment.text = textArea.value;
      clearTimeout(saveTimeout);
      saveTimeout = setTimeout(persist, 400); // debounce writes while typing
    };
    row.appendChild(textArea);

    if (!segment.confirmed) row.classList.add('dim');
    list.appendChild(row);
  });
}

// ---------- Shadowing ----------

async function renderShadowingView(bookId) {
  const container = el('div', { class: 'view' });
  container.appendChild(backHeader('Shadowing', () => goTab('library')));
  root.appendChild(container);

  const book = await AF.DB.getBook(bookId);
  if (!book) {
    container.appendChild(el('p', { class: 'error', text: 'Книга не найдена' }));
    return;
  }
  await setAudioSource(book.audioBlob);

  const confirmed = book.chapters[0].segments.filter((s) => s.confirmed);
  if (confirmed.length === 0) {
    container.appendChild(el('p', { class: 'muted', text: 'Нет подтверждённых фрагментов. Сначала разметьте книгу.' }));
    return;
  }

  let index = 0;
  const textPanel = el('div', { class: 'card shadow-text' });
  container.appendChild(textPanel);

  const speedRow = el('div', { class: 'card' });
  const speedLabel = el('div', { class: 'small muted' });
  const speedSlider = el('input', { type: 'range', min: '0.5', max: '1.25', step: '0.05', value: '1' });
  speedRow.appendChild(speedLabel);
  speedRow.appendChild(speedSlider);
  container.appendChild(speedRow);
  speedSlider.oninput = () => {
    engine.rate = parseFloat(speedSlider.value);
    speedLabel.textContent = `Скорость: ${engine.rate.toFixed(2)}x`;
  };
  engine.rate = 1;
  speedLabel.textContent = 'Скорость: 1.00x';

  const controls = el('div', { class: 'row wrap' });
  const loopBtn = el('button', { class: 'btn btn-secondary', text: '🔁 A–B Loop' });
  const onceBtn = el('button', { class: 'btn btn-secondary', text: '▶ Прослушать раз' });
  const stopBtn = el('button', { class: 'btn btn-secondary', text: '⏹ Стоп' });
  controls.appendChild(loopBtn);
  controls.appendChild(onceBtn);
  controls.appendChild(stopBtn);
  container.appendChild(controls);

  const recordSection = el('div', { class: 'card' });
  container.appendChild(recordSection);

  const navRow = el('div', { class: 'row space-between' });
  const prevBtn = el('button', { class: 'btn btn-secondary', text: '← Предыдущий' });
  const posLabel = el('span', { class: 'muted small' });
  const nextBtn = el('button', { class: 'btn btn-secondary', text: 'Следующий →' });
  navRow.appendChild(prevBtn);
  navRow.appendChild(posLabel);
  navRow.appendChild(nextBtn);
  container.appendChild(navRow);

  function currentSegment() { return confirmed[index]; }

  function drawSegment() {
    const seg = currentSegment();
    textPanel.textContent = seg.text || '(текст не добавлен для этого фрагмента)';
    posLabel.textContent = `${index + 1} / ${confirmed.length}`;
    prevBtn.disabled = index === 0;
    nextBtn.disabled = index === confirmed.length - 1;
    engine.stop();
    drawRecordSection();
  }

  loopBtn.onclick = () => {
    const seg = currentSegment();
    engine.setLoop(seg.start, seg.end);
    engine.play(seg.start);
  };
  onceBtn.onclick = () => {
    const seg = currentSegment();
    engine.playRange(seg.start, seg.end);
  };
  stopBtn.onclick = () => engine.stop();

  prevBtn.onclick = () => { if (index > 0) { index -= 1; drawSegment(); } };
  nextBtn.onclick = () => { if (index < confirmed.length - 1) { index += 1; drawSegment(); } };

  function drawRecordSection() {
    recordSection.innerHTML = '';
    if (recorder.isRecording) {
      const timeLabel = el('div', { class: 'mono', text: 'Запись… 0.0s' });
      recorder.onTick = (sec) => { timeLabel.textContent = `Запись… ${sec.toFixed(1)}s`; };
      recordSection.appendChild(timeLabel);
      const stopRecBtn = el('button', { class: 'btn btn-danger', text: '⏹ Остановить запись' });
      stopRecBtn.onclick = async () => {
        const { blob, mime, duration } = await recorder.stop();
        const seg = currentSegment();
        await AF.DB.addRecording({
          id: crypto.randomUUID(),
          bookId: book.id,
          chapterId: book.chapters[0].id,
          segmentId: seg.id,
          blob, mime, duration,
          date: new Date().toISOString(),
        });
        await AF.DB.logPractice(duration, 1);
        drawRecordSection();
      };
      recordSection.appendChild(stopRecBtn);
    } else {
      const startRecBtn = el('button', { class: 'btn btn-primary', text: '🎙 Записать своё чтение' });
      startRecBtn.onclick = async () => {
        try {
          await recorder.start();
          drawRecordSection();
        } catch (err) {
          alert('Нет доступа к микрофону: ' + err.message);
        }
      };
      recordSection.appendChild(startRecBtn);
    }
  }

  drawSegment();
}

// ---------- Recordings ----------

async function renderRecordingsView() {
  const container = el('div', { class: 'view' });
  container.appendChild(el('h2', { text: 'Записи' }));
  root.appendChild(container);

  const [recordings, books] = await Promise.all([AF.DB.getAllRecordings(), AF.DB.getAllBooks()]);
  const bookById = Object.fromEntries(books.map((b) => [b.id, b]));

  if (recordings.length === 0) {
    container.appendChild(el('p', { class: 'muted', text: 'Пока нет записей.' }));
    return;
  }

  const grouped = {};
  for (const rec of recordings) {
    (grouped[rec.bookId] = grouped[rec.bookId] || []).push(rec);
  }

  let currentlyPlayingAudio = null;

  for (const [bookId, recs] of Object.entries(grouped)) {
    const book = bookById[bookId];
    const section = el('div', { class: 'card' });
    section.appendChild(el('h3', { text: book ? book.title : 'Неизвестная книга' }));

    recs.sort((a, b) => new Date(b.date) - new Date(a.date));
    for (const rec of recs) {
      const segment = book?.chapters?.[0]?.segments.find((s) => s.id === rec.segmentId);
      const row = el('div', { class: 'row space-between recording-row' });
      const label = el('div', {});
      label.appendChild(el('div', { class: 'small', text: segment?.text ? truncate(segment.text, 60) : '(без текста)' }));
      label.appendChild(el('div', { class: 'muted small', text: `${new Date(rec.date).toLocaleString()} · ${rec.duration.toFixed(1)}s` }));
      row.appendChild(label);

      const btnGroup = el('div', { class: 'row' });
      const playBtn = el('button', { class: 'icon-btn', text: '▶' });
      playBtn.onclick = () => {
        if (currentlyPlayingAudio) currentlyPlayingAudio.pause();
        const url = URL.createObjectURL(rec.blob);
        const a = new Audio(url);
        a.play();
        currentlyPlayingAudio = a;
      };
      const delBtn = el('button', { class: 'icon-btn', text: '🗑' });
      delBtn.onclick = async () => {
        await AF.DB.deleteRecording(rec.id);
        renderRecordingsView();
      };
      btnGroup.appendChild(playBtn);
      btnGroup.appendChild(delBtn);
      row.appendChild(btnGroup);

      section.appendChild(row);
    }
    container.appendChild(section);
  }
}

// ---------- Stats ----------

async function renderStatsView() {
  const container = el('div', { class: 'view' });
  container.appendChild(el('h2', { text: 'Статистика' }));
  root.appendChild(container);

  const stats = await AF.DB.getStats();
  const streak = AF.computeStreak(stats);
  const totalMinutes = Math.round(stats.dailyLogs.reduce((s, l) => s + l.practiceSeconds, 0) / 60);

  const summary = el('div', { class: 'card' });
  summary.appendChild(statRow('Текущая серия', `${streak} дн.`));
  summary.appendChild(statRow('Дней с практикой', `${stats.dailyLogs.length}`));
  summary.appendChild(statRow('Всего фрагментов прочитано', `${stats.totalSegmentsCompleted}`));
  summary.appendChild(statRow('Общее время практики', `${totalMinutes} мин`));
  container.appendChild(summary);

  const daysCard = el('div', { class: 'card' });
  daysCard.appendChild(el('h3', { text: 'По дням' }));
  const sorted = [...stats.dailyLogs].sort((a, b) => (a.dateKey < b.dateKey ? 1 : -1));
  for (const log of sorted) {
    daysCard.appendChild(statRow(log.dateKey, `${log.segmentsCompleted} фрагм. · ${Math.round(log.practiceSeconds / 60)} мин`));
  }
  container.appendChild(daysCard);
}

function statRow(label, value) {
  const row = el('div', { class: 'row space-between stat-row' });
  row.appendChild(el('span', { text: label }));
  row.appendChild(el('span', { class: 'muted', text: value }));
  return row;
}

// ---------- small DOM helpers ----------

function el(tag, opts = {}) {
  const node = document.createElement(tag);
  if (opts.class) node.className = opts.class;
  if (opts.text !== undefined) node.textContent = opts.text;
  if (opts.type) node.type = opts.type;
  if (opts.placeholder) node.placeholder = opts.placeholder;
  if (opts.min !== undefined) node.min = opts.min;
  if (opts.max !== undefined) node.max = opts.max;
  if (opts.step !== undefined) node.step = opts.step;
  if (opts.value !== undefined) node.value = opts.value;
  if (opts.accept) node.accept = opts.accept;
  return node;
}

function labeled(labelText, inputEl) {
  const wrap = el('div', { class: 'field' });
  wrap.appendChild(el('label', { class: 'field-label', text: labelText }));
  wrap.appendChild(inputEl);
  return wrap;
}

function backHeader(title, onBack) {
  const header = el('div', { class: 'row' });
  const backBtn = el('button', { class: 'btn btn-secondary', text: '← Назад' });
  backBtn.onclick = onBack;
  header.appendChild(backBtn);
  header.appendChild(el('h2', { text: title }));
  return header;
}

function truncate(str, n) {
  return str.length > n ? str.slice(0, n) + '…' : str;
}

// ---------- tab bar wiring ----------

document.querySelectorAll('.tab-btn').forEach((btn) => {
  btn.addEventListener('click', () => goTab(btn.dataset.tab));
});

render();
})();
