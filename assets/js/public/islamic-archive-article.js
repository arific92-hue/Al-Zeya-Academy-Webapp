(() => {
  'use strict';
  const client = window.supabaseClient;
  const $ = (selector, root = document) => root.querySelector(selector);
  const escapeHtml = window.escapeHtml || ((v = '') => String(v).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])));
  let current = null;

  function setLoading(message) {
    const state = $('#archiveArticleState');
    if (state) state.innerHTML = `<div class="archive-article-state-icon">۞</div><h2>${escapeHtml(message)}</h2>`;
  }

  function renderContent(post) {
    const content = $('#articleContent');
    if (!content) return;
    content.innerHTML = '';

    if (post.arabic_quote) {
      const quote = document.createElement('blockquote');
      quote.className = 'archive-article-quote ar';
      quote.textContent = post.arabic_quote;
      content.appendChild(quote);
    }

    if (post.translation) {
      const heading = document.createElement('h2');
      heading.className = 'archive-article-subheading';
      heading.textContent = 'Tarjuma / Mafhoom';
      content.appendChild(heading);
      const p = document.createElement('p');
      p.textContent = post.translation;
      content.appendChild(p);
    }

    const paragraphs = String(post.content || '')
      .split(/\n\s*\n|\n(?=\s*[-•])/)
      .map(part => part.trim())
      .filter(Boolean);

    paragraphs.forEach(part => {
      const p = document.createElement('p');
      if (/^[-•]\s*/.test(part)) {
        p.className = 'archive-article-list-item';
        p.textContent = part.replace(/^[-•]\s*/, '');
      } else {
        p.textContent = part;
      }
      content.appendChild(p);
    });

    if (Array.isArray(post.takeaways) && post.takeaways.length) {
      const box = document.createElement('section');
      box.className = 'archive-article-takeaways';
      const heading = document.createElement('h2');
      heading.className = 'archive-article-subheading';
      heading.textContent = 'Is mauzu se kya seekhein?';
      box.appendChild(heading);
      const list = document.createElement('ul');
      post.takeaways.forEach(item => {
        const li = document.createElement('li');
        li.textContent = item;
        list.appendChild(li);
      });
      box.appendChild(list);
      content.appendChild(box);
    }
  }

  function renderRelated(posts) {
    const wrap = $('#articleRelated');
    if (!wrap) return;
    const related = posts.filter(post => post.id !== current.id).slice(0, 3);
    if (!related.length) { wrap.hidden = true; return; }
    wrap.hidden = false;
    wrap.innerHTML = `<div class="archive-article-related-head"><span class="section-eyebrow">Aage parhein</span><h2>Isi mauzu se mutaliq</h2></div><div class="archive-article-related-grid">${related.map(post => `
      <a class="archive-article-related-card" href="archive-article.html?slug=${encodeURIComponent(post.slug || post.id)}">
        <span>${escapeHtml(post.category_name || 'Islamic Knowledge')}</span>
        <strong>${escapeHtml(post.title || 'Untitled')}</strong>
        ${post.summary ? `<p>${escapeHtml(post.summary)}</p>` : ''}
      </a>`).join('')}</div>`;
  }

  function shareArticle() {
    if (!current) return;
    const url = `${window.location.origin}${window.location.pathname}?slug=${encodeURIComponent(current.slug || current.id)}`;
    const payload = { title: current.title || 'Islamic Archive', text: `${current.title || 'Islamic Archive'} — Al-Zeya Academy`, url };
    if (navigator.share) navigator.share(payload).catch(() => {});
    else navigator.clipboard?.writeText(url).then(() => alert('Article link copied.'));
  }

  async function copyReference() {
    if (!current?.source_reference) return;
    try {
      await navigator.clipboard.writeText(current.source_reference);
      const button = $('#copyReferenceBtn');
      if (button) {
        const old = button.textContent;
        button.textContent = 'Reference copied';
        setTimeout(() => { button.textContent = old; }, 1200);
      }
    } catch {}
  }

  async function loadArticle() {
    if (!client) return;
    const slug = new URLSearchParams(window.location.search).get('slug');
    if (!slug) { setLoading('Article nahi mila.'); return; }

    const { data, error } = await client.rpc('get_public_archive_post', { p_slug: slug });
    const post = Array.isArray(data) ? data[0] : data;
    if (error || !post) {
      console.error('Archive article load failed:', error);
      setLoading('Yeh article available nahi hai.');
      return;
    }

    current = post;
    $('#archiveArticleState')?.setAttribute('hidden', 'hidden');
    $('#archiveArticleContent')?.removeAttribute('hidden');

    document.title = `${post.title || 'Islamic Archive'} · Al-Zeya Academy`;
    $('#articleCategory').textContent = post.category_name || 'Islamic Knowledge';
    $('#articleTitle').textContent = post.title || 'Untitled';
    const urdu = $('#articleUrduTitle');
    if (post.urdu_title) { urdu.textContent = post.urdu_title; urdu.hidden = false; }
    else urdu.hidden = true;
    $('#articleSummary').textContent = post.summary || '';
    $('#articlePreparedBy').textContent = post.contributor_name
      ? `Prepared by ${post.contributor_name}${post.contributor_role ? ` · ${post.contributor_role}` : ''}`
      : 'Al-Zeya Academy Archive';
    const verification = $('#articleVerification');
    verification.textContent = post.verification_label || 'Reviewed by Al-Zeya Academy';
    $('#articleSourceType').textContent = post.source_type || 'Reference';
    $('#articleReferenceSource').textContent = post.source_type || 'Reference';
    const refBox = $('#articleReferenceBox');
    if (post.source_reference) {
      $('#articleReference').textContent = post.source_reference;
      refBox.hidden = false;
    } else refBox.hidden = true;

    const media = $('#articleHeroMedia');
    if (post.thumbnail_url) media.innerHTML = `<img src="${escapeHtml(post.thumbnail_url)}" alt="" decoding="async">`;
    else media.innerHTML = '<div class="archive-article-placeholder" aria-hidden="true">۞</div>';

    renderContent(post);

    const relatedResult = await client.rpc('search_public_archive', {
      p_query: null,
      p_category: post.category_slug || null,
      p_limit: 4
    });
    renderRelated(Array.isArray(relatedResult.data) ? relatedResult.data : []);
  }

  function initMenu() {
    const menuToggle = $('#menuToggle');
    const mobileMenu = $('#mobileMenu');
    const menuIcon = $('#menuIcon');
    if (!menuToggle || !mobileMenu || !menuIcon) return;
    const openIcon = '<path stroke-linecap="round" d="M4 7h16M4 12h16M4 17h16" />';
    const closeIcon = '<path stroke-linecap="round" d="M6 6l12 12M6 18L18 6" />';
    const close = () => { mobileMenu.classList.remove('open'); menuToggle.setAttribute('aria-expanded','false'); menuIcon.innerHTML = openIcon; };
    menuToggle.addEventListener('click', event => { event.stopPropagation(); const open = mobileMenu.classList.toggle('open'); menuToggle.setAttribute('aria-expanded', String(open)); menuIcon.innerHTML = open ? closeIcon : openIcon; });
    mobileMenu.querySelectorAll('a').forEach(a => a.addEventListener('click', close));
    document.addEventListener('click', event => { if (mobileMenu.classList.contains('open') && !mobileMenu.contains(event.target) && !menuToggle.contains(event.target)) close(); });
  }

  function init() {
    initMenu();
    $('#shareArticleBtn')?.addEventListener('click', shareArticle);
    $('#copyReferenceBtn')?.addEventListener('click', copyReference);
    window.addEventListener('load', loadArticle, { once: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
