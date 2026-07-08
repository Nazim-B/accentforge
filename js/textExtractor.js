// textExtractor.js — same deliberately dumb philosophy as the Swift version:
// pulls raw text out of TXT/PDF, no chapter/layout detection. The user reviews
// the "Full text" panel and manually copies the right chunk into each segment.
'use strict';

const AF = window.AF || {};
window.AF = AF;

AF.TextExtractor = {
  async extractText(file, textType) {
    if (textType === 'txt') {
      return this._extractTxt(file);
    }
    return this._extractPdf(file);
  },

  async _extractTxt(file) {
    return await file.text();
  },

  async _extractPdf(file) {
    if (!window.pdfjsLib) {
      throw new Error('pdf.js не загружен (vendor/pdf.min.js)');
    }
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = window.pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    let fullText = '';
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const content = await page.getTextContent();
      const pageText = content.items.map((item) => item.str).join(' ');
      fullText += pageText + '\n\n';
    }
    if (!fullText.trim()) {
      throw new Error('Не удалось извлечь текст из PDF (возможно, это скан без текстового слоя)');
    }
    return fullText;
  },
};
