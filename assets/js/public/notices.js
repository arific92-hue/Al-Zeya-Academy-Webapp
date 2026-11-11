/* Mobile menu */
    const menuToggle = document.getElementById("menuToggle");
    const mobileMenu = document.getElementById("mobileMenu");
    const menuIcon   = document.getElementById("menuIcon");

    const ICON_OPEN  = `<path stroke-linecap="round" d="M4 7h16M4 12h16M4 17h16" />`;
    const ICON_CLOSE = `<path stroke-linecap="round" d="M6 6l12 12M6 18L18 6" />`;

    menuToggle.addEventListener("click", () => {
      const isOpen = mobileMenu.classList.toggle("open");
      menuToggle.setAttribute("aria-expanded", isOpen);
      menuIcon.innerHTML = isOpen ? ICON_CLOSE : ICON_OPEN;
    });

    mobileMenu.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        mobileMenu.classList.remove("open");
        menuToggle.setAttribute("aria-expanded", "false");
        menuIcon.innerHTML = ICON_OPEN;
      });
    });

    document.addEventListener("click", (event) => {
      const isOpen = mobileMenu.classList.contains("open");
      const clickedInsideMenu = mobileMenu.contains(event.target);
      const clickedToggle = menuToggle.contains(event.target);

      if (isOpen && !clickedInsideMenu && !clickedToggle) {
        mobileMenu.classList.remove("open");
        menuToggle.setAttribute("aria-expanded", "false");
        menuIcon.innerHTML = ICON_OPEN;
      }
    });

    /* Progress bar animation */
    window.addEventListener("load", () => {
      document.querySelectorAll(".progress-fill").forEach((bar, i) => {
        const w = bar.dataset.width || "0%";
        setTimeout(() => { bar.style.width = w; }, 300 + i * 160);
      });
    });

    /* Back to top */
    const backToTop = document.getElementById("backToTop");
    window.addEventListener("scroll", () => {
      backToTop.classList.toggle("visible", window.scrollY > 500);
    });
    backToTop.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  
    /* Notices page filters/search */
    const noticeCards = Array.from(document.querySelectorAll('.full-notice-card'));
    const noticeFilters = Array.from(document.querySelectorAll('.notice-filter'));
    const noticeSearch = document.getElementById('noticeSearch');
    const clearNoticeSearch = document.getElementById('clearNoticeSearch');
    const noticeCount = document.getElementById('noticeCount');
    const noticeEmpty = document.getElementById('noticeEmpty');
    let activeNoticeFilter = 'all';

    function applyNoticeFilters() {
      const q = (noticeSearch ? noticeSearch.value : '').trim().toLowerCase();
      let shown = 0;
      noticeCards.forEach((card) => {
        const categoryMatch = activeNoticeFilter === 'all' || card.dataset.category === activeNoticeFilter;
        const textMatch = !q || card.dataset.search.includes(q) || card.textContent.toLowerCase().includes(q);
        const visible = categoryMatch && textMatch;
        card.style.display = visible ? '' : 'none';
        if (visible) shown += 1;
      });
      if (noticeCount) noticeCount.textContent = `Showing ${shown} notice${shown === 1 ? '' : 's'}`;
      if (noticeEmpty) noticeEmpty.style.display = shown ? 'none' : 'block';
    }

    noticeFilters.forEach((filter) => {
      filter.addEventListener('click', () => {
        noticeFilters.forEach((item) => item.classList.remove('active'));
        filter.classList.add('active');
        activeNoticeFilter = filter.dataset.filter;
        applyNoticeFilters();
      });
    });
    noticeSearch?.addEventListener('input', applyNoticeFilters);
    clearNoticeSearch?.addEventListener('click', () => {
      if (noticeSearch) { noticeSearch.value = ''; noticeSearch.focus(); }
      applyNoticeFilters();
    });


/* ---- original inline script block separator ---- */


(async()=>{try{
const sb = window.supabaseClient;const {data,error}=await sb.from('notices').select('*').eq('published',true).order('pinned',{ascending:false}).order('notice_date',{ascending:false}).order('created_at',{ascending:false});if(error||!data?.length)return;const grid=document.getElementById('noticeGrid');if(!grid)return;const empty=grid.querySelector('#noticeEmpty');const cats={examination:'exam','new-batch':'event',holiday:'holiday',event:'event',admission:'holiday',general:'event'};const esc=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));const dateParts=v=>{const d=new Date(v+'T00:00:00');return {day:String(d.getDate()).padStart(2,'0'),mon:d.toLocaleDateString('en-IN',{month:'short',year:'numeric'})}};grid.innerHTML=data.map(n=>{const d=dateParts(n.notice_date), tags=Array.isArray(n.tags)?n.tags:[], href=n.link_url||'index.html#notices', text=n.link_text||'Read notice';return `<article class="full-notice-card${n.pinned?' is-pinned':''}" data-category="${esc(n.category)}" data-search="${esc([n.title,n.short_description,n.content,n.category,tags.join(' ')].join(' ')).toLowerCase()}"><div class="full-notice-date"><span class="day">${d.day}</span><span class="mon">${esc(d.mon)}</span></div><div class="full-notice-body"><span class="cat ${cats[n.category]||'event'}">${esc(n.category.replace('-', ' '))}</span>${n.pinned?'<span class="public-pin">Pinned</span>':''}<h3>${esc(n.title)}</h3><p>${esc(n.short_description)}</p>${tags.length?`<div class="full-notice-meta">${tags.map(t=>`<span class="notice-tag">${esc(t)}</span>`).join('')}</div>`:''}${n.content?`<div style="margin-top:12px;color:var(--muted-text);font-size:12px;line-height:1.65;white-space:pre-line">${esc(n.content)}</div>`:''}<a class="full-notice-link" href="${esc(href)}">${esc(text)} <svg fill="none" stroke="currentColor" stroke-width="2.4" viewBox="0 0 24 24"><path d="M5 12h14m-6-6 6 6-6 6" stroke-linecap="round" stroke-linejoin="round"></path></svg></a></div></article>`}).join('')+(empty?empty.outerHTML:'');const cards=Array.from(grid.querySelectorAll('.full-notice-card'));const filters=Array.from(document.querySelectorAll('.notice-filter'));const search=document.getElementById('noticeSearch'),clear=document.getElementById('clearNoticeSearch'),count=document.getElementById('noticeCount'),emptyEl=document.getElementById('noticeEmpty');let active='all';function apply(){const q=(search?.value||'').trim().toLowerCase();let shown=0;cards.forEach(c=>{const ok=(active==='all'||c.dataset.category===active)&&(!q||c.dataset.search.includes(q)||c.textContent.toLowerCase().includes(q));c.style.display=ok?'':'none';if(ok)shown++});if(count)count.textContent=`Showing ${shown} notice${shown===1?'':'s'}`;if(emptyEl)emptyEl.style.display=shown?'none':'block'}filters.forEach(f=>f.addEventListener('click',()=>{filters.forEach(x=>x.classList.remove('active'));f.classList.add('active');active=f.dataset.filter;apply()}));search?.addEventListener('input',apply);clear?.addEventListener('click',()=>{if(search){search.value='';search.focus()}apply()});apply()}catch(e){console.warn('Dynamic notices unavailable; keeping static notices.',e)}})();

