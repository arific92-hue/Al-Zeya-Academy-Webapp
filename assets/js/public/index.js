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
  

/* ---- original inline script block separator ---- */


(async()=>{try{
const sb = window.supabaseClient;const g=document.getElementById('homeCoursesGrid');if(!g)return;const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));const {data:courses,error}=await sb.from('courses').select('id,name,duration,fees,description,subjects,thumbnail_url,pinned').eq('pinned',true).order('created_at',{ascending:false});if(error||!courses?.length){g.innerHTML='';return;}g.innerHTML=courses.map(c=>{const subjects=Array.isArray(c.subjects)?c.subjects.filter(Boolean):[];const fee=c.fees!==null&&c.fees!==undefined&&c.fees!==''?`₹${Number(c.fees).toLocaleString('en-IN')}`:'—';const thumb=c.thumbnail_url?`<img src="${esc(c.thumbnail_url)}" alt="${esc(c.name)} course thumbnail" loading="lazy" style="width:100%;height:100%;object-fit:cover">`:`<span class="thumb-icon"><svg fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" viewBox="0 0 24 24"><path d="M4 19.5A2.5 2.5 0 016.5 17H20V4a2 2 0 00-2-2H6.5A2.5 2.5 0 004 4.5v15z"></path><path d="M4 19.5A2.5 2.5 0 016.5 22H20v-3"></path><path d="M9 7h7M9 11h7"></path></svg></span>`;return `<article class="course-card"><span class="pinned-tag"><svg fill="currentColor" viewBox="0 0 24 24"><path d="M14.5 2l2.7 5.5 6 .9-4.35 4.24 1.03 6-5.38-2.83L9.12 18.6l1.03-6L5.8 8.4l6-.9L14.5 2z"></path></svg>Pinned</span><div class="course-thumb hifz">${thumb}</div><div class="course-body"><div class="course-meta-top"><span>Islamic &amp; Academic Program</span><span class="dot"></span><span class="level">${esc(c.duration||'Structured')}</span></div><h3 class="course-title">${esc(c.name||'Untitled Course')}</h3><p class="course-desc">${esc(c.description||'A structured learning program offered by Al-Zeya Academy.')}</p><div class="course-stats"><div class="course-stat"><span class="k">Subjects</span><span class="v">${subjects.length}<em>${subjects.length===1?' subject':' subjects'}</em></span></div><div class="course-stat fees"><span class="k">Monthly Fees</span><span class="v">${fee}<em>/mo</em></span></div></div><div class="course-actions"><a class="btn-explore" href="#" data-course-explore data-course-name="${esc(c.name||'Untitled Course')}" data-course-description="${esc(c.description||'')}" data-course-subjects="${esc(JSON.stringify(subjects))}">Explore Course</a><a class="btn-apply" href="admission.html?course=${encodeURIComponent(c.name||'')}">Apply <svg fill="none" stroke="currentColor" stroke-width="2.4" viewBox="0 0 24 24"><path d="M5 12h14m-6-6 6 6-6 6" stroke-linecap="round" stroke-linejoin="round"></path></svg></a></div></div></article>`}).join('')}catch(e){console.warn('Dynamic featured courses unavailable',e)}})();


/* ---- original inline script block separator ---- */


(async()=>{try{
const sb = window.supabaseClient;const esc=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const {data:notices,error:ne}=await sb.from('notices').select('*').eq('published',true).order('pinned',{ascending:false}).order('notice_date',{ascending:false}).order('created_at',{ascending:false}).limit(3);if(!ne&&notices?.length){const g=document.querySelector('.notices-grid');if(g){const cats={examination:'exam','new-batch':'event',holiday:'holiday',event:'event',admission:'holiday',general:'event'};g.innerHTML=notices.map(n=>{const d=new Date(n.notice_date+'T00:00:00');const href=n.link_url||'notices.html';return `<a class="notice-card" href="${esc(href)}"><div class="notice-date"><span class="day">${String(d.getDate()).padStart(2,'0')}</span><span class="mon">${esc(d.toLocaleDateString('en-IN',{month:'short'}))}</span></div><div class="notice-content"><span class="cat ${cats[n.category]||'event'}">${esc(n.category.replace('-', ' '))}</span><h4>${esc(n.title)}${n.pinned?' <span style="font-size:9px;letter-spacing:.08em;text-transform:uppercase;color:var(--amber-300)">Pinned</span>':''}</h4><p>${esc(n.short_description)}</p><span class="read-more">${esc(n.link_text||'Read notice')}<svg fill="none" stroke="currentColor" stroke-width="2.4" viewBox="0 0 24 24"><path d="M5 12h14m-6-6 6 6-6 6" stroke-linecap="round" stroke-linejoin="round"></path></svg></span></div></a>`}).join('')}}
const {data:offers,error:oe}=await sb.from('offers').select('*').eq('active',true).order('sort_order',{ascending:true}).order('created_at',{ascending:false});if(!oe&&offers?.length){const g=document.querySelector('.offers-grid');if(g){const now=new Date();const valid=offers.filter(o=>{const start=!o.start_date||new Date(o.start_date+'T00:00:00')<=now;const end=!o.end_date||new Date(o.end_date+'T23:59:59')>=now;return start&&end});const icons={currency:'<path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"></path>',star:'<path d="M12 3l2.09 6.26L20.5 10l-5 4.5L17 21l-5-3-5 3 1.5-6.5-5-4.5 6.41-.74L12 3z"></path>',siblings:'<path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"></path>',book:'<path d="M4 5.5A2.5 2.5 0 016.5 3H20v15H6.5A2.5 2.5 0 004 20.5zM4 5.5v15"></path>',award:'<circle cx="12" cy="8" r="5"></circle><path d="M8.5 12.5L7 21l5-3 5 3-1.5-8.5"></path>'};g.innerHTML=valid.map(o=>`<div class="offer-card"><span class="offer-badge">${esc(o.badge)}${o.badge_label?`<span>${esc(o.badge_label)}</span>`:''}</span><span class="offer-icon"><svg fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" viewBox="0 0 24 24">${icons[o.icon]||icons.currency}</svg></span><h3>${esc(o.title)}</h3><p>${esc(o.description)}</p>${o.validity_text?`<div class="offer-validity"><svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"></circle><path d="M12 7v5l3 2" stroke-linecap="round"></path></svg>${esc(o.validity_text)}</div>`:''}<a class="offer-cta" href="${esc(o.cta_url||'admission.html')}">${esc(o.cta_text||'Learn More')}<svg fill="none" stroke="currentColor" stroke-width="2.4" viewBox="0 0 24 24"><path d="M5 12h14m-6-6 6 6-6 6" stroke-linecap="round" stroke-linejoin="round"></path></svg></a></div>`).join('')}}}
catch(e){console.warn('Dynamic public content unavailable; keeping existing fallback content.',e)}})();

  const courseModal = document.getElementById("courseModal");
  const courseModalTitle = document.getElementById("courseModalTitle");
  const courseModalIntro = document.getElementById("courseModalIntro");
  const courseModalSubjects = document.getElementById("courseModalSubjects");
  const courseModalApply = document.getElementById("courseModalApply");
  const courseModalClose = document.getElementById("courseModalClose");

  function closeCourseModal() {
    if (!courseModal) return;
    courseModal.hidden = true;
    courseModal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }

  function openCourseModal(name, description, subjects) {
    if (!courseModal) return;
    courseModalTitle.textContent = name || "Course";
    courseModalIntro.textContent = description || "Explore the subjects included in this Al-Zeya Academy course.";
    const list = Array.isArray(subjects) ? subjects.filter(Boolean) : [];
    courseModalSubjects.innerHTML = list.length
      ? list.map((subject, i) => `<div class="course-subject"><span class="course-subject-num">${i + 1}</span><span>${esc(subject)}</span></div>`).join("")
      : '<div class="course-subject-empty">Subjects for this course have not been added yet.</div>';
    courseModalApply.href = `admission.html?course=${encodeURIComponent(name || "")}`;
    courseModal.hidden = false;
    courseModal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }

  document.addEventListener("click", (event) => {
    const trigger = event.target.closest("[data-course-explore]");
    if (trigger) {
      event.preventDefault();
      let subjects = [];
      try { subjects = JSON.parse(trigger.dataset.courseSubjects || "[]"); } catch (_) {}
      openCourseModal(trigger.dataset.courseName || "Course", trigger.dataset.courseDescription || "", subjects);
    }
    if (event.target === courseModal || event.target.closest("#courseModalClose")) closeCourseModal();
  });
  document.addEventListener("keydown", (event) => { if (event.key === "Escape") closeCourseModal(); });


