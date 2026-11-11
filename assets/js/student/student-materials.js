(function () {
  'use strict';

  document.querySelectorAll('[data-nav]').forEach(a => a.classList.toggle('active', a.dataset.nav === 'materials'));
  document.getElementById('logoutBtn')?.addEventListener('click', StudentPortal.goLogin);

  const state = { subject: '', filter: 'all', data: null, course: null };

  function resourceUrl(value) {
    const raw = String(value || '').trim(); if (!raw) return '';
    try { const url = new URL(raw, window.location.href); return ['http:', 'https:'].includes(url.protocol) ? url.href : ''; } catch (_) { return ''; }
  }
  function kindFor(x, isAudio) {
    if (isAudio) return 'audio';
    const type = String(x.material_type || '').toLowerCase();
    if (type.includes('audio')) return 'audio';
    if (type.includes('video')) return 'video';
    if (type.includes('pdf')) return 'pdf';
    return 'other';
  }
  function iconFor(kind) { return ({ pdf: 'PDF', audio: '♫', video: '▶', other: '▤' })[kind] || '▤'; }

  function normalizedSubject(value) { return String(value || '').trim().replace(/\s+/g, ' ').toLowerCase(); }
  function subjectLabel(value) { const raw = String(value || '').trim(); return raw || 'General'; }

  function audioCard(x) {
    const fallbackUrl = resourceUrl(x.drive_url || x.audio_url || ''), sourceId = `audio-${String(x.id || '').replace(/[^a-zA-Z0-9_-]/g, '')}`;
    return `<article class="resource-card resource-card-audio" data-resource-kind="audio" data-audio-card data-audio-id="${StudentPortal.esc(x.id || '')}" data-audio-path="${StudentPortal.esc(x.audio_path || '')}" data-audio-source="${StudentPortal.esc(fallbackUrl)}"><div class="resource-card-top"><span class="resource-type-icon audio">♫</span><span class="badge">Class Audio</span></div><h3>${StudentPortal.esc(x.title || 'Recorded Class')}</h3><p>${StudentPortal.esc(StudentPortal.fmtDate(x.class_date))}</p><div class="audio-player-wrap" id="${StudentPortal.esc(sourceId)}"><div class="empty audio-loading" style="padding:14px">Loading audio…</div>${fallbackUrl ? `<div class="audio-fallback" hidden><a class="btn btn-soft" href="${StudentPortal.esc(fallbackUrl)}" target="_blank" rel="noopener noreferrer">Play Audio File</a></div>` : ''}</div></article>`;
  }

  function materialCard(x) {
    const kind = kindFor(x, false), url = resourceUrl(x.resource_url);
    return `<article class="resource-card resource-card-${kind}" data-resource-kind="${kind}"><div class="resource-card-top"><span class="resource-type-icon ${kind}">${iconFor(kind)}</span><span class="badge">${StudentPortal.esc(kind === 'pdf' ? 'PDF' : kind === 'video' ? 'Video' : 'Study')}</span></div><h3>${StudentPortal.esc(x.title || 'Study Resource')}</h3><p>${StudentPortal.esc(StudentPortal.fmtDate(x.publish_date))}</p>${x.notes ? `<p class="resource-note">${StudentPortal.esc(x.notes)}</p>` : ''}${url ? `<a class="btn btn-soft" href="${StudentPortal.esc(url)}" target="_blank" rel="noopener noreferrer">Open Resource →</a>` : '<div class="empty" style="padding:14px">This resource link is unavailable.</div>'}</article>`;
  }

  async function hydrateStorageAudio(root, token) {
    const cards = [...root.querySelectorAll('[data-audio-card]')];
    await Promise.all(cards.map(async card => {
      const wrap = card.querySelector('.audio-player-wrap'); if (!wrap) return;
      try {
        let url = ''; const path = String(card.dataset.audioPath || '').trim();
        if (path) url = await StudentPortal.getStudentAudioUrl(token, card.dataset.audioId, path);
        else if (card.dataset.audioSource) url = StudentPortal.getPlayableAudioUrl(card.dataset.audioSource);
        if (!url) throw new Error('No audio link');
        wrap.querySelector('.audio-loading')?.remove();
        const player = document.createElement('audio'); player.className = 'portal-audio'; player.controls = true; player.preload = 'metadata'; player.src = url;
        player.addEventListener('error', () => wrap.querySelector('.audio-fallback')?.removeAttribute('hidden'), { once: true });
        wrap.prepend(player);
      } catch (error) {
        wrap.querySelector('.audio-loading')?.remove(); const fallback = wrap.querySelector('.audio-fallback');
        if (fallback) fallback.removeAttribute('hidden'); else wrap.innerHTML = '<div class="empty" style="padding:14px">This class audio is temporarily unavailable.</div>';
      }
    }));
  }

  function allResources(d) {
    const materials = Array.isArray(d.materials) ? d.materials : [];
    const audio = Array.isArray(d.audio) ? d.audio : [];
    return [...materials.map(x => ({ ...x, _audio: false })), ...audio.map(x => ({ ...x, _audio: true }))];
  }

  function subjectList(resources, course) {
    const configured = Array.isArray(course?.subjects) ? course.subjects.map(x => typeof x === 'string' ? x : x?.name || '').filter(Boolean) : [];
    const present = resources.map(x => subjectLabel(x.subject));
    const byKey = new Map();
    [...configured, ...present].forEach(label => { const key = normalizedSubject(label); if (key && !byKey.has(key)) byKey.set(key, label); });
    return [...byKey.entries()].map(([key, label]) => ({ key, label }));
  }

  function renderSubjects(d, resources) {
    const subjects = subjectList(resources, state.course);
    StudentPortal.setupShell(d.student);
    document.getElementById('content').innerHTML = `<div class="page-hero"><div><div class="page-kicker">Learning library</div><h1 class="page-title">Study</h1><p class="page-lead">Choose a subject to find its published audio, PDFs and videos in one place.</p></div><a class="page-back" href="student-dashboard.html">← Home</a></div><section class="portal-banner study-hero"><div><div class="eyebrow">Knowledge is Light</div><h2>Your subjects, one library.</h2><p>Everything published for your enrolled course is grouped by subject.</p></div><div class="study-art" aria-hidden="true">▤</div></section><section style="margin-top:18px"><div class="section-head" style="margin:0 0 12px"><div><h3>Subjects</h3><p>${subjects.length} subject${subjects.length === 1 ? '' : 's'} available</p></div></div><div class="subject-library-grid">${subjects.length ? subjects.map(({key,label}) => { const rows = resources.filter(x => normalizedSubject(x.subject) === key); const counts = { audio: rows.filter(x => kindFor(x,x._audio)==='audio').length, pdf: rows.filter(x => kindFor(x,x._audio)==='pdf').length, video: rows.filter(x => kindFor(x,x._audio)==='video').length }; return `<button class="subject-library-card" type="button" data-subject="${StudentPortal.esc(key)}"><span class="subject-card-icon">✦</span><span class="subject-card-main"><strong>${StudentPortal.esc(label)}</strong><small>${counts.audio} Audio · ${counts.pdf} PDF · ${counts.video} Video</small></span><span class="subject-card-arrow">›</span></button>`; }).join('') : '<div class="card"><div class="empty">No subjects are currently available for your enrolled course.</div></div>'}</div></section>`;
    document.querySelectorAll('[data-subject]').forEach(btn => btn.addEventListener('click', () => { state.subject = btn.dataset.subject || ''; state.filter = 'all'; renderSubjectDetail(d, resources); }));
  }

  function renderSubjectDetail(d, resources) {
    const subject = subjectLabel((subjectList(resources, state.course).find(x => x.key === state.subject) || {}).label || state.subject);
    const rows = resources.filter(x => normalizedSubject(x.subject) === normalizedSubject(subject));
    const counts = { all: rows.length, audio: rows.filter(x => kindFor(x,x._audio)==='audio').length, pdf: rows.filter(x => kindFor(x,x._audio)==='pdf').length, video: rows.filter(x => kindFor(x,x._audio)==='video').length, other: rows.filter(x => kindFor(x,x._audio)==='other').length };
    const visible = rows.filter(x => state.filter === 'all' || kindFor(x,x._audio) === state.filter);
    StudentPortal.setupShell(d.student);
    document.getElementById('content').innerHTML = `<div class="page-hero"><div><div class="page-kicker">Study by subject</div><h1 class="page-title">${StudentPortal.esc(subject)}</h1><p class="page-lead">All published learning resources for this subject are kept together here.</p></div><button class="page-back" id="backSubjects" type="button">← All Subjects</button></div><section class="subject-detail-hero"><div><span class="eyebrow">${StudentPortal.esc(d.student?.course || 'Course')}</span><h2>${StudentPortal.esc(subject)}</h2><p>${counts.all} resource${counts.all === 1 ? '' : 's'} available for this subject.</p></div><div class="subject-detail-count">${counts.all}</div></section><div class="material-tabs subject-filter-tabs" style="margin-top:15px"><button class="filter-tab ${state.filter === 'all' ? 'active' : ''}" data-subject-filter="all">All (${counts.all})</button><button class="filter-tab ${state.filter === 'audio' ? 'active' : ''}" data-subject-filter="audio">Class Audio (${counts.audio})</button><button class="filter-tab ${state.filter === 'pdf' ? 'active' : ''}" data-subject-filter="pdf">PDF (${counts.pdf})</button><button class="filter-tab ${state.filter === 'video' ? 'active' : ''}" data-subject-filter="video">Video (${counts.video})</button>${counts.other ? `<button class="filter-tab ${state.filter === 'other' ? 'active' : ''}" data-subject-filter="other">Other (${counts.other})</button>` : ''}</div><section class="resource-grid subject-resource-grid" style="margin-top:15px">${visible.length ? visible.map(x => x._audio ? audioCard(x) : materialCard(x)).join('') : '<div class="card" style="grid-column:1/-1"><div class="empty">No resources are available in this filter yet.</div></div>'}</section>`;
    document.getElementById('backSubjects')?.addEventListener('click', () => { state.subject = ''; state.filter = 'all'; renderSubjects(d, resources); });
    document.querySelectorAll('[data-subject-filter]').forEach(btn => btn.addEventListener('click', () => { state.filter = btn.dataset.subjectFilter; renderSubjectDetail(d, resources); }));
    if (visible.some(x => x._audio)) hydrateStorageAudio(document.getElementById('content'), StudentPortal.getToken());
  }

  async function loadCourse(d) {
    const courseId = String(d.student?.course_id || '').trim();
    const courseName = String(d.student?.course || '').trim();
    if (courseId) {
      const { data } = await StudentPortal.sb.from('courses').select('id,name,subjects').eq('id', courseId).maybeSingle();
      if (data) return data;
    }
    if (courseName) {
      const { data } = await StudentPortal.sb.from('courses').select('id,name,subjects').ilike('name', courseName).limit(1).maybeSingle();
      return data || null;
    }
    return null;
  }

  (async function init() {
    try {
      state.data = await StudentPortal.loadPortal();
      state.course = await loadCourse(state.data);
      renderSubjects(state.data, allResources(state.data));
    } catch (_) {}
  }());
}());
