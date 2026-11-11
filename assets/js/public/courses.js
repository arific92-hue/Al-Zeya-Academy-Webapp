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

function courseSlug(value) {
  return String(value ?? "")
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeCourseName(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}

const supabaseClient = window.supabaseClient;
const searchInput = document.getElementById("courseSearch");
const count = document.getElementById("courseCount");
const grid = document.getElementById("coursesGrid");
const coursesSection = document.querySelector(".courses-section");
const courseDetail = document.getElementById("courseDetail");
let allCourses = [];
let detailCourseId = "";

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({
    "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"
  }[c]));
}

function courseThumbnailMarkup(course, detail = false) {
  if (course?.thumbnail_url) {
    return `<img src="${esc(course.thumbnail_url)}" alt="${esc(course.name || "Course")} course thumbnail" ${detail ? "" : "loading=\"lazy\""}>`;
  }
  return `<span class="thumb-icon" aria-hidden="true"><svg fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" viewBox="0 0 24 24"><path d="M4 19.5A2.5 2.5 0 016.5 17H20V4a2 2 0 00-2-2H6.5A2.5 2.5 0 004 4.5v15z"></path><path d="M4 19.5A2.5 2.5 0 016.5 22H20v-3"></path><path d="M9 7h7M9 11h7"></path></svg></span>`;
}

function renderCourses(list) {
  if (!list.length) {
    grid.innerHTML = '<div class="course-empty"><strong>No course found</strong><span>Courses added by the academy will appear here.</span></div>';
    count.textContent = "0 courses";
    return;
  }
  grid.innerHTML = list.map(c => {
    const subjects = Array.isArray(c.subjects) ? c.subjects.filter(Boolean) : [];
    const fee = c.fees !== null && c.fees !== undefined && c.fees !== "" ? `₹${Number(c.fees).toLocaleString("en-IN")}` : "—";
    return `<article class="course-card" id="course-${courseSlug(c.name)}" data-course-id="${esc(c.id || "")}">
      <div class="course-thumb hifz">${courseThumbnailMarkup(c)}</div>
      <div class="course-body">
        <div class="course-meta-top"><span>Islamic &amp; Academic Program</span><span class="dot"></span><span class="level">${esc(c.duration || "Structured")}</span></div>
        <h3 class="course-title">${esc(c.name || "Untitled Course")}</h3>
        <p class="course-desc">${esc(c.description || "A structured learning program offered by Al-Zeya Academy.")}</p>
        <div class="course-stats">
          <div class="course-stat"><span class="k">Subjects</span><span class="v">${subjects.length}<em>${subjects.length === 1 ? " subject" : " subjects"}</em></span></div>
          <div class="course-stat fees"><span class="k">Monthly Fees</span><span class="v">${fee}<em>/mo</em></span></div>
        </div>
        <div class="course-actions">
          <a href="#courseDetail" class="btn-explore" data-course-explore data-course-id="${esc(c.id || "")}">Explore Course</a>
          <a href="admission.html?course=${encodeURIComponent(c.name || "")}" class="btn-apply">Apply <svg fill="none" stroke="currentColor" stroke-width="2.4" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 12h14m-6-6l6 6-6 6"/></svg></a>
        </div>
      </div>
    </article>`;
  }).join("");
  count.textContent = `${list.length} ${list.length === 1 ? "course" : "courses"}`;
}

function filterCourses() {
  const query = (searchInput?.value || "").trim().toLowerCase();
  const filtered = !query ? allCourses : allCourses.filter(c => JSON.stringify(c).toLowerCase().includes(query));
  if (coursesSection?.classList.contains("detail-open")) closeCourseDetail({ updateUrl: false, scroll: false });
  renderCourses(filtered);
}

function findCourseFromQuery(value) {
  const wanted = normalizeCourseName(value);
  if (!wanted) return null;
  return allCourses.find(course => {
    const current = normalizeCourseName(course.name);
    return current === wanted || current.includes(wanted) || wanted.includes(current);
  }) || null;
}

function setCourseUrl(course, { replace = false } = {}) {
  const url = new URL(window.location.href);
  url.searchParams.set("course", course.name || "");
  url.hash = "courseDetail";
  const state = { courseId: course.id };
  if (replace) window.history.replaceState(state, "", url);
  else window.history.pushState(state, "", url);
}

function clearCourseUrl() {
  const url = new URL(window.location.href);
  url.searchParams.delete("course");
  url.hash = "courses";
  window.history.pushState({}, "", url);
}

function renderCourseDetail(course) {
  if (!courseDetail || !course) return;
  const subjects = Array.isArray(course.subjects) ? course.subjects.filter(Boolean) : [];
  const fee = course.fees !== null && course.fees !== undefined && course.fees !== "" ? `₹${Number(course.fees).toLocaleString("en-IN")}` : "—";
  courseDetail.innerHTML = `
    <a class="course-detail-back" id="courseDetailBack" href="#courses" aria-label="Back to all courses">
      <svg aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24" width="17" height="17"><path d="M19 12H5M11 18l-6-6 6-6" stroke-linecap="round" stroke-linejoin="round"/></svg>
      Back to All Courses
    </a>
    <div class="course-detail-hero">
      <div class="course-detail-media">${courseThumbnailMarkup(course, true)}</div>
      <div class="course-detail-title-wrap">
        <div class="course-detail-kicker">Islamic &amp; Academic Program</div>
        <h1 class="course-detail-title">${esc(course.name || "Course")}</h1>
        ${course.name_urdu ? `<div class="course-detail-urdu ar" lang="ur">${esc(course.name_urdu)}</div>` : ""}
        <div class="course-detail-meta">
          <div class="course-detail-stat"><span class="k">Duration</span><span class="v">${esc(course.duration || "Structured")}</span></div>
          <div class="course-detail-stat"><span class="k">Subjects</span><span class="v">${subjects.length}</span></div>
          <div class="course-detail-stat fee"><span class="k">Monthly Fee</span><span class="v">${esc(fee)}</span></div>
        </div>
      </div>
    </div>
    <section class="course-detail-section">
      <h3>About this Course</h3>
      <p class="course-detail-description">${esc(course.description || "A structured learning program offered by Al-Zeya Academy.")}</p>
    </section>
    <section class="course-detail-section">
      <h3>Course Subjects</h3>
      <div class="course-detail-subjects">
        ${subjects.length ? subjects.map((subject, i) => `<div class="course-detail-subject"><span class="course-detail-subject-num">${String(i + 1).padStart(2, "0")}</span><span>${esc(subject)}</span></div>`).join("") : '<div class="course-detail-empty">Subjects for this course have not been added yet.</div>'}
      </div>
    </section>
    <div class="course-detail-apply">
      <p>Ready to begin your journey with this course?</p>
      <a href="admission.html?course=${encodeURIComponent(course.name || "")}">Apply for this Course <svg aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.4" viewBox="0 0 24 24" width="17" height="17"><path d="M5 12h14m-6-6l6 6-6 6" stroke-linecap="round" stroke-linejoin="round"/></svg></a>
    </div>`;
}

function openCourseDetail(course, { updateUrl = true, scroll = true, replaceUrl = false } = {}) {
  if (!courseDetail || !course) return;
  detailCourseId = String(course.id || "");
  renderCourseDetail(course);
  if (coursesSection) coursesSection.classList.add("detail-open");
  courseDetail.hidden = false;
  if (updateUrl) setCourseUrl(course, { replace: replaceUrl });
  else if (replaceUrl) setCourseUrl(course, { replace: true });
  if (scroll) {
    requestAnimationFrame(() => {
      courseDetail.scrollIntoView({ behavior: "smooth", block: "start" });
      courseDetail.focus({ preventScroll: true });
    });
  }
}

function closeCourseDetail({ updateUrl = true, scroll = true } = {}) {
  if (!courseDetail) return;
  detailCourseId = "";
  if (coursesSection) coursesSection.classList.remove("detail-open");
  courseDetail.hidden = true;
  if (updateUrl) clearCourseUrl();
  if (scroll) {
    document.getElementById("courses")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

async function loadCourses() {
  grid.innerHTML = '<div class="course-loading">Loading courses…</div>';
  const { data, error } = await supabaseClient.from("courses").select("id,name,duration,fees,description,subjects,thumbnail_url,pinned,created_at").order("created_at", { ascending: false });
  if (error) {
    grid.innerHTML = '<div class="course-empty"><strong>Courses are temporarily unavailable</strong><span>Please try again shortly.</span></div>';
    count.textContent = "0 courses";
    console.error(error);
    return;
  }
  allCourses = Array.isArray(data) ? data : [];
  filterCourses();

  const requestedCourse = new URLSearchParams(window.location.search).get("course");
  const match = findCourseFromQuery(requestedCourse);
  if (match) {
    requestAnimationFrame(() => openCourseDetail(match, { updateUrl: false, scroll: true, replaceUrl: true }));
  }
}

document.addEventListener("click", (event) => {
  const trigger = event.target.closest("[data-course-explore]");
  if (trigger) {
    event.preventDefault();
    const course = allCourses.find(item => String(item.id || "") === String(trigger.dataset.courseId || ""));
    if (course) openCourseDetail(course);
    return;
  }

  if (event.target.closest("#courseDetailBack")) {
    event.preventDefault();
    closeCourseDetail();
  }
});

window.addEventListener("popstate", () => {
  const requestedCourse = new URLSearchParams(window.location.search).get("course");
  const match = findCourseFromQuery(requestedCourse);
  if (match) openCourseDetail(match, { updateUrl: false, scroll: true });
  else closeCourseDetail({ updateUrl: false, scroll: true });
});

if (searchInput) searchInput.addEventListener("input", filterCourses);
loadCourses();

/* Back to top */
const backToTop = document.getElementById("backToTop");
if (backToTop) {
  window.addEventListener("scroll", () => backToTop.classList.toggle("visible", window.scrollY > 500));
  backToTop.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
}
