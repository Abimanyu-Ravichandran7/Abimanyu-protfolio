/* ==========================================================================
   ORANGE NEXUS — Abimanyu R Portfolio
   Vanilla JS interactions. Bootstrap's bundle (loaded before this file)
   powers the modals, collapses and toasts.
   ========================================================================== */
(() => {
  'use strict';

  /* ---------- Config ---------- */
  const CONFIG = {
    email: 'abimanyuravichandran003@gmail.com',
    /*
     * Contact form delivery.
     * Leave empty to open the visitor's email app with the message pre-filled.
     * To deliver messages straight to the inbox, paste a form endpoint that accepts
     * a JSON POST and answers 2xx on success, e.g. 'https://formspree.io/f/your-id'.
     */
    contactEndpoint: ''
  };

  /* ---------- Helpers ---------- */
  const doc = document.documentElement;
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const escapeHTML = s => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  let vw = innerWidth;
  let vh = innerHeight;
  const pointer = { x: vw / 2, y: vh / 2, nx: 0, ny: 0, moved: false };

  doc.classList.add('fx');

  /* ---------- Frame loop + scroll/resize buses ---------- */
  const tickers = new Set();
  const onFrame = fn => { tickers.add(fn); return () => tickers.delete(fn); };
  const frame = t => { tickers.forEach(fn => fn(t)); requestAnimationFrame(frame); };
  requestAnimationFrame(frame);

  const scrollFns = new Set();
  const resizeFns = new Set();
  let scrollQueued = false;
  const runScroll = () => { scrollQueued = false; const y = scrollY; scrollFns.forEach(fn => fn(y)); };
  addEventListener('scroll', () => {
    if (!scrollQueued) { scrollQueued = true; requestAnimationFrame(runScroll); }
  }, { passive: true });

  let resizeTimer;
  addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      vw = innerWidth; vh = innerHeight;
      resizeFns.forEach(fn => fn());
      runScroll();
    }, 120);
  });

  addEventListener('pointermove', e => {
    if (e.pointerType === 'touch') return;
    pointer.x = e.clientX; pointer.y = e.clientY;
    pointer.nx = (e.clientX / vw) * 2 - 1;
    pointer.ny = (e.clientY / vh) * 2 - 1;
    pointer.moved = true;
  }, { passive: true });

  const safe = (name, fn) => { try { fn(); } catch (err) { console.warn(`[portfolio] ${name} disabled:`, err); } };

  /* ---------- Toast ---------- */
  function toast(message, icon = 'bi-check2-circle') {
    const el = $('#appToast');
    if (!el || !window.bootstrap) return;
    $('#toastText').textContent = message;
    el.querySelector('i').className = `bi ${icon}`;
    bootstrap.Toast.getOrCreateInstance(el).show();
  }

  /* ==========================================================================
     Text effects
     ========================================================================== */
  function splitText(el) {
    const text = el.textContent.trim().replace(/\s+/g, ' ');
    el.classList.add('split');
    el.style.setProperty('--sd', `${Number(el.dataset.splitDelay) || 0}ms`);
    let ci = 0;
    const words = text.split(' ').map(word =>
      `<span class="split-w">${Array.from(word).map(ch => `<span class="split-c" style="--ci:${ci++}">${escapeHTML(ch)}</span>`).join('')}</span>`
    ).join(' ');
    el.innerHTML = `<span class="visually-hidden">${escapeHTML(text)}</span><span aria-hidden="true">${words}</span>`;
  }

  function blurText(el) {
    const text = el.textContent.trim().replace(/\s+/g, ' ');
    el.style.setProperty('--bd', `${Number(el.dataset.blurDelay) || 0}ms`);
    const words = text.split(' ').map((w, i) => `<span class="blur-w" style="--wi:${i}">${escapeHTML(w)}</span>`).join(' ');
    el.innerHTML = `<span class="visually-hidden">${escapeHTML(text)}</span><span aria-hidden="true">${words}</span>`;
  }

  const GLYPHS = '!<>-_\\/[]{}=+*^?#$%&01ABCDEFXZ';
  function decrypt(el, finalText, duration = 900) {
    const target = finalText || el.dataset.text || el.textContent;
    el.dataset.text = target;
    if (reduced) { el.textContent = target; return Promise.resolve(); }
    if (el._decryptStop) el._decryptStop();
    return new Promise(resolve => {
      const start = performance.now();
      const stop = onFrame(now => {
        const p = clamp((now - start) / duration, 0, 1);
        const revealed = Math.floor(p * target.length);
        let out = '';
        for (let i = 0; i < target.length; i++) {
          const ch = target[i];
          out += (i < revealed || ch === ' ' || ch === ',') ? ch : GLYPHS[(Math.random() * GLYPHS.length) | 0];
        }
        el.textContent = out;
        if (p >= 1) { stop(); el._decryptStop = null; el.textContent = target; resolve(); }
      });
      el._decryptStop = () => { stop(); el.textContent = target; resolve(); };
    });
  }

  function countUp(el) {
    const target = Number(el.dataset.count);
    if (reduced || !target) { el.textContent = String(target); return; }
    const start = performance.now();
    const dur = 1400;
    const stop = onFrame(now => {
      const p = clamp((now - start) / dur, 0, 1);
      el.textContent = String(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p >= 1) stop();
    });
  }

  /* ==========================================================================
     Scroll reveal (starts once the loader has finished)
     ========================================================================== */
  const inViewHooks = [];
  function onInView(el) {
    if (el.matches('[data-count]')) countUp(el);
    $$('[data-count]', el).forEach(countUp);
    if (el.matches('[data-decrypt]')) decrypt(el);
    $$('[data-decrypt]', el).forEach(d => decrypt(d));
    inViewHooks.forEach(fn => fn(el));
  }

  function initReveal() {
    const targets = $$('[data-reveal], [data-split], [data-blur], .project, .edu-grid');
    if (!('IntersectionObserver' in window)) {
      targets.forEach(el => { el.classList.add('is-inview'); onInView(el); });
      return;
    }
    // A fully clipped element has no visible area, so IntersectionObserver never reports it.
    // Clip-reveal lines are therefore watched through their (unclipped) parent heading.
    const watch = new Map();
    targets.forEach(el => {
      const host = el.matches('[data-reveal="clip"]') && el.parentElement ? el.parentElement : el;
      if (!watch.has(host)) watch.set(host, []);
      watch.get(host).push(el);
    });
    const io = new IntersectionObserver(entries => {
      entries.forEach(en => {
        if (!en.isIntersecting) return;
        (watch.get(en.target) || []).forEach(el => {
          el.classList.add('is-inview');
          onInView(el);
        });
        io.unobserve(en.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    watch.forEach((_, host) => io.observe(host));
  }

  /* ==========================================================================
     Loader
     ========================================================================== */
  function initLoader(onDone) {
    const loader = $('#loader');
    if (!loader) { doc.classList.remove('is-loading'); onDone(); return; }
    doc.classList.add('is-loading', 'is-locked');

    const pctEl = $('#loaderPct');
    const ring = $('#loaderRing');
    const steps = $$('#loaderSteps li');
    const wave = $('#loaderWave');
    for (let i = 0; i < 30; i++) {
      const bar = document.createElement('i');
      bar.style.setProperty('--i', i);
      wave.appendChild(bar);
    }

    let seen = false;
    try { seen = sessionStorage.getItem('ar-intro') === '1'; } catch (e) { /* storage blocked */ }
    const minTime = reduced ? 200 : (seen ? 600 : 1250);
    const start = performance.now();

    // Wait only for what the first screen needs: the hero photo and the display/body fonts.
    const heroImg = $('.portrait__img');
    const fontLoad = document.fonts && document.fonts.load
      ? Promise.all(['600 1em "Space Grotesk"', '400 1em Inter', '500 1em "JetBrains Mono"'].map(f => document.fonts.load(f)))
      : Promise.resolve();
    const tasks = [
      fontLoad,
      heroImg && !heroImg.complete
        ? new Promise(r => { heroImg.addEventListener('load', r, { once: true }); heroImg.addEventListener('error', r, { once: true }); })
        : Promise.resolve()
    ];
    let loaded = 0;
    tasks.forEach(p => p.then(() => { loaded++; }, () => { loaded++; }));
    const failSafe = setTimeout(() => { loaded = tasks.length; }, 3000); // never hold visitors longer than this

    let shown = 0;
    let finished = false;
    let last = start;
    const stop = onFrame(now => {
      const dt = now - last;
      last = now;
      // Progress follows time, but holds at 85% until the hero photo and fonts are ready.
      const timeCap = clamp((now - start) / minTime, 0, 1) * 100;
      const goal = loaded >= tasks.length ? timeCap : Math.min(timeCap, 85);
      shown = reduced ? goal : shown + (goal - shown) * (1 - Math.pow(0.8, dt / 16.7));
      const v = Math.min(100, Math.round(shown));
      pctEl.textContent = String(v).padStart(2, '0');
      ring.style.strokeDashoffset = String(100 - shown);
      steps.forEach((li, i) => {
        const next = steps[i + 1] ? Number(steps[i + 1].dataset.at) : 100;
        li.classList.toggle('is-active', v >= Number(li.dataset.at));
        li.classList.toggle('is-done', v >= next);
      });
      if (!finished && loaded >= tasks.length && shown > 99.4) {
        finished = true;
        stop();
        clearTimeout(failSafe);
        pctEl.textContent = '100';
        ring.style.strokeDashoffset = '0';
        exit();
      }
    });

    function release() {
      doc.classList.remove('is-loading', 'is-locked');
      resizeFns.forEach(fn => fn()); // measure layouts now that the page is painted
      onDone();
    }

    function exit() {
      try { sessionStorage.setItem('ar-intro', '1'); } catch (e) { /* storage blocked */ }
      if (reduced) {
        loader.classList.add('is-fade');
        release();
        setTimeout(() => loader.remove(), 300);
        return;
      }
      loader.classList.add('is-done');
      setTimeout(() => { loader.classList.add('is-exit'); release(); }, 560);
      setTimeout(() => loader.remove(), 1700);
    }
  }

  /* ==========================================================================
     Navigation
     ========================================================================== */
  function initNav() {
    const header = $('#siteHeader');
    const links = $$('.nav-links a');
    const indicator = $('#navIndicator');
    const wrap = $('.nav-links-wrap');
    let current = '';

    const moveIndicator = () => {
      const a = links.find(l => l.dataset.link === current);
      if (!a || !wrap || wrap.offsetParent === null) return;
      indicator.style.width = `${a.offsetWidth - 24}px`;
      indicator.style.transform = `translateX(${a.offsetLeft + 12}px)`;
      indicator.style.opacity = '1';
    };

    const setActive = id => {
      if (!id || id === current) return;
      current = id;
      links.forEach(l => {
        const on = l.dataset.link === id;
        l.classList.toggle('is-active', on);
        if (on) l.setAttribute('aria-current', 'location'); else l.removeAttribute('aria-current');
      });
      moveIndicator();
    };

    setActive('home');
    scrollFns.add(y => header.classList.toggle('is-scrolled', y > 24));
    resizeFns.add(moveIndicator);
    if (document.fonts) document.fonts.ready.then(moveIndicator);

    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver(entries => {
        entries.forEach(en => { if (en.isIntersecting) setActive(en.target.dataset.nav); });
      }, { rootMargin: '-45% 0px -50% 0px' });
      $$('[data-nav]').forEach(s => io.observe(s));
    }

    /* Full-screen mobile menu */
    const toggle = $('#navToggle');
    const menu = $('#mobileMenu');
    let open = false;
    let closeTimer;

    const focusables = () => [toggle, ...$$('a, button', menu)];

    function openMenu() {
      clearTimeout(closeTimer);
      open = true;
      menu.hidden = false;
      requestAnimationFrame(() => requestAnimationFrame(() => menu.classList.add('is-open')));
      toggle.classList.add('is-open');
      toggle.setAttribute('aria-expanded', 'true');
      toggle.setAttribute('aria-label', 'Close menu');
      doc.classList.add('menu-open');
      setTimeout(() => { const first = $('a', menu); if (first) first.focus(); }, reduced ? 0 : 320);
    }

    function closeMenu(returnFocus = true) {
      if (!open) return;
      open = false;
      menu.classList.remove('is-open');
      toggle.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-label', 'Open menu');
      doc.classList.remove('menu-open');
      closeTimer = setTimeout(() => { menu.hidden = true; }, reduced ? 0 : 760);
      if (returnFocus) toggle.focus();
    }

    toggle.addEventListener('click', () => (open ? closeMenu() : openMenu()));
    menu.addEventListener('click', e => { if (e.target.closest('a[href^="#"]')) closeMenu(false); });
    document.addEventListener('keydown', e => {
      if (!open) return;
      if (e.key === 'Escape') { e.preventDefault(); closeMenu(); return; }
      if (e.key === 'Tab') {
        const items = focusables();
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
    matchMedia('(min-width: 1200px)').addEventListener('change', e => { if (e.matches) closeMenu(false); });
  }

  /* ==========================================================================
     Custom cursor + cursor glow
     ========================================================================== */
  function initCursor() {
    if (!finePointer || reduced) return;
    const cursor = $('#cursor');
    const ring = $('.cursor__ring', cursor);
    const dot = $('.cursor__dot', cursor);
    const label = $('.cursor__label', cursor);
    const glow = $('#cursorGlow');
    doc.classList.add('has-cursor');
    cursor.classList.add('is-hidden');

    let rx = pointer.x, ry = pointer.y, gx = pointer.x, gy = pointer.y;
    onFrame(() => {
      if (!pointer.moved) return;
      rx = lerp(rx, pointer.x, 0.2);
      ry = lerp(ry, pointer.y, 0.2);
      gx = lerp(gx, pointer.x, 0.08);
      gy = lerp(gy, pointer.y, 0.08);
      dot.style.transform = `translate3d(${pointer.x}px, ${pointer.y}px, 0)`;
      ring.style.transform = `translate3d(${rx.toFixed(1)}px, ${ry.toFixed(1)}px, 0)`;
      glow.style.transform = `translate3d(${gx.toFixed(1)}px, ${gy.toFixed(1)}px, 0)`;
    });

    const hoverSel = 'a, button, [role="button"], label, .tech-chip, .orbit__node, select';
    document.addEventListener('pointerover', e => {
      const t = e.target;
      if (!(t instanceof Element)) return;
      const view = t.closest('[data-cursor="view"]');
      const text = t.closest('input:not([type="checkbox"]):not([type="radio"]), textarea');
      cursor.classList.toggle('is-view', !!view);
      label.textContent = view ? (view.dataset.cursorLabel || 'View') : '';
      cursor.classList.toggle('is-text', !!text);
      cursor.classList.toggle('is-hover', !view && !text && !!t.closest(hoverSel));
    });
    document.addEventListener('pointermove', () => cursor.classList.remove('is-hidden'), { passive: true });
    document.addEventListener('pointerdown', () => cursor.classList.add('is-down'));
    document.addEventListener('pointerup', () => cursor.classList.remove('is-down'));
    document.addEventListener('mouseout', e => { if (!e.relatedTarget) cursor.classList.add('is-hidden'); });
  }

  /* ==========================================================================
     Particle field with a subtle swarm toward the cursor
     ========================================================================== */
  function initParticles() {
    const canvas = $('#bgParticles');
    if (!canvas || !canvas.getContext) return;
    const ctx = canvas.getContext('2d');
    let w = 0, h = 0, parts = [];

    const make = () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.2,
      vy: (Math.random() - 0.5) * 0.2,
      r: Math.random() * 1.3 + 0.45,
      a: Math.random() * 0.45 + 0.15,
      ph: Math.random() * Math.PI * 2
    });

    function resize() {
      const dpr = Math.min(devicePixelRatio || 1, 1.5);
      w = innerWidth; h = innerHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.round(clamp((w * h) / 24000, 16, finePointer ? 66 : 26));
      parts = Array.from({ length: count }, make);
      if (reduced) draw(0);
    }

    function draw(t) {
      ctx.clearRect(0, 0, w, h);
      const R = 180;
      const usePointer = finePointer && pointer.moved && !reduced;
      for (const p of parts) {
        if (!reduced) {
          if (usePointer) {
            const dx = pointer.x - p.x, dy = pointer.y - p.y;
            const d2 = dx * dx + dy * dy;
            if (d2 < R * R) {
              const d = Math.sqrt(d2) || 1;
              const f = (1 - d / R) * 0.03;
              p.vx += (dx / d) * f + (-dy / d) * f * 0.6;
              p.vy += (dy / d) * f + (dx / d) * f * 0.6;
            }
          }
          p.vx *= 0.975; p.vy *= 0.975;
          const sp = Math.hypot(p.vx, p.vy);
          if (sp > 1.4) { p.vx *= 1.4 / sp; p.vy *= 1.4 / sp; }
          p.x += p.vx + Math.cos(t * 0.0002 + p.ph) * 0.08;
          p.y += p.vy - 0.05;
          if (p.y < -10) { p.y = h + 10; p.x = Math.random() * w; }
          if (p.x < -10) p.x = w + 10; else if (p.x > w + 10) p.x = -10;
          if (p.y > h + 10) p.y = -10;
        }
        let alpha = p.a * (0.7 + 0.3 * Math.sin(t * 0.0015 + p.ph));
        if (usePointer) {
          const d = Math.hypot(pointer.x - p.x, pointer.y - p.y);
          if (d < 140) {
            alpha = Math.min(1, alpha + (1 - d / 140) * 0.6);
            ctx.globalAlpha = (1 - d / 140) * 0.18;
            ctx.strokeStyle = '#FF8C42';
            ctx.lineWidth = 0.6;
            ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(pointer.x, pointer.y); ctx.stroke();
          }
        }
        ctx.globalAlpha = alpha;
        ctx.fillStyle = '#FF8C42';
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    resize();
    resizeFns.add(resize);
    if (!reduced) onFrame(draw);
  }

  /* ==========================================================================
     Pointer-driven micro-interactions
     ========================================================================== */
  function initMagnetic() {
    if (!finePointer || reduced) return;
    $$('[data-magnetic]').forEach(el => {
      el.addEventListener('pointermove', e => {
        const r = el.getBoundingClientRect();
        const x = e.clientX - (r.left + r.width / 2);
        const y = e.clientY - (r.top + r.height / 2);
        el.style.transform = `translate3d(${(x * 0.26).toFixed(1)}px, ${(y * 0.32).toFixed(1)}px, 0)`;
      });
      el.addEventListener('pointerleave', () => { el.style.transform = ''; });
    });
  }

  function initSpotlight() {
    if (!finePointer) return;
    document.addEventListener('pointermove', e => {
      const el = e.target instanceof Element ? e.target.closest('[data-spotlight]') : null;
      if (!el) return;
      const r = el.getBoundingClientRect();
      el.style.setProperty('--mx', `${(e.clientX - r.left).toFixed(0)}px`);
      el.style.setProperty('--my', `${(e.clientY - r.top).toFixed(0)}px`);
    }, { passive: true });
  }

  function initTilt() {
    if (!finePointer || reduced) return;
    $$('[data-tilt]').forEach(el => {
      el.addEventListener('pointermove', e => {
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        el.style.setProperty('--rx', `${(-py * 5).toFixed(2)}deg`);
        el.style.setProperty('--ry', `${(px * 7).toFixed(2)}deg`);
        el.style.setProperty('--gx', `${((px + 0.5) * 100).toFixed(1)}%`);
        el.style.setProperty('--gy', `${((py + 0.5) * 100).toFixed(1)}%`);
        el.classList.add('is-tilting');
      });
      el.addEventListener('pointerleave', () => {
        el.style.setProperty('--rx', '0deg');
        el.style.setProperty('--ry', '0deg');
        el.classList.remove('is-tilting');
      });
    });
  }

  function whenVisible(el, cb) {
    if (!('IntersectionObserver' in window)) { cb(true); return; }
    new IntersectionObserver(([en]) => cb(en.isIntersecting)).observe(el);
  }

  function initIdCard() {
    const card = $('#idCard');
    if (!card || reduced) return;
    let visible = false, hover = false, tx = 0, ty = 0, cx = 0, cy = 0;
    whenVisible(card, v => { visible = v; });
    if (finePointer) {
      card.addEventListener('pointermove', e => {
        const r = card.getBoundingClientRect();
        tx = (e.clientX - r.left) / r.width - 0.5;
        ty = (e.clientY - r.top) / r.height - 0.5;
        hover = true;
      });
      card.addEventListener('pointerleave', () => { hover = false; });
    }
    onFrame(t => {
      if (!visible) return;
      const targetY = hover ? tx * 18 : Math.sin(t * 0.0006) * 7 - 3;
      const targetX = hover ? -ty * 14 : Math.cos(t * 0.0005) * 3 + 2;
      cx = lerp(cx, targetX, 0.08);
      cy = lerp(cy, targetY, 0.08);
      card.style.transform = `rotateX(${cx.toFixed(2)}deg) rotateY(${cy.toFixed(2)}deg)`;
      card.style.setProperty('--hx', `${(50 + cy * 4).toFixed(1)}%`);
    });
  }

  /* ==========================================================================
     Parallax (scroll + pointer)
     ========================================================================== */
  function initParallax() {
    if (reduced) return;
    const items = $$('[data-parallax]').map(el => ({ el, s: parseFloat(el.dataset.parallax) || 0 }));
    const imgs = $$('[data-parallax-img]').map(el => ({ el, s: parseFloat(el.dataset.parallaxImg) || 0, host: el.closest('.about-portrait__frame') }));
    const bgWord = $('#heroBgWord');

    scrollFns.add(y => {
      items.forEach(({ el, s }) => {
        const r = el.parentElement.getBoundingClientRect();
        if (r.bottom < 0 || r.top > vh) return;
        const c = r.top + r.height / 2 - vh / 2;
        el.style.transform = `translate3d(0, ${(c * s).toFixed(1)}px, 0)`;
      });
      imgs.forEach(({ el, s, host }) => {
        if (!host) return;
        const r = host.getBoundingClientRect();
        if (r.bottom < 0 || r.top > vh) return;
        const limit = r.height * 0.07;
        const c = (r.top + r.height / 2 - vh / 2) * s;
        el.style.transform = `translate3d(0, ${clamp(c, -limit, limit).toFixed(1)}px, 0)`;
      });
      if (bgWord && y < vh * 1.4) bgWord.style.transform = `translate3d(${(-y * 0.25).toFixed(1)}px, 0, 0)`;
    });
  }

  function initHeroPointer() {
    if (reduced || !finePointer) return;
    const hero = $('#home');
    const img = $('.portrait__img');
    const beam = $('.hero__beam');
    const icons = $$('.float-icon').map(el => ({ el, d: parseFloat(el.dataset.depth) || 1 }));
    if (!hero || !img) return;
    let visible = true, cx = 0, cy = 0;
    whenVisible(hero, v => { visible = v; });
    onFrame(() => {
      if (!visible || !pointer.moved) return;
      const nx = lerp(cx, pointer.nx, 0.06);
      const ny = lerp(cy, pointer.ny, 0.06);
      if (Math.abs(nx - cx) < 0.0005 && Math.abs(ny - cy) < 0.0005) return;
      cx = nx; cy = ny;
      img.style.transform = `scale(1.08) translate3d(${(-cx * 10).toFixed(2)}px, ${(-cy * 8).toFixed(2)}px, 0)`;
      if (beam) beam.style.transform = `translate3d(${(cx * 40).toFixed(1)}px, ${(cy * 30).toFixed(1)}px, 0)`;
      icons.forEach(({ el, d }) => {
        el.style.transform = `translate3d(${(cx * 14 * d).toFixed(1)}px, ${(cy * 12 * d).toFixed(1)}px, 0)`;
      });
    });
  }

  /* ==========================================================================
     Hero: role typewriter + profile terminal
     ========================================================================== */
  async function initRoleTypewriter() {
    const el = $('#roleRotator');
    if (!el || reduced) return;
    const roles = ['FULL STACK DEVELOPER', 'TECHNICAL TRAINER', 'SOFTWARE ENGINEER'];
    let i = 0;
    for (;;) {
      await wait(2600);
      const current = roles[i];
      for (let n = current.length; n >= 0; n--) { el.textContent = current.slice(0, n); await wait(26); }
      i = (i + 1) % roles.length;
      const next = roles[i];
      for (let n = 1; n <= next.length; n++) { el.textContent = next.slice(0, n); await wait(52); }
    }
  }

  async function runHeroTerminal() {
    const body = $('#heroTerminal');
    if (!body) return;
    const lines = [
      ['Initializing developer profile...'],
      ['Loading technical skills...'],
      ['Full Stack Development: ', 'Active'],
      ['Technical Training: ', 'Active'],
      ['Application Development: ', 'Active'],
      ['System Status: ', 'Ready']
    ];
    const holder = document.createElement('div');
    holder.setAttribute('aria-hidden', 'true');
    body.appendChild(holder);
    for (const [text, status] of lines) {
      const p = document.createElement('p');
      p.innerHTML = '<span class="ht-p">&gt;</span> <span class="ht-t"></span>';
      holder.appendChild(p);
      const t = $('.ht-t', p);
      if (reduced) t.textContent = text;
      else for (const ch of text) { t.textContent += ch; await wait(15); }
      if (status) {
        const b = document.createElement('b');
        b.className = status === 'Ready' ? 'ht-ready' : 'ht-ok';
        b.textContent = status;
        p.appendChild(b);
      }
      await wait(reduced ? 0 : 130);
    }
    const caret = document.createElement('span');
    caret.className = 'ht-caret';
    holder.lastElementChild.appendChild(document.createTextNode(' '));
    holder.lastElementChild.appendChild(caret);
  }

  /* ==========================================================================
     About: words light up as the biography scrolls through view
     ========================================================================== */
  function initBioHighlight() {
    const bio = $('#aboutBio');
    if (!bio || reduced) return;
    const words = [];
    const walk = node => {
      Array.from(node.childNodes).forEach(n => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(part => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
            const s = document.createElement('span');
            s.className = 'w';
            s.textContent = part;
            frag.appendChild(s);
            words.push(s);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1) {
          walk(n);
        }
      });
    };
    $$('[data-words]', bio).forEach(walk);
    let lit = -1;
    scrollFns.add(() => {
      const r = bio.getBoundingClientRect();
      if (r.top > vh || r.bottom < 0) return;
      const start = vh * 0.88;
      const end = vh * 0.4;
      const p = clamp((start - r.top) / (r.height + start - end), 0, 1);
      const n = Math.round(p * words.length);
      if (n === lit) return;
      const [a, b] = lit < 0 ? [0, words.length] : [Math.min(n, lit), Math.max(n, lit)];
      for (let i = a; i < b; i++) words[i].classList.toggle('is-lit', i < n);
      lit = n;
    });
  }

  /* ==========================================================================
     Technology universe (orbit)
     ========================================================================== */
  function initOrbit() {
    const orbit = $('#orbit');
    if (!orbit) return;
    const nodes = $$('.orbit__node', orbit);
    const rings = $$('.orbit__ring', orbit);
    const info = { box: $('#universeInfo'), name: $('#uName'), cat: $('#uCat'), desc: $('#uDesc'), icon: $('#uIcon') };

    function select(node) {
      nodes.forEach(n => {
        const on = n === node;
        n.classList.toggle('is-selected', on);
        n.setAttribute('aria-pressed', String(on));
      });
      info.box.classList.add('is-swapping');
      setTimeout(() => {
        info.name.textContent = node.dataset.name;
        info.cat.textContent = node.dataset.cat;
        info.desc.textContent = node.dataset.desc;
        info.icon.setAttribute('href', `#i-${node.dataset.tech}`);
        info.box.classList.remove('is-swapping');
      }, reduced ? 0 : 190);
    }
    nodes.forEach(n => n.addEventListener('click', () => select(n)));

    const RINGS = [{ r: 0.2, speed: 0.00016 }, { r: 0.32, speed: -0.00011 }, { r: 0.445, speed: 0.000075 }];
    const data = nodes.map(n => ({ n, ring: Number(n.dataset.ring) || 0, a0: 0 }));
    RINGS.forEach((_, ri) => {
      const group = data.filter(d => d.ring === ri);
      group.forEach((d, i) => { d.a0 = (i / group.length) * Math.PI * 2 + ri * 0.75; });
    });

    const staticMQ = matchMedia('(max-width: 767.98px)');
    let isStatic = true;
    let W = 0, H = 0;
    const measure = () => { W = orbit.clientWidth; H = orbit.clientHeight; };
    const apply = () => {
      isStatic = reduced || staticMQ.matches;
      orbit.classList.toggle('is-static', isStatic);
      if (isStatic) nodes.forEach(n => { n.style.transform = ''; n.style.zIndex = ''; n.style.opacity = ''; });
      measure();
    };
    apply();
    staticMQ.addEventListener('change', apply);
    resizeFns.add(measure);

    let visible = false;
    whenVisible(orbit, v => { visible = v; if (v) measure(); });

    let slow = false;
    orbit.addEventListener('pointerenter', () => { slow = true; });
    orbit.addEventListener('pointerleave', () => { slow = false; });
    orbit.addEventListener('focusin', () => { slow = true; });
    orbit.addEventListener('focusout', () => { slow = false; });

    let speedMul = 1, phase = 0, last = performance.now(), tilt = 0.5, rot = 0;
    onFrame(now => {
      const dt = Math.min(now - last, 50);
      last = now;
      if (!visible || isStatic || !W) return;
      speedMul = lerp(speedMul, slow ? 0.12 : 1, 0.05);
      phase += dt * speedMul;

      let tx = 0, ty = 0;
      if (finePointer && pointer.moved) {
        const r = orbit.getBoundingClientRect();
        tx = clamp((pointer.x - (r.left + r.width / 2)) / r.width, -1, 1);
        ty = clamp((pointer.y - (r.top + r.height / 2)) / r.height, -1, 1);
      }
      tilt = lerp(tilt, 0.52 + ty * 0.1, 0.05);
      rot = lerp(rot, tx * 9, 0.05);
      const rr = (rot * Math.PI) / 180;
      const cosR = Math.cos(rr), sinR = Math.sin(rr);
      const cx = W / 2, cy = H / 2;

      rings.forEach((ring, i) => {
        const rx = RINGS[i].r * W;
        ring.style.width = `${(rx * 2).toFixed(1)}px`;
        ring.style.height = `${(rx * 2 * tilt).toFixed(1)}px`;
        ring.style.transform = `translate(-50%, -50%) rotate(${rot.toFixed(2)}deg)`;
      });

      data.forEach(d => {
        const cfg = RINGS[d.ring];
        const a = d.a0 + phase * cfg.speed;
        const ex = Math.cos(a) * cfg.r * W;
        const ey = Math.sin(a) * cfg.r * W * tilt;
        const x = cx + ex * cosR - ey * sinR;
        const y = cy + ex * sinR + ey * cosR;
        const depth = (Math.sin(a) + 1) / 2;
        const s = 0.72 + depth * 0.38;
        d.n.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) scale(${s.toFixed(3)})`;
        d.n.style.zIndex = String(depth > 0.5 ? 60 + Math.round(depth * 10) : 10 + Math.round(depth * 10));
        d.n.style.opacity = (0.45 + depth * 0.55).toFixed(2);
      });
    });
  }

  /* ==========================================================================
     Skills matrix filtering (FLIP animation)
     ========================================================================== */
  function initSkills() {
    const bar = $('#skillFilters');
    const grid = $('#skillGrid');
    if (!bar || !grid) return;
    const buttons = $$('button', bar);
    const items = $$(':scope > li', grid);
    const indicator = $('.matrix__filter-indicator', bar);
    const status = $('#skillsStatus');
    items.forEach((li, i) => li.style.setProperty('--i', i));

    let active = buttons.find(b => b.classList.contains('is-active')) || buttons[0];
    const moveIndicator = () => {
      indicator.style.width = `${active.offsetWidth}px`;
      indicator.style.transform = `translateX(${active.offsetLeft}px)`;
    };
    moveIndicator();
    resizeFns.add(moveIndicator);
    if (document.fonts) document.fonts.ready.then(moveIndicator);

    buttons.forEach(btn => btn.addEventListener('click', () => {
      if (btn === active) return;
      active.classList.remove('is-active');
      active.setAttribute('aria-pressed', 'false');
      active = btn;
      btn.classList.add('is-active');
      btn.setAttribute('aria-pressed', 'true');
      moveIndicator();
      bar.scrollTo({ left: btn.offsetLeft - bar.clientWidth / 2 + btn.offsetWidth / 2, behavior: reduced ? 'auto' : 'smooth' });

      const cat = btn.dataset.filter;
      const first = new Map(items.map(li => [li, li.hidden ? null : li.getBoundingClientRect()]));
      items.forEach(li => { li.hidden = !(cat === 'all' || li.dataset.cat === cat); });

      if (!reduced) {
        let k = 0;
        items.forEach(li => {
          if (li.hidden) return;
          const f = first.get(li);
          const l = li.getBoundingClientRect();
          if (!f) {
            li.animate(
              [{ opacity: 0, transform: 'translateY(16px) scale(.96)' }, { opacity: 1, transform: 'none' }],
              { duration: 480, delay: (k++) * 35, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'backwards' }
            );
          } else {
            const dx = f.left - l.left, dy = f.top - l.top;
            if (dx || dy) {
              li.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }],
                { duration: 520, easing: 'cubic-bezier(.22,1,.36,1)' });
            }
          }
        });
      }
      const n = items.filter(li => !li.hidden).length;
      const label = btn.firstChild.textContent.trim();
      status.textContent = `Showing ${n} ${cat === 'all' ? 'skills' : `${label} skills`}.`;
      runScroll();
    }));
  }

  /* ==========================================================================
     Experience timeline progress
     ========================================================================== */
  function initTimeline() {
    const tl = $('#timeline');
    const fill = $('#timelineFill');
    if (!tl || !fill) return;
    const items = $$('.timeline__item', tl).map(it => ({ it, node: $('.timeline__node', it) }));
    scrollFns.add(() => {
      const r = tl.getBoundingClientRect();
      if (r.bottom < -200 || r.top > vh + 200) return;
      const line = vh * 0.62;
      fill.style.transform = `scaleY(${clamp((line - r.top) / r.height, 0, 1).toFixed(4)})`;
      items.forEach(({ it, node }) => {
        const nr = node.getBoundingClientRect();
        it.classList.toggle('is-active', nr.top + nr.height / 2 < line);
      });
    });
    ['shown.bs.collapse', 'hidden.bs.collapse'].forEach(ev => tl.addEventListener(ev, () => { runScroll(); resizeFns.forEach(fn => fn()); }));
  }

  /* ==========================================================================
     Projects: pinned horizontal storytelling on desktop, stacked elsewhere
     ========================================================================== */
  function initProjects() {
    const section = $('#projects');
    const pin = $('#projectsPin');
    const track = $('#projectsTrack');
    const sticky = $('.projects__sticky');
    const bar = $('#projectsBar');
    const count = $('#projectsCount');
    if (!section || !pin || !track) return;
    const projects = $$('.project', track);
    const mq = matchMedia('(min-width: 992px)');
    let horizontal = false;
    let dist = 0;

    function setup() {
      horizontal = mq.matches && !reduced && innerHeight >= 600;
      section.classList.toggle('is-horizontal', horizontal);
      if (!horizontal) {
        pin.style.height = '';
        track.style.transform = '';
        return;
      }
      dist = Math.max(0, track.scrollWidth - innerWidth);
      pin.style.height = `${dist + innerHeight}px`;
      update();
    }

    function update() {
      if (!horizontal) return;
      const top = pin.getBoundingClientRect().top;
      const p = dist ? clamp(-top / dist, 0, 1) : 0;
      track.style.transform = `translate3d(${(-p * dist).toFixed(1)}px, 0, 0)`;
      bar.style.transform = `scaleX(${p.toFixed(4)})`;
      let idx = 0, best = Infinity;
      projects.forEach((pr, i) => {
        const r = pr.getBoundingClientRect();
        const d = Math.abs(r.left + r.width / 2 - innerWidth / 2);
        if (d < best) { best = d; idx = i; }
      });
      count.textContent = `${String(idx + 1).padStart(2, '0')} / ${String(projects.length).padStart(2, '0')}`;
    }

    setup();
    scrollFns.add(update);
    resizeFns.add(setup);
    mq.addEventListener('change', setup);
    addEventListener('load', setup);
    if (document.fonts) document.fonts.ready.then(setup);

    // Keep keyboard focus visible inside the pinned track
    track.addEventListener('focusin', e => {
      if (!horizontal) return;
      sticky.scrollLeft = 0;
      const panel = e.target.closest('.project, .projects__intro, .projects__outro');
      if (!panel || !dist) return;
      const x = panel.offsetLeft - (innerWidth - panel.offsetWidth) / 2;
      const p = clamp(x / dist, 0, 1);
      const pinTop = pin.getBoundingClientRect().top + scrollY;
      window.scrollTo({ top: pinTop + p * dist, behavior: 'auto' });
    });

    // Keyboard activation for the media "buttons" that open the detail modal
    $$('.project__media[role="button"]').forEach(m => m.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); m.click(); }
    }));
  }

  /* ==========================================================================
     Scroll-linked chrome: progress bar, back-to-top, expanding stage
     ========================================================================== */
  function initProgress() {
    const bar = $('#scrollProgress');
    const toTop = $('#toTop');
    const ring = $('#toTopRing');
    scrollFns.add(y => {
      const max = doc.scrollHeight - vh;
      const p = max > 0 ? clamp(y / max, 0, 1) : 0;
      bar.style.transform = `scaleX(${p.toFixed(4)})`;
      ring.style.strokeDashoffset = (100 - p * 100).toFixed(2);
      toTop.classList.toggle('is-visible', y > vh * 0.8);
    });
    $$('[data-scroll-top]').forEach(b => b.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
      const brand = $('.brand');
      if (brand) brand.focus({ preventScroll: true });
    }));
  }

  function initScrollExpand() {
    if (reduced) return;
    const els = $$('[data-scroll-expand]');
    scrollFns.add(() => els.forEach(el => {
      const r = el.getBoundingClientRect();
      if (r.top > vh || r.bottom < 0) return;
      const p = clamp((vh - r.top) / (vh * 0.75), 0, 1);
      const e = 1 - Math.pow(1 - p, 2);
      el.style.setProperty('--ex', `${((1 - e) * 6).toFixed(2)}%`);
    }));
  }

  function initDecryptHover() {
    $$('[data-decrypt]').forEach(el => { el.dataset.text = el.textContent; });
    if (reduced) return;
    $$('.section-head').forEach(head => head.addEventListener('pointerenter', () => {
      $$('[data-decrypt]', head).forEach(el => decrypt(el, null, 600));
    }));
  }

  /* ==========================================================================
     Developer terminal (predefined commands only — no code execution)
     ========================================================================== */
  function initTerminal() {
    const screen = $('#terminalScreen');
    const form = $('#terminalForm');
    const input = $('#terminalInput');
    const term = $('#devTerminal');
    if (!screen || !form || !input) return;

    const seg = (t, c = '', href = '') => ({ t, c, href });
    const L = (...segs) => segs;
    const GH = 'https://github.com/Abimanyu-Ravichandran7';
    const REPO = name => `${GH}/${name}`;

    const COMMANDS = {
      help: () => [
        L(seg('Available commands:', 't-muted')),
        L(seg('  whoami  role  technologies  focus  experience', 't-accent')),
        L(seg('  projects  education  contact  status  clear', 't-accent'))
      ],
      whoami: () => [L(seg('Abimanyu R'))],
      role: () => [L(seg('Full Stack Developer | Technical Trainer'))],
      technologies: () => [L(seg('Python, JavaScript, React, Node.js, Django, MySQL, MongoDB'))],
      focus: () => [L(seg('Application Development')), L(seg('API Integration')), L(seg('Technical Training'))],
      experience: () => [
        L(seg('Jul 2026 – Present  ', 't-dim'), seg('Technical Trainer'), seg(' · Qaroo India Private Limited', 't-muted')),
        L(seg('Oct 2024 – Oct 2025 ', 't-dim'), seg('Technical Trainer (Full Stack Python)'), seg(' · Indra Institute of Education', 't-muted')),
        L(seg('Dec 2023 – May 2024 ', 't-dim'), seg('Software Developer'), seg(' · Internship', 't-muted'))
      ],
      projects: () => [
        L(seg('01 ', 't-accent'), seg('Qaroo India — CMS Platform', '', REPO('QAROO-INDIA-PVT-LTD')), seg('  React · Node.js · MongoDB  ', 't-muted'), seg('[live]', 't-ok', 'https://qaroo-india-pvt-ltd.vercel.app')),
        L(seg('02 ', 't-accent'), seg('Institute OS', '', REPO('Institute_OS')), seg('  React · TypeScript · Express · SQLite', 't-muted')),
        L(seg('03 ', 't-accent'), seg('StockMaster — Inventory & Orders', '', REPO('product-inventory')), seg('  React · Django REST Framework', 't-muted')),
        L(seg('04 ', 't-accent'), seg('CRM Web Application', '', REPO('CRM-Customer-Relationship-Management-')), seg('  Python · JavaScript · MySQL', 't-muted')),
        L(seg('05 ', 't-accent'), seg('ERP — BMW Car Showroom', '', REPO('ERP-WEB-APPLICATION-BMW-car-showroom-')), seg('  Python · MySQL', 't-muted')),
        L(seg('Click a title to open its source on GitHub.', 't-dim'))
      ],
      education: () => [
        L(seg('2020 – 2023 ', 't-dim'), seg('Bachelor of Computer Technology'), seg(' · Gobi Arts & Science College', 't-muted')),
        L(seg('2023        ', 't-dim'), seg('Full Stack Python Developer (Certification)'), seg(' · Indra Institute of Education', 't-muted'))
      ],
      contact: () => [
        L(seg('email   ', 't-dim'), seg(CONFIG.email, '', `mailto:${CONFIG.email}`)),
        L(seg('phone   ', 't-dim'), seg('+91 9360810347', '', 'tel:+919360810347')),
        L(seg('github  ', 't-dim'), seg(GH.replace('https://', ''), '', GH)),
        L(seg('linkedin ', 't-dim'), seg('linkedin.com/in/abimanyu-ravichandran', '', 'https://www.linkedin.com/in/abimanyu-ravichandran'))
      ],
      status: () => [L(seg('Ready to build something meaningful.', 't-ok'))]
    };
    const ALIASES = { skills: 'technologies', stack: 'technologies', tech: 'technologies', ls: 'help', '?': 'help', man: 'help', cls: 'clear', about: 'whoami', email: 'contact', github: 'contact', linkedin: 'contact' };
    const BLOCKED = /^(sudo|rm|eval|exec|node|python|py|bash|sh|cd|cat|echo|curl|wget|npm|git|chmod|mkdir|touch|kill)\b/;

    const scrollDown = () => { screen.scrollTop = screen.scrollHeight; };
    const speed = reduced ? 0 : 7;

    async function typeLine(segs, extraClass = '') {
      const p = document.createElement('p');
      p.className = `t-line ${extraClass}`.trim();
      screen.appendChild(p);
      for (const s of segs) {
        const el = document.createElement(s.href ? 'a' : 'span');
        if (s.c) el.className = s.c;
        if (s.href) {
          el.href = s.href;
          if (s.href.startsWith('http')) { el.target = '_blank'; el.rel = 'noopener'; }
        }
        p.appendChild(el);
        if (!speed) { el.textContent = s.t; continue; }
        for (let i = 0; i < s.t.length; i += 2) { el.textContent = s.t.slice(0, i + 2); scrollDown(); await wait(speed); }
      }
      scrollDown();
    }

    async function promptLine(cmd, animate) {
      const p = document.createElement('p');
      p.className = 't-line';
      p.innerHTML = '<span class="t-user">abimanyu</span><span class="t-prompt">@portfolio:~$ </span><span class="t-cmd"></span>';
      screen.appendChild(p);
      const c = $('.t-cmd', p);
      if (animate && !reduced) { for (const ch of cmd) { c.textContent += ch; scrollDown(); await wait(45); } }
      else c.textContent = cmd;
      scrollDown();
    }

    const history = [];
    let hIdx = 0;

    async function run(raw, animate = false) {
      const cmd = raw.trim().toLowerCase().slice(0, 40);
      if (!cmd) return;
      history.push(cmd);
      hIdx = history.length;
      await promptLine(cmd, animate);
      if (cmd === 'clear') { await wait(reduced ? 0 : 120); screen.innerHTML = ''; return; }
      const key = ALIASES[cmd] || cmd;
      let out;
      if (Object.prototype.hasOwnProperty.call(COMMANDS, key)) out = COMMANDS[key]();
      else if (BLOCKED.test(cmd)) out = [L(seg('Permission denied: this is a read-only portfolio shell.', 't-err')), L(seg("Type 'help' to see what you can run.", 't-muted'))];
      else out = [L(seg(`command not found: ${cmd}`, 't-err')), L(seg("Type 'help' to see available commands.", 't-muted'))];
      for (const line of out) await typeLine(line);
      const gap = document.createElement('div');
      gap.className = 't-gap';
      gap.style.height = '.6rem';
      screen.appendChild(gap);
      scrollDown();
    }

    let chain = Promise.resolve();
    const queue = (cmd, animate) => { chain = chain.then(() => run(cmd, animate)).catch(() => {}); return chain; };

    form.addEventListener('submit', e => {
      e.preventDefault();
      const v = input.value;
      input.value = '';
      queue(v, false);
    });

    input.addEventListener('keydown', e => {
      if (e.key === 'ArrowUp' && history.length) { e.preventDefault(); hIdx = Math.max(0, hIdx - 1); input.value = history[hIdx]; }
      else if (e.key === 'ArrowDown' && history.length) { e.preventDefault(); hIdx = Math.min(history.length, hIdx + 1); input.value = history[hIdx] || ''; }
    });

    $$('[data-cmd]', term).forEach(b => b.addEventListener('click', () => queue(b.dataset.cmd, true)));

    let booted = false;
    const boot = () => {
      if (booted) return;
      booted = true;
      chain = chain
        .then(() => typeLine([seg('Welcome to Abimanyu’s dev shell — read-only, predefined commands only.', 't-muted')]))
        .then(() => typeLine([seg("Type 'help' or click a command below.", 't-muted')]))
        .then(() => wait(reduced ? 0 : 250))
        .then(() => run('whoami', true))
        .catch(() => {});
    };
    inViewHooks.push(el => { if (el === term) boot(); });
  }

  /* ==========================================================================
     Contact form — validation + honest delivery feedback
     ========================================================================== */
  function initContact() {
    const form = $('#contactForm');
    if (!form) return;
    const fields = { name: $('#cfName'), email: $('#cfEmail'), subject: $('#cfSubject'), message: $('#cfMessage') };
    const btn = $('#cfSubmit');
    const status = $('#formStatus');
    const note = $('#formNote span');
    const honeypot = $('#cfWebsite');
    const direct = Boolean(CONFIG.contactEndpoint);

    note.textContent = direct
      ? 'Your message is delivered straight to my inbox.'
      : 'Opens your email app with your message ready to send.';
    $('.btn-x__text', btn).textContent = direct ? 'Send Message' : 'Send via Email App';

    const rules = {
      name: v => v.length >= 2 || 'Please enter your full name (at least 2 characters).',
      email: v => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) || 'Please enter a valid email address, e.g. name@example.com.',
      subject: v => v.length >= 3 || 'Please add a subject (at least 3 characters).',
      message: v => v.length >= 10 || 'Please write a message (at least 10 characters).'
    };

    function validate(key) {
      const el = fields[key];
      const res = rules[key](el.value.trim());
      const ok = res === true;
      el.classList.toggle('is-invalid', !ok);
      el.setAttribute('aria-invalid', String(!ok));
      document.getElementById(el.getAttribute('aria-describedby')).textContent = ok ? '' : res;
      return ok;
    }

    Object.keys(fields).forEach(k => {
      fields[k].addEventListener('blur', () => { if (fields[k].value.trim()) validate(k); });
      fields[k].addEventListener('input', () => { if (fields[k].classList.contains('is-invalid')) validate(k); });
    });

    function setStatus(type, message, withEmail = false) {
      status.className = 'form-status';
      status.textContent = '';
      if (!type) return;
      status.classList.add(`is-${type}`);
      const icon = document.createElement('i');
      icon.className = `bi ${type === 'success' ? 'bi-check2-circle' : type === 'error' ? 'bi-exclamation-triangle' : 'bi-envelope-paper'}`;
      icon.setAttribute('aria-hidden', 'true');
      const text = document.createElement('span');
      text.textContent = message;
      if (withEmail) {
        text.appendChild(document.createTextNode(' '));
        const a = document.createElement('a');
        a.href = `mailto:${CONFIG.email}`;
        a.textContent = CONFIG.email;
        text.appendChild(a);
        text.appendChild(document.createTextNode('.'));
      }
      status.append(icon, text);
    }

    const setLoading = on => {
      btn.classList.toggle('is-loading', on);
      btn.disabled = on;
      btn.setAttribute('aria-busy', String(on));
    };

    form.addEventListener('submit', async e => {
      e.preventDefault();
      setStatus('');
      const keys = Object.keys(fields);
      const results = keys.map(validate);
      const firstBad = results.indexOf(false);
      if (firstBad !== -1) {
        fields[keys[firstBad]].focus();
        setStatus('error', 'Please fix the highlighted fields and try again.');
        return;
      }
      if (honeypot.value) return; // bot submission — silently ignore

      const data = Object.fromEntries(keys.map(k => [k, fields[k].value.trim()]));
      setLoading(true);

      if (direct) {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 15000);
        try {
          const res = await fetch(CONFIG.contactEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify({ ...data, _subject: `Portfolio: ${data.subject}` }),
            signal: ctrl.signal
          });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          form.reset();
          keys.forEach(k => fields[k].removeAttribute('aria-invalid'));
          setStatus('success', 'Thank you — your message has been sent. I will get back to you soon.');
        } catch (err) {
          setStatus('error', 'Sorry, your message could not be sent right now. Please email me directly at', true);
        } finally {
          clearTimeout(timer);
          setLoading(false);
        }
        return;
      }

      // No delivery service configured: hand off to the visitor's email app.
      const body = `${data.message}\n\n— ${data.name}\n${data.email}`;
      const href = `mailto:${CONFIG.email}?subject=${encodeURIComponent(data.subject)}&body=${encodeURIComponent(body)}`;
      window.location.href = href;
      setTimeout(() => {
        setLoading(false);
        setStatus('info', 'Your email app should now be open with this message ready — press Send there to deliver it. Nothing has been sent yet. If no app opened, you can email me at', true);
      }, 700);
    });
  }

  /* ==========================================================================
     Copy email + resume download feedback
     ========================================================================== */
  function initCopy() {
    $$('[data-copy]').forEach(btn => btn.addEventListener('click', async () => {
      const text = btn.dataset.copy;
      let ok = false;
      try {
        await navigator.clipboard.writeText(text);
        ok = true;
      } catch (err) {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.setAttribute('readonly', '');
        ta.style.cssText = 'position:fixed;opacity:0;pointer-events:none';
        document.body.appendChild(ta);
        ta.select();
        try { ok = document.execCommand('copy'); } catch (e2) { ok = false; }
        ta.remove();
      }
      const icon = btn.querySelector('i');
      if (ok) {
        btn.classList.add('is-copied');
        icon.className = 'bi bi-check2';
        btn.setAttribute('aria-label', 'Email address copied');
        toast('Email address copied to clipboard');
        setTimeout(() => {
          btn.classList.remove('is-copied');
          icon.className = 'bi bi-clipboard';
          btn.setAttribute('aria-label', 'Copy email address');
        }, 2200);
      } else {
        toast('Copy failed — please select the address to copy it', 'bi-exclamation-triangle');
      }
    }));
  }

  function initResume() {
    $$('[data-resume]').forEach(a => a.addEventListener('click', () => {
      a.classList.add('is-downloading');
      toast('Downloading Abimanyu_R_Resume.pdf', 'bi-file-earmark-arrow-down');
      setTimeout(() => a.classList.remove('is-downloading'), 1800);
    }));
  }

  /* ==========================================================================
     Boot
     ========================================================================== */
  safe('split text', () => $$('[data-split]').forEach(splitText));
  safe('blur text', () => $$('[data-blur]').forEach(blurText));
  safe('counters', () => $$('[data-count]').forEach(el => { if (!reduced) el.textContent = '0'; }));
  safe('bio highlight', initBioHighlight);
  safe('decrypt', initDecryptHover);
  safe('nav', initNav);
  safe('cursor', initCursor);
  safe('particles', initParticles);
  safe('magnetic', initMagnetic);
  safe('spotlight', initSpotlight);
  safe('tilt', initTilt);
  safe('id card', initIdCard);
  safe('parallax', initParallax);
  safe('hero pointer', initHeroPointer);
  safe('orbit', initOrbit);
  safe('skills', initSkills);
  safe('timeline', initTimeline);
  safe('projects', initProjects);
  safe('terminal', initTerminal);
  safe('contact', initContact);
  safe('copy', initCopy);
  safe('resume', initResume);
  safe('progress', initProgress);
  safe('scroll expand', initScrollExpand);
  safe('year', () => { $('#year').textContent = String(new Date().getFullYear()); });

  initLoader(() => {
    doc.classList.add('is-ready');
    safe('reveal', initReveal);
    runScroll();
    setTimeout(() => safe('hero terminal', runHeroTerminal), reduced ? 0 : 1300);
    setTimeout(() => safe('role typewriter', initRoleTypewriter), reduced ? 0 : 2200);
  });
})();
