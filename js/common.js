/* common.js
if (!firebase.apps.length && window.appConfig?.firebaseConfig) {
  firebase.initializeApp(window.appConfig.firebaseConfig);
}
(function () {
  'use strict';

  // ---------- DOM Utils ----------
  window.getElement = function (id) {
    const el = document.getElementById(id);
    if (!el) console.warn(`Element #${id} not found`);
    return el;
  };

  window.showAlert = function (message, type = 'error', duration = 3000) {
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.innerHTML = `<span>${message}</span><button class="close-btn" aria-label="Close">&times;</button>`;
    document.body.appendChild(alert);
    alert.querySelector('.close-btn').addEventListener('click', () => alert.remove());
    if (duration > 0) setTimeout(() => alert.remove(), duration);
  };

  // ---------- Flagging (localStorage; avoids name collision) ----------
  const FLAGS_KEY = 'flaggedWords';
  const readFlags = () => {
    try { return JSON.parse(localStorage.getItem(FLAGS_KEY) || '[]'); }
    catch { return []; }
  };
  const saveFlags = (arr) => localStorage.setItem(FLAGS_KEY, JSON.stringify(arr));

  window.toggleFlagWord = function (word) {
    if (!word) return;
    const list = readFlags();
    const i = list.indexOf(word);
    if (i === -1) list.push(word); else list.splice(i, 1);
    saveFlags(list);

    const btn = document.getElementById('flagWordBtn');
    if (btn) {
      const active = list.includes(word);
      btn.classList.toggle('active', active);
      btn.innerHTML = active ? '<i class="fas fa-flag"></i> Flagged' : '<i class="far fa-flag"></i> Flag';
    }
    document.querySelectorAll('.word-flag').forEach(el => {
      if (el.dataset.word === word) el.classList.toggle('active', list.includes(word));
    });
  };

  window.showFlaggedWords = function (containerId = 'flagged-container') {
    const container = getElement(containerId);
    const list = readFlags();
    if (!container || list.length === 0) return;
    container.innerHTML = `
      <div class="flagged-section">
        <h3><i class="fas fa-flag"></i> Flagged Words</h3>
        <ul class="flagged-list">
          ${list.map(w => `<li data-word="${w}">${w}
            <button class="unflag-btn" data-word="${w}"><i class="fas fa-times"></i></button>
          </li>`).join('')}
        </ul>
      </div>`;
    container.querySelectorAll('.unflag-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const w = e.currentTarget.dataset.word;
        window.toggleFlagWord(w);
        e.currentTarget.closest('li')?.remove();
      });
    });
  };

  // ---------- Theme ----------
  window.initThemeToggle = function () {
    const toggleBtn = document.getElementById('dark-mode-toggle');
    const apply = (isDark) => {
      document.body.classList.toggle('dark-mode', isDark);
      localStorage.setItem('darkMode', isDark);
      const icon = toggleBtn?.querySelector('i');
      if (icon) icon.className = isDark ? 'fas fa-sun' : 'fas fa-moon';
      document.dispatchEvent(new CustomEvent('themeChange', { detail: { isDark } }));
    };
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => apply(!document.body.classList.contains('dark-mode')));
    }
    apply(localStorage.getItem('darkMode') === 'true');
  };

  // ---------- Spelling helpers ----------
  window.spelling = {
    speak(text, lang = 'en-US', rate = 0.95) {
      if (!('speechSynthesis' in window)) { showAlert('Text-to-speech not supported', 'error'); return; }
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = lang; u.rate = rate; u.volume = 1;
      const voices = speechSynthesis.getVoices();
      const v = voices.find(x => x.lang === lang) || voices.find(x => x.lang.startsWith(lang.split('-')[0]));
      if (v) u.voice = v;
      speechSynthesis.speak(u);
    }
  };

  // ---------- Absolute footer links patch ----------
  (function enforceAbsoluteFooterLinks(){
    function apply() {
      var root = 'https://spellrightpro.org';
      var footer = document.querySelector('footer');
      if (!footer) return;

      var map = {
        'terms':         root + '/terms.html',
        'privacy':       root + '/privacy.html',
        'refund-policy': root + '/refund-policy.html',
        'contact':       root + '/contact.html'
      };

      footer.querySelectorAll('a[href]').forEach(function(a){
        var href = a.getAttribute('href') || '';
        if (/^\/?terms(\.html)?$/i.test(href))             a.href = map['terms'];
        else if (/^\/?privacy(\.html)?$/i.test(href))      a.href = map['privacy'];
        else if (/^\/?refund-?policy(\.html)?$/i.test(href)) a.href = map['refund-policy'];
        else if (/^\/?contact(\.html)?$/i.test(href))      a.href = map['contact'];
      });
    }
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', apply);
    } else {
      apply();
    }
  })();

})();
