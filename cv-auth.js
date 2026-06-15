/* cv-auth.js — CalcVibe Supabase auth, loaded on every page */
(function () {
  'use strict';

  var SUPA_URL = 'https://sortlwfbratpmdxvecrq.supabase.co';
  var SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNvcnRsd2ZicmF0cG1keHZlY3JxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0MzQyNDQsImV4cCI6MjA5NzAxMDI0NH0.5baj_sbDhS1qaLn8NvANTDOVZona8xHSN4owo0cDlFI';

  var _supa     = null;
  var _user     = null;
  var _isSignup = false;

  function supa() {
    if (!_supa && window.supabase) _supa = window.supabase.createClient(SUPA_URL, SUPA_KEY);
    return _supa;
  }

  /* ── NAV BUTTON ─────────────────────────────────────────── */
  function injectBtn() {
    var nav = document.querySelector('nav');
    if (!nav) return;
    var btn       = document.createElement('button');
    btn.id        = 'cv-auth-btn';
    btn.type      = 'button';
    btn.className = 'cv-auth-navbtn';
    btn.textContent = 'Sign In';
    btn.addEventListener('click', openModal);
    nav.appendChild(btn);
  }

  /* ── MODAL ──────────────────────────────────────────────── */
  var MODAL_HTML = [
    '<div id="cv-auth-overlay" class="cv-auth-overlay" role="dialog" aria-modal="true" aria-label="CalcVibe account">',
      '<div class="cv-auth-box">',
        '<button type="button" class="cv-auth-close" id="cv-auth-close" aria-label="Close">&times;</button>',

        /* logged-out panel */
        '<div id="cv-panel-out">',
          '<h2 class="cv-auth-heading">Sign in to CalcVibe</h2>',
          '<p class="cv-auth-sub">Save your data and access it from any device.</p>',
          '<div id="cv-auth-msg" class="cv-auth-msg" hidden></div>',
          '<form id="cv-auth-form" novalidate>',
            '<div class="cv-auth-field">',
              '<label for="cv-email">Email</label>',
              '<input type="email" id="cv-email" autocomplete="email" placeholder="you@example.com" required>',
            '</div>',
            '<div class="cv-auth-field">',
              '<label for="cv-password">Password</label>',
              '<input type="password" id="cv-password" autocomplete="current-password" placeholder="Password" required>',
            '</div>',
            '<button type="submit" id="cv-auth-submit" class="cv-auth-btn-primary">Sign In</button>',
          '</form>',
          '<button type="button" id="cv-auth-toggle" class="cv-auth-link">No account yet? Sign up</button>',
        '</div>',

        /* logged-in panel */
        '<div id="cv-panel-in" hidden>',
          '<h2 class="cv-auth-heading">Your Account</h2>',
          '<p id="cv-auth-email-lbl" class="cv-auth-email-lbl"></p>',
          '<p class="cv-auth-sub">Your data is saved and synced automatically.</p>',
          '<button type="button" id="cv-auth-logout" class="cv-auth-btn-outline">Sign Out</button>',
        '</div>',
      '</div>',
    '</div>'
  ].join('');

  function injectModal() {
    document.body.insertAdjacentHTML('beforeend', MODAL_HTML);
    document.getElementById('cv-auth-close').addEventListener('click', closeModal);
    document.getElementById('cv-auth-overlay').addEventListener('click', function (e) {
      if (e.target === this) closeModal();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeModal();
    });
    document.getElementById('cv-auth-form').addEventListener('submit', handleSubmit);
    document.getElementById('cv-auth-toggle').addEventListener('click', toggleMode);
    document.getElementById('cv-auth-logout').addEventListener('click', handleLogout);
  }

  function openModal() {
    document.getElementById('cv-auth-overlay').classList.add('cv-open');
    (_user
      ? document.getElementById('cv-auth-logout')
      : document.getElementById('cv-email')
    ).focus();
  }

  function closeModal() {
    document.getElementById('cv-auth-overlay').classList.remove('cv-open');
    clearMsg();
  }

  function showPanels(loggedIn) {
    var pOut = document.getElementById('cv-panel-out');
    var pIn  = document.getElementById('cv-panel-in');
    if (!pOut) return;
    pOut.hidden = loggedIn;
    pIn.hidden  = !loggedIn;
    if (loggedIn && _user) {
      document.getElementById('cv-auth-email-lbl').textContent = _user.email;
    }
  }

  function toggleMode() {
    _isSignup = !_isSignup;
    document.getElementById('cv-auth-submit').textContent =
      _isSignup ? 'Create Account' : 'Sign In';
    document.getElementById('cv-auth-toggle').textContent =
      _isSignup ? 'Already have an account? Sign in' : 'No account yet? Sign up';
    clearMsg();
  }

  function showMsg(text, isErr) {
    var el = document.getElementById('cv-auth-msg');
    el.textContent = text;
    el.className   = 'cv-auth-msg ' + (isErr ? 'cv-auth-msg-err' : 'cv-auth-msg-ok');
    el.hidden      = false;
  }

  function clearMsg() {
    var el = document.getElementById('cv-auth-msg');
    if (el) el.hidden = true;
  }

  /* ── AUTH ACTIONS ───────────────────────────────────────── */
  function handleSubmit(e) {
    e.preventDefault();
    var email = document.getElementById('cv-email').value.trim();
    var pw    = document.getElementById('cv-password').value;
    var btn   = document.getElementById('cv-auth-submit');
    btn.disabled    = true;
    btn.textContent = _isSignup ? 'Creating…' : 'Signing in…';
    clearMsg();

    var p = _isSignup
      ? supa().auth.signUp({ email: email, password: pw })
      : supa().auth.signInWithPassword({ email: email, password: pw });

    p.then(function (res) {
      btn.disabled    = false;
      btn.textContent = _isSignup ? 'Create Account' : 'Sign In';
      if (res.error) { showMsg(res.error.message, true); return; }
      if (_isSignup) {
        showMsg('Account created! Check your email to confirm before signing in.', false);
      } else {
        _user = res.data.user;
        updateNavBtn();
        showPanels(true);
        closeModal();
        emit('login', _user);
      }
    });
  }

  function handleLogout() {
    supa().auth.signOut().then(function () {
      _user = null;
      updateNavBtn();
      showPanels(false);
      closeModal();
      emit('logout');
    });
  }

  function updateNavBtn() {
    var btn = document.getElementById('cv-auth-btn');
    if (!btn) return;
    if (_user) {
      btn.textContent = _user.email.split('@')[0];
      btn.classList.add('cv-auth-navbtn--in');
    } else {
      btn.textContent = 'Sign In';
      btn.classList.remove('cv-auth-navbtn--in');
    }
  }

  /* ── EVENT BRIDGE ───────────────────────────────────────── */
  function emit(name, data) {
    if (name === 'login'  && typeof window.CVAuth.onLogin  === 'function') window.CVAuth.onLogin(data);
    if (name === 'logout' && typeof window.CVAuth.onLogout === 'function') window.CVAuth.onLogout();
  }

  /* ── PUBLIC API ─────────────────────────────────────────── */
  window.CVAuth = {
    client:   supa,
    getUser:  function () { return _user; },
    onLogin:  null,
    onLogout: null
  };

  /* ── BOOT ───────────────────────────────────────────────── */
  document.addEventListener('DOMContentLoaded', function () {
    if (!window.supabase) return;
    injectBtn();
    injectModal();

    supa().auth.getSession().then(function (res) {
      var session = res.data && res.data.session;
      if (session) {
        _user = session.user;
        updateNavBtn();
        showPanels(true);
        emit('login', _user);
      }
    });

    supa().auth.onAuthStateChange(function (event, session) {
      _user = session ? session.user : null;
      updateNavBtn();
      showPanels(!!_user);
      if (_user) emit('login', _user);
      else       emit('logout');
    });
  });
})();
