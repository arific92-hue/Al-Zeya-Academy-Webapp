(function () {
  'use strict';

  document.querySelectorAll('[data-nav]').forEach(a => a.classList.toggle('active', a.dataset.nav === 'profile'));
  document.getElementById('logoutBtn')?.addEventListener('click', StudentPortal.goLogin);

  function infoRow(icon, label, value) {
    return `<div class="profile-detail-row"><div class="profile-detail-label"><span class="profile-item-icon">${icon}</span><span>${StudentPortal.esc(label)}</span></div><strong>${StudentPortal.esc(value || '—')}</strong></div>`;
  }

  function feeStatus(item) {
    const status = String(item.status || '').toLowerCase();
    if (status === 'paid') return '<span class="badge badge-success">Paid</span>';
    if (status === 'partial') return '<span class="badge badge-warning">Partial</span>';
    if (status === 'waived') return '<span class="badge badge-blue">Waived</span>';
    return '<span class="badge">Pending</span>';
  }

  function monthLabel(v) {
    if (!v) return 'Month not recorded';
    const date = new Date(`${v}T00:00:00`);
    return Number.isNaN(date.getTime()) ? String(v) : date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  }

  function feeModal(rows, student, academicYear) {
    const sorted = [...rows].sort((a,b) => String(b.month_date || '').localeCompare(String(a.month_date || '')));
    const body = sorted.length ? sorted.map(item => { const due=Number(item.amount_due||0), paid=Number(item.amount_paid||0), balance=Math.max(due-paid,0); return `<div class="fee-history-row"><div><strong>${StudentPortal.esc(monthLabel(item.month_date))}</strong><small>${item.paid_on ? `Paid on ${StudentPortal.esc(StudentPortal.fmtDate(item.paid_on))}` : 'No payment date recorded'}</small></div><div class="fee-history-amounts"><span>Due <b>₹${due.toLocaleString('en-IN')}</b></span><span>Paid <b>₹${paid.toLocaleString('en-IN')}</b></span>${balance ? `<span>Balance <b>₹${balance.toLocaleString('en-IN')}</b></span>` : ''}${feeStatus(item)}</div></div>`; }).join('') : '<div class="empty">No fee records are available for the current enrolled class.</div>';
    return `<div class="portal-modal" id="feeHistoryModal" role="dialog" aria-modal="true" aria-labelledby="feeHistoryTitle"><div class="portal-modal-backdrop" data-close-fee></div><div class="portal-modal-card"><button class="portal-modal-close" type="button" data-close-fee aria-label="Close">×</button><div class="eyebrow">Fee History</div><h2 id="feeHistoryTitle">${StudentPortal.esc(student.course || 'Enrolled Class')}</h2><p class="portal-modal-lead">Monthly fee record for academic year ${StudentPortal.esc(academicYear || student.admission_year || '—')}.</p><div class="fee-history-list">${body}</div></div></div>`;
  }

  function render(d) {
    StudentPortal.setupShell(d.student);
    const s = d.student || {}, feeRows = Array.isArray(d.fees) ? d.fees : [];
    const outstanding = feeRows.reduce((sum, x) => sum + Math.max(Number(x.amount_due || 0) - Number(x.amount_paid || 0), 0), 0);
    document.getElementById('content').innerHTML = `<div class="page-hero"><div><div class="page-kicker">Student record</div><h1 class="page-title">Profile</h1><p class="page-lead">Your academy record, enrollment and account information.</p></div><button class="page-back" id="profileSignOut" type="button">Sign out</button></div><section class="profile-hero"><div class="profile-head"><div class="profile-avatar-lg">${StudentPortal.esc(StudentPortal.getInitials(s.student_name))}</div><div><h2>${StudentPortal.esc(s.student_name || 'Student')}</h2><p>${StudentPortal.esc(s.student_id || '—')} · ${StudentPortal.esc(s.course || 'Course not assigned')}</p><span class="badge badge-success">Enrolled</span></div></div></section><section class="profile-section"><div class="section-head"><div><h3>Personal Information</h3><p>Your personal details held by the academy.</p></div></div><div class="profile-detail-list">${infoRow('◉','Father / Guardian',s.guardian_name)}${infoRow('☎','Contact Number',s.mobile)}${infoRow('✉','Email',s.email)}${infoRow('▣','Date of Birth',StudentPortal.fmtDate(s.dob))}${infoRow('⌂','City',s.city)}${infoRow('⌖','State',s.state)}${infoRow('▤','Address',s.address)}</div></section><section class="profile-section"><div class="section-head"><div><h3>My Academy</h3><p>Current enrollment and academy-related information.</p></div></div><div class="profile-detail-list">${infoRow('▤','Enrolled Course',s.course)}${infoRow('₹','Monthly Fee',`₹${Number(s.monthly_fee || 0).toLocaleString('en-IN')}`)}${infoRow('◷','Admission Year',s.admission_year)}${infoRow('✓','Enrolled On',StudentPortal.fmtDate(s.enrolled_on))}${infoRow('●','Current Fee Balance',outstanding > 0 ? `₹${outstanding.toLocaleString('en-IN')} outstanding` : 'No payment due')}</div></section><section class="profile-actions-grid"><button class="quick-link profile-action-btn" id="feeDetailsBtn" type="button"><span class="quick-icon">₹</span><span class="quick-copy"><strong>Fee Details</strong><small>View monthly payment history</small></span><span class="item-arrow">›</span></button><a class="quick-link profile-action-btn" href="student-dashboard.html#attendance"><span class="quick-icon">◷</span><span class="quick-copy"><strong>Attendance</strong><small>View your attendance</small></span><span class="item-arrow">›</span></a></section>${feeModal(feeRows,s,d.academic_year)}`;
    document.getElementById('profileSignOut')?.addEventListener('click', StudentPortal.goLogin);
    document.getElementById('feeDetailsBtn')?.addEventListener('click', () => document.getElementById('feeHistoryModal')?.classList.add('show'));
    document.querySelectorAll('[data-close-fee]').forEach(el => el.addEventListener('click', () => document.getElementById('feeHistoryModal')?.classList.remove('show')));
    document.addEventListener('keydown', function onKey(e){ if(e.key==='Escape'){ document.getElementById('feeHistoryModal')?.classList.remove('show'); document.removeEventListener('keydown',onKey); } });
  }

  (async function init() { try { render(await StudentPortal.loadPortal()); } catch (_) {} }());
}());
