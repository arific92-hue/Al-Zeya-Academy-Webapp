(function () {
  'use strict';

  document.querySelectorAll('[data-nav]').forEach(a => a.classList.toggle('active', a.dataset.nav === 'dashboard'));
  document.getElementById('logoutBtn')?.addEventListener('click', StudentPortal.goLogin);

  const state = { calendarDate: new Date(), portalData: null };

  function parseDate(value) {
    if (!value) return null;
    const d = new Date(`${value}T00:00:00`);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  function todayKey() { return StudentPortal.academyClock().dateKey; }

  function sortedClasses(rows) {
    return [...(rows || [])].sort((a, b) => {
      const da = String(a.class_date || ''), db = String(b.class_date || '');
      return da.localeCompare(db) || String(a.class_time || '').localeCompare(String(b.class_time || ''));
    });
  }

  function getPrimaryClass(rows) {
    const now = new Date();
    const classes = sortedClasses(rows);
    const live = classes.find(x => StudentPortal.getClassAccess(x, now).state === 'live');
    if (live) return { item: live, access: StudentPortal.getClassAccess(live, now) };
    const catchup = classes.find(x => StudentPortal.getClassAccess(x, now).state === 'catchup');
    if (catchup) return { item: catchup, access: StudentPortal.getClassAccess(catchup, now) };
    const upcoming = classes.find(x => StudentPortal.getClassAccess(x, now).state === 'upcoming');
    if (upcoming) return { item: upcoming, access: StudentPortal.getClassAccess(upcoming, now) };
    const recent = classes.filter(x => StudentPortal.getClassAccess(x, now).state === 'completed').at(-1);
    return { item: recent || null, access: recent ? StudentPortal.getClassAccess(recent, now) : null };
  }

  function renderCalendarPreview(attendanceRows, classRows) {
    const year = state.calendarDate.getFullYear();
    const month = state.calendarDate.getMonth();
    const first = new Date(year, month, 1);
    const start = (first.getDay() + 6) % 7;
    const days = new Date(year, month + 1, 0).getDate();
    const attendance = new Map((attendanceRows || []).map(item => [String(item.class_date), String(item.status || '')]));
    const classDays = new Set((classRows || []).map(item => String(item.class_date || '')));
    const monthLabel = first.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
    const cells = [];
    for (let i = 0; i < start; i += 1) cells.push('<div class="calendar-day muted-day" aria-hidden="true"></div>');
    const today = todayKey();
    for (let day = 1; day <= days; day += 1) {
      const d = new Date(year, month, day), key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      let cls = '';
      const status = attendance.get(key);
      if (status) cls = `attendance-${status}`;
      if (key === today) cls += ' today';
      const title = `${d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}${status ? ` · ${status}` : ''}${classDays.has(key) ? ' · class scheduled' : ''}`;
      cells.push(`<div class="calendar-day ${cls.trim()}" title="${StudentPortal.esc(title)}"><span>${day}</span></div>`);
    }
    return `<div class="section-head" style="margin-top:0"><div><h3>Academic Calendar</h3><p>Attendance and class activity at a glance.</p></div><span class="tiny muted">${StudentPortal.esc(monthLabel)}</span></div><div class="compact-calendar">${['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(day => `<div class="calendar-weekday">${day}</div>`).join('')}${cells.join('')}</div><div class="row" style="margin-top:12px;gap:10px;flex-wrap:wrap"><span class="tiny muted"><b class="legend-dot" style="background:#19A765"></b> Present</span><span class="tiny muted"><b class="legend-dot" style="background:#E84C3D"></b> Absent</span><span class="tiny muted"><b class="legend-dot" style="background:#D88E14"></b> Late</span><span class="tiny muted"><b class="legend-dot" style="background:#2A5AA5"></b> Leave</span></div>`;
  }

  function renderFee(fees) {
    const rows = Array.isArray(fees) ? fees : [];
    const totalDue = rows.reduce((sum, item) => sum + Math.max(Number(item.amount_due || 0), 0), 0);
    const totalPaid = rows.reduce((sum, item) => sum + Math.max(Number(item.amount_paid || 0), 0), 0);
    const outstanding = Math.max(totalDue - totalPaid, 0);
    const progress = totalDue > 0 ? Math.min(100, Math.round(totalPaid * 100 / totalDue)) : 0;
    const open = rows.find(item => Math.max(Number(item.amount_due || 0) - Number(item.amount_paid || 0), 0) > 0);
    const payButton = outstanding > 0 && open ? `<a class="btn btn-gold" id="upiPayBtn" href="#" rel="nofollow">Pay ₹${outstanding.toLocaleString('en-IN')}</a>` : `<span class="badge badge-success">No payment due</span>`;
    return `<section class="card" id="fees"><div class="section-head" style="margin:0"><div><h3>Fee Overview</h3><p>${outstanding > 0 ? 'You have an outstanding balance.' : 'Your current fee record is up to date.'}</p></div><span class="score-pill">${progress}% paid</span></div><div class="fee-progress"><span style="width:${progress}%"></span></div><div class="fee-figures"><span>Paid <strong>₹${totalPaid.toLocaleString('en-IN')}</strong></span><span>Total <strong>₹${totalDue.toLocaleString('en-IN')}</strong></span></div><div class="fee-payment-actions">${payButton}<a class="btn btn-soft" href="student-profile.html">Fee History</a></div><p class="fee-payment-note">Your academy fee record is the source of truth.</p></section>`;
  }

  function liveHero(primary, allClasses, student) {
    if (!primary.item) return `<section class="live-hero live-hero-empty"><div class="live-hero-content"><span class="status-pill"><span class="status-dot"></span> Learning today</span><h2>No live class published yet</h2><div class="subject">Your next academy session will appear here.</div><div class="live-actions"><a class="btn btn-gold" href="student-live-classes.html">View Classes →</a></div></div><div class="live-art" aria-hidden="true">✦</div></section>`;
    const x = primary.item, access = primary.access || StudentPortal.getClassAccess(x), link = StudentPortal.classJoinUrl(x, allClasses);
    const label = access.state === 'live' ? 'LIVE NOW' : access.state === 'catchup' ? 'CATCH-UP OPEN' : access.state === 'upcoming' ? 'LIVE SOON' : 'NEXT CLASS';
    const statusClass = access.state === 'live' ? 'live' : access.state === 'catchup' ? 'catchup' : '';
    const canJoin = Boolean(link && access.joinAvailable);
    const action = canJoin ? `<a class="dashboard-join-btn active" href="${StudentPortal.esc(link)}" target="_blank" rel="noopener">JOIN NOW <span>→</span></a>` : `<a class="dashboard-join-btn disabled" href="student-live-classes.html" aria-disabled="true" title="${StudentPortal.esc(StudentPortal.classWindowText(access, x))}" data-disabled-dashboard-join="true">JOIN NOW <span>→</span></a>`;
    return `<section class="live-hero ${access.state === 'catchup' ? 'is-catchup' : ''}"><div class="live-hero-content"><span class="status-pill"><span class="status-dot ${statusClass}"></span>${label}</span><h2>${StudentPortal.esc(x.title || 'Live Class')}</h2><div class="subject">${StudentPortal.esc(x.subject || student.course || 'Academy Class')}</div><div class="live-meta"><span>◷ ${StudentPortal.esc(StudentPortal.formatTimeLabel(x.class_time))}</span><span>▣ ${StudentPortal.esc(StudentPortal.fmtDate(x.class_date))}</span></div><p class="live-window-note">${StudentPortal.esc(StudentPortal.classWindowText(access, x))}</p><div class="live-hero-actions">${action}</div></div><div class="live-art" aria-hidden="true"><div class="live-art-glow"></div><div class="live-art-book">▰</div></div></section>`;
  }

  function renderDashboard(d) {
    state.portalData = d;
    StudentPortal.setupShell(d.student);
    const classes = sortedClasses(d.live_classes || []), primary = getPrimaryClass(classes);
    const todayClasses = classes.filter(x => String(x.class_date || '') === todayKey());
    const schedule = todayClasses.length ? todayClasses : classes.filter(x => StudentPortal.getClassAccess(x).state === 'upcoming').slice(0, 3);
    const marks = Array.isArray(d.marks) ? d.marks : [];
    const total = marks.reduce((sum, item) => sum + Number(item.marks_obtained || 0), 0);
    const max = marks.reduce((sum, item) => sum + Number(item.max_marks || 0), 0);
    const pct = max ? Math.round(total * 100 / max) : 0;
    const notifications = Array.isArray(d.notifications) ? d.notifications.slice(0, 3) : [];
    const s = d.student || {}, initial = StudentPortal.getInitials(s.student_name);
    const quick = `<div class="quick-grid"><a class="quick-link" href="student-live-classes.html"><span class="quick-icon">▶</span><span class="quick-copy"><strong>My Classes</strong><small>Live & upcoming</small></span></a><a class="quick-link" href="student-materials.html"><span class="quick-icon">▤</span><span class="quick-copy"><strong>Study Material</strong><small>By subject</small></span></a><a class="quick-link" href="student-marks.html"><span class="quick-icon">⌁</span><span class="quick-copy"><strong>Marks</strong><small>Progress & results</small></span></a><a class="quick-link" href="student-profile.html"><span class="quick-icon">●</span><span class="quick-copy"><strong>Profile</strong><small>Your academy record</small></span></a></div>`;
    const scheduleHtml = schedule.length ? schedule.map(x => `<a class="schedule-item" href="student-live-classes.html"><div class="schedule-date"><strong>${parseDate(x.class_date)?.getDate() || '—'}</strong><small>${parseDate(x.class_date)?.toLocaleDateString('en-IN', { month: 'short' }) || ''}</small></div><div class="schedule-copy"><strong>${StudentPortal.esc(x.title || x.subject || 'Class')}</strong><small>${StudentPortal.esc(x.subject || s.course || 'Academy class')}</small><div class="schedule-time">${StudentPortal.esc(StudentPortal.formatTimeLabel(x.class_time))}</div></div><span class="item-arrow">›</span></a>`).join('') : '<div class="empty">No classes are scheduled yet.</div>';
    const noticeHtml = notifications.length ? notifications.map(x => `<div class="notice-item"><span class="notice-icon">▣</span><span class="notice-copy"><strong>${StudentPortal.esc(x.title || x.message || 'Academy update')}</strong><small>${StudentPortal.esc(x.message || 'New update available in your portal.')}</small></span></div>`).join('') : '<div class="empty" style="margin:8px 0">No new academy updates right now.</div>';
    const resultCard = `<section class="card"><div class="section-head" style="margin:0"><div><h3>Recent Results</h3><p>Your latest published academic progress.</p></div><a class="section-link" href="student-marks.html">View all →</a></div><div class="metric-card" style="margin-top:14px"><span class="metric-icon">⌁</span><span><small>Overall published score</small><strong>${pct}%</strong></span></div><div class="row" style="margin-top:10px"><span class="tiny muted">${total} obtained</span><span class="tiny muted">${max} total</span></div></section>`;

    document.getElementById('content').innerHTML = `<div class="hero-greeting"><div><div class="page-kicker">Al-Zeya Academy · Student Portal</div><h1>Assalamualaikum,<br>${StudentPortal.esc(s.student_name || 'Student')}</h1><p>${StudentPortal.esc(s.course || 'Your learning journey')} · ${StudentPortal.esc(s.student_id || 'Student ID')}</p></div><a class="profile-mini" href="student-profile.html"><span class="profile-mini-avatar">${StudentPortal.esc(initial)}</span><span class="profile-mini-copy"><small>Current course</small><strong>${StudentPortal.esc(s.course || 'Not assigned')}</strong></span></a></div>${liveHero(primary, classes, s)}<section style="margin-top:16px">${quick}</section><div class="grid grid-2" style="margin-top:24px"><section class="card"><div class="section-head" style="margin:0"><div><h3>Today's Schedule</h3><p>${todayClasses.length ? 'Your classes scheduled for today.' : 'Upcoming sessions from your course.'}</p></div><a class="section-link" href="student-live-classes.html">View all →</a></div><div class="schedule-list">${scheduleHtml}</div></section><section class="card" id="attendance"><div>${renderCalendarPreview(d.attendance || [], classes)}</div></section></div><div class="grid grid-2" style="margin-top:16px"><section class="card"><div class="section-head" style="margin:0"><div><h3>Notice Board</h3><p>Updates from the academy.</p></div></div><div class="notice-list">${noticeHtml}</div></section>${renderFee(d.fees || [])}</div><div class="grid grid-2" style="margin-top:16px">${resultCard}<div class="quote-card"><blockquote>“The best of people are those who learn and teach.”</blockquote><footer>Prophet Muhammad ﷺ</footer></div></div>`;

    const feeRows = Array.isArray(d.fees) ? d.fees : [], open = feeRows.find(item => Math.max(Number(item.amount_due || 0) - Number(item.amount_paid || 0), 0) > 0), payable = open ? Math.max(Number(open.amount_due || 0) - Number(open.amount_paid || 0), 0) : 0;
    const upi = document.getElementById('upiPayBtn');
    if (upi && open && payable > 0) {
      try {
        const reference = `AZA-${String(open.id || open.month_date || Date.now()).replace(/[^A-Za-z0-9-]/g, '').slice(0, 28)}`;
        upi.href = StudentPortal.buildUpiPaymentUrl({ amount: payable, reference, note: `Al Zeya Academy fee - ${StudentPortal.fmtDate(open.month_date)}` });
      } catch (error) { upi.addEventListener('click', event => { event.preventDefault(); alert(error.message || 'Unable to start the UPI payment.'); }); }
    }
    document.querySelectorAll('[data-disabled-dashboard-join]').forEach(linkEl => linkEl.addEventListener('click', event => event.preventDefault()));
  }

  async function refreshDashboard() { try { renderDashboard(await StudentPortal.portalSnapshot()); } catch (_) {} }
  (async function init() { try { const data = await StudentPortal.loadPortal(); renderDashboard(data); window.setInterval(refreshDashboard, 15000); document.addEventListener('visibilitychange', () => { if (!document.hidden) refreshDashboard(); }, { passive: true }); } catch (_) {} }());
}());
