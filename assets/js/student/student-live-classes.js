(function () {
  'use strict';

  document.querySelectorAll('[data-nav]').forEach(a => a.classList.toggle('active', a.dataset.nav === 'classes'));
  document.getElementById('logoutBtn')?.addEventListener('click', StudentPortal.goLogin);

  // The Classes page intentionally keeps the completed history in the backend.
  // It simply does not expose that history as a visible tab anymore.
  const state = { filter: 'ongoing', data: null };
  const UPCOMING_DAYS = 7;

  function dateKeyFromParts(year, month, day) {
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  function rollingUpcomingEnd() {
    const now = new Date();
    const academyParts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).formatToParts(now).reduce((out, part) => {
      out[part.type] = part.value;
      return out;
    }, {});

    // Use UTC for the arithmetic after extracting the academy-local calendar date.
    // This prevents the browser's own timezone from shifting the 7-day window.
    const base = new Date(Date.UTC(
      Number(academyParts.year),
      Number(academyParts.month) - 1,
      Number(academyParts.day)
    ));
    base.setUTCDate(base.getUTCDate() + (UPCOMING_DAYS - 1));
    return dateKeyFromParts(base.getUTCFullYear(), base.getUTCMonth() + 1, base.getUTCDate());
  }

  function sorted(items, mode) {
    return [...(items || [])].sort((a, b) => {
      if (mode === 'ongoing') {
        const aState = StudentPortal.getClassAccess(a).state;
        const bState = StudentPortal.getClassAccess(b).state;
        const stateRank = { live: 0, catchup: 1, upcoming: 2, completed: 3 };
        const rankDiff = (stateRank[aState] ?? 9) - (stateRank[bState] ?? 9);
        if (rankDiff) return rankDiff;
      }
      return String(a.class_date || '').localeCompare(String(b.class_date || '')) ||
        String(a.class_time || '').localeCompare(String(b.class_time || '')) ||
        String(a.title || '').localeCompare(String(b.title || ''));
    });
  }

  function isWithinRollingUpcomingWindow(item) {
    const access = StudentPortal.getClassAccess(item);
    if (access.state !== 'upcoming') return false;

    const startKey = StudentPortal.academyClock().dateKey;
    const endKey = rollingUpcomingEnd();
    const dateKey = String(item?.class_date || '').trim();
    return Boolean(dateKey) && dateKey >= startKey && dateKey <= endKey;
  }

  function counts(items) {
    const liveCount = items.filter(x => ['live', 'catchup'].includes(StudentPortal.getClassAccess(x).state)).length;
    const upcomingCount = items.filter(isWithinRollingUpcomingWindow).length;
    return { ongoing: liveCount, upcoming: upcomingCount };
  }

  function badgeFor(access) {
    const map = {
      live: ['LIVE NOW', 'badge-danger'],
      catchup: ['CATCH-UP OPEN', 'badge-success'],
      upcoming: ['UPCOMING', 'badge-warning'],
      completed: ['COMPLETED', 'badge-blue']
    };
    const [label, cls] = map[access.state] || map.upcoming;
    return `<span class="badge ${cls}">${label}</span>`;
  }

  function joinButton(access, joinUrl, item) {
    const safeText = StudentPortal.esc(StudentPortal.classWindowText(access, item));
    if (joinUrl && access.joinAvailable) {
      return `<a class="class-join-cta active ${access.state === 'live' ? 'live' : ''}" href="${StudentPortal.esc(joinUrl)}" target="_blank" rel="noopener">JOIN NOW <span>→</span></a>`;
    }
    return `<a class="class-join-cta disabled" href="student-live-classes.html" aria-disabled="true" title="${safeText}" data-disabled-join="true">JOIN NOW <span>→</span></a>`;
  }

  function renderCard(x, allRows) {
    const access = StudentPortal.getClassAccess(x);
    const joinUrl = StudentPortal.classJoinUrl(x, allRows);
    const stateClass = access.state === 'live'
      ? 'class-card-live'
      : access.state === 'catchup'
        ? 'class-card-catchup'
        : access.state === 'completed'
          ? 'class-card-completed'
          : '';
    const windowText = StudentPortal.classWindowText(access, x);
    const artLabel = access.state === 'live'
      ? 'Live lesson'
      : access.state === 'catchup'
        ? 'Catch-up open'
        : 'Upcoming class';
    const artIcon = access.state === 'live' ? '▶' : access.state === 'catchup' ? '↺' : '✦';
    const artCopy = access.state === 'upcoming'
      ? 'Join window opens 15 min before'
      : 'Meet link available during window';

    return `<article class="class-card ${stateClass}">
      <div class="class-card-main">
        <div class="class-status-row">
          ${badgeFor(access)}
          <span class="class-course-label">${StudentPortal.esc(x.subject || 'Academy Class')}</span>
        </div>
        <h3>${StudentPortal.esc(x.title || x.subject || 'Live Class')}</h3>
        <div class="class-meta">
          <span>▣ ${StudentPortal.esc(StudentPortal.fmtDate(x.class_date))}</span>
          <span>◷ ${StudentPortal.esc(StudentPortal.formatTimeLabel(x.class_time))}</span>
        </div>
        ${x.notes ? `<p class="class-note">${StudentPortal.esc(x.notes)}</p>` : ''}
        <div class="class-window-chip">${StudentPortal.esc(windowText)}</div>
        <div class="class-actions">${joinButton(access, joinUrl, x)}</div>
      </div>
      <div class="class-card-art" aria-hidden="true">
        <div class="class-art-circle">${artIcon}</div>
        <strong>${artLabel}</strong>
        <small>${artCopy}</small>
      </div>
    </article>`;
  }

  function render() {
    const d = state.data || {};
    const items = Array.isArray(d.live_classes) ? d.live_classes : [];
    const c = counts(items);
    const filter = state.filter;

    const filtered = filter === 'ongoing'
      ? sorted(items.filter(x => ['live', 'catchup'].includes(StudentPortal.getClassAccess(x).state)), 'ongoing')
      : sorted(items.filter(isWithinRollingUpcomingWindow), 'upcoming');

    StudentPortal.setupShell(d.student);

    document.getElementById('content').innerHTML = `
      <div class="page-hero classes-page-header">
        <div>
          <div class="page-kicker">Live learning</div>
          <h1 class="page-title">Classes</h1>
          <p class="page-lead">Your live sessions are updated automatically. The join window opens 15 minutes before class and stays active for 15 minutes after it ends.</p>
        </div>
        <a class="page-back" href="student-dashboard.html">← Home</a>
      </div>

      <section class="portal-banner classes-hero">
        <div>
          <div class="eyebrow">Learn · Reflect · Grow</div>
          <h2>Your live learning schedule.</h2>
        </div>
        <div class="study-art" aria-hidden="true">▶</div>
      </section>

      <section class="class-view-toolbar" aria-label="Class schedule filters">
        <div class="class-view-copy">
          <span class="class-view-kicker">Class schedule</span>
          <strong>${filter === 'ongoing' ? 'Live & Catch-up' : 'Next 7 Days'}</strong>
        </div>
        <div class="class-tabs" role="tablist" aria-label="Class schedule views">
          <button class="filter-tab ${filter === 'ongoing' ? 'active' : ''}" data-class-filter="ongoing" role="tab" aria-selected="${filter === 'ongoing'}">Live <span>${c.ongoing}</span></button>
          <button class="filter-tab ${filter === 'upcoming' ? 'active' : ''}" data-class-filter="upcoming" role="tab" aria-selected="${filter === 'upcoming'}">Upcoming <span>${c.upcoming}</span></button>
        </div>
      </section>

      <section class="class-list" aria-live="polite">
        ${filtered.length
          ? filtered.map(x => renderCard(x, items)).join('')
          : `<div class="card class-empty-state">
              <div class="class-empty-icon">${filter === 'ongoing' ? '◷' : '✦'}</div>
              <div class="empty-title">${filter === 'ongoing' ? 'No live class right now' : 'No upcoming classes in the next 7 days'}</div>
              <div class="empty-copy">${filter === 'ongoing' ? 'Your next scheduled session will become available automatically when its join window opens.' : 'Your rolling schedule will update automatically each day as the seven-day window moves forward.'}</div>
              <button type="button" class="empty-switch" data-class-filter="${filter === 'ongoing' ? 'upcoming' : 'ongoing'}">View ${filter === 'ongoing' ? 'Upcoming' : 'Live'} Classes</button>
            </div>`}
      </section>`;

    document.querySelectorAll('[data-class-filter]').forEach(button => {
      button.addEventListener('click', () => {
        state.filter = button.dataset.classFilter;
        render();
      });
    });

    document.querySelectorAll('[data-disabled-join]').forEach(link => {
      link.addEventListener('click', event => event.preventDefault());
    });
  }

  (async function init() {
    try {
      state.data = await StudentPortal.loadPortal();
      render();

      window.setInterval(async () => {
        try {
          state.data = await StudentPortal.portalSnapshot();
          render();
        } catch (_) {}
      }, 15000);

      document.addEventListener('visibilitychange', async () => {
        if (!document.hidden) {
          try {
            state.data = await StudentPortal.portalSnapshot();
            render();
          } catch (_) {}
        }
      }, { passive: true });
    } catch (_) {}
  }());
}());
