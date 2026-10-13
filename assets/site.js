(() => {
  'use strict';

  const byId = (id) => document.getElementById(id);
  const svgNS = 'http://www.w3.org/2000/svg';
  function svgElement(tag, attributes, parent, content) {
    const element = document.createElementNS(svgNS, tag);
    Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, value));
    if (content !== undefined) element.textContent = content;
    parent.append(element);
    return element;
  }
  function seededRandom(seed) {
    return () => {
      seed |= 0;
      seed = seed + 0x6D2B79F5 | 0;
      let value = Math.imul(seed ^ seed >>> 15, 1 | seed);
      value = value + Math.imul(value ^ value >>> 7, 61 | value) ^ value;
      return ((value ^ value >>> 14) >>> 0) / 4294967296;
    };
  }

  // Reveal controls only when their enhancement is available.
  document.querySelectorAll('.js-controls').forEach((element) => { element.hidden = false; });

  // Chapter navigation and reading progress. No reading history is stored.
  const chapters = [...document.querySelectorAll('.chapter')];
  const chapterLinks = [...document.querySelectorAll('.contents nav a')];
  const progress = document.querySelector('.reading-progress');
  progress.hidden = false;
  let scrollPending = false;
  function updateReadingPosition() {
    scrollPending = false;
    let current = chapters[0];
    const threshold = Math.min(window.innerHeight * 0.28, 220);
    chapters.forEach((chapter) => {
      if (chapter.getBoundingClientRect().top <= threshold) current = chapter;
    });
    chapterLinks.forEach((link) => {
      if (link.hash === `#${current.id}`) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
    const start = chapters[0].getBoundingClientRect().top + window.scrollY;
    const end = chapters.at(-1).getBoundingClientRect().bottom + window.scrollY - window.innerHeight;
    const percentage = Math.round(Math.min(1, Math.max(0, (window.scrollY - start) / Math.max(1, end - start))) * 100);
    byId('progress-value').textContent = `${percentage}%`;
    byId('progress-fill').style.width = `${percentage}%`;
  }
  function scheduleReadingPosition() {
    if (!scrollPending) {
      scrollPending = true;
      requestAnimationFrame(updateReadingPosition);
    }
  }
  window.addEventListener('scroll', scheduleReadingPosition, { passive: true });
  window.addEventListener('resize', scheduleReadingPosition);
  document.querySelectorAll('details').forEach((detail) => detail.addEventListener('toggle', scheduleReadingPosition));
  const words = chapters.slice(0, -1).map((chapter) => chapter.textContent).join(' ').trim().split(/\s+/).length;
  byId('reading-time').textContent = Math.ceil(words / 190);
  updateReadingPosition();

  // Citation network: deliberately holds paper quality out of the model.
  (() => {
    const svg = byId('net');
    svg.querySelector(':scope > text')?.remove();
    const drawing = svgElement('g', {}, svg);
    const maximum = 200;
    const startingCount = 60;
    let papers, edges, random, preferential = true;
    function addPaper() {
      if (papers.length >= maximum) return;
      const index = papers.length;
      const paper = { index, citations: 0, y: 24 + random() * 200 };
      const selected = new Set();
      const count = Math.min(3, index);
      while (selected.size < count) {
        const weights = papers.map((candidate) => selected.has(candidate.index) ? 0 : (preferential ? candidate.citations + 1 : 1));
        const total = weights.reduce((sum, weight) => sum + weight, 0);
        let position = random() * total;
        for (let i = 0; i < weights.length; i++) {
          if (position < weights[i]) { selected.add(i); break; }
          position -= weights[i];
        }
      }
      selected.forEach((target) => { papers[target].citations++; edges.push([index, target]); });
      papers.push(paper);
    }
    function draw() {
      drawing.replaceChildren();
      const x = (index) => 18 + index * 604 / Math.max(1, papers.length - 1);
      const connections = svgElement('g', { stroke: 'var(--ink)', 'stroke-opacity': '.12', 'stroke-width': '.7' }, drawing);
      edges.forEach(([from, to]) => svgElement('line', { x1: x(from), y1: papers[from].y, x2: x(to), y2: papers[to].y }, connections));
      const sorted = [...papers].sort((a, b) => b.citations - a.citations);
      const top = sorted[0];
      papers.forEach((paper) => svgElement('circle', { cx: x(paper.index), cy: paper.y, r: Math.min(13, 2.7 + Math.sqrt(paper.citations) * 1.5), fill: paper === top ? 'var(--accent)' : 'var(--ink)', 'fill-opacity': '.85' }, drawing));
      svgElement('line', { x1: 18, y1: 249, x2: 622, y2: 249, stroke: 'var(--rule)' }, drawing);
      svgElement('text', { x: 18, y: 269 }, drawing, 'Earlier papers');
      svgElement('text', { x: 622, y: 269, 'text-anchor': 'end' }, drawing, 'Later papers →');
      const topCount = Math.ceil(papers.length / 10);
      const share = Math.round(100 * sorted.slice(0, topCount).reduce((sum, paper) => sum + paper.citations, 0) / edges.length);
      byId('netOut').textContent = `${papers.length} papers. The most-cited 10% receive ${share}% of all citations in this model. ${preferential ? 'Existing popularity increases the chance of another citation.' : 'Each earlier paper is equally likely to receive each new citation.'}${papers.length === maximum ? ' Model complete—reset or compare the other rule.' : ''}`;
      byId('grow').disabled = papers.length >= maximum;
    }
    function reset() {
      papers = []; edges = []; random = seededRandom(17);
      for (let i = 0; i < startingCount; i++) addPaper();
      draw();
    }
    function setMode(value) {
      preferential = value;
      byId('mPref').setAttribute('aria-pressed', String(value));
      byId('mEq').setAttribute('aria-pressed', String(!value));
      reset();
    }
    byId('mPref').addEventListener('click', () => setMode(true));
    byId('mEq').addEventListener('click', () => setMode(false));
    byId('netReset').addEventListener('click', reset);
    byId('grow').addEventListener('click', () => { for (let i = 0; i < 25; i++) addPaper(); draw(); });
    reset();
  })();

  // Independent continuous tests under the null: each p-value is uniform.
  (() => {
    const slider = byId('kSlider');
    const output = byId('fpOut');
    const cells = Array.from({ length: 20 }, (_, i) => {
      const cell = document.createElement('div');
      cell.className = 'outcome';
      cell.append(`Test ${String(i + 1).padStart(2, '0')}`);
      const value = document.createElement('span');
      value.textContent = 'p = —';
      cell.append(value);
      byId('outcomes').append(cell);
      return cell;
    });
    const count = () => Number(slider.value);
    const probability = () => 1 - Math.pow(0.95, count());
    function clearCells() {
      cells.forEach((cell, i) => { cell.hidden = i >= count(); cell.classList.remove('hit'); cell.lastElementChild.textContent = 'p = —'; });
    }
    function update() {
      byId('kVal').value = count();
      clearCells();
      output.textContent = `With ${count()} independent test${count() === 1 ? '' : 's'}, the chance of at least one false positive is about ${Math.round(probability() * 100)}%, even though every true effect is zero.`;
    }
    slider.addEventListener('input', update);
    byId('runOne').addEventListener('click', () => {
      let hits = 0;
      cells.forEach((cell, i) => {
        if (i >= count()) return;
        const p = Math.random();
        const hit = p < 0.05;
        if (hit) hits++;
        cell.classList.toggle('hit', hit);
        // Show enough precision that a non-significant value never rounds below the threshold.
        cell.lastElementChild.textContent = p < 0.0001 ? 'p < .0001' : `p = ${p.toFixed(4)}`;
      });
      output.textContent = hits ? `${hits} of ${count()} tests crossed p < 0.05. The outlined ${hits === 1 ? 'result is a false positive' : 'results are false positives'}: the treatment has no effect in this simulation.` : `None of the ${count()} tests crossed p < 0.05 this time. Run the study again to see the variation from random sampling. The true effects remain zero.`;
    });
    byId('runMany').addEventListener('click', () => {
      let studiesWithHit = 0;
      for (let study = 0; study < 1000; study++) {
        for (let test = 0; test < count(); test++) {
          if (Math.random() < 0.05) { studiesWithHit++; break; }
        }
      }
      clearCells();
      output.textContent = `${studiesWithHit} of 1,000 simulated studies found at least one false positive. The mathematical expectation is about ${Math.round(1000 * probability())} per 1,000. Each study tested ${count()} independent outcome${count() === 1 ? '' : 's'} with no real effect.`;
    });
    update();
  })();

  // A fixed synthetic literature makes the hidden/visible comparison reproducible.
  (() => {
    const svg = byId('funnel');
    svg.querySelector(':scope > text')?.remove();
    const drawing = svgElement('g', {}, svg);
    const random = seededRandom(1);
    function normal() {
      let u = 0;
      while (u === 0) u = random();
      return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * random());
    }
    const truth = 0.15;
    const studies = Array.from({ length: 90 }, () => {
      const size = Math.round(20 * Math.pow(20, random()));
      const error = 2 / Math.sqrt(size);
      const effect = truth + normal() * error;
      return { error, effect, published: effect / error > 1.96 || random() < 0.12 };
    });
    const published = studies.filter((study) => study.published);
    const average = (values) => values.reduce((sum, value) => sum + value.effect, 0) / values.length;
    let revealed = false;
    const x = (value) => 58 + (value + 0.9) / 2.25 * 558;
    const y = (precision) => 279 - (precision - 2) / 8.5 * 226;
    function draw() {
      drawing.replaceChildren();
      const defs = svgElement('defs', {}, drawing);
      const clip = svgElement('clipPath', { id: 'funnel-clip' }, defs);
      svgElement('rect', { x: 58, y: 53, width: 558, height: 226 }, clip);
      const plot = svgElement('g', { 'clip-path': 'url(#funnel-clip)' }, drawing);
      svgElement('rect', { x: 58, y: 53, width: 558, height: 226, fill: 'var(--paper)', stroke: 'var(--rule)' }, plot);
      svgElement('path', { d: `M${x(truth - 1.96 / 2)} ${y(2)} L${x(truth - 1.96 / 10.5)} ${y(10.5)} L${x(truth + 1.96 / 10.5)} ${y(10.5)} L${x(truth + 1.96 / 2)} ${y(2)}`, stroke: 'var(--rule)', fill: 'none', 'stroke-dasharray': '3 4' }, plot);
      svgElement('line', { x1: x(truth), x2: x(truth), y1: 53, y2: 279, stroke: 'var(--ink)', 'stroke-width': 1.5 }, plot);
      studies.forEach((study) => {
        if (study.published || revealed) svgElement('circle', { cx: x(study.effect), cy: y(1 / study.error), r: 4.5, fill: study.published ? 'var(--ink)' : 'var(--paper)', stroke: study.published ? 'var(--ink)' : 'var(--accent)', 'stroke-width': 1.5, opacity: .85 }, plot);
      });
      const visible = revealed ? studies : published;
      const mean = average(visible);
      svgElement('line', { x1: x(mean), x2: x(mean), y1: 53, y2: 279, stroke: 'var(--accent)', 'stroke-width': 2, 'stroke-dasharray': '6 4' }, plot);
      svgElement('line', { x1: 58, x2: 80, y1: 22, y2: 22, stroke: 'var(--ink)', 'stroke-width': 1.5 }, drawing);
      svgElement('text', { x: 86, y: 26 }, drawing, 'True effect: 0.15');
      svgElement('line', { x1: 350, x2: 373, y1: 22, y2: 22, stroke: 'var(--accent)', 'stroke-width': 2, 'stroke-dasharray': '5 3' }, drawing);
      svgElement('text', { x: 380, y: 26 }, drawing, `Visible average: ${mean.toFixed(2)}`);
      [-0.5, 0, 0.5, 1].forEach((tick) => svgElement('text', { x: x(tick), y: 301, 'text-anchor': 'middle' }, drawing, tick > 0 ? `+${tick}` : String(tick)));
      svgElement('text', { x: 337, y: 331, 'text-anchor': 'middle' }, drawing, 'Estimated effect');
      svgElement('text', { x: 19, y: 166, 'text-anchor': 'middle', transform: 'rotate(-90 19 166)' }, drawing, 'Higher precision →');
      byId('funOut').textContent = revealed
        ? `All ${studies.length} studies are visible. Hollow circles were unpublished. The average is ${mean.toFixed(2)}, compared with ${average(published).toFixed(2)} for the published subset. The true effect remains 0.15.`
        : `Only ${published.length} of ${studies.length} studies are visible. Their average effect is ${mean.toFixed(2)}, above the true effect of 0.15. Reveal the missing results to see how selection changes the picture.`;
    }
    byId('drawer').addEventListener('click', () => {
      revealed = !revealed;
      byId('drawer').setAttribute('aria-pressed', String(revealed));
      byId('drawer').textContent = revealed ? 'Show published studies only −' : 'Reveal unpublished studies +';
      draw();
    });
    draw();
  })();

  // Search and topic filters operate locally; reference anchors always reveal their source.
  const sources = [...document.querySelectorAll('#source-list > li')];
  const search = byId('source-search');
  const topic = byId('source-topic');
  function filterSources() {
    const query = search.value.toLocaleLowerCase().trim();
    let count = 0;
    sources.forEach((source) => {
      const matches = (topic.value === 'all' || source.dataset.topic === topic.value) && source.textContent.toLocaleLowerCase().includes(query);
      source.hidden = !matches;
      if (matches) count++;
    });
    byId('source-count').textContent = `${count} of ${sources.length} sources`;
    byId('no-sources').hidden = count !== 0;
    scheduleReadingPosition();
  }
  search.addEventListener('input', filterSources);
  topic.addEventListener('change', filterSources);
  function revealReference(hash) {
    const source = sources.find((item) => `#${item.id}` === hash);
    if (source?.hidden) { search.value = ''; topic.value = 'all'; filterSources(); }
  }
  document.addEventListener('click', (event) => {
    const link = event.target.closest('a[href^="#ref-"]');
    if (link) revealReference(link.hash);
  });
  window.addEventListener('hashchange', () => { revealReference(window.location.hash); });
  filterSources();

  byId('copy-link').addEventListener('click', async () => {
    const address = document.querySelector('link[rel="canonical"]').href;
    try {
      await navigator.clipboard.writeText(address);
      byId('share-status').textContent = 'Link copied.';
    } catch {
      byId('share-status').textContent = `Copy this address: ${address}`;
    }
  });
  byId('print-guide').addEventListener('click', () => window.print());
  let closedBeforePrint = [];
  window.addEventListener('beforeprint', () => {
    closedBeforePrint = [...document.querySelectorAll('details:not([open])')];
    // Remove accordion grouping while printing so every funding model can be open.
    document.querySelectorAll('.funding-models details').forEach((detail) => { detail.removeAttribute('name'); detail.open = true; });
    sources.forEach((source) => { source.hidden = false; });
  });
  window.addEventListener('afterprint', () => {
    closedBeforePrint.forEach((detail) => { detail.open = false; });
    document.querySelectorAll('.funding-models details').forEach((detail) => { detail.setAttribute('name', 'funding'); });
    filterSources();
  });
})();
