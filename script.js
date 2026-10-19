/* Runs immediately (script is in <head>) so reveal-hiding only applies when JavaScript works */
document.documentElement.classList.add('js');

document.addEventListener('DOMContentLoaded', function () {
  try {
    init();
  } catch (err) {
    /* If anything fails, drop the .js class so every section stays visible */
    document.documentElement.classList.remove('js');
    if (window.console) { console.error('Portfolio script error:', err); }
  }
});

function init() {
  var header = document.getElementById('header');
  var toggle = document.getElementById('menu-toggle');
  var nav = document.getElementById('main-nav');
  var toTop = document.getElementById('to-top');
  var navLinks = Array.prototype.slice.call(document.querySelectorAll('.nav-link'));
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasIO = 'IntersectionObserver' in window;

  /* ---------- Scroll reveal (once per element) ----------
     Stagger comes from the --d value in the HTML (CSS caps the delay). */
  var revealEls = Array.prototype.slice.call(document.querySelectorAll('.reveal'));
  function revealAll() {
    revealEls.forEach(function (el) { el.classList.add('in'); });
  }

  if (hasIO && !reduceMotion) {
    var revealObserver = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          obs.unobserve(entry.target); /* never re-animates */
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -32px 0px' });
    revealEls.forEach(function (el) { revealObserver.observe(el); });
    window.addEventListener('beforeprint', revealAll);
  } else {
    revealAll();
  }

  /* ---------- Header state + scroll-to-top (IntersectionObserver sentinels, no scroll listener) ---------- */
  function watchSentinel(name, onChange) {
    var el = document.querySelector('[data-sentinel="' + name + '"]');
    if (!el || !hasIO) { return false; }
    new IntersectionObserver(function (entries) {
      var e = entries[entries.length - 1];
      /* "passed" = the marker has scrolled above the top of the viewport */
      onChange(!e.isIntersecting && e.boundingClientRect.top < 0);
    }).observe(el);
    return true;
  }
  var okHeader = watchSentinel('header', function (passed) { header.classList.toggle('scrolled', passed); });
  var okTop = watchSentinel('top', function (passed) { toTop.classList.toggle('show', passed); });
  if (!okHeader) { header.classList.add('scrolled'); }
  if (!okTop) { toTop.classList.add('show'); }

  toTop.addEventListener('click', function () {
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
  });

  /* ---------- Active section highlighting ---------- */
  var sections = navLinks.map(function (a) {
    return document.querySelector(a.getAttribute('href'));
  }).filter(Boolean);

  if (hasIO) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          var id = '#' + entry.target.id;
          navLinks.forEach(function (a) {
            var active = a.getAttribute('href') === id;
            a.classList.toggle('active', active);
            if (active) { a.setAttribute('aria-current', 'true'); } else { a.removeAttribute('aria-current'); }
          });
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });
    sections.forEach(function (s) { spy.observe(s); });
  }

  /* ---------- Mobile menu ---------- */
  function setMenu(open) {
    nav.classList.toggle('open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  }
  toggle.addEventListener('click', function () {
    setMenu(toggle.getAttribute('aria-expanded') !== 'true');
  });
  nav.addEventListener('click', function (e) {
    if (e.target.closest('a')) { setMenu(false); }
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && nav.classList.contains('open')) {
      setMenu(false);
      toggle.focus();
    }
  });
  window.addEventListener('resize', function () {
    if (window.innerWidth >= 1000) { setMenu(false); }
  });

  /* ---------- Image fallbacks (labelled placeholders if a file is missing) ---------- */
  document.querySelectorAll('img[data-fallback]').forEach(function (img) {
    function hide() { img.classList.add('hidden'); }
    if (img.complete && img.naturalWidth === 0) { hide(); }
    img.addEventListener('error', hide);
  });

  /* ---------- Footer year ---------- */
  var year = document.getElementById('year');
  if (year) { year.textContent = new Date().getFullYear(); }

  /* ---------- Contact form validation ---------- */
  var form = document.getElementById('contact-form');
  var status = document.getElementById('form-status');

  var rules = {
    name: function (v) { return v.trim().length >= 2 ? '' : 'Please enter your full name.'; },
    email: function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) ? '' : 'Please enter a valid email address.'; },
    subject: function (v) { return v.trim().length >= 3 ? '' : 'Please enter a subject (at least 3 characters).'; },
    message: function (v) { return v.trim().length >= 10 ? '' : 'Please write a message of at least 10 characters.'; }
  };

  function validateField(field) {
    var msg = rules[field.name](field.value);
    var out = document.getElementById(field.id + '-error');
    out.textContent = msg;
    if (msg) { field.setAttribute('aria-invalid', 'true'); } else { field.removeAttribute('aria-invalid'); }
    return !msg;
  }

  Object.keys(rules).forEach(function (name) {
    var field = form.elements[name];
    field.addEventListener('blur', function () { validateField(field); });
    field.addEventListener('input', function () {
      if (field.getAttribute('aria-invalid')) { validateField(field); }
    });
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    status.className = 'form-status';
    status.textContent = '';

    var firstInvalid = null;
    Object.keys(rules).forEach(function (name) {
      var field = form.elements[name];
      if (!validateField(field) && !firstInvalid) { firstInvalid = field; }
    });

    if (firstInvalid) {
      status.classList.add('err');
      status.textContent = 'Please fix the highlighted fields and try again.';
      firstInvalid.focus();
      return;
    }

    /* No backend/email service is configured, so nothing is sent.
       To make it real, connect a service (e.g. Formspree) and send the data here. */
    status.classList.add('ok');
    status.textContent = 'Your details look valid, but this form is not connected to an email service yet, so your message was not sent. Please reach out through the email or social links instead.';
  });
}