(function () {
  'use strict';

  const form = document.getElementById('loginForm');
  const button = document.getElementById('loginBtn');
  const notice = document.getElementById('notice');
  const holdModal = document.getElementById('portalHoldModal');
  const holdMessage = document.getElementById('portalHoldMessage');
  const holdClose = document.getElementById('portalHoldClose');
  const holdOk = document.getElementById('portalHoldOk');
  const holdPay = document.getElementById('portalHoldPay');

  function showNotice(message) {
    notice.textContent = message;
    notice.classList.add('show');
  }

  function showHoldModal(message, options = {}) {
    holdMessage.textContent = message || 'Your student portal access is currently restricted. Please contact the academy office for assistance.';
    const holdType = String(options.holdType || '');
    const amount = Number(options.outstandingAmount || 0);
    holdPay.hidden = !(holdType === 'fee_hold' && Number.isFinite(amount) && amount > 0);
    holdPay.dataset.amount = amount > 0 ? amount.toFixed(2) : '';
    holdPay.dataset.reference = options.reference || '';
    holdPay.dataset.dueDate = options.latestDueDate || '';
    holdModal.classList.add('show');
    holdModal.setAttribute('aria-hidden', 'false');
    (holdPay.hidden ? holdOk : holdPay).focus();
  }

  function closeHoldModal() {
    holdModal.classList.remove('show');
    holdModal.setAttribute('aria-hidden', 'true');
  }

  if (StudentPortal.getToken()) {
    StudentPortal.loadPortal().then(() => {
      window.location.replace('student-dashboard.html');
    }).catch(() => {
      // loadPortal handles the redirect when the existing session is invalid or held.
    });
  }

  const params = new URLSearchParams(window.location.search);
  if (params.get('reason') === 'hold') {
    showHoldModal('Your student portal access has been placed on hold. Please contact the academy office for assistance.');
    window.history.replaceState({}, document.title, window.location.pathname);
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (button.disabled) return;

    button.disabled = true;
    button.textContent = 'Signing in…';
    notice.classList.remove('show');

    try {
      const data = await StudentPortal.rpc('student_portal_login', {
        p_username: document.getElementById('username').value.trim(),
        p_password: document.getElementById('password').value
      });

      if (!data?.ok) {
        if (data?.code === 'PORTAL_ON_HOLD') {
          showHoldModal(data.message, {
            holdType: data.hold_type,
            outstandingAmount: data.outstanding_amount,
            latestDueDate: data.latest_due_date,
            reference: `AZA-HOLD-${Date.now()}`
          });
        } else {
          throw new Error(data?.message || 'Invalid login details.');
        }
        return;
      }

      StudentPortal.setToken(data.token);
      window.location.replace('student-dashboard.html');
    } catch (error) {
      showNotice(error.message || 'Unable to sign in.');
    } finally {
      button.disabled = false;
      button.textContent = 'Enter Student Portal';
    }
  });


  holdPay.addEventListener('click', () => {
    try {
      const amount = Number(holdPay.dataset.amount || 0);
      const dueDate = holdPay.dataset.dueDate || '';
      const reference = String(holdPay.dataset.reference || `AZA-HOLD-${Date.now()}`).slice(0, 35);
      const url = StudentPortal.buildUpiPaymentUrl({
        amount,
        reference,
        note: `Al Zeya Academy fee${dueDate ? ` - due ${dueDate}` : ''}`
      });
      window.location.href = url;
    } catch (error) {
      alert(error.message || 'Unable to start the UPI payment. Please contact the academy office.');
    }
  });
  holdClose.addEventListener('click', closeHoldModal);
  holdOk.addEventListener('click', closeHoldModal);
  holdModal.addEventListener('click', (event) => {
    if (event.target === holdModal) closeHoldModal();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && holdModal.classList.contains('show')) closeHoldModal();
  });
})();
