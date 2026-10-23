(function () {
  const U = window.AeroUtil;
  const $ = U.$;
  const $$ = U.$$;

  const POLL_MS = 200;
  const FETCH_TIMEOUT_MS = 1500;
  const MAX_SAMPLES = 60000;
  const TARE_WINDOW = 10;
  const TARE_MIN = 3;
  const SAVE_EVERY_MS = 3000;
  const RUN_COLORS = ['#38bdf8', '#f97316', '#a3e635', '#e879f9', '#facc15', '#f43f5e', '#2dd4bf', '#818cf8'];
  const TICK_COLOR = '#94a3b8';
  const GRID_COLOR = '#1e293b';

  const round = (v, d) => Math.round(v * 10 ** d) / 10 ** d;
  const corrected = (p1, p2) => p1 - p2 - state.offset + state.constant;
  const elapsed = (r) => ((r.end !== null ? r.end : Date.now()) - r.start) / 1000;
  const activeRun = () => state.runs.find((r) => r.end === null) || null;

  const hexToRgba = (hex, a) => {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
  };

  const emptyData = (xTime, n) => {
    const t = Date.now() / 1000;
    return [xTime ? [t - 60, t] : [0, 60], ...Array.from({ length: n }, () => [null, null])];
  };

  const state = {
    samples: [],
    recent: [],
    paused: false,
    offset: U.readNumber('aero.tare.offset', 0),
    constant: U.readNumber('aero.tare.constant', 0),
    runs: (() => {
      const r = U.readJSON('aero.runs', []);
      return Array.isArray(r) ? r : [];
    })(),
    runMode: localStorage.getItem('aero.runMode') === 'fade' ? 'fade' : 'distinct',
    latest: null,
    view: 'monitor',
    dirtyMonitor: true,
    dirtyRuns: true,
    listDirty: true,
    lastListRender: 0,
    runsDirty: false,
    lastFlush: 0,
  };

  class Chart {
    constructor(host, cfg) {
      this.host = host;
      this.cfg = cfg;
      this.u = null;
      this.sig = null;
      this.data = null;
      this.seriesCfg = [];
      this.zoomed = false;
      this.programmatic = false;
      if (typeof ResizeObserver === 'function') {
        this.ro = new ResizeObserver(() => this.resize());
        this.ro.observe(host);
      }
    }

    dims() {
      const w = this.host.clientWidth;
      const h = this.host.clientHeight;
      return { width: w > 0 ? w : 320, height: h > 0 ? Math.max(140, h - 40) : 220 };
    }

    render(sig, cfgs, data) {
      this.seriesCfg = cfgs;
      this.data = data;
      if (!this.u || sig !== this.sig) {
        this.destroy();
        this.sig = sig;
        this.zoomed = false;
        this.create(cfgs, data);
      } else {
        this.u.setData(data, false);
      }
      this.applyRanges();
    }

    create(cfgs, data) {
      const d = this.dims();
      const { xTime, xLabel, yLabel, decimals } = this.cfg;
      const dec = decimals == null ? 1 : decimals;
      const grid = { stroke: GRID_COLOR, width: 1 };
      const ticks = { stroke: GRID_COLOR, width: 1 };

      const xAxis = { label: xLabel, size: 44, space: 90, stroke: TICK_COLOR, grid, ticks };
      if (xTime) xAxis.values = (u, vals) => vals.map((v) => U.fmtAxis(v));

      const yAxis = {
        label: yLabel,
        size: 70,
        stroke: TICK_COLOR,
        grid,
        ticks,
        values: (u, vals) => vals.map((v) => (Math.abs(v) >= 1000 ? v.toFixed(0) : v.toFixed(dec))),
      };

      const series = [
        {
          label: xLabel,
          value: (u, v) => (v == null ? '—' : xTime ? U.fmtLocal(v * 1000) : `${v.toFixed(1)} s`),
        },
      ];
      cfgs.forEach((c) =>
        series.push({
          label: c.label,
          stroke: c.color,
          width: c.width || 1.8,
          spanGaps: true,
          points: { show: false },
          value: (u, v) => (v == null ? '—' : `${v.toFixed(dec)} Pa`),
        })
      );

      const opts = {
        width: d.width,
        height: d.height,
        legend: { show: true },
        scales: { x: { time: !!xTime } },
        axes: [xAxis, yAxis],
        series,
        hooks: {
          setScale: [
            (u, key) => {
              if (key === 'x' && !this.programmatic) this.zoomed = true;
            },
          ],
        },
      };

      this.u = new uPlot(opts, data, this.host);
      this.u.over.addEventListener('dblclick', () => this.resetZoom());
    }

    applyRanges() {
      const u = this.u;
      const d = this.data;
      if (!u || !d || !d[0].length) return;
      const xs = d[0];
      this.programmatic = true;
      try {
        if (!this.zoomed) {
          const x0 = xs[0];
          const x1 = xs[xs.length - 1];
          u.setScale('x', { min: x0, max: x1 > x0 ? x1 : x0 + 1 });
        }
        let lo = Infinity;
        let hi = -Infinity;
        for (let i = 1; i < d.length; i++) {
          const ys = d[i];
          for (let j = 0; j < ys.length; j++) {
            const v = ys[j];
            if (v == null) continue;
            if (v < lo) lo = v;
            if (v > hi) hi = v;
          }
        }
        if (!Number.isFinite(lo)) {
          lo = -1;
          hi = 1;
        }
        const span = hi - lo;
        const pad = span > 1e-9 ? span * 0.08 : 1;
        u.setScale('y', { min: lo - pad, max: hi + pad });
      } finally {
        this.programmatic = false;
      }
    }

    resetZoom() {
      this.zoomed = false;
      this.applyRanges();
    }

    resize() {
      if (!this.u || this.host.clientWidth === 0) return;
      const d = this.dims();
      this.u.setSize({ width: d.width, height: d.height });
    }

    destroy() {
      if (this.u) this.u.destroy();
      this.u = null;
      this.sig = null;
    }

    summaryLines() {
      const lines = [`Capturado: ${U.fmtLocal(Date.now())}`];
      if (!this.u || !this.data || !this.data[0].length) return lines;
      const x0 = this.u.scales.x.min;
      const x1 = this.u.scales.x.max;
      const dec = this.cfg.decimals == null ? 1 : this.cfg.decimals;
      lines.push(
        this.cfg.xTime
          ? `Ventana: ${U.fmtLocal(x0 * 1000)} → ${U.fmtLocal(x1 * 1000)}`
          : `Ventana: ${x0.toFixed(1)} s → ${x1.toFixed(1)} s`
      );
      const xs = this.data[0];
      this.seriesCfg.forEach((s, i) => {
        const ys = this.data[i + 1];
        let mn = Infinity;
        let mx = -Infinity;
        let last = null;
        for (let j = 0; j < xs.length; j++) {
          const v = ys[j];
          if (xs[j] < x0 || xs[j] > x1 || v == null) continue;
          if (v < mn) mn = v;
          if (v > mx) mx = v;
          last = v;
        }
        lines.push(
          last == null
            ? `${s.label}: sin datos en la ventana`
            : `${s.label}: mín ${mn.toFixed(dec)} · máx ${mx.toFixed(dec)} · última ${last.toFixed(dec)} Pa`
        );
      });
      return lines;
    }

    snapshot() {
      if (!this.u) return null;
      const src = this.u.ctx.canvas;
      const pr = this.u.pxRatio || 1;
      const pad = 14 * pr;
      const measure = document.createElement('canvas').getContext('2d');
      const legendFont = `${Math.round(15 * pr)}px system-ui, sans-serif`;
      const titleFont = `600 ${Math.round(20 * pr)}px system-ui, sans-serif`;
      const monoFont = `${Math.round(14 * pr)}px ui-monospace, monospace`;

      measure.font = legendFont;
      const rows = [[]];
      let rowW = pad;
      this.seriesCfg.forEach((s) => {
        const w = measure.measureText(s.label).width + 40 * pr;
        if (rowW + w > src.width - pad && rows[rows.length - 1].length) {
          rows.push([]);
          rowW = pad;
        }
        rows[rows.length - 1].push(s);
        rowW += w;
      });

      const lines = this.summaryLines();
      const headH = (48 + rows.length * 22 + 6) * pr;
      const footH = (lines.length * 22 + 14) * pr;

      const c = document.createElement('canvas');
      c.width = src.width;
      c.height = headH + src.height + footH;
      const g = c.getContext('2d');
      g.fillStyle = '#0f172a';
      g.fillRect(0, 0, c.width, c.height);

      g.fillStyle = '#e2e8f0';
      g.font = titleFont;
      g.fillText(this.cfg.title, pad, 28 * pr);

      g.font = legendFont;
      rows.forEach((row, r) => {
        let x = pad;
        const y = (48 + r * 22) * pr;
        row.forEach((s) => {
          g.fillStyle = s.color;
          g.fillRect(x, y - 11 * pr, 12 * pr, 10 * pr);
          g.fillStyle = '#cbd5e1';
          g.fillText(s.label, x + 18 * pr, y);
          x += g.measureText(s.label).width + 40 * pr;
        });
      });

      g.drawImage(src, 0, headH);

      g.font = monoFont;
      g.fillStyle = '#cbd5e1';
      lines.forEach((ln, i) => g.fillText(ln, pad, headH + src.height + (i + 1) * 22 * pr + 4 * pr));
      return c;
    }

    csvBlob() {
      if (!this.data || !this.data[0].length) return null;
      const { xTime, xCsv } = this.cfg;
      const xs = this.data[0];
      const esc = (s) => (/[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
      const rows = [];
      for (let j = 0; j < xs.length; j++) {
        let any = false;
        const vals = [];
        for (let i = 1; i < this.data.length; i++) {
          const v = this.data[i][j];
          if (v != null) any = true;
          vals.push(v == null ? '' : v.toFixed(2));
        }
        if (!any) continue;
        const xCell = xTime ? U.fmtLocalMs(xs[j] * 1000) : xs[j].toFixed(2);
        rows.push([xCell, ...vals].join(','));
      }
      if (!rows.length) return null;
      const header = [xCsv, ...this.seriesCfg.map((s) => `${s.label} [Pa]`)].map(esc).join(',');
      return new Blob(['\uFEFF' + [header, ...rows].join('\r\n')], { type: 'text/csv;charset=utf-8' });
    }
  }

  const RAW_SERIES = [{ label: 'Sensor 1 (P1)', color: '#38bdf8' }, { label: 'Sensor 2 (P2)', color: '#f97316' }];
  const DIFF_SERIES = [{ label: 'P1 − P2 corregida', color: '#a3e635' }];

  let rawChart;
  let diffChart;
  let runsChart;
  const CHARTS = {};

  const setConn = (ok, text) => {
    const c = $('#conn');
    c.textContent = text;
    c.className = 'conn ' + (ok ? 'ok' : 'bad');
  };

  const renderReadouts = () => {
    const l = state.latest;
    $('#m-p1').textContent = l ? U.fmtNum(l.p1, 1) : '—';
    $('#m-p2').textContent = l ? U.fmtNum(l.p2, 1) : '—';
    $('#m-diff').textContent = l ? U.fmtNum(corrected(l.p1, l.p2), 2) : '—';
  };

  const renderTare = () => {
    $('#tare-status').textContent =
      state.offset === 0 ? 'Sin tarar (offset 0 Pa)' : `Offset actual: ${state.offset.toFixed(2)} Pa`;
    renderReadouts();
  };

  const markDirty = () => {
    state.dirtyMonitor = true;
    state.dirtyRuns = true;
    state.listDirty = true;
  };

  const onSensors = (list) => {
    const s1 = list.find((s) => s.sensorId === 1);
    const s2 = list.find((s) => s.sensorId === 2);
    const ok = !!(
      s1 && s2 && s1.valid && s2.valid && Number.isFinite(s1.pressurePa) && Number.isFinite(s2.pressurePa)
    );
    state.latest = ok ? { p1: s1.pressurePa, p2: s2.pressurePa } : null;
    renderReadouts();
    if (!ok) return;

    const { p1, p2 } = state.latest;
    const now = Date.now();

    state.recent.push(p1 - p2);
    if (state.recent.length > TARE_WINDOW) state.recent.shift();

    if (!state.paused) {
      state.samples.push({ ts: now, p1, p2 });
      if (state.samples.length > MAX_SAMPLES) state.samples.splice(0, state.samples.length - MAX_SAMPLES);
      renderMonitor();
    }

    const run = activeRun();
    if (run) {
      run.pts.push([round((now - run.start) / 1000, 3), round(p1, 2), round(p2, 2)]);
      state.runsDirty = true;
      renderRuns();
    }
  };

  const poll = async () => {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
    try {
      const res = await fetch('/api/sensors', { cache: 'no-store', signal: ctrl.signal });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const body = await res.json();
      setConn(true, 'Conectado');
      onSensors(Array.isArray(body.sensors) ? body.sensors : []);
    } catch (e) {
      setConn(false, 'Sin conexión con el sensor');
      state.latest = null;
      renderReadouts();
    } finally {
      clearTimeout(timer);
      setTimeout(poll, POLL_MS);
    }
  };

  const monitorData = () => {
    const s = state.samples;
    if (!s.length) return null;
    return {
      raw: [s.map((v) => v.ts / 1000), s.map((v) => v.p1), s.map((v) => v.p2)],
      diff: [s.map((v) => v.ts / 1000), s.map((v) => corrected(v.p1, v.p2))],
    };
  };

  const renderMonitor = () => {
    const d = monitorData();
    if (!d) {
      rawChart.render('raw', RAW_SERIES, emptyData(true, 2));
      diffChart.render('diff', DIFF_SERIES, emptyData(true, 1));
    } else {
      rawChart.render('raw', RAW_SERIES, d.raw);
      diffChart.render('diff', DIFF_SERIES, d.diff);
    }
    rawChart.resetZoom();
    diffChart.resetZoom();
    
  };

  const runsData = (visible) => {
    if (!visible.length) return emptyData(false, 0);
    const keys = new Set();
    visible.forEach((r) => r.pts.forEach((p) => keys.add(Math.round(p[0] * 100))));
    const times = Array.from(keys).sort((a, b) => a - b);
    if (!times.length) return emptyData(false, visible.length);
    const index = new Map(times.map((k, i) => [k, i]));
    const cols = visible.map((r) => {
      const col = new Array(times.length).fill(null);
      r.pts.forEach((p) => {
        col[index.get(Math.round(p[0] * 100))] = corrected(p[1], p[2]);
      });
      return col;
    });
    return [times.map((k) => k / 100), ...cols];
  };

  const renderRuns = () => {
    const visible = state.runs.filter((r) => r.visible);
    const newest = state.runs.length ? state.runs[state.runs.length - 1].id : '';
    const cfgs = visible.map((r) => {
      if (state.runMode === 'fade') {
        return r.id === newest
          ? { label: r.name, color: r.color, width: 2.4 }
          : { label: r.name, color: hexToRgba(r.color, 0.28), width: 1.2 };
      }
      return { label: r.name, color: r.color, width: 2.2 };
    });
    const sig = ['runs', state.runMode, state.runMode === 'fade' ? newest : '', visible.map((r) => r.id).join(',')].join('|');
    runsChart.render(sig, cfgs, runsData(visible));
    runsChart.resetZoom();
  };

  const flushRuns = () => {
    state.runsDirty = false;
    state.lastFlush = Date.now();
    U.writeJSON('aero.runs', state.runs);
  };

  const renderRunList = () => {
    state.listDirty = false;
    state.lastListRender = Date.now();
    const list = $('#run-list');
    const active = activeRun();
    $('#run-status').textContent = active
      ? `Lapso activo: ${active.name} · ${elapsed(active).toFixed(1)} s`
      : 'Sin lapso activo';

    list.textContent = '';
    if (!state.runs.length) {
      list.appendChild(U.el('p', { class: 'hint', text: 'Todavía no hay lapsos. Toca "Nuevo lapso" para empezar.' }));
      return;
    }
    state.runs.forEach((r) => {
      const cb = U.el('input', { type: 'checkbox' });
      cb.checked = r.visible;
      cb.addEventListener('change', () => {
        r.visible = cb.checked;
        state.runsDirty = true;
        state.dirtyRuns = true;
      });
      list.appendChild(
        U.el('label', { class: 'run-item' }, [
          cb,
          U.el('span', { class: 'swatch', style: `background:${r.color}` }),
          U.el('span', { class: 'run-name', text: r.name }),
          U.el('span', { class: 'hint', text: `${elapsed(r).toFixed(1)} s · ${r.pts.length} pts` }),
        ])
      );
    });
  };

  const commitRuns = () => {
    state.dirtyRuns = true;
    flushRuns();
    renderRunList();
  };

  const startRun = () => {
    const now = Date.now();
    const current = activeRun();
    if (current) current.end = now;
    const n = state.runs.length + 1;
    state.runs.push({
      id: `r${now.toString(36)}`,
      name: `Lapso ${n}`,
      color: RUN_COLORS[(n - 1) % RUN_COLORS.length],
      start: now,
      end: null,
      visible: true,
      pts: [],
    });
    commitRuns();
  };

  const stopRun = () => {
    const r = activeRun();
    if (!r) return U.toast('No hay un lapso activo.');
    r.end = Date.now();
    commitRuns();
  };

  const resetRuns = () => {
    if (!state.runs.length) return;
    if (!confirm('¿Borrar todos los lapsos registrados?')) return;
    state.runs = [];
    commitRuns();
  };

  const tare = () => {
    if (state.recent.length < TARE_MIN) {
      return U.toast(`Aún no hay suficientes lecturas válidas para tarar (mín. ${TARE_MIN}).`, true);
    }
    state.offset = state.recent.reduce((a, b) => a + b, 0) / state.recent.length;
    U.writeJSON('aero.tare.offset', state.offset);
    renderTare();
    markDirty();
    U.toast(`Tarado: offset ${state.offset.toFixed(2)} Pa`);
  };

  const untare = () => {
    state.offset = 0;
    U.writeJSON('aero.tare.offset', 0);
    renderTare();
    markDirty();
    U.toast('Tarado eliminado.');
  };

  const togglePause = () => {
    state.paused = !state.paused;
    const b = $('#btn-pause');
    b.textContent = state.paused ? 'Reanudar' : 'Pausar';
    b.classList.toggle('active', state.paused);
  };

  const showTab = (name) => {
    state.view = name;
    $$('.tab').forEach((t) => t.classList.toggle('active', t.dataset.tab === name));
    $$('.view').forEach((v) => v.classList.toggle('active', v.id === `view-${name}`));
    markDirty();
  };

  const exportPng = async (chart) => {
    const canvas = chart.snapshot();
    if (!canvas) return U.toast('El gráfico aún no está listo.', true);
    canvas.toBlob(
      (blob) => U.deliverBlob(blob, `${chart.cfg.file}_${U.fmtFile(Date.now())}.png`, chart.cfg.title),
      'image/png'
    );
  };

  const exportCsv = (chart) => {
    const blob = chart.csvBlob();
    if (!blob) return U.toast('No hay datos para exportar.', true);
    U.deliverBlob(blob, `${chart.cfg.file}_${U.fmtFile(Date.now())}.csv`, chart.cfg.title);
  };

  const addToReport = (chart) => {
    const canvas = chart.snapshot();
    if (!canvas) return U.toast('El gráfico aún no está listo.', true);
    window.AeroReport.addPlot({
      title: chart.cfg.title,
      png: canvas.toDataURL('image/png'),
      w: canvas.width,
      h: canvas.height,
      summary: chart.summaryLines().join('\n'),
    });
  };

  const handleChartAction = (btn) => {
    const chart = CHARTS[btn.closest('[data-chart]').dataset.chart];
    const act = btn.dataset.act;
    if (act === 'zoom') chart.resetZoom();
    else if (act === 'png') exportPng(chart);
    else if (act === 'csv') exportCsv(chart);
    else if (act === 'report') addToReport(chart);
  };

  const tick = () => {
    if (state.view === 'monitor' && state.dirtyMonitor) {
      state.dirtyMonitor = false;
      renderMonitor();
    }
    if (state.view === 'runs') {
      if (state.dirtyRuns) {
        state.dirtyRuns = false;
        renderRuns();
      }
      if (state.listDirty || (activeRun() && Date.now() - state.lastListRender > 1000)) renderRunList();
    }
    if (state.runsDirty && Date.now() - state.lastFlush > SAVE_EVERY_MS) flushRuns();
  };

  const init = () => {
    rawChart = new Chart($('#host-raw'), {
      name: 'presiones',
      file: 'presiones',
      title: 'Presiones absolutas (sensor 1 y sensor 2)',
      xTime: true,
      xLabel: 'Fecha y hora',
      xCsv: 'fecha_hora',
      yLabel: 'Presión [Pa]',
      decimals: 1,
    });
    diffChart = new Chart($('#host-diff'), {
      name: 'diferencia',
      file: 'diferencia',
      title: 'Diferencia corregida (P1 − P2, con tarado)',
      xTime: true,
      xLabel: 'Fecha y hora',
      xCsv: 'fecha_hora',
      yLabel: 'Diferencia [Pa]',
      decimals: 2,
    });
    runsChart = new Chart($('#host-runs'), {
      file: 'lapsos',
      title: 'Comparación de lapsos (diferencia corregida)',
      xTime: false,
      xLabel: 'Tiempo desde inicio del lapso [s]',
      xCsv: 'tiempo_s',
      yLabel: 'Diferencia [Pa]',
      decimals: 2,
    });
    CHARTS.raw = rawChart;
    CHARTS.diff = diffChart;
    CHARTS.runs = runsChart;

    window.AeroReport.init();

    $$('.tab').forEach((t) => t.addEventListener('click', () => showTab(t.dataset.tab)));
    $('#btn-pause').addEventListener('click', togglePause);
    $('#btn-tare').addEventListener('click', tare);
    $('#btn-untare').addEventListener('click', untare);

    const constInput = $('#tare-constant');
    constInput.value = state.constant;
    constInput.addEventListener('change', () => {
      const v = parseFloat(constInput.value);
      if (!Number.isFinite(v)) {
        constInput.value = state.constant;
        return U.toast('Valor de constante no válido.', true);
      }
      state.constant = v;
      U.writeJSON('aero.tare.constant', v);
      renderReadouts();
      markDirty();
    });

    $('#run-new').addEventListener('click', startRun);
    $('#run-stop').addEventListener('click', stopRun);
    $('#run-reset').addEventListener('click', resetRuns);

    const modeSel = $('#run-mode');
    modeSel.value = state.runMode;
    modeSel.addEventListener('change', () => {
      state.runMode = modeSel.value === 'fade' ? 'fade' : 'distinct';
      localStorage.setItem('aero.runMode', state.runMode);
      state.dirtyRuns = true;
    });

    $$('[data-chart] [data-act]').forEach((b) => b.addEventListener('click', () => handleChartAction(b)));

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden' && state.runsDirty) flushRuns();
    });
    window.addEventListener('pagehide', () => {
      if (state.runsDirty) flushRuns();
    });

    renderTare();
    renderRunList();
    markDirty();
    poll();
    setInterval(tick, 250);
  };

  document.addEventListener('DOMContentLoaded', init);
})();
