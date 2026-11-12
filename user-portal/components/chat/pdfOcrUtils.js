let pdfjsPromise = null;

export const loadPdfJs = () => {
  if (pdfjsPromise) return pdfjsPromise;
  pdfjsPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('Window is not defined'));
      return;
    }
    if (window.pdfjsLib) {
      resolve(window.pdfjsLib);
      return;
    }
    const script = document.createElement('script');
    script.src =
      'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    script.onload = () => {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc =
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      resolve(window.pdfjsLib);
    };
    script.onerror = (err) => {
      pdfjsPromise = null;
      reject(err);
    };
    document.head.appendChild(script);
  });
  return pdfjsPromise;
};

export const extractTextFromPdf = async (arrayBuffer) => {
  const pdfjs = await loadPdfJs();
  const loadingTask = pdfjs.getDocument({ data: new Uint8Array(arrayBuffer) });
  const pdf = await loadingTask.promise;
  let fullText = '';
  const pages = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map((item) => item.str).join(' ');
    pages.push({ pageNumber: i, text: pageText });
    fullText += `--- Page ${i} ---\n${pageText}\n\n`;
  }
  if (!fullText.trim()) {
    fullText = '[Empty PDF document or scanned PDF with no extractable text]';
  }
  return { fullText, pageCount: pdf.numPages, pages };
};

let tesseractPromise = null;

export const loadTesseract = () => {
  if (tesseractPromise) return tesseractPromise;
  tesseractPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('Window is not defined'));
      return;
    }
    if (window.Tesseract) {
      resolve(window.Tesseract);
      return;
    }
    const script = document.createElement('script');
    script.src =
      'https://cdn.jsdelivr.net/npm/tesseract.js@5.0.5/dist/tesseract.min.js';
    script.onload = () => {
      resolve(window.Tesseract);
    };
    script.onerror = (err) => {
      tesseractPromise = null;
      reject(err);
    };
    document.head.appendChild(script);
  });
  return tesseractPromise;
};

export const cleanOcrText = (raw) => {
  if (!raw) return '';
  return raw
    .replace(/[|\\]+/g, ' ')
    .replace(/[[\]{}~^`]+/g, ' ')
    .replace(/\s+[^a-zA-Z0-9\s.,?!%$@#\-_]{1,3}\s+/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n+/g, '\n')
    .trim();
};

export const extractTextFromImage = async (dataUrl) => {
  const tesseract = await loadTesseract();
  const worker = await tesseract.createWorker('eng');
  const ret = await worker.recognize(dataUrl);
  await worker.terminate();
  const text = (ret.data.text || '').trim();
  if (!text) {
    return '[No extractable text found in image]';
  }
  return cleanOcrText(text);
};

