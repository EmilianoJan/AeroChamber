(function () {
  const U = window.AeroUtil;
  const KEY_ITEMS = 'aero.report.items';
  const KEY_TITLE = 'aero.report.title';
  const JSPDF_SRC = 'lib/jspdf.umd.min.js';

  let items = U.readJSON(KEY_ITEMS, []);
  let title = localStorage.getItem(KEY_TITLE) || 'Informe de experimento';
  let saveTimer = null;

  const newId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

  const save = () => {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      U.writeJSON(KEY_ITEMS, items);
      try {
        localStorage.setItem(KEY_TITLE, title);
      } catch (e) {
        U.toast('No se pudo guardar el título del informe.', true);
      }
    }, 300);
  };

  const timestamp = () => U.fmtLocal(Date.now());

  const addPlot = ({ title: plotTitle, png, w, h, summary }) => {
    items.push({ id: newId(), type: 'image', title: plotTitle, png, w, h, summary, added: timestamp() });
    if (!U.writeJSON(KEY_ITEMS, items)) {
      items.pop();
      return false;
    }
    render();
    U.toast('Gráfico agregado al informe.');
    return true;
  };

  const addText = (text) => {
    items.push({ id: newId(), type: 'text', text: text || '', added: timestamp() });
    save();
    render();
  };

  const move = (idx, delta) => {
    const j = idx + delta;
    if (j < 0 || j >= items.length) return;
    [items[idx], items[j]] = [items[j], items[idx]];
    save();
    render();
  };

  const remove = (idx) => {
    items.splice(idx, 1);
    save();
    render();
  };

  const iconBtn = (label, aria, onClick) => U.el('button', { class: 'icon-btn', type: 'button', 'aria-label': aria, text: label, onclick: onClick });

  const render = () => {
    const list = U.$('#report-list');
    list.textContent = '';
    if (!items.length) {
      list.appendChild(U.el('p', { class: 'hint', text: 'El informe está vacío. Usa "Agregar texto" o el botón 📝 de un gráfico.' }));
      return;
    }

    items.forEach((item, idx) => {
      const head = U.el('div', { class: 'report-item-head' }, [
        U.el('span', { class: 'hint', text: `${idx + 1}. ${item.type === 'image' ? item.title : 'Texto'} · ${item.added || ''}` }),
        U.el('div', { class: 'btn-row compact' }, [
          iconBtn('↑', 'Subir', () => move(idx, -1)),
          iconBtn('↓', 'Bajar', () => move(idx, 1)),
          iconBtn('✕', 'Eliminar', () => {
            if (confirm('¿Eliminar este elemento del informe?')) remove(idx);
          }),
        ]),
      ]);

      const body = [];
      if (item.type === 'image') {
        body.push(U.el('img', { class: 'report-thumb', src: item.png, alt: item.title }));
        if (item.summary) body.push(U.el('pre', { class: 'summary', text: item.summary }));
      } else {
        const ta = U.el('textarea', { class: 'report-text', rows: '4', placeholder: 'Escribe aquí...' });
        ta.value = item.text;
        ta.addEventListener('input', () => {
          item.text = ta.value;
          save();
        });
        body.push(ta);
      }

      list.appendChild(U.el('div', { class: 'report-item' }, [head, ...body]));
    });
  };

  const pdfLib = async () => {
    if (!(window.jspdf && window.jspdf.jsPDF)) {
      await U.loadScript(JSPDF_SRC);
    }
    return window.jspdf.jsPDF;
  };

  const buildPdf = async () => {
    const JsPDF = await pdfLib();
    const doc = new JsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait', compress: true });
    const margin = 15;
    const maxW = 210 - margin * 2;
    const bottom = 297 - margin;
    let y = margin;

    const ensure = (h) => {
      if (y + h > bottom) {
        doc.addPage();
        y = margin;
      }
    };

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.splitTextToSize(title, maxW).forEach((line) => {
      ensure(9);
      doc.text(line, margin, y + 5);
      y += 9;
    });
    y += 3;

    items.forEach((item) => {
      if (item.type === 'image') {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        ensure(8);
        doc.text(item.title, margin, y + 4);
        y += 8;

        let w = maxW;
        let h = (maxW * item.h) / item.w;
        if (h > 150) {
          h = 150;
          w = (150 * item.w) / item.h;
        }
        ensure(h + 2);
        doc.addImage(item.png, 'PNG', margin, y, w, h);
        y += h + 3;

        if (item.summary) {
          doc.setFont('courier', 'normal');
          doc.setFontSize(9);
          doc.splitTextToSize(item.summary, maxW).forEach((line) => {
            ensure(5);
            doc.text(line, margin, y + 3.5);
            y += 4.5;
          });
        }
        y += 6;
      } else if (item.text) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(11);
        item.text.split(/\r?\n/).forEach((paragraph) => {
          const lines = paragraph ? doc.splitTextToSize(paragraph, maxW) : [''];
          lines.forEach((line) => {
            ensure(6);
            doc.text(line, margin, y + 4.5);
            y += 6;
          });
        });
        y += 4;
      }
    });

    return doc.output('blob');
  };

  const buildFilename = (ext) => `informe_${U.fmtFile(Date.now())}.${ext}`;

  const exportPdf = async () => {
    if (!items.length) return U.toast('El informe está vacío.', true);
    try {
      const blob = await buildPdf();
      await U.deliverBlob(blob, buildFilename('pdf'), title);
    } catch (e) {
      U.toast('No se pudo generar el PDF: ' + e.message, true);
    }
  };

  const exportDocx = async () => {
    if (!items.length) return U.toast('El informe está vacío.', true);
    try {
      const blob = window.AeroDocx.build({ title, items });
      await U.deliverBlob(blob, buildFilename('docx'), title);
    } catch (e) {
      U.toast('No se pudo generar el Word: ' + e.message, true);
    }
  };

  const init = () => {
    const titleInput = U.$('#report-title');
    titleInput.value = title;
    titleInput.addEventListener('input', () => {
      title = titleInput.value;
      save();
    });

    U.$('#report-add-text').addEventListener('click', () => addText(''));
    U.$('#report-pdf').addEventListener('click', exportPdf);
    U.$('#report-docx').addEventListener('click', exportDocx);
    U.$('#report-clear').addEventListener('click', () => {
      if (!items.length) return;
      if (confirm('¿Borrar todo el informe?')) {
        items = [];
        save();
        render();
      }
    });
    render();
  };

  window.AeroReport = { init, addPlot, addText };
})();
