/* cv-auth.js — CalcVibe Supabase auth, loaded on every page */
(function () {
  'use strict';

  var SUPA_URL = 'https://sortlwfbratpmdxvecrq.supabase.co';
  var SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNvcnRsd2ZicmF0cG1keHZlY3JxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0MzQyNDQsImV4cCI6MjA5NzAxMDI0NH0.5baj_sbDhS1qaLn8NvANTDOVZona8xHSN4owo0cDlFI';

  var _supa     = null;
  var _user     = null;
  var _mode     = 'signin';
  var _dropOpen = false;

  function supa() {
    if (!_supa && window.supabase) _supa = window.supabase.createClient(SUPA_URL, SUPA_KEY);
    return _supa;
  }

  function truncate(str, n) {
    return str.length > n ? str.slice(0, n) + '…' : str;
  }

  /* ── NAV WIDGET ─────────────────────────────────────────── */
  function injectNav() {
    var nav = document.querySelector('nav');
    if (!nav) return;

    var wrap = document.createElement('div');
    wrap.className = 'cva-wrap';

    /* signed-out: plain "Sign in" pill */
    var signinBtn       = document.createElement('button');
    signinBtn.id        = 'cva-signin-btn';
    signinBtn.type      = 'button';
    signinBtn.className = 'cva-signin-btn';
    signinBtn.textContent = 'Sign in';
    signinBtn.addEventListener('click', openModal);

    /* signed-in: avatar + email + chevron */
    var accountBtn       = document.createElement('button');
    accountBtn.id        = 'cva-account-btn';
    accountBtn.type      = 'button';
    accountBtn.className = 'cva-account-btn';
    accountBtn.hidden    = true;
    accountBtn.innerHTML =
      '<span class="cva-avatar" id="cva-avatar">U</span>' +
      '<span class="cva-email-short" id="cva-email-short"></span>' +
      '<span class="cva-chevron" aria-hidden="true">&#9662;</span>';
    accountBtn.addEventListener('click', toggleDrop);

    /* dropdown */
    var drop = document.createElement('div');
    drop.id        = 'cva-drop';
    drop.className = 'cva-drop';
    drop.hidden    = true;
    drop.innerHTML =
      '<div class="cva-drop-email" id="cva-drop-email"></div>' +
      '<div class="cva-drop-sync"><span class="cva-sync-dot"></span>Data synced</div>' +
      '<div class="cva-drop-divider"></div>' +
      '<button type="button" class="cva-drop-signout" id="cva-signout-btn">Sign out</button>';
    drop.querySelector('#cva-signout-btn').addEventListener('click', handleLogout);

    wrap.appendChild(signinBtn);
    wrap.appendChild(accountBtn);
    wrap.appendChild(drop);
    nav.appendChild(wrap);

    document.addEventListener('click', function (e) {
      if (_dropOpen && !wrap.contains(e.target)) closeDrop();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeDrop();
    });
  }

  function toggleDrop() { _dropOpen ? closeDrop() : openDrop(); }

  function openDrop() {
    _dropOpen = true;
    document.getElementById('cva-drop').hidden = false;
    document.getElementById('cva-account-btn').classList.add('cva-account-btn--open');
  }

  function closeDrop() {
    _dropOpen = false;
    var d = document.getElementById('cva-drop');
    if (d) d.hidden = true;
    var b = document.getElementById('cva-account-btn');
    if (b) b.classList.remove('cva-account-btn--open');
  }

  function updateNav() {
    var signinBtn  = document.getElementById('cva-signin-btn');
    var accountBtn = document.getElementById('cva-account-btn');
    if (!signinBtn) return;
    if (_user) {
      signinBtn.hidden  = true;
      accountBtn.hidden = false;
      document.getElementById('cva-avatar').textContent     = _user.email[0].toUpperCase();
      document.getElementById('cva-email-short').textContent = truncate(_user.email.split('@')[0], 20);
      document.getElementById('cva-drop-email').textContent  = _user.email;
    } else {
      signinBtn.hidden  = false;
      accountBtn.hidden = true;
      closeDrop();
    }
  }

  /* ── MODAL ──────────────────────────────────────────────── */
  var MODAL_HTML = [
    '<div id="cva-overlay" class="cva-overlay" role="dialog" aria-modal="true" aria-label="CalcVibe account">',
      '<div class="cva-modal">',
        '<button type="button" class="cva-close" id="cva-close" aria-label="Close">&times;</button>',

        '<div class="cva-value-prop">',
          '<p class="cva-vp-title">Save your results across devices</p>',
          '<p class="cva-vp-sub">Sign in to save your calculator results and track your portfolio from anywhere.</p>',
          '<ul class="cva-vp-list">',
            '<li>Save any calculator result</li>',
            '<li>Track your portfolio over time</li>',
            '<li>Access from any device</li>',
          '</ul>',
        '</div>',

        '<div class="cva-tabs" role="tablist">',
          '<button type="button" class="cva-tab cva-tab--active" id="cva-tab-signin" role="tab" aria-selected="true">Sign in</button>',
          '<button type="button" class="cva-tab" id="cva-tab-signup" role="tab" aria-selected="false">Create account</button>',
        '</div>',

        '<div id="cva-msg" class="cva-msg" hidden></div>',

        '<form id="cva-form" novalidate>',
          '<div class="cva-field">',
            '<label for="cva-email">Email</label>',
            '<input type="email" id="cva-email" autocomplete="email" placeholder="you@example.com" required>',
          '</div>',
          '<div class="cva-field">',
            '<label for="cva-password">Password</label>',
            '<input type="password" id="cva-password" autocomplete="current-password" placeholder="Password" required>',
          '</div>',
          '<button type="submit" id="cva-submit" class="cva-submit">Sign in</button>',
        '</form>',
      '</div>',
    '</div>'
  ].join('');

  function injectModal() {
    document.body.insertAdjacentHTML('beforeend', MODAL_HTML);

    document.getElementById('cva-close').addEventListener('click', closeModal);
    document.getElementById('cva-overlay').addEventListener('click', function (e) {
      if (e.target === this) closeModal();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        var o = document.getElementById('cva-overlay');
        if (o && o.classList.contains('cva-open')) closeModal();
      }
    });
    document.getElementById('cva-form').addEventListener('submit', handleSubmit);
    document.getElementById('cva-tab-signin').addEventListener('click', function () { setMode('signin'); });
    document.getElementById('cva-tab-signup').addEventListener('click', function () { setMode('signup'); });
  }

  function setMode(mode) {
    _mode = mode;
    var isSignup = mode === 'signup';
    document.getElementById('cva-tab-signin').classList.toggle('cva-tab--active', !isSignup);
    document.getElementById('cva-tab-signin').setAttribute('aria-selected', isSignup ? 'false' : 'true');
    document.getElementById('cva-tab-signup').classList.toggle('cva-tab--active', isSignup);
    document.getElementById('cva-tab-signup').setAttribute('aria-selected', isSignup ? 'true' : 'false');
    document.getElementById('cva-submit').textContent = isSignup ? 'Create account' : 'Sign in';
    clearMsg();
  }

  function openModal() {
    document.getElementById('cva-overlay').classList.add('cva-open');
    document.getElementById('cva-email').focus();
  }

  function closeModal() {
    document.getElementById('cva-overlay').classList.remove('cva-open');
    clearMsg();
  }

  function showMsg(text, isErr) {
    var el = document.getElementById('cva-msg');
    el.textContent = text;
    el.className   = 'cva-msg ' + (isErr ? 'cva-msg--err' : 'cva-msg--ok');
    el.hidden      = false;
  }

  function clearMsg() {
    var el = document.getElementById('cva-msg');
    if (el) el.hidden = true;
  }

  /* ── AUTH ACTIONS ───────────────────────────────────────── */
  function handleSubmit(e) {
    e.preventDefault();
    var email = document.getElementById('cva-email').value.trim();
    var pw    = document.getElementById('cva-password').value;
    var btn   = document.getElementById('cva-submit');
    btn.disabled    = true;
    btn.textContent = _mode === 'signup' ? 'Creating…' : 'Signing in…';
    clearMsg();

    var p = _mode === 'signup'
      ? supa().auth.signUp({ email: email, password: pw })
      : supa().auth.signInWithPassword({ email: email, password: pw });

    p.then(function (res) {
      btn.disabled    = false;
      btn.textContent = _mode === 'signup' ? 'Create account' : 'Sign in';
      if (res.error) { showMsg(res.error.message, true); return; }
      if (_mode === 'signup') {
        showMsg('Account created! Check your email to confirm before signing in.', false);
      } else {
        _user = res.data.user;
        updateNav();
        closeModal();
        emit('login', _user);
      }
    });
  }

  function handleLogout() {
    supa().auth.signOut().then(function () {
      _user = null;
      updateNav();
      emit('logout');
    });
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
    injectNav();
    injectModal();

    supa().auth.getSession().then(function (res) {
      var session = res.data && res.data.session;
      if (session) {
        _user = session.user;
        updateNav();
        emit('login', _user);
      }
    });

    supa().auth.onAuthStateChange(function (event, session) {
      _user = session ? session.user : null;
      updateNav();
      if (_user) emit('login', _user);
      else       emit('logout');
    });
  });
})();
