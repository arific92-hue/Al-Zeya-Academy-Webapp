/* Al-Zeya Academy — simplified fee register + student portal access controls. */
(async () => {
  'use strict';

  if (!await window.AdminCore.requireAdmin()) return;

  const $ = (id) => document.getElementById(id);
  const esc = window.AdminCore.escape;
  const money = window.AdminCore.money;
  const today = () => new Date().toISOString().slice(0, 10);
  const currentMonth = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  };

  const state = {
    students: [],
    fees: new Map(),
    access: new Map(),
    filtered: [],
    editingStudentId: null,
    busy: false
  };

  const monthInput = $('feeMonth');
  const courseFilter = $('feeCourse');
  const statusFilter = $('feeStatusFilter');
  const searchInput = $('feeSearch');
  const rowsEl = $('feeRows');

  monthInput.value = currentMonth();

  function monthDate() {
    return `${monthInput.value || currentMonth()}-01`;
  }

  function monthLabel() {
    return monthLabelFor(monthDate());
  }

  function monthLabelFor(dateValue) {
    const date = String(dateValue || '').slice(0, 10);
    const parsed = new Date(`${date}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) return '—';
    return parsed.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  }

  function formatStatus(status) {
    return ({ pending: 'Pending', partial: 'Partial', paid: 'Paid', waived: 'Waived' }[status] || 'Pending');
  }

  function accessLabel(access) {
    if (!access || access.access_status === 'active') return 'Active';
    return access.access_status === 'fee_hold' ? 'Fee Hold' : 'Manual Hold';
  }

  function accessClass(access) {
    if (!access || access.access_status === 'active') return 'active';
    return access.access_status === 'fee_hold' ? 'fee-hold' : 'manual-hold';
  }

  function normalizeFee(fee, student) {
    if (!fee) {
      return {
        exists: false,
        id: null,
        amount_due: Number(student.monthly_fee || 0),
        amount_paid: 0,
        discount_amount: 0,
        due_date: '',
        paid_on: '',
        payment_method: '',
        payment_reference: '',
        receipt_number: '',
        notes: '',
        status: 'pending'
      };
    }
    return {
      exists: true,
      id: fee.id,
      amount_due: Number(fee.amount_due || 0),
      amount_paid: Number(fee.amount_paid || 0),
      discount_amount: Number(fee.discount_amount || 0),
      due_date: fee.due_date || '',
      paid_on: fee.paid_on || '',
      payment_method: fee.payment_method || '',
      payment_reference: fee.payment_reference || '',
      receipt_number: fee.receipt_number || '',
      notes: fee.notes || '',
      status: fee.status || 'pending'
    };
  }

  function balanceFor(fee) {
    if (fee.status === 'waived') return 0;
    return Math.max(Number(fee.amount_due || 0) - Number(fee.amount_paid || 0), 0);
  }

  function effectiveStatus(fee) {
    if (fee.status === 'waived') return 'waived';
    const due = Number(fee.amount_due || 0);
    const paid = Number(fee.amount_paid || 0);
    if (due > 0 && paid >= due) return 'paid';
    if (paid > 0) return 'partial';
    return 'pending';
  }

  function isOverdue(fee) {
    if (!fee.due_date || fee.status === 'paid' || fee.status === 'waived') return false;
    return fee.due_date < today() && balanceFor(fee) > 0;
  }

  function receiptNumberFor(fee) {
    const saved = String(fee?.receipt_number || '').trim();
    if (saved) return saved;
    const id = String(fee?.id || '').replace(/[^a-z0-9]/gi, '').slice(0, 8).toUpperCase();
    return id ? `RCP-${id}` : '—';
  }

  function receiptEsc(value) {
    return esc(value).replace(/\n/g, '<br>');
  }

  function printFeeReceipt(studentId) {
    const student = state.students.find(s => s.id === studentId);
    const fee = student ? normalizeFee(state.fees.get(studentId), student) : null;
    if (!student || !fee?.exists || Number(fee.amount_paid || 0) <= 0 || fee.status === 'waived') {
      AdminCore.toast('A receipt is available only for a recorded payment.', 'warning');
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      AdminCore.toast('The receipt window was blocked. Please allow pop-ups for this admin site.', 'warning');
      return;
    }

    const standardFee = Math.max(Number(fee.amount_due || 0) + Number(fee.discount_amount || 0), 0);
    const balance = balanceFor(fee);
    const statusText = effectiveStatus(fee) === 'paid' ? 'PAID IN FULL' : 'PARTIAL PAYMENT';
    const templateUrl = new URL('assets/receipt/fee-receipt-template.svg', window.location.href).href;
    const receiptNumber = receiptNumberFor(fee);
    const monthText = monthLabelFor(fee.month_date || monthDate());

    printWindow.document.open();
    printWindow.document.write(`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Fee Receipt · ${receiptEsc(student.student_name)}</title>
<style>
  @page { size: A5 portrait; margin: 0; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; width: 148mm; min-height: 210mm; background: #fff; }
  body { font-family: Inter, Arial, Helvetica, sans-serif; color: #14213d; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .receipt-page { position: relative; width: 148mm; height: 210mm; overflow: hidden; background: #fff; }
  .receipt-template { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
  .receipt-content { position: absolute; left: 12mm; right: 12mm; top: 32mm; bottom: 43mm; }
  .receipt-meta { display: grid; grid-template-columns: 1fr 1fr; gap: 5mm; margin-bottom: 4mm; }
  .meta-card { border: .35mm solid #d9deea; border-radius: 2.5mm; padding: 3mm 3.3mm; min-height: 13mm; }
  .k { display:block; font-size: 2.45mm; line-height: 1.2; letter-spacing: .25mm; text-transform: uppercase; color: #6c7485; font-weight: 700; margin-bottom: 1.1mm; }
  .v { display:block; font-size: 3.25mm; line-height: 1.25; color: #0f2451; font-weight: 700; overflow-wrap: anywhere; }
  .section-label { margin: 3mm 0 1.8mm; font-size: 2.55mm; line-height: 1.2; letter-spacing: .38mm; text-transform: uppercase; color: #2a3073; font-weight: 800; }
  .student-grid { display: grid; grid-template-columns: 1.35fr .8fr; gap: 2.5mm 5mm; border: .35mm solid #d9deea; border-radius: 2.5mm; padding: 3.1mm 3.3mm; }
  .student-item { min-width: 0; }
  .student-item.wide { grid-column: 1 / -1; }
  .student-item .v { font-size: 3.1mm; }
  .fee-table { width:100%; border-collapse: separate; border-spacing: 0; margin-top: 1.2mm; border: .35mm solid #cdd5e4; border-radius: 2.5mm; overflow: hidden; }
  .fee-table th, .fee-table td { padding: 2.5mm 3mm; border-bottom: .25mm solid #e0e4ec; font-size: 2.85mm; line-height: 1.25; vertical-align: middle; }
  .fee-table th { text-transform: uppercase; letter-spacing: .25mm; font-size: 2.35mm; color:#536075; background:#f5f7fa; text-align:left; }
  .fee-table tr:last-child td { border-bottom: 0; }
  .fee-table td.amount, .fee-table th.amount { text-align:right; white-space:nowrap; }
  .fee-table .strong { font-weight:800; color:#0f2451; }
  .status-row { display:flex; align-items:center; justify-content:space-between; gap:4mm; margin-top: 3mm; padding: 3mm 3.3mm; border: .4mm solid #2a3073; border-radius: 2.5mm; }
  .status { font-size: 3mm; font-weight: 900; letter-spacing: .25mm; color:#2a3073; }
  .status-balance { font-size: 2.8mm; color:#596273; text-align:right; }
  @media print { body { width:148mm; } .receipt-page { break-after: page; } }
</style>
</head>
<body>
<div class="receipt-page">
  <img class="receipt-template" src="${templateUrl}" alt="">
  <div class="receipt-content">
    <div class="receipt-meta">
      <div class="meta-card"><span class="k">Receipt No.</span><span class="v">${receiptEsc(receiptNumber)}</span></div>
      <div class="meta-card"><span class="k">Payment Date</span><span class="v">${receiptEsc(window.AdminCore.date(fee.paid_on))}</span></div>
    </div>

    <div class="section-label">Student Details</div>
    <div class="student-grid">
      <div class="student-item wide"><span class="k">Student Name</span><span class="v">${receiptEsc(student.student_name || '—')}</span></div>
      <div class="student-item"><span class="k">Student ID</span><span class="v">${receiptEsc(student.student_id || '—')}</span></div>
      <div class="student-item"><span class="k">Course</span><span class="v">${receiptEsc(student.course || '—')}</span></div>
      <div class="student-item"><span class="k">Fee Month</span><span class="v">${receiptEsc(monthText)}</span></div>
      <div class="student-item"><span class="k">Payment Method</span><span class="v">${receiptEsc(fee.payment_method || '—')}</span></div>
      ${fee.payment_reference ? `<div class="student-item wide"><span class="k">Payment Reference</span><span class="v">${receiptEsc(fee.payment_reference)}</span></div>` : ''}
    </div>

    <div class="section-label">Fee Details</div>
    <table class="fee-table">
      <thead><tr><th>Description</th><th class="amount">Amount</th></tr></thead>
      <tbody>
        <tr><td>Standard Monthly Fee</td><td class="amount">${receiptEsc(money(standardFee))}</td></tr>
        ${Number(fee.discount_amount || 0) > 0 ? `<tr><td>Discount</td><td class="amount">−${receiptEsc(money(fee.discount_amount))}</td></tr>` : ''}
        <tr><td class="strong">Net Fee</td><td class="amount strong">${receiptEsc(money(fee.amount_due))}</td></tr>
        <tr><td class="strong">Amount Received</td><td class="amount strong">${receiptEsc(money(fee.amount_paid))}</td></tr>
        <tr><td>Balance Due</td><td class="amount">${receiptEsc(money(balance))}</td></tr>
      </tbody>
    </table>

    <div class="status-row">
      <div class="status">${statusText}</div>
      <div class="status-balance">${balance > 0 ? `Balance remaining: ${receiptEsc(money(balance))}` : 'Fee balance cleared for this record.'}</div>
    </div>

  </div>
</div>
<script>
  const printNow = () => { window.focus(); window.setTimeout(() => window.print(), 120); };
  window.addEventListener('afterprint', () => window.close(), { once: true });
  const img = document.querySelector('.receipt-template');
  if (img.complete) { printNow(); }
  else {
    img.addEventListener('load', printNow, { once: true });
    img.addEventListener('error', printNow, { once: true });
    window.setTimeout(printNow, 1800);
  }
</script>
</body>
</html>`);
    printWindow.document.close();
  }

  function populateCourses() {
    const current = courseFilter.value;
    const courses = [...new Set(state.students.map(s => s.course).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b));
    courseFilter.innerHTML = '<option value="">All courses</option>' +
      courses.map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join('');
    courseFilter.value = courses.includes(current) ? current : '';
  }

  function filteredStudents() {
    const query = (searchInput.value || '').trim().toLowerCase();
    const course = courseFilter.value;
    const status = statusFilter.value;

    return state.students.filter(student => {
      const fee = normalizeFee(state.fees.get(student.id), student);
      const text = `${student.student_name || ''} ${student.student_id || ''} ${student.mobile || ''} ${student.course || ''}`.toLowerCase();
      if (query && !text.includes(query)) return false;
      if (course && student.course !== course) return false;
      if (status && effectiveStatus(fee) !== status) return false;
      return true;
    });
  }

  function renderSummary() {
    const students = filteredStudents();
    let expected = 0;
    let collected = 0;
    let outstanding = 0;
    let paid = 0;
    let overdue = 0;
    let holds = 0;

    students.forEach(student => {
      const fee = normalizeFee(state.fees.get(student.id), student);
      expected += fee.status === 'waived' ? 0 : Number(fee.amount_due || 0);
      collected += Number(fee.amount_paid || 0);
      outstanding += balanceFor(fee);
      if (effectiveStatus(fee) === 'paid') paid += 1;
      if (isOverdue(fee)) overdue += 1;
      if ((state.access.get(student.id)?.access_status || 'active') !== 'active') holds += 1;
    });

    $('expectedTotal').textContent = money(expected);
    $('collectedTotal').textContent = money(collected);
    $('outstandingTotal').textContent = money(outstanding);
    $('paidCount').textContent = String(paid);
    $('overdueCount').textContent = String(overdue);
    $('holdCount').textContent = String(holds);
    $('feeNote').textContent = `${students.length} student${students.length === 1 ? '' : 's'} · ${monthLabel()}`;
  }

  function renderRows() {
    state.filtered = filteredStudents();
    renderSummary();

    if (!state.filtered.length) {
      rowsEl.innerHTML = '<tr><td colspan="9" class="empty-cell">No students match the current filters.</td></tr>';
      return;
    }

    rowsEl.innerHTML = state.filtered.map(student => {
      const fee = normalizeFee(state.fees.get(student.id), student);
      const status = effectiveStatus(fee);
      const overdue = isOverdue(fee);
      const access = state.access.get(student.id);
      const balance = balanceFor(fee);
      const recordText = fee.exists ? 'Edit' : 'Record Fee';
      const paymentText = fee.exists && Number(fee.amount_paid || 0) > 0 ? 'Payment / Edit' : 'Receive Fee';

      return `<tr class="fee-row" data-id="${esc(student.id)}">
        <td class="student-cell">
          <div class="cell-title">${esc(student.student_name)}</div>
          <div class="cell-sub">${esc(student.student_id || 'No ID')}</div>
        </td>
        <td><div class="course-name-small">${esc(student.course || 'Not specified')}</div><div class="cell-sub">${esc(student.mobile || 'No contact')}</div></td>
        <td><strong>${fee.status === 'waived' ? 'Waived' : money(fee.amount_due)}</strong>${fee.discount_amount ? `<div class="cell-sub">Discount ${money(fee.discount_amount)}</div>` : ''}</td>
        <td>${fee.due_date ? esc(window.AdminCore.date(fee.due_date)) : '<span class="muted-cell">Not set</span>'}${overdue ? '<span class="overdue-badge">Overdue</span>' : ''}</td>
        <td><span class="status-pill status-${esc(status)}">${formatStatus(status)}</span></td>
        <td><strong>${money(fee.amount_paid)}</strong>${balance > 0 ? `<div class="balance-text">Balance ${money(balance)}</div>` : ''}</td>
        <td><span class="portal-pill portal-${accessClass(access)}">${accessLabel(access)}</span>${access?.hold_reason ? `<div class="cell-sub">${esc(access.hold_reason)}</div>` : ''}</td>
        <td class="row-actions">
          <button class="table-btn primary-action" data-action="fee" data-id="${esc(student.id)}">${recordText}</button>
          ${fee.exists && fee.status !== 'waived' ? `<button class="table-btn" data-action="payment" data-id="${esc(student.id)}">${paymentText}</button>` : ''}
          ${fee.exists && Number(fee.amount_paid || 0) > 0 && fee.status !== 'waived' ? `<button class="table-btn receipt-action" data-action="receipt" data-id="${esc(student.id)}">Print Receipt</button>` : ''}
          <button class="table-btn" data-action="portal" data-id="${esc(student.id)}">${access?.access_status === 'active' ? 'Hold Portal' : 'Manage Portal'}</button>
        </td>
      </tr>`;
    }).join('');
  }

  async function loadStudents() {
    const { data, error } = await supabaseClient
      .from('students')
      .select('id,student_id,student_name,mobile,course,monthly_fee,archived_at')
      .is('archived_at', null)
      .order('student_name', { ascending: true });
    if (error) throw error;
    state.students = data || [];
    populateCourses();
  }

  async function loadFees() {
    const { data, error } = await supabaseClient
      .from('fees')
      .select('id,student_id,month_date,amount_due,amount_paid,status,paid_on,payment_method,notes,due_date,discount_amount,payment_reference,receipt_number')
      .eq('month_date', monthDate())
      .is('archived_at', null);
    if (error) throw error;
    state.fees = new Map((data || []).map(fee => [fee.student_id, fee]));
  }

  async function loadAccess() {
    const { data, error } = await supabaseClient.rpc('admin_student_portal_access');
    if (error) throw error;
    state.access = new Map((data || []).map(row => [row.student_id, row]));
  }

  async function reload() {
    rowsEl.innerHTML = '<tr><td colspan="9" class="empty-cell">Loading fee register…</td></tr>';
    try {
      await Promise.all([loadFees(), loadAccess()]);
      renderRows();
    } catch (error) {
      rowsEl.innerHTML = `<tr><td colspan="9" class="empty-cell">${esc(error.message || 'Unable to load fee data.')}</td></tr>`;
      AdminCore.toast(error.message || 'Unable to load fee data.', 'error');
    }
  }

  function openFeeModal(studentId, paymentOnly = false) {
    const student = state.students.find(s => s.id === studentId);
    if (!student) return;
    const fee = normalizeFee(state.fees.get(studentId), student);
    state.editingStudentId = studentId;

    $('feeModalTitle').textContent = fee.exists ? (paymentOnly ? 'Receive / Update Payment' : 'Edit Fee Record') : 'Record Monthly Fee';
    $('feeModalStudent').textContent = student.student_name;
    $('feeModalMeta').textContent = `${student.student_id || 'No ID'} · ${student.course || 'No course'} · ${monthLabel()}`;
    const standardFee = fee.exists ? fee.amount_due + fee.discount_amount : Number(student.monthly_fee || 0);
    $('feeStandard').value = String(standardFee);
    $('feeDiscount').value = String(fee.discount_amount || 0);
    $('feeDueDate').value = fee.due_date || '';
    $('feeAmountPaid').value = String(fee.amount_paid || 0);
    $('feePaidOn').value = fee.paid_on || (fee.amount_paid > 0 ? today() : '');
    $('feePaymentMethod').value = fee.payment_method || '';
    $('feePaymentReference').value = fee.payment_reference || '';
    $('feeReceiptNumber').value = fee.receipt_number || '';
    $('feeNotes').value = fee.notes || '';
    $('feeWaived').checked = fee.status === 'waived';
    $('printFeeReceiptBtn').hidden = !(fee.exists && Number(fee.amount_paid || 0) > 0 && fee.status !== 'waived');
    $('feeModalStatus').textContent = `Current status: ${formatStatus(effectiveStatus(fee))}`;
    $('feeModal').classList.add('show');
    $('feeModal').setAttribute('aria-hidden', 'false');
    toggleFeeFields();
    $('feeStandard').focus();
  }

  function closeFeeModal() {
    $('feeModal').classList.remove('show');
    $('feeModal').setAttribute('aria-hidden', 'true');
    state.editingStudentId = null;
  }

  function toggleFeeFields() {
    const waived = $('feeWaived').checked;
    document.querySelectorAll('[data-fee-field]').forEach(el => { el.disabled = waived; });
    $('feeWaived').disabled = false;
  }

  async function saveFee(event) {
    event.preventDefault();
    if (state.busy || !state.editingStudentId) return;

    const student = state.students.find(s => s.id === state.editingStudentId);
    if (!student) return;

    const waived = $('feeWaived').checked;
    const standard = Math.max(Number($('feeStandard').value || 0), 0);
    const discount = Math.min(Math.max(Number($('feeDiscount').value || 0), 0), standard);
    const amountDue = Math.max(standard - discount, 0);
    const amountPaid = waived ? 0 : Math.max(Number($('feeAmountPaid').value || 0), 0);

    if (!Number.isFinite(standard) || !Number.isFinite(discount) || !Number.isFinite(amountPaid)) {
      AdminCore.toast('Enter valid fee amounts.', 'warning');
      return;
    }
    if (!waived && amountPaid > amountDue) {
      AdminCore.toast('Amount paid cannot be greater than the fee due.', 'warning');
      return;
    }
    if (!waived && !$('feeDueDate').value) {
      AdminCore.toast('Please set the fee due date.', 'warning');
      $('feeDueDate').focus();
      return;
    }
    if (amountPaid > 0 && !$('feePaidOn').value) {
      AdminCore.toast('Please set the payment date.', 'warning');
      $('feePaidOn').focus();
      return;
    }

    const status = waived ? 'waived' : (amountDue > 0 && amountPaid >= amountDue ? 'paid' : amountPaid > 0 ? 'partial' : 'pending');
    const payload = {
      student_id: student.id,
      month_date: monthDate(),
      amount_due: amountDue,
      amount_paid: amountPaid,
      status,
      paid_on: amountPaid > 0 ? $('feePaidOn').value : null,
      payment_method: amountPaid > 0 ? ($('feePaymentMethod').value || null) : null,
      notes: $('feeNotes').value.trim() || null,
      due_date: waived ? ($('feeDueDate').value || null) : $('feeDueDate').value,
      discount_amount: discount,
      payment_reference: amountPaid > 0 ? ($('feePaymentReference').value.trim() || null) : null,
      receipt_number: amountPaid > 0 ? ($('feeReceiptNumber').value.trim() || null) : null
    };

    const btn = $('saveFeeBtn');
    state.busy = true;
    btn.disabled = true;
    btn.textContent = 'Saving…';

    try {
      const { data, error } = await supabaseClient.rpc('admin_upsert_fee', {
        p_student_uuid: student.id,
        p_month_date: monthDate(),
        p_standard_fee: standard,
        p_discount_amount: discount,
        p_amount_paid: amountPaid,
        p_due_date: payload.due_date,
        p_paid_on: payload.paid_on,
        p_payment_method: payload.payment_method,
        p_payment_reference: payload.payment_reference,
        p_receipt_number: payload.receipt_number,
        p_notes: payload.notes,
        p_waived: waived
      });
      if (error) throw error;
      if (!data?.ok || !data?.fee) throw new Error(data?.message || 'Unable to save fee record.');
      state.fees.set(student.id, data.fee);
      closeFeeModal();
      renderRows();
      AdminCore.toast(`Fee record saved for ${student.student_name}.`);
    } catch (error) {
      AdminCore.toast(error.message || 'Unable to save fee record.', 'error');
    } finally {
      state.busy = false;
      btn.disabled = false;
      btn.textContent = 'Save Fee Record';
    }
  }

  function openPortalModal(studentId) {
    const student = state.students.find(s => s.id === studentId);
    if (!student) return;
    const access = state.access.get(studentId) || { access_status: 'active', hold_reason: '' };
    state.editingStudentId = studentId;

    $('portalModalStudent').textContent = student.student_name;
    $('portalModalMeta').textContent = `${student.student_id || 'No ID'} · ${student.course || 'No course'}`;
    $('portalStatus').value = access.access_status || 'active';
    $('portalReason').value = access.hold_reason || '';
    $('portalHoldInfo').textContent = access.access_status === 'active'
      ? 'Portal is currently active. A hold blocks new logins and ends existing portal access.'
      : `Current state: ${accessLabel(access)}${access.held_at ? ` · since ${window.AdminCore.date(access.held_at.slice(0, 10))}` : ''}`;
    $('portalModal').classList.add('show');
    $('portalModal').setAttribute('aria-hidden', 'false');
    togglePortalFields();
  }

  function closePortalModal() {
    $('portalModal').classList.remove('show');
    $('portalModal').setAttribute('aria-hidden', 'true');
    state.editingStudentId = null;
  }

  function togglePortalFields() {
    const active = $('portalStatus').value === 'active';
    $('portalReason').disabled = active;
    $('portalReasonWrap').classList.toggle('disabled', active);
  }

  async function savePortalAccess() {
    if (state.busy || !state.editingStudentId) return;
    const student = state.students.find(s => s.id === state.editingStudentId);
    if (!student) return;

    const status = $('portalStatus').value;
    const reason = $('portalReason').value.trim();
    if (status !== 'active' && !reason) {
      AdminCore.toast('Please enter a short reason for the portal hold.', 'warning');
      $('portalReason').focus();
      return;
    }

    const btn = $('savePortalBtn');
    state.busy = true;
    btn.disabled = true;
    btn.textContent = 'Saving…';

    try {
      const { data, error } = await supabaseClient.rpc('admin_set_student_portal_access', {
        p_student_uuid: student.id,
        p_status: status,
        p_reason: status === 'active' ? null : reason
      });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.message || 'Unable to update portal access.');
      state.access.set(student.id, data.access);
      closePortalModal();
      renderRows();
      AdminCore.toast(status === 'active' ? `${student.student_name}'s portal is active.` : `${student.student_name}'s portal is on hold.`);
    } catch (error) {
      AdminCore.toast(error.message || 'Unable to update portal access.', 'error');
    } finally {
      state.busy = false;
      btn.disabled = false;
      btn.textContent = 'Save Access Status';
    }
  }

  rowsEl.addEventListener('click', event => {
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    const id = button.dataset.id;
    if (button.dataset.action === 'fee') openFeeModal(id, false);
    if (button.dataset.action === 'payment') openFeeModal(id, true);
    if (button.dataset.action === 'receipt') printFeeReceipt(id);
    if (button.dataset.action === 'portal') openPortalModal(id);
  });

  $('feeForm').addEventListener('submit', saveFee);
  $('feeWaived').addEventListener('change', toggleFeeFields);
  $('portalStatus').addEventListener('change', togglePortalFields);
  $('savePortalBtn').addEventListener('click', savePortalAccess);
  $('closeFeeModal').addEventListener('click', closeFeeModal);
  $('cancelFeeBtn').addEventListener('click', closeFeeModal);
  $('printFeeReceiptBtn').addEventListener('click', () => {
    if (state.editingStudentId) printFeeReceipt(state.editingStudentId);
  });
  $('closePortalModal').addEventListener('click', closePortalModal);
  $('cancelPortalBtn').addEventListener('click', closePortalModal);

  [$('feeModal'), $('portalModal')].forEach(modal => modal.addEventListener('click', event => {
    if (event.target === modal) modal.classList.remove('show');
  }));

  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    if ($('feeModal').classList.contains('show')) closeFeeModal();
    if ($('portalModal').classList.contains('show')) closePortalModal();
  });

  monthInput.addEventListener('change', reload);
  courseFilter.addEventListener('change', renderRows);
  statusFilter.addEventListener('change', renderRows);
  searchInput.addEventListener('input', renderRows);

  try {
    if (AdminCore.profile?.permissions && AdminCore.profile.permissions.finance === false) {
      throw new Error('Your account does not have finance permission.');
    }
    await loadStudents();
    await reload();
  } catch (error) {
    rowsEl.innerHTML = `<tr><td colspan="9" class="empty-cell">${esc(error.message || 'Unable to open Student Fees.')}</td></tr>`;
    AdminCore.toast(error.message || 'Unable to open Student Fees.', 'error');
  }
})();
