/* ============================================================
   SAGAR C R — PORTFOLIO SCRIPT
   Sections: Intro (identity slot reels), Code rain, Nav,
             Scroll reveal, 3D tilt + glare, Counters,
             Terminal typing, Contact actions
   ============================================================ */

/* Contact form: set FORM_ENDPOINT to a Formspree / Web3Forms URL to deliver
   messages straight to your inbox. While it is empty, the form opens the
   visitor's email app with the message pre-filled (mailto). */
const FORM_ENDPOINT = '';
const CONTACT_EMAIL = 'sagarsagi2004@gmail.com';

document.addEventListener('DOMContentLoaded', () => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  document.getElementById('year').textContent = new Date().getFullYear();

  initIntro(reduceMotion);
  initCodeRain('introRain', reduceMotion, false);
  initPageRain(reduceMotion);
  initHeroTitleReveal(reduceMotion);
  initScrollExtras();
  initHeaderScroll();
  initNav();
  initMobileMenu();
  initScrollReveal(reduceMotion);
  initTilt(reduceMotion);
  initHeroParallax(reduceMotion);
  initCounters();
  initTerminal(reduceMotion);
  initContact();
  initContactForm();
});

/* ----------------------------------------------------------
   1. INTRO — "I'M S A G A R" SLOT-MACHINE REVEAL
   ---------------------------------------------------------- */
function initIntro(reduceMotion){
  const body = document.body;
  const introEl = document.getElementById('intro');
  const alreadyPlayed = sessionStorage.getItem('introPlayed') === 'true';

  const finishIntro = () => {
    sessionStorage.setItem('introPlayed', 'true');
    introEl.classList.add('intro-hidden');
    body.classList.remove('intro-active');
    body.classList.add('intro-done');
    window.setTimeout(() => { introEl.style.display = 'none'; }, 750);
  };

  if (alreadyPlayed || reduceMotion) {
    introEl.style.display = 'none';
    body.classList.remove('intro-active');
    body.classList.add('intro-done');
    return;
  }

  const reels = Array.from(document.querySelectorAll('.reel'));
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

  const BASE_SPIN = 500;   // was 850 — reels start locking sooner
  const STAGGER = 160;    // was 260 — tighter gap between each letter locking

  let maxStop = 0;

  reels.forEach((reel, i) => {
    const charEl = reel.querySelector('.reel-char');
    const finalChar = reel.dataset.final;
    const stopAt = BASE_SPIN + i * STAGGER;
    maxStop = Math.max(maxStop, stopAt);

    const spinId = window.setInterval(() => {
      charEl.textContent = chars[Math.floor(Math.random() * chars.length)];
    }, 45);

    window.setTimeout(() => {
      window.clearInterval(spinId);
      charEl.textContent = finalChar;
      reel.classList.add('locked');
    }, stopAt);
  });

  // Finishing effect: flash + ring, light sweep, underline, then a soft exit
  const t = maxStop;
  window.setTimeout(() => introEl.classList.add('intro-flash'), t + 200);
  window.setTimeout(() => introEl.classList.add('intro-sweep-go'), t + 420);
  window.setTimeout(() => introEl.classList.add('intro-line-go'), t + 620);
  window.setTimeout(() => introEl.classList.add('intro-exit'), t + 1300);
  window.setTimeout(finishIntro, t + 1900);

  // Safety net: never block the site for more than ~6s
  window.setTimeout(finishIntro, 6000);
}

/* ----------------------------------------------------------
   2. CODE RAIN — ambient canvas backdrop
   ---------------------------------------------------------- */
function initCodeRain(canvasId, reduceMotion, alwaysOn){
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  if (reduceMotion) {
    canvas.style.display = 'none';
    return;
  }

  const ctx = canvas.getContext('2d');
  const glyphs = '01{}<>/;=+-*#[]()_$%'.split('');
  let width = 0, height = 0, columns = 0, drops = [];
  let running = true;
  let resizeTimer = null;

  const setup = () => {
    const rect = canvas.getBoundingClientRect();
    width = canvas.width = Math.max(1, Math.floor(rect.width));
    height = canvas.height = Math.max(1, Math.floor(rect.height));
    columns = Math.max(1, Math.floor(width / 20));
    drops = new Array(columns).fill(0).map(() => Math.random() * -60);
  };

  const onResize = () => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(setup, 200);
  };

  setup();
  window.addEventListener('resize', onResize);

  // Pause the animation while its section is off-screen to save cycles
  if (!alwaysOn && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => { running = entry.isIntersecting; });
    }, { threshold: 0 });
    io.observe(canvas.closest('section') || canvas);
  }

  const draw = () => {
    if (running && width > 0 && height > 0) {
      ctx.fillStyle = 'rgba(11,12,14,0.09)';
      ctx.fillRect(0, 0, width, height);
      ctx.font = '15px "JetBrains Mono", monospace';

      for (let i = 0; i < drops.length; i++) {
        const glyph = glyphs[Math.floor(Math.random() * glyphs.length)];
        const x = i * 20;
        const y = drops[i] * 18;

        // Leading glyph glows brighter than the trailing tail for more depth
        ctx.fillStyle = Math.random() > 0.92 ? '#FFD98A' : '#FFB627';
        ctx.fillText(glyph, x, y);

        if (y > height && Math.random() > 0.975) {
          drops[i] = 0;
        } else {
          drops[i] += 1;
        }
      }
    }
    requestAnimationFrame(draw);
  };

  requestAnimationFrame(draw);
}

/* ----------------------------------------------------------
   2b. PAGE RAIN — one calm fixed canvas behind the whole site.
       CSS masks it so it is strongest at the left/right edges
       and very quiet behind the reading column.
   ---------------------------------------------------------- */
/* pageRain canvas is shared with initScrollExtras via this ref */
let _pageRainCanvas = null;

function initPageRain(reduceMotion){
  const canvas = document.getElementById('pageRain');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  _pageRainCanvas = canvas;

  const glyphs = '01{}<>/;=+-*#[]()_$%'.split('');
  const STEP = 20, LINE = 18, FPS = 30;
  /* OPACITY_START: bright at top; OPACITY_END: near-invisible at bottom */
  const OPACITY_START = 0.42, OPACITY_END = 0.06;
  let width = 0, height = 0, drops = [];
  let running = true, last = 0, resizeTimer = null;
  /* scrollOpacity is updated by initScrollExtras on every scroll event */
  canvas._scrollOpacity = OPACITY_START;

  const setup = () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
    ctx.fillStyle = '#0B0C0E';
    ctx.fillRect(0, 0, width, height);
    drops = new Array(Math.ceil(width / STEP)).fill(0).map(() => Math.random() * -40);
  };

  const drawFrame = () => {
    /* fade trail — slightly more opaque trail = crisper chars */
    ctx.fillStyle = 'rgba(11,12,14,0.11)';
    ctx.fillRect(0, 0, width, height);
    ctx.font = '14px "JetBrains Mono", monospace';
    const op = canvas._scrollOpacity;
    for (let i = 0; i < drops.length; i++) {
      const y = drops[i] * LINE;
      /* leading glyph slightly brighter */
      const bright = Math.random() > 0.88;
      ctx.fillStyle = bright
        ? `rgba(255,217,138,${Math.min(1, op * 1.3)})`
        : `rgba(255,182,39,${op})`;
      ctx.fillText(glyphs[Math.floor(Math.random() * glyphs.length)], i * STEP, y);
      if (y > height && Math.random() > 0.97) drops[i] = 0; else drops[i] += 1;
    }
  };

  setup();
  window.addEventListener('resize', () => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(setup, 200);
  });

  if (reduceMotion) {
    canvas._scrollOpacity = 0.14;
    for (let n = 0; n < 60; n++) drawFrame();
    canvas.style.opacity = '1';
    return;
  }

  document.addEventListener('visibilitychange', () => { running = !document.hidden; });

  const loop = (now) => {
    if (running && now - last >= 1000 / FPS) {
      last = now;
      drawFrame();
    }
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
  /* fade the canvas element in gently once the intro exits */
  const showCanvas = () => { canvas.style.opacity = '1'; canvas.style.transition = 'opacity 1.4s ease'; };
  if (document.body.classList.contains('intro-done')) {
    showCanvas();
  } else {
    const chk = window.setInterval(() => {
      if (document.body.classList.contains('intro-done')) { window.clearInterval(chk); showCanvas(); }
    }, 100);
  }
}

/* ----------------------------------------------------------
   2c. HERO TITLE — letters rise in once the intro has finished,
       then a brief amber shimmer passes across them
   ---------------------------------------------------------- */
function initHeroTitleReveal(reduceMotion){
  const title = document.querySelector('.hero-title-line');
  if (!title || reduceMotion) return;

  const text = title.textContent;
  title.setAttribute('aria-label', text);
  title.textContent = '';
  let n = 0;
  Array.from(text).forEach((ch) => {
    const span = document.createElement('span');
    span.setAttribute('aria-hidden', 'true');
    if (ch === ' ') {
      span.className = 'char-space';
      span.innerHTML = '&nbsp;';
    } else {
      span.className = 'char';
      span.style.setProperty('--i', n++);
      span.textContent = ch;
    }
    title.appendChild(span);
  });
  title.classList.add('title-split');

  const go = () => {
    window.setTimeout(() => {
      title.classList.add('title-go');
      window.setTimeout(() => title.classList.add('title-shimmer'), 700);
    }, 150);
  };

  if (document.body.classList.contains('intro-done')) {
    go();
  } else {
    const check = window.setInterval(() => {
      if (document.body.classList.contains('intro-done')) {
        window.clearInterval(check);
        go();
      }
    }, 100);
  }
}

/* ----------------------------------------------------------
   2d. SCROLL PROGRESS BAR + BACK-TO-TOP
   ---------------------------------------------------------- */
function initScrollExtras(){
  const bar = document.getElementById('scrollProgress');
  const topBtn = document.getElementById('toTop');
  /* rain opacity: 0.42 at top → 0.06 at bottom of page */
  const RAIN_TOP = 0.42, RAIN_BOT = 0.06;
  let ticking = false;

  const update = () => {
    const doc = document.documentElement;
    const max = doc.scrollHeight - window.innerHeight;
    const pct = max > 0 ? Math.min(1, window.scrollY / max) : 0;
    if (bar) bar.style.transform = `scaleX(${pct})`;
    if (topBtn) topBtn.classList.toggle('show', window.scrollY > 700);
    /* dim the rain as the user scrolls — write directly onto the canvas ref */
    if (_pageRainCanvas) {
      _pageRainCanvas._scrollOpacity = RAIN_TOP - (RAIN_TOP - RAIN_BOT) * pct;
    }
    ticking = false;
  };

  window.addEventListener('scroll', () => {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  }, { passive: true });
  update();

  if (topBtn) {
    topBtn.addEventListener('click', () => {
      const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      window.scrollTo({ top: 0, behavior: smooth ? 'smooth' : 'auto' });
    });
  }
}

/* ----------------------------------------------------------
   3. STICKY HEADER
   ---------------------------------------------------------- */
function initHeaderScroll(){
  const header = document.getElementById('siteHeader');
  if (!header) return;
  const onScroll = () => {
    header.classList.toggle('scrolled', window.scrollY > 12);
  };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
}

/* ----------------------------------------------------------
   4. NAV — smooth scroll + active section highlight
   ---------------------------------------------------------- */
function initNav(){
  const navLinks = Array.from(document.querySelectorAll('.nav-link, .mobile-link'));
  const sections = Array.from(document.querySelectorAll('main section[id]'));

  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      const targetId = link.getAttribute('href');
      const target = document.querySelector(targetId);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        closeMobileMenu();
        history.pushState(null, '', targetId);
      }
    });
  });

  if (!sections.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const id = entry.target.getAttribute('id');
        navLinks.forEach(link => {
          link.classList.toggle('active', link.dataset.section === id);
        });
      }
    });
  }, { rootMargin: '-45% 0px -45% 0px', threshold: 0 });

  sections.forEach(section => observer.observe(section));
}

/* ----------------------------------------------------------
   5. MOBILE MENU
   ---------------------------------------------------------- */
function closeMobileMenu(){
  const menu = document.getElementById('mobileMenu');
  const toggle = document.getElementById('menuToggle');
  if (!menu || !toggle) return;
  menu.classList.remove('open');
  toggle.setAttribute('aria-expanded', 'false');
  toggle.setAttribute('aria-label', 'Open menu');
  document.body.style.overflow = '';
}

function initMobileMenu(){
  const toggle = document.getElementById('menuToggle');
  const menu = document.getElementById('mobileMenu');
  if (!toggle || !menu) return;

  toggle.addEventListener('click', () => {
    const isOpen = menu.classList.toggle('open');
    toggle.setAttribute('aria-expanded', String(isOpen));
    toggle.setAttribute('aria-label', isOpen ? 'Close menu' : 'Open menu');
    document.body.style.overflow = isOpen ? 'hidden' : '';
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeMobileMenu();
  });
}

/* ----------------------------------------------------------
   6. SCROLL REVEAL
   ---------------------------------------------------------- */
function initScrollReveal(reduceMotion){
  const revealEls = document.querySelectorAll('.reveal');
  if (!revealEls.length) return;

  if (reduceMotion) {
    revealEls.forEach(el => el.classList.add('in-view'));
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry, i) => {
      if (entry.isIntersecting) {
        window.setTimeout(() => entry.target.classList.add('in-view'), (i % 6) * 60);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.14, rootMargin: '0px 0px -60px 0px' });

  revealEls.forEach(el => observer.observe(el));
}

/* ----------------------------------------------------------
   7. 3D TILT + GLARE — cards, tiles, photo, terminal
   ---------------------------------------------------------- */
function initTilt(reduceMotion){
  if (reduceMotion) return;
  const isCoarsePointer = window.matchMedia('(pointer: coarse)').matches;
  if (isCoarsePointer) return;

  const tiltEls = document.querySelectorAll('.tilt');
  const RANGE = { strong: { x: 9, y: 12 }, soft: { x: 5, y: 6 } };

  tiltEls.forEach(el => {
    const intensity = RANGE[el.dataset.tilt] || RANGE.soft;
    const lift = parseFloat(el.dataset.lift) || 0;
    let frame = null;

    el.addEventListener('mouseenter', () => {
      el.style.transition = 'none';
      el.classList.add('tilting');
    });

    el.addEventListener('mousemove', (e) => {
      const rect = el.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width;
      const py = (e.clientY - rect.top) / rect.height;

      if (frame) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const rotateX = (-(py - 0.5) * 2 * intensity.x).toFixed(2);
        const rotateY = ((px - 0.5) * 2 * intensity.y).toFixed(2);
        el.style.transform = `perspective(900px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(${-lift}px) translateZ(0)`;
        el.style.setProperty('--mx', `${px * 100}%`);
        el.style.setProperty('--my', `${py * 100}%`);
      });
    });

    el.addEventListener('mouseleave', () => {
      if (frame) cancelAnimationFrame(frame);
      el.classList.remove('tilting');
      el.style.transition = 'transform .5s cubic-bezier(.16,.8,.28,1)';
      el.style.transform = 'perspective(900px) rotateX(0deg) rotateY(0deg)';
    });
  });
}

/* ----------------------------------------------------------
   8. HERO PARALLAX — glow layer follows the cursor gently
   ---------------------------------------------------------- */
function initHeroParallax(reduceMotion){
  if (reduceMotion) return;
  const hero = document.getElementById('home');
  const glow = document.getElementById('heroGlow');
  if (!hero || !glow) return;
  if (window.matchMedia('(pointer: coarse)').matches) return;

  let frame = null;
  hero.addEventListener('mousemove', (e) => {
    const rect = hero.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    if (frame) cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      glow.style.transform = `translate(${px * 30}px, ${py * 30}px)`;
    });
  });
  hero.addEventListener('mouseleave', () => {
    if (frame) cancelAnimationFrame(frame);
    glow.style.transform = 'translate(0px, 0px)';
  });
}

/* ----------------------------------------------------------
   9. STAT COUNTERS
   ---------------------------------------------------------- */
function initCounters(){
  const counters = document.querySelectorAll('.stat-num[data-count]');
  if (!counters.length) return;

  const animateCounter = (el) => {
    const target = parseInt(el.dataset.count, 10) || 0;
    const duration = 900;
    const start = performance.now();

    const step = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.round(eased * target);
      if (progress < 1) requestAnimationFrame(step);
      else el.textContent = target;
    };
    requestAnimationFrame(step);
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        animateCounter(entry.target);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.6 });

  counters.forEach(el => observer.observe(el));
}

/* ----------------------------------------------------------
   10. HERO TERMINAL — typed boot log
   ---------------------------------------------------------- */
function initTerminal(reduceMotion){
  const body = document.getElementById('terminalBody');
  if (!body) return;

  const lines = [
    { text: '$ whoami', type: 'prompt' },
    { text: 'sagar_c_r \u2014 full-stack developer', type: 'out' },
    { text: '$ status --check', type: 'prompt' },
    { text: 'pursuing MCA \u00b7 Maharaja Institute of Technology, Mysore', type: 'out' },
    { text: 'availability: open to opportunities', type: 'out-accent' },
    { text: '$ stack --list', type: 'prompt' },
    { text: 'python \u00b7 javascript \u00b7 angular \u00b7 flask \u00b7 fastapi', type: 'out' },
    { text: 'mysql \u00b7 postgresql \u00b7 git \u00b7 rest apis', type: 'out' },
  ];

  if (reduceMotion) {
    body.innerHTML = lines.map(renderLine).join('');
    return;
  }

  let lineIndex = 0;

  const typeNext = () => {
    if (lineIndex >= lines.length) return;
    const lineData = lines[lineIndex];
    const p = document.createElement('p');
    p.className = 't-line ' + (lineData.type === 'prompt' ? 't-prompt' : lineData.type === 'out-accent' ? 't-accent' : 't-out');
    p.style.opacity = '1';
    body.appendChild(p);

    let charIndex = 0;
    const speed = lineData.type === 'prompt' ? 34 : 14;

    const typeChar = () => {
      if (charIndex <= lineData.text.length) {
        p.textContent = lineData.text.slice(0, charIndex);
        charIndex++;
        window.setTimeout(typeChar, speed);
      } else {
        lineIndex++;
        window.setTimeout(typeNext, lineData.type === 'prompt' ? 120 : 260);
      }
    };
    typeChar();
  };

  const start = () => window.setTimeout(typeNext, 400);
  if (document.body.classList.contains('intro-done')) {
    start();
  } else {
    const check = window.setInterval(() => {
      if (document.body.classList.contains('intro-done')) {
        window.clearInterval(check);
        start();
      }
    }, 200);
  }

  window.setTimeout(() => {
    const cursor = document.createElement('span');
    cursor.className = 'cursor-blink';
    body.appendChild(cursor);
  }, 400 + lines.length * 900);
}

function renderLine(lineData){
  const cls = lineData.type === 'prompt' ? 't-prompt' : lineData.type === 'out-accent' ? 't-accent' : 't-out';
  return `<p class="t-line ${cls}" style="opacity:1">${lineData.text}</p>`;
}

/* ----------------------------------------------------------
   11. CONTACT — copy email + external links
   ---------------------------------------------------------- */
function initContact(){
  const copyBtn = document.getElementById('copyEmailBtn');
  const toast = document.getElementById('toast');
  if (!copyBtn || !toast) return;

  copyBtn.addEventListener('click', async () => {
    const email = copyBtn.dataset.email;
    try {
      await navigator.clipboard.writeText(email);
      showToast(toast, 'Email copied to clipboard');
    } catch (err) {
      window.location.href = `mailto:${email}`;
    }
  });

  // GitHub / LinkedIn / other contact-links are plain <a href target="_blank">
  // elements — the browser handles navigation natively, no JS required.
}

/* ----------------------------------------------------------
   12. CONTACT FORM — validate, then send via FORM_ENDPOINT
       or fall back to the visitor's email app (mailto)
   ---------------------------------------------------------- */
function initContactForm(){
  const form = document.getElementById('contactForm');
  if (!form) return;
  const status = document.getElementById('cfStatus');
  const submit = document.getElementById('cfSubmit');
  const toast = document.getElementById('toast');

  const fields = {
    name:    { el: document.getElementById('cfName'),    err: document.getElementById('cfNameErr') },
    email:   { el: document.getElementById('cfEmail'),   err: document.getElementById('cfEmailErr') },
    message: { el: document.getElementById('cfMessage'), err: document.getElementById('cfMessageErr') }
  };
  const emailOk = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

  const setError = (key, msg) => {
    const f = fields[key];
    f.err.textContent = msg;
    f.el.closest('.field').classList.toggle('has-error', !!msg);
    if (msg) f.el.setAttribute('aria-invalid', 'true'); else f.el.removeAttribute('aria-invalid');
  };

  const validate = () => {
    let first = null;
    const name = fields.name.el.value.trim();
    const email = fields.email.el.value.trim();
    const msg = fields.message.el.value.trim();
    setError('name', name ? '' : 'Please enter your name.');
    setError('email', !email ? 'Please enter your email.' : (emailOk(email) ? '' : 'Please enter a valid email address.'));
    setError('message', msg.length >= 10 ? '' : 'Please write a message (at least 10 characters).');
    ['name', 'email', 'message'].some((k) => {
      if (fields[k].err.textContent) { first = fields[k].el; return true; }
      return false;
    });
    if (first) first.focus();
    return !first;
  };

  const say = (text, kind) => {
    status.textContent = text;
    status.className = 'form-status' + (kind ? ' ' + kind : '');
  };

  Object.keys(fields).forEach((k) => {
    fields[k].el.addEventListener('input', () => { if (fields[k].err.textContent) setError(k, ''); });
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    say('', '');
    if (document.getElementById('cfCompany').value) return; // honeypot
    if (!validate()) return;

    const name = fields.name.el.value.trim();
    const email = fields.email.el.value.trim();
    const subject = document.getElementById('cfSubject').value.trim() || `Portfolio message from ${name}`;
    const message = fields.message.el.value.trim();

    if (FORM_ENDPOINT) {
      submit.disabled = true;
      say('Sending…', '');
      try {
        const res = await fetch(FORM_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify({ name, email, subject, message })
        });
        if (!res.ok) throw new Error('bad status');
        form.reset();
        say('Thanks, your message has been sent.', 'ok');
        if (toast) showToast(toast, 'Message sent');
      } catch (err) {
        say(`Could not send right now. Please email ${CONTACT_EMAIL} directly.`, 'err');
      } finally {
        submit.disabled = false;
      }
      return;
    }

    const body = `${message}\n\n— ${name} (${email})`;
    window.location.href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    say('Opening your email app with the message ready to send.', 'ok');
  });
}

function showToast(toast, message){
  toast.textContent = message;
  toast.classList.add('show');
  window.setTimeout(() => toast.classList.remove('show'), 2400);
}
