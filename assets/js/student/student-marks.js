(function () {
  'use strict';

  document.querySelectorAll('[data-nav]').forEach(a => a.classList.toggle('active', a.dataset.nav === 'marks'));
  document.getElementById('logoutBtn')?.addEventListener('click', StudentPortal.goLogin);

  function render(d) {
    StudentPortal.setupShell(d.student);
    const marks = Array.isArray(d.marks) ? d.marks : [];
    const total = marks.reduce((sum, item) => sum + Number(item.marks_obtained || 0), 0);
    const max = marks.reduce((sum, item) => sum + Number(item.max_marks || 0), 0);
    const pct = max ? Math.round(total * 100 / max) : 0;
    const subjectMap = new Map();
    marks.forEach(item => {
      const subject = item.subject || 'Subject';
      const bucket = subjectMap.get(subject) || { obtained: 0, max: 0, count: 0 };
      bucket.obtained += Number(item.marks_obtained || 0);
      bucket.max += Number(item.max_marks || 0);
      bucket.count += 1;
      subjectMap.set(subject, bucket);
    });
    const subjectRows = [...subjectMap.entries()].map(([subject, v]) => ({ subject, pct: v.max ? Math.round(v.obtained * 100 / v.max) : 0, ...v })).sort((a, b) => b.pct - a.pct);
    const assessments = {};
    marks.forEach(m => (assessments[m.assessment_name || 'Assessment'] ??= []).push(m));

    const topSubjects = subjectRows.slice(0, 6).map(item => `<div class="subject-row"><div><div class="subject-row-head"><strong>${StudentPortal.esc(item.subject)}</strong><span>${item.pct}%</span></div><div class="subject-bar"><span style="width:${item.pct}%"></span></div></div></div>`).join('');
    const assessmentSections = Object.entries(assessments).map(([assessment, items]) => `<section class="card" style="margin-top:14px"><div class="row"><div><div class="page-kicker">Assessment</div><h3>${StudentPortal.esc(assessment)}</h3></div><span class="badge">${items.length} subjects</span></div><div class="table-wrap" style="margin-top:12px"><table class="data-table"><thead><tr><th>Subject</th><th>Marks</th><th>Maximum</th><th>Percent</th><th>Remarks</th></tr></thead><tbody>${items.map(m => { const p = m.max_marks ? Math.round(Number(m.marks_obtained || 0) * 100 / Number(m.max_marks)) : 0; return `<tr><td><strong>${StudentPortal.esc(m.subject || '—')}</strong></td><td>${m.marks_obtained ?? '—'}</td><td>${m.max_marks ?? '—'}</td><td>${m.max_marks ? `${p}%` : '—'}</td><td>${StudentPortal.esc(m.remarks || '—')}</td></tr>`; }).join('')}</tbody></table></div></section>`).join('');

    document.getElementById('content').innerHTML = `<div class="page-hero"><div><div class="page-kicker">Academic progress</div><h1 class="page-title">Marks</h1><p class="page-lead">A clear view of your published performance across assessments and subjects.</p></div><a class="page-back" href="student-dashboard.html">← Home</a></div><section class="portal-banner"><div class="progress-hero"><div class="progress-copy"><div class="eyebrow">Your progress</div><h2>Keep going — you're building momentum.</h2><p>${marks.length ? `Your overall published score is based on ${marks.length} recorded subject results.` : 'Once the academy publishes your results, your progress will appear here.'}</p></div><div class="progress-ring" style="--pct:${pct}%"><div class="ring-text"><strong>${pct}%</strong><small>Overall score</small></div></div></div></section><section class="grid grid-3" style="margin-top:15px"><div class="metric-card"><span class="metric-icon">▤</span><span><small>Total Marks</small><strong>${max}</strong></span></div><div class="metric-card"><span class="metric-icon">✓</span><span><small>Obtained Marks</small><strong>${total}</strong></span></div><div class="metric-card"><span class="metric-icon">%</span><span><small>Percentage</small><strong>${pct}%</strong></span></div></section><section class="card" style="margin-top:16px"><div class="section-head" style="margin:0"><div><h3>Subject Wise Performance</h3><p>Grouped across your published assessments.</p></div></div>${topSubjects ? `<div class="subject-performance" style="margin-top:15px">${topSubjects}</div>` : '<div class="empty" style="margin-top:14px">No marks have been published yet.</div>'}</section>${assessmentSections}`;
  }

  (async function init() { try { render(await StudentPortal.loadPortal()); } catch (_) {} }());
}());
