/* Mobile menu — same behavior as the homepage */
  const menuToggle = document.getElementById("menuToggle");
  const mobileMenu = document.getElementById("mobileMenu");
  const menuIcon   = document.getElementById("menuIcon");
  const ICON_OPEN  = `<path stroke-linecap="round" d="M4 7h16M4 12h16M4 17h16" />`;
  const ICON_CLOSE = `<path stroke-linecap="round" d="M6 6l12 12M6 18L18 6" />`;

  if (menuToggle && mobileMenu && menuIcon) {
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
      if (isOpen && !mobileMenu.contains(event.target) && !menuToggle.contains(event.target)) {
        mobileMenu.classList.remove("open");
        menuToggle.setAttribute("aria-expanded", "false");
        menuIcon.innerHTML = ICON_OPEN;
      }
    });
  }

  /* Back to top */
  const backToTop = document.getElementById("backToTop");
  if (backToTop) {
    window.addEventListener("scroll", () => backToTop.classList.toggle("visible", window.scrollY > 500));
    backToTop.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
  }


/* ---- original inline script block separator ---- */


(async()=>{
const client = window.supabaseClient;try{const {data}=await client.from('courses').select('*').order('created_at',{ascending:false});if(!data||!data.length)return;const grid=document.querySelector('.courses-grid');if(!grid)return;data.forEach(c=>{const card=document.createElement('article');card.className='course-card';const subjects=Array.isArray(c.subjects)?c.subjects:[];card.innerHTML=`<div class="course-thumb" style="background:linear-gradient(135deg,var(--navy-800),var(--navy-950))">${c.thumbnail_url?`<img src="${c.thumbnail_url}" alt="${String(c.name||'Course').replace(/"/g,'&quot;')}" style="width:100%;height:100%;object-fit:cover;border-radius:inherit">`:'<span class="thumb-icon" style="color:var(--amber-300);font-family:Cormorant Garamond,Georgia,serif;font-size:32px;font-weight:700">'+String(c.name||'C').slice(0,1)+'</span>'}</div><div class="course-body"><div class="course-meta-top"><span>Academy Course</span><span class="dot"></span><span class="level">Managed</span></div><h3 class="course-title">${escapeHtml(c.name||'Untitled Course')}</h3><p class="course-urdu">${subjects.length?escapeHtml(subjects.slice(0,3).join(' · ')):'Structured learning program'}</p><p class="course-desc">${escapeHtml(c.description||'')}</p><div class="course-stats"><div class="course-stat"><span class="k">Duration</span><span class="v">${escapeHtml(c.duration||'—')}</span></div><div class="course-stat fees"><span class="k">Fees</span><span class="v">₹${escapeHtml(String(c.fees??'—'))}</span></div></div><div class="course-actions"><a href="admission.html?course=${encodeURIComponent(c.name||'')}" class="btn-explore" style="grid-column:1/-1">Apply <svg fill="none" stroke="currentColor" stroke-width="2.4" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 12h14m-6-6l6 6-6 6"/></svg></a></div></div>`;grid.appendChild(card)});}catch(e){console.warn('Managed courses unavailable',e)}})();function escapeHtml(s){return String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}
