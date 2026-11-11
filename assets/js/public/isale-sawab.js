(() => {
  'use strict';

  // Mission page owns its mobile navigation handler because public-core only
  // initializes shared runtime; other public pages keep their existing scripts.
  const menuToggle = document.getElementById('menuToggle');
  const mobileMenu = document.getElementById('mobileMenu');
  const menuIcon = document.getElementById('menuIcon');
  const ICON_OPEN = '<path stroke-linecap="round" d="M4 7h16M4 12h16M4 17h16" />';
  const ICON_CLOSE = '<path stroke-linecap="round" d="M6 6l12 12M6 18L18 6" />';

  if (menuToggle && mobileMenu && menuIcon) {
    menuToggle.addEventListener('click', () => {
      const isOpen = mobileMenu.classList.toggle('open');
      menuToggle.setAttribute('aria-expanded', String(isOpen));
      menuIcon.innerHTML = isOpen ? ICON_CLOSE : ICON_OPEN;
    });

    mobileMenu.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        mobileMenu.classList.remove('open');
        menuToggle.setAttribute('aria-expanded', 'false');
        menuIcon.innerHTML = ICON_OPEN;
      });
    });

    document.addEventListener('click', event => {
      if (!mobileMenu.classList.contains('open')) return;
      if (mobileMenu.contains(event.target) || menuToggle.contains(event.target)) return;
      mobileMenu.classList.remove('open');
      menuToggle.setAttribute('aria-expanded', 'false');
      menuIcon.innerHTML = ICON_OPEN;
    });
  }

  const client = window.supabaseClient;
  const form = document.getElementById('missionForm');
  const activitiesEl = document.getElementById('activityList');
  const selectedSummaryEl = document.getElementById('selectedSummary');
  const selectedCountEl = document.getElementById('selectedCount');
  const totalUnitsEl = document.getElementById('totalUnits');
  const customNameEl = document.getElementById('customIbadatName');
  const addCustomBtn = document.getElementById('addCustomIbadat');
  const toast = document.getElementById('missionToast');
  const submitBtn = document.getElementById('missionSubmit');
  const submitText = document.getElementById('missionSubmitText');
  const submitSpinner = document.getElementById('missionSubmitSpinner');
  const successPanel = document.getElementById('missionSuccess');
  const formPanel = document.getElementById('missionFormPanel');
  const resetBtn = document.getElementById('missionReset');
  const shareBtn = document.getElementById('missionShare');
  const wallEl = document.getElementById('missionWall');
  const counterDurood = document.getElementById('counterDurood');
  const counterSurah = document.getElementById('counterSurah');
  const counterJuz = document.getElementById('counterJuz');
  const counterPeople = document.getElementById('counterPeople');
  const step1Panel = document.getElementById('missionStep1');
  const step2Panel = document.getElementById('missionStep2');
  const step3Panel = document.getElementById('missionStep3');
  const step1NextBtn = document.getElementById('missionStep1Next');
  const step2BackBtn = document.getElementById('missionStep2Back');
  const step2NextBtn = document.getElementById('missionStep2Next');
  const step3BackBtn = document.getElementById('missionStep3Back');
  const finalReviewEl = document.getElementById('missionFinalReview');

  const builtIns = [
    { key:'durood-sharif', name:'Durood Sharif', category:'Durood', defaultQty:1000, unit:'martaba' },
    { key:'ayatul-kursi', name:'Ayatul Kursi', category:'Quran', defaultQty:15, unit:'martaba' },
    { key:'surah-fatiha', name:'Surah Fatiha', category:'Surah', defaultQty:15, unit:'tilawat' },
    { key:'surah-ikhlas', name:'Surah Ikhlas', category:'Surah', defaultQty:15, unit:'tilawat' },
    { key:'surah-falaq', name:'Surah Falaq', category:'Surah', defaultQty:15, unit:'tilawat' },
    { key:'surah-naas', name:'Surah Naas', category:'Surah', defaultQty:15, unit:'tilawat' },
    { key:'surah-yaseen', name:'Surah Yaseen', category:'Surah', defaultQty:10, unit:'tilawat' },
    { key:'surah-mulk', name:'Surah Mulk', category:'Surah', defaultQty:10, unit:'tilawat' },
    { key:'surah-waqia', name:'Surah Waqia', category:'Surah', defaultQty:10, unit:'tilawat' },
    { key:'surah-jumma', name:'Surah Jumuah', category:'Surah', defaultQty:10, unit:'tilawat' },
    { key:'surah-rehman', name:'Surah Rehman', category:'Surah', defaultQty:10, unit:'tilawat' },
    { key:'surah-muzammil', name:'Surah Muzammil', category:'Surah', defaultQty:10, unit:'tilawat' },
    { key:'surah-alam-nashra', name:'Surah Alam Nashra', category:'Surah', defaultQty:10, unit:'tilawat' },
    { key:'surah-asr', name:'Surah Al-Asr', category:'Surah', defaultQty:10, unit:'tilawat' },
    { key:'ahad-nama', name:'Ahad Nama', category:'Zikr', defaultQty:10, unit:'martaba' },
    { key:'surah-kahf', name:'Surah Kahf', category:'Surah', defaultQty:1, unit:'tilawat' },
    { key:'surah-fath', name:'Surah Fatah', category:'Surah', defaultQty:1, unit:'tilawat' },
    { key:'surah-dukhan', name:'Surah Dukhan', category:'Surah', defaultQty:1, unit:'tilawat' },
    { key:'durood-e-taaj', name:'Durood-e-Taaj', category:'Durood', defaultQty:1, unit:'martaba' },
    { key:'istighfar', name:'Istighfar', category:'Zikr', defaultQty:100, unit:'martaba' }
  ];

  const juzItems = Array.from({ length: 30 }, (_, i) => ({
    key: `juz-${i + 1}`,
    name: `Juz ${i + 1}`,
    category: 'Juz',
    defaultQty: 1,
    unit: 'juz'
  }));

  let activities = builtIns.map(item => ({ ...item }));
  const selections = new Map();

  const formatNumber = (value) => new Intl.NumberFormat('en-IN').format(value);
  const slugify = (value) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
  const escapeHtml = window.escapeHtml || ((value='') => String(value).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])));

  function showToast(message, kind='info') {
    toast.textContent = message;
    toast.className = `mission-toast is-visible ${kind}`;
    window.clearTimeout(showToast._timer);
    showToast._timer = window.setTimeout(() => toast.classList.remove('is-visible'), 3600);
  }

  function renderActivities() {
    const filter = document.querySelector('.mission-filter.is-active')?.dataset.filter || 'all';
    const visible = activities.filter(item => filter === 'all' || item.category.toLowerCase() === filter);
    activitiesEl.innerHTML = visible.map(item => {
      const selected = selections.has(item.key);
      const qty = selections.get(item.key)?.quantity ?? item.defaultQty;
      return `
        <article class="ibadat-row ${selected ? 'is-selected' : ''}" data-key="${escapeHtml(item.key)}">
          <div class="ibadat-icon">${item.category === 'Juz' ? '30' : item.category === 'Durood' ? '✦' : item.category === 'Zikr' ? '•' : '۝'}</div>
          <div class="ibadat-copy">
            <span class="ibadat-name">${escapeHtml(item.name)}</span>
            <span class="ibadat-meta">${escapeHtml(item.category)} · ${escapeHtml(item.unit)}</span>
          </div>
          <div class="quantity-wrap">
            <button type="button" class="qty-btn" data-action="decrement" aria-label="Kam karein">−</button>
            <input class="qty-input" inputmode="numeric" min="1" max="1000000" value="${selected ? qty : item.defaultQty}" aria-label="${escapeHtml(item.name)} ki miqdaar">
            <button type="button" class="qty-btn" data-action="increment" aria-label="Barhayein">+</button>
          </div>
          <button type="button" class="select-ibadat" data-action="toggle">${selected ? 'Shamil hai' : 'Shamil karein'}</button>
        </article>`;
    }).join('');
  }

  function findItem(key) {
    return activities.find(entry => entry.key === key) || juzItems.find(entry => entry.key === key);
  }

  function updateSelection(key, quantity, item = findItem(key)) {
    if (!item) return;
    const safeQty = Math.max(1, Math.min(1000000, Number.parseInt(quantity, 10) || item.defaultQty));
    selections.set(key, { item, quantity: safeQty });
    renderActivities();
    renderSummary();
  }

  function toggleSelection(key) {
    const item = findItem(key);
    if (!item) return;
    if (selections.has(key)) {
      selections.delete(key);
    } else {
      selections.set(key, { item, quantity: item.defaultQty });
    }
    renderActivities();
    renderSummary();
  }

  function renderSummary() {
    const values = [...selections.values()];
    const total = values.reduce((sum, entry) => sum + entry.quantity, 0);
    selectedCountEl.textContent = formatNumber(values.length);
    totalUnitsEl.textContent = formatNumber(total);
    if (!values.length) {
      selectedSummaryEl.innerHTML = '<div class="summary-empty">Abhi koi ibadat select nahi ki gayi. Neeche se apni tilawat ya zikr shamil karein.</div>';
      return;
    }
    selectedSummaryEl.innerHTML = values.map(({ item, quantity }) => `
      <div class="summary-chip">
        <span>${escapeHtml(item.name)}</span>
        <b>${formatNumber(quantity)}</b>
        <button type="button" data-remove-key="${escapeHtml(item.key)}" aria-label="${escapeHtml(item.name)} hata dein">×</button>
      </div>`).join('');
  }

  function renderJuzGrid() {
    const grid = document.getElementById('juzGrid');
    if (!grid) return;
    grid.innerHTML = juzItems.map(item => {
      const selected = selections.has(item.key);
      return `<button type="button" class="juz-pill ${selected ? 'is-selected' : ''}" data-juz-key="${item.key}">${item.name}</button>`;
    }).join('');
  }

  function setMode(mode) {
    document.querySelectorAll('.mission-mode').forEach(button => button.classList.toggle('is-active', button.dataset.mode === mode));
    document.querySelectorAll('.mission-pane').forEach(pane => pane.hidden = pane.dataset.pane !== mode);
    if (mode === 'juz') renderJuzGrid();
  }

  activitiesEl.addEventListener('click', event => {
    const row = event.target.closest('.ibadat-row');
    const action = event.target.closest('[data-action]')?.dataset.action;
    if (!row || !action) return;
    const key = row.dataset.key;
    const item = activities.find(entry => entry.key === key);
    if (!item) return;
    if (action === 'toggle') toggleSelection(key);
    if (action === 'increment') {
      const current = selections.get(key)?.quantity ?? item.defaultQty;
      updateSelection(key, current + 1, item);
    }
    if (action === 'decrement') {
      const current = selections.get(key)?.quantity ?? item.defaultQty;
      updateSelection(key, Math.max(1, current - 1), item);
    }
  });

  activitiesEl.addEventListener('change', event => {
    const input = event.target.closest('.qty-input');
    const row = input?.closest('.ibadat-row');
    if (!input || !row) return;
    const item = activities.find(entry => entry.key === row.dataset.key);
    if (item) updateSelection(item.key, input.value, item);
  });

  selectedSummaryEl.addEventListener('click', event => {
    const key = event.target.closest('[data-remove-key]')?.dataset.removeKey;
    if (!key) return;
    selections.delete(key);
    renderActivities();
    renderSummary();
  });

  document.querySelectorAll('.mission-filter').forEach(button => button.addEventListener('click', () => {
    document.querySelectorAll('.mission-filter').forEach(btn => btn.classList.remove('is-active'));
    button.classList.add('is-active');
    renderActivities();
  }));

  document.querySelectorAll('.mission-mode').forEach(button => button.addEventListener('click', () => setMode(button.dataset.mode)));

  document.getElementById('juzGrid')?.addEventListener('click', event => {
    const key = event.target.closest('[data-juz-key]')?.dataset.juzKey;
    if (!key) return;
    toggleSelection(key);
    renderJuzGrid();
  });

  addCustomBtn.addEventListener('click', () => {
    const name = customNameEl.value.trim();
    if (name.length < 2) {
      showToast('Ibadat ka naam likh kar phir Add karein.', 'error');
      customNameEl.focus();
      return;
    }
    const key = `custom-${slugify(name)}-${Date.now()}`;
    const item = { key, name, category:'Zikr', defaultQty:1, unit:'martaba', custom:true };
    activities.push(item);
    selections.set(key, { item, quantity: 1 });
    customNameEl.value = '';
    renderActivities();
    renderSummary();
    showToast('Aapki custom ibadat shamil kar di gayi.', 'success');
  });

  function scrollToStep(panel) {
    if (!panel) return;
    const top = panel.getBoundingClientRect().top + window.scrollY - 96;
    window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
  }

  function updateProgress(step) {
    document.querySelectorAll('[data-progress-step]').forEach(el => {
      const value = Number(el.dataset.progressStep);
      el.classList.toggle('is-active', value === step);
      el.classList.toggle('is-complete', value < step);
      if (value === step) el.setAttribute('aria-current', 'step');
      else el.removeAttribute('aria-current');
    });
  }

  function renderFinalReview() {
    if (!finalReviewEl) return;
    const payload = collectFormPayload();
    const selectedNames = payload.contributions.map(entry => `${escapeHtml(entry.item_name)} × ${formatNumber(entry.quantity)}`);
    finalReviewEl.innerHTML = `
      <div class="mission-review-card"><span>Aap ka naam</span><strong>${escapeHtml(payload.name || '—')}</strong></div>
      <div class="mission-review-card"><span>Niyyat</span><strong>${escapeHtml(payload.intentionType || '—')}</strong></div>
      <div class="mission-review-card mission-review-wide"><span>Ibadat</span><strong>${selectedNames.length ? selectedNames.join(' · ') : '—'}</strong></div>`;
  }

  function setMissionStep(step, { scroll = true } = {}) {
    const panels = [step1Panel, step2Panel, step3Panel];
    panels.forEach((panel, index) => {
      if (!panel) return;
      const active = index + 1 === step;
      panel.hidden = !active;
      panel.classList.toggle('is-active', active);
    });
    updateProgress(step);
    if (step === 3) renderFinalReview();
    if (scroll) scrollToStep(panels[step - 1]);
  }

  function validateStep1() {
    if (!selections.size) {
      showToast('Pehle kam az kam ek ibadat select karein.', 'error');
      return false;
    }
    return true;
  }

  function validateStep2() {
    const name = document.getElementById('participantName').value.trim();
    const intentionType = document.getElementById('intentionType').value;
    if (!name) {
      showToast('Apna naam zaroor darj karein.', 'error');
      document.getElementById('participantName').focus();
      return false;
    }
    if (!intentionType) {
      showToast('Niyyat ka option select karein.', 'error');
      document.getElementById('intentionType').focus();
      return false;
    }
    return true;
  }

  step1NextBtn?.addEventListener('click', () => {
    if (validateStep1()) setMissionStep(2);
  });

  step2BackBtn?.addEventListener('click', () => setMissionStep(1));

  step2NextBtn?.addEventListener('click', () => {
    if (validateStep2()) setMissionStep(3);
  });

  step3BackBtn?.addEventListener('click', () => setMissionStep(2));

  function setSubmitting(value) {
    submitBtn.disabled = value;
    submitText.textContent = value ? 'Darj ho raha hai...' : 'Mission Mein Shamil Hon';
    submitSpinner.hidden = !value;
  }

  function collectFormPayload() {
    const name = document.getElementById('participantName').value.trim();
    const intention = document.getElementById('intentionName').value.trim();
    const intentionType = document.getElementById('intentionType').value;
    const notes = document.getElementById('missionNotes').value.trim();
    const showOnWall = document.getElementById('showOnWall').checked;
    const contributions = [...selections.values()].map(({ item, quantity }) => ({
      item_key: item.key,
      item_name: item.name,
      category: item.category,
      unit: item.unit,
      quantity
    }));
    return { name, intention, intentionType, notes, showOnWall, contributions };
  }

  form.addEventListener('submit', async event => {
    event.preventDefault();
    const payload = collectFormPayload();
    if (!payload.name) return showToast('Apna naam zaroor darj karein.', 'error');
    if (!payload.intentionType) return showToast('Niyyat ka option select karein.', 'error');
    if (!payload.contributions.length) return showToast('Kam az kam ek ibadat shamil karein.', 'error');

    setSubmitting(true);
    try {
      if (!client) throw new Error('Mission service unavailable');
      const { data, error } = await client.rpc('submit_isale_sawab_mission', {
        p_participant_name: payload.name,
        p_intention_type: payload.intentionType,
        p_intention_name: payload.intention,
        p_notes: payload.notes || null,
        p_show_on_wall: payload.showOnWall,
        p_contributions: payload.contributions
      });
      if (error) throw error;
      const result = Array.isArray(data) ? data[0] : data;
      showSuccess(result?.submission_id, payload);
      await loadMissionStats();
      await loadMissionWall();
    } catch (error) {
      console.error('Isale Sawab submission failed:', error);
      showToast('Ibadat darj nahi ho saki. Barah-e-karam dobara koshish karein.', 'error');
    } finally {
      setSubmitting(false);
    }
  });

  function showSuccess(id, payload) {
    formPanel.hidden = true;
    successPanel.hidden = false;
    document.getElementById('successParticipant').textContent = payload.name;
    document.getElementById('successIntention').textContent = payload.intention || payload.intentionType;
    document.getElementById('successRef').textContent = id ? `Mission Ref: ${String(id).slice(0, 8).toUpperCase()}` : 'Al-Zeya Academy · Isale Sawab Mission';
    successPanel.scrollIntoView({ behavior:'smooth', block:'start' });
  }

  resetBtn.addEventListener('click', () => {
    form.reset();
    selections.clear();
    formPanel.hidden = false;
    successPanel.hidden = true;
    renderActivities();
    renderJuzGrid();
    renderSummary();
    setMissionStep(1, { scroll: false });
    window.scrollTo({ top: document.getElementById('missionBuilder').offsetTop - 90, behavior:'smooth' });
  });

  async function shareMissionPage() {
    const shareData = {
      title: 'Al-Zeya Academy — Isale Sawab Mission',
      text: 'Al-Zeya Academy ke Isale Sawab Mission ka hissa banein.',
      url: window.location.href
    };

    try {
      if (typeof navigator.share === 'function') {
        await navigator.share(shareData);
        return;
      }

      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareData.url);
        showToast('Mission ka link copy ho gaya. Aap ise share kar sakte hain.', 'success');
        return;
      }

      const tempInput = document.createElement('input');
      tempInput.value = shareData.url;
      tempInput.setAttribute('readonly', '');
      tempInput.style.position = 'fixed';
      tempInput.style.opacity = '0';
      document.body.appendChild(tempInput);
      tempInput.select();
      document.execCommand('copy');
      tempInput.remove();
      showToast('Mission ka link copy ho gaya. Aap ise share kar sakte hain.', 'success');
    } catch (error) {
      if (error?.name !== 'AbortError') {
        console.warn('Mission share failed:', error);
        showToast('Share nahi ho saka. Barah-e-karam dobara koshish karein.', 'error');
      }
    }
  }

  shareBtn?.addEventListener('click', shareMissionPage);

  async function loadMissionStats() {
    if (!client) return;
    const { data, error } = await client.rpc('get_isale_sawab_stats');
    if (error) {
      console.warn('Mission stats unavailable:', error.message);
      return;
    }
    const row = Array.isArray(data) ? data[0] : data;
    if (!row) return;
    animateCounter(counterDurood, Number(row.durood_total || 0));
    animateCounter(counterSurah, Number(row.surah_total || 0));
    animateCounter(counterJuz, Number(row.juz_total || 0));
    animateCounter(counterPeople, Number(row.participant_total || 0));
  }

  function animateCounter(el, target) {
    if (!el) return;
    const start = Number(el.dataset.value || 0);
    const duration = 700;
    const startAt = performance.now();
    const step = now => {
      const progress = Math.min(1, (now - startAt) / duration);
      const value = Math.round(start + (target - start) * (1 - Math.pow(1 - progress, 3)));
      el.textContent = formatNumber(value);
      if (progress < 1) requestAnimationFrame(step);
      else el.dataset.value = String(target);
    };
    requestAnimationFrame(step);
  }

  async function loadMissionWall() {
    if (!client || !wallEl) return;
    const { data, error } = await client.rpc('get_isale_sawab_wall', { p_limit: 12 });
    if (error) {
      console.warn('Mission wall unavailable:', error.message);
      return;
    }
    if (!Array.isArray(data) || !data.length) {
      wallEl.innerHTML = '<div class="wall-empty">Abhi mission wall khali hai. Aap pehle apna naam shamil kar sakte hain.</div>';
      return;
    }
    wallEl.innerHTML = data.map(entry => `
      <article class="mission-wall-card">
        <div class="wall-avatar">${escapeHtml((entry.participant_name || 'A').slice(0, 1).toUpperCase())}</div>
        <div>
          <strong>${escapeHtml(entry.participant_name || 'Anonymous')}</strong>
          <span>${escapeHtml(entry.highlight_text || 'Ibadat ka hissa')}</span>
        </div>
        <div class="wall-date">${escapeHtml(entry.relative_label || '')}</div>
      </article>`).join('');
  }

  // Initial render
  setMissionStep(1, { scroll: false });
  renderActivities();
  renderJuzGrid();
  renderSummary();
  loadMissionStats();
  loadMissionWall();
})();
