// Loaded with `defer`: the DOM is parsed before this runs, so no loader / load-event wait.
const root = document.documentElement;
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

// ============================================
// THEME TOGGLE
// ============================================
const themeToggle = document.getElementById('themeToggle');

function readSavedTheme() {
  try { return localStorage.getItem('theme') || 'dark'; } catch (e) { return 'dark'; }
}

function applyTheme(theme) {
  root.setAttribute('data-theme', theme);
  themeToggle.checked = theme === 'light';
}

applyTheme(readSavedTheme());

themeToggle.addEventListener('change', () => {
  const theme = themeToggle.checked ? 'light' : 'dark';
  // Colour transitions only while switching, so they never fight hover/reveal transitions
  root.classList.add('theme-switching');
  applyTheme(theme);
  setTimeout(() => root.classList.remove('theme-switching'), 450);
  try { localStorage.setItem('theme', theme); } catch (e) { /* storage blocked: theme still applies */ }
});

// ============================================
// CUSTOM CURSOR (fine pointers only, rAF loop sleeps when idle)
// ============================================
function initCursor() {
  if (!finePointer || reducedMotion) return;
  const cursor = document.getElementById('cursor');
  const follower = document.getElementById('cursorFollower');
  root.classList.add('has-cursor');

  let mouseX = -100, mouseY = -100, followerX = -100, followerY = -100;
  let running = false;

  function tick() {
    followerX += (mouseX - followerX) * 0.18;
    followerY += (mouseY - followerY) * 0.18;
    follower.style.transform = `translate3d(${followerX}px, ${followerY}px, 0)`;
    if (Math.abs(mouseX - followerX) + Math.abs(mouseY - followerY) > 0.5) {
      requestAnimationFrame(tick);
    } else {
      running = false;
    }
  }

  document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    cursor.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0)`;
    root.classList.add('cursor-active');
    if (!running) { running = true; requestAnimationFrame(tick); }
  }, { passive: true });

  const HOVER_SELECTOR = 'a, button, label, .tag, .cert-item, .project-card, .timeline-card, .impact-card';
  document.addEventListener('mouseover', (e) => {
    const on = !!e.target.closest(HOVER_SELECTOR);
    cursor.classList.toggle('click', on);
    follower.classList.toggle('hover', on);
  }, { passive: true });

  document.addEventListener('mousedown', () => cursor.classList.add('down'));
  document.addEventListener('mouseup', () => cursor.classList.remove('down'));
}

// ============================================
// SCROLL: navbar state + progress bar (one rAF-throttled handler)
// ============================================
function initScroll() {
  const navbar = document.getElementById('navbar');
  const progress = document.getElementById('scrollProgress');
  let ticking = false;

  function update() {
    const y = window.scrollY;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    navbar.classList.toggle('scrolled', y > 30);
    progress.style.transform = `scaleX(${max > 0 ? y / max : 0})`;
    ticking = false;
  }

  window.addEventListener('scroll', () => {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  }, { passive: true });
  update();
}

// ============================================
// HAMBURGER
// ============================================
function initMobileNav() {
  const hamburger = document.getElementById('hamburger');
  const mobileNav = document.getElementById('mobileNav');

  function setOpen(open) {
    mobileNav.classList.toggle('open', open);
    hamburger.classList.toggle('open', open);
    hamburger.setAttribute('aria-expanded', String(open));
  }

  hamburger.addEventListener('click', () => setOpen(!mobileNav.classList.contains('open')));
  mobileNav.querySelectorAll('a').forEach(link => link.addEventListener('click', () => setOpen(false)));
}

// ============================================
// TYPED TEXT
// ============================================
const PHRASES = [
  'Senior Android Engineer',
  'Mobile Team Lead',
  'Jetpack Compose & KMP',
  'BLE & RFID Specialist',
  'Certified Ethical Hacker',
];

function initTyping() {
  const typedEl = document.getElementById('typedText');
  if (reducedMotion) return; // static first phrase stays in the HTML

  let phraseIndex = 0;
  let charIndex = PHRASES[0].length;
  let isDeleting = true;

  function type() {
    const phrase = PHRASES[phraseIndex];
    charIndex += isDeleting ? -1 : 1;
    typedEl.textContent = phrase.slice(0, charIndex);

    let delay = isDeleting ? 45 : 90;
    if (!isDeleting && charIndex === phrase.length) {
      delay = 2000;
      isDeleting = true;
    } else if (isDeleting && charIndex === 0) {
      isDeleting = false;
      phraseIndex = (phraseIndex + 1) % PHRASES.length;
      delay = 350;
    }
    setTimeout(type, delay);
  }
  setTimeout(type, 2200);
}

// ============================================
// PARTICLE CANVAS (pauses off-screen / hidden tab, DPR-aware)
// ============================================
function initParticles() {
  const canvas = document.getElementById('particleCanvas');
  if (!canvas || reducedMotion) return;
  const ctx = canvas.getContext('2d');
  const LINK_DIST = 120;
  const LINK_DIST_SQ = LINK_DIST * LINK_DIST;
  const count = window.innerWidth < 768 ? 28 : 55;
  let width = 0, height = 0;
  let visible = true;
  let frame = 0;

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = canvas.offsetWidth;
    height = canvas.offsetHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function makeParticle() {
    return {
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 2 + 0.5,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      color: `rgba(${Math.random() > 0.5 ? '108,99,255' : '168,85,247'},${(Math.random() * 0.5 + 0.1).toFixed(2)})`,
    };
  }

  resize();
  let particles = Array.from({ length: count }, makeParticle);

  function draw() {
    ctx.clearRect(0, 0, width, height);
    particles = particles.map(p => {
      const nx = p.x + p.vx;
      const ny = p.y + p.vy;
      return (nx < 0 || nx > width || ny < 0 || ny > height) ? makeParticle() : { ...p, x: nx, y: ny };
    });

    for (const p of particles) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.fill();
    }

    ctx.lineWidth = 0.5;
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const distSq = dx * dx + dy * dy;
        if (distSq < LINK_DIST_SQ) {
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = `rgba(108,99,255,${0.08 * (1 - Math.sqrt(distSq) / LINK_DIST)})`;
          ctx.stroke();
        }
      }
    }
    frame = requestAnimationFrame(draw);
  }

  function setRunning(run) {
    cancelAnimationFrame(frame);
    if (run) frame = requestAnimationFrame(draw);
  }

  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    setRunning(visible && !document.hidden);
  }).observe(canvas);

  document.addEventListener('visibilitychange', () => setRunning(visible && !document.hidden));

  let resizeTimer = 0;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resize, 150);
  }, { passive: true });
}

// ============================================
// COUNT-UP NUMBERS (rAF, eased, run once when visible)
// ============================================
function animateCount(el) {
  const target = parseInt(el.dataset.target, 10);
  if (Number.isNaN(target) || reducedMotion) return;
  const duration = 1200;
  const start = performance.now();
  function step(now) {
    const t = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - t, 3);
    el.textContent = String(Math.round(target * eased));
    if (t < 1) requestAnimationFrame(step);
  }
  el.textContent = '0';
  requestAnimationFrame(step);
}

// ============================================
// REVEAL ON SCROLL (+ skill bars, counters, timeline progress)
// ============================================
function initReveal() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      el.classList.add('visible');
      el.querySelectorAll('.skill-fill').forEach(bar => { bar.style.width = bar.dataset.width + '%'; });
      el.querySelectorAll('.count-up').forEach(animateCount);
      observer.unobserve(el);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

  // Count-ups outside .reveal blocks (hero card, section headings)
  const countObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      animateCount(entry.target);
      countObserver.unobserve(entry.target);
    });
  }, { threshold: 0.6 });
  document.querySelectorAll('.count-up').forEach(el => {
    if (!el.closest('.reveal')) countObserver.observe(el);
  });
}

function initTimelineProgress() {
  const timeline = document.getElementById('timeline');
  if (!timeline || reducedMotion) return;
  new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting) timeline.classList.add('drawn');
  }, { threshold: 0.15 }).observe(timeline);
}

// ============================================
// ACTIVE NAV LINK (IntersectionObserver, no per-scroll layout reads)
// ============================================
function initActiveNav() {
  const navLinks = new Map(
    Array.from(document.querySelectorAll('.nav-links a')).map(a => [a.getAttribute('href').slice(1), a])
  );
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      navLinks.forEach(link => link.classList.remove('active'));
      const link = navLinks.get(entry.target.id);
      if (link) link.classList.add('active');
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  document.querySelectorAll('section[id]').forEach(section => observer.observe(section));
}

// ============================================
// PROJECT FILTERS
// ============================================
function initProjectFilters() {
  const buttons = document.querySelectorAll('.filter-btn');
  const cards = document.querySelectorAll('.project-card[data-cat]');

  buttons.forEach(btn => btn.addEventListener('click', () => {
    const filter = btn.dataset.filter;
    buttons.forEach(b => {
      const active = b === btn;
      b.classList.toggle('active', active);
      b.setAttribute('aria-selected', String(active));
    });
    cards.forEach(card => {
      const show = filter === 'all' || card.dataset.cat === filter;
      card.classList.toggle('is-hidden', !show);
      if (show) card.classList.add('visible');
    });
  }));
}

// ============================================
// CARD SPOTLIGHT (pointer-follow glow via CSS vars)
// ============================================
function initSpotlight() {
  if (!finePointer || reducedMotion) return;
  document.querySelectorAll('.project-card, .impact-card, .article-card').forEach(card => {
    card.addEventListener('pointermove', (e) => {
      const rect = card.getBoundingClientRect();
      card.style.setProperty('--mx', `${e.clientX - rect.left}px`);
      card.style.setProperty('--my', `${e.clientY - rect.top}px`);
    }, { passive: true });
  });
}

// ============================================
// MAGNETIC BUTTONS
// ============================================
function initMagnetic() {
  if (!finePointer || reducedMotion) return;
  document.querySelectorAll('.magnetic').forEach(btn => {
    btn.addEventListener('pointermove', (e) => {
      const rect = btn.getBoundingClientRect();
      const x = (e.clientX - rect.left - rect.width / 2) * 0.25;
      const y = (e.clientY - rect.top - rect.height / 2) * 0.35;
      btn.style.transform = `translate(${x}px, ${y}px)`;
    });
    btn.addEventListener('pointerleave', () => { btn.style.transform = ''; });
  });
}

// ============================================
// CONTACT FORM → opens the visitor's mail app (static site, no backend)
// ============================================
const CONTACT_EMAIL = 'heyfahim@gmail.com';
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateContact({ name, email, message }) {
  if (!name) return 'Please enter your name.';
  if (!EMAIL_PATTERN.test(email)) return 'Please enter a valid email address.';
  if (message.length < 10) return 'Please write a message of at least 10 characters.';
  return '';
}

function initContactForm() {
  const form = document.getElementById('contactForm');
  const status = document.getElementById('formStatus');

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const data = new FormData(form);
    const fields = {
      name: String(data.get('name') || '').trim(),
      email: String(data.get('email') || '').trim(),
      subject: String(data.get('subject') || '').trim(),
      message: String(data.get('message') || '').trim(),
    };

    const error = validateContact(fields);
    status.className = 'form-status show ' + (error ? 'error' : 'ok');
    if (error) { status.textContent = error; return; }

    const subject = fields.subject || `Portfolio enquiry from ${fields.name}`;
    const body = `${fields.message}\n\n— ${fields.name} (${fields.email})`;
    window.location.href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    status.textContent = `Opening your email app… If nothing happens, write to ${CONTACT_EMAIL}.`;
  });
}

// ============================================
// BOOT
// ============================================
initCursor();
initScroll();
initMobileNav();
initTyping();
initParticles();
initReveal();
initTimelineProgress();
initActiveNav();
initProjectFilters();
initSpotlight();
initMagnetic();
initContactForm();
