(function () {
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  const el = (tag, attrs, children) => {
    const node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach((k) => {
        if (k === 'text') node.textContent = attrs[k];
        else if (k === 'html') node.innerHTML = attrs[k];
        else if (k.startsWith('on')) node.addEventListener(k.slice(2), attrs[k]);
        else node.setAttribute(k, attrs[k]);
      });
    }
    (children || []).forEach((c) => node.appendChild(c));
    return node;
  };

  const pad = (n, w) => String(n).padStart(w || 2, '0');

  const fmtLocal = (ms) => {
    const d = new Date(ms);
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  };

  const fmtLocalMs = (ms) => `${fmtLocal(ms)}.${pad(new Date(ms).getMilliseconds(), 3)}`;

  const fmtAxis = (sec) => {
    const d = new Date(sec * 1000);
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  };

  const fmtFile = (ms) => {
    const d = new Date(ms);
    return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
  };

  const fmtNum = (v, decimals) => (v == null || !Number.isFinite(v) ? '—' : v.toFixed(decimals == null ? 1 : decimals));

  const readJSON = (key, fallback) => {
    try {
      const raw = localStorage.getItem(key);
      return raw == null ? fallback : JSON.parse(raw);
    } catch (e) {
      return fallback;
    }
  };

  const writeJSON = (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      toast('No se pudo guardar en el almacenamiento del navegador (¿lleno?).', true);
      return false;
    }
  };

  const readNumber = (key, fallback) => {
    const v = parseFloat(localStorage.getItem(key));
    return Number.isFinite(v) ? v : fallback;
  };

  let toastTimer = null;
  const toast = (msg, isError) => {
    const node = $('#toast');
    if (!node) return;
    node.textContent = msg;
    node.classList.toggle('error', !!isError);
    node.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => node.classList.remove('show'), 2800);
  };

  const deliverBlob = async (blob, filename, title) => {
    const file = typeof File === 'function' ? new File([blob], filename, { type: blob.type }) : null;
    if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: title || filename });
        return;
      } catch (e) {
        if (e && e.name === 'AbortError') return;
      }
    }
    const url = URL.createObjectURL(blob);
    const a = el('a', { href: url, download: filename });
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  };

  const loadScript = (src) =>
    new Promise((resolve, reject) => {
      const s = el('script', { src });
      s.onload = () => resolve();
      s.onerror = () => reject(new Error('No se pudo cargar ' + src));
      document.head.appendChild(s);
    });

  window.AeroUtil = {
    $, $$, el, pad, fmtLocal, fmtLocalMs, fmtAxis, fmtFile, fmtNum,
    readJSON, writeJSON, readNumber, toast, deliverBlob, loadScript,
  };
})();
