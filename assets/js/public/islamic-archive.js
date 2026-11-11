(() => {
  'use strict';
  const client = window.supabaseClient;
  const $ = (selector, root = document) => root.querySelector(selector);
  const escapeHtml = window.escapeHtml || ((v = '') => String(v).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])));

  const state = { categories: [], activeCategory: 'all', query: '', currentPage: 1, pageSize: 9, posts: [] };

  function setContributionModal(open) {
    const modal = $('#contributionModal');
    if (!modal) return;
    modal.hidden = !open;
    modal.setAttribute('aria-hidden', String(!open));
    document.body.classList.toggle('archive-modal-open', open);
  }

  function renderCategories() {
    const wrap = $('#archiveCategories');
    if (!wrap) return;
    const all = [{ slug: 'all', name: 'Sab' }, ...state.categories];
    wrap.innerHTML = all.map(category => `
      <button type="button" class="archive-chip${state.activeCategory === category.slug ? ' active' : ''}" data-category="${escapeHtml(category.slug)}">
        ${escapeHtml(category.name)}
      </button>`).join('');
  }

  function card(post) {
    const contributor = post.contributor_name
      ? `Prepared by ${escapeHtml(post.contributor_name)}`
      : 'Al-Zeya Academy Archive';
    const thumbnail = post.thumbnail_url
      ? `<img class="archive-card-media-image" src="${escapeHtml(post.thumbnail_url)}" alt="" loading="lazy" decoding="async">`
      : `<div class="archive-card-media-placeholder" aria-hidden="true"><span>۞</span></div>`;

    return `<article class="archive-card">
      <a class="archive-card-media" href="archive-article.html?slug=${encodeURIComponent(post.slug || post.id)}" aria-label="Read ${escapeHtml(post.title || 'Archive article')}">
        ${thumbnail}
      </a>
      <div class="archive-card-top">
        <span class="archive-card-badge">${escapeHtml(post.category_name || post.category || 'Islamic Knowledge')}</span>
        <h3>${escapeHtml(post.title || 'Untitled')}</h3>
        ${post.urdu_title ? `<div class="archive-card-urdu">${escapeHtml(post.urdu_title)}</div>` : ''}
        <p>${escapeHtml(post.summary || 'Read the researched article and its reference.')}</p>
      </div>
      <div class="archive-card-footer">
        <span class="archive-card-meta">${contributor}</span>
        <a class="archive-read-btn" href="archive-article.html?slug=${encodeURIComponent(post.slug || post.id)}">Read Article <span aria-hidden="true">→</span></a>
      </div>
    </article>`;
  }

  function renderPagination(totalPages) {
    const nav = $('#archivePagination');
    if (!nav) return;
    if (totalPages <= 1) {
      nav.hidden = true;
      nav.innerHTML = '';
      return;
    }
    const items = [];
    items.push(`<button type="button" class="archive-page-btn" data-page="${state.currentPage - 1}" aria-label="Previous page" ${state.currentPage === 1 ? 'disabled' : ''}>‹</button>`);
    const start = Math.max(1, Math.min(state.currentPage - 2, totalPages - 4));
    const end = Math.min(totalPages, Math.max(5, state.currentPage + 2));
    if (start > 1) {
      items.push(`<button type="button" class="archive-page-btn" data-page="1">1</button>`);
      if (start > 2) items.push('<span class="archive-page-ellipsis" aria-hidden="true">…</span>');
    }
    for (let page = start; page <= end; page++) {
      items.push(`<button type="button" class="archive-page-btn${page === state.currentPage ? ' active' : ''}" data-page="${page}" aria-current="${page === state.currentPage ? 'page' : 'false'}">${page}</button>`);
    }
    if (end < totalPages) {
      if (end < totalPages - 1) items.push('<span class="archive-page-ellipsis" aria-hidden="true">…</span>');
      items.push(`<button type="button" class="archive-page-btn" data-page="${totalPages}">${totalPages}</button>`);
    }
    items.push(`<button type="button" class="archive-page-btn" data-page="${state.currentPage + 1}" aria-label="Next page" ${state.currentPage === totalPages ? 'disabled' : ''}>›</button>`);
    nav.innerHTML = items.join('');
    nav.hidden = false;
  }

  function renderResults(posts) {
    const grid = $('#archiveGrid');
    const empty = $('#archiveEmpty');
    const resultCount = $('#resultCount');
    if (!grid || !empty) return;
    state.posts = Array.isArray(posts) ? posts : [];
    const total = state.posts.length;
    const totalPages = Math.max(1, Math.ceil(total / state.pageSize));
    state.currentPage = Math.min(Math.max(1, state.currentPage), totalPages);
    const start = (state.currentPage - 1) * state.pageSize;
    const visiblePosts = state.posts.slice(start, start + state.pageSize);
    grid.innerHTML = visiblePosts.map(card).join('');
    empty.hidden = total !== 0;
    if (resultCount) resultCount.textContent = total ? `${total} result${total === 1 ? '' : 's'}` : '';
    const title = $('#resultsTitle');
    if (title) title.textContent = state.query || state.activeCategory !== 'all' ? 'Search Results' : 'Latest from the Archive';
    renderPagination(totalPages);
  }

  async function loadCategories() {
    if (!client) return;
    const { data, error } = await client.rpc('get_public_archive_categories');
    if (error) {
      console.warn('Archive categories unavailable:', error);
      state.categories = [];
    } else {
      state.categories = Array.isArray(data) ? data : [];
    }
    renderCategories();
    const select = $('#archiveCategorySelect');
    if (select) select.innerHTML = state.categories.map(category => `<option value="${escapeHtml(category.slug)}">${escapeHtml(category.name)}</option>`).join('');
  }

  async function searchArchive() {
    if (!client) return;
    state.currentPage = 1;
    const { data, error } = await client.rpc('search_public_archive', {
      p_query: state.query || null,
      p_category: state.activeCategory === 'all' ? null : state.activeCategory,
      p_limit: 100
    });
    if (error) {
      console.error('Archive search failed:', error);
      renderResults([]);
      const emptyTitle = $('#emptyTitle');
      const emptyText = $('#emptyText');
      if (emptyTitle) emptyTitle.textContent = 'Archive load nahi ho saka';
      if (emptyText) emptyText.textContent = 'Thori der baad dobara koshish karein.';
      return;
    }
    renderResults(Array.isArray(data) ? data : []);
  }

  async function submitContribution(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const btn = $('#submitContributionBtn');
    const status = $('#contributionStatus');
    const formData = new FormData(form);
    const payload = {
      contributor_name: String(formData.get('contributorName') || '').trim(),
      contributor_role: String(formData.get('contributorRole') || '').trim(),
      contributor_email: String(formData.get('contributorEmail') || '').trim(),
      category: String(formData.get('category') || '').trim(),
      title: String(formData.get('title') || '').trim(),
      summary: String(formData.get('summary') || '').trim(),
      content: String(formData.get('content') || '').trim(),
      source_type: String(formData.get('sourceType') || '').trim(),
      source_reference: String(formData.get('reference') || '').trim(),
      tags: String(formData.get('tags') || '').split(',').map(v => v.trim()).filter(Boolean)
    };

    if (!payload.contributor_name || !payload.category || !payload.title || !payload.content) return;
    btn.disabled = true;
    status.className = 'archive-form-status show';
    status.textContent = 'Submission review ke liye bheji ja rahi hai…';

    const { error } = await client.rpc('submit_archive_contribution', { p_payload: payload });
    if (error) {
      console.error(error);
      status.className = 'archive-form-status show error';
      status.textContent = 'Submission bhejne mein masla hua. Dobara koshish karein.';
      btn.disabled = false;
      return;
    }

    status.className = 'archive-form-status show';
    status.textContent = 'JazakAllahu Khairan. Aapki submission review ke liye bhej di gayi hai.';
    form.reset();
    setTimeout(() => setContributionModal(false), 1400);
    btn.disabled = false;
  }

  function initMenu() {
    const menuToggle = $('#menuToggle');
    const mobileMenu = $('#mobileMenu');
    const menuIcon = $('#menuIcon');
    if (!menuToggle || !mobileMenu || !menuIcon) return;
    const openIcon = '<path stroke-linecap="round" d="M4 7h16M4 12h16M4 17h16" />';
    const closeIcon = '<path stroke-linecap="round" d="M6 6l12 12M6 18L18 6" />';
    const close = () => {
      mobileMenu.classList.remove('open');
      menuToggle.setAttribute('aria-expanded', 'false');
      menuIcon.innerHTML = openIcon;
    };
    menuToggle.addEventListener('click', event => {
      event.stopPropagation();
      const open = mobileMenu.classList.toggle('open');
      menuToggle.setAttribute('aria-expanded', String(open));
      menuIcon.innerHTML = open ? closeIcon : openIcon;
    });
    mobileMenu.querySelectorAll('a').forEach(a => a.addEventListener('click', close));
    document.addEventListener('click', event => {
      if (mobileMenu.classList.contains('open') && !mobileMenu.contains(event.target) && !menuToggle.contains(event.target)) close();
    });
  }

  function init() {
    initMenu();
    const search = $('#archiveSearchInput');
    let timer;
    search?.addEventListener('input', () => {
      clearTimeout(timer);
      state.query = search.value.trim();
      timer = setTimeout(searchArchive, 180);
    });
    $('#clearArchiveSearch')?.addEventListener('click', () => {
      if (search) search.value = '';
      state.query = '';
      searchArchive();
      search?.focus();
    });
    $('#archiveCategories')?.addEventListener('click', event => {
      const button = event.target.closest('[data-category]');
      if (!button) return;
      state.activeCategory = button.dataset.category || 'all';
      renderCategories();
      searchArchive();
    });

    $('#archivePagination')?.addEventListener('click', event => {
      const button = event.target.closest('[data-page]');
      if (!button || button.disabled) return;
      const page = Number(button.dataset.page);
      if (!Number.isInteger(page) || page < 1) return;
      const totalPages = Math.max(1, Math.ceil(state.posts.length / state.pageSize));
      if (page > totalPages) return;
      state.currentPage = page;
      renderResults(state.posts);
      document.querySelector('#archiveGrid')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    document.querySelectorAll('[data-close-contribution]').forEach(el => el.addEventListener('click', () => setContributionModal(false)));
    $('#contributionForm')?.addEventListener('submit', submitContribution);
    $('#openContributionHero')?.addEventListener('click', () => setContributionModal(true));
    $('#openContributionBottom')?.addEventListener('click', () => setContributionModal(true));
    $('#emptyContributionBtn')?.addEventListener('click', () => setContributionModal(true));
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') setContributionModal(false);
    });

    window.addEventListener('load', async () => {
      if (!client) return;
      await loadCategories();
      await searchArchive();
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
