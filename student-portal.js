/* Al-Zeya Academy — shared student portal runtime. */
(function (window) {
  'use strict';

  const SUPABASE_URL = 'https://wzwtzsomjehurrhplntz.supabase.co';
  const SUPABASE_ANON_KEY = 'sb_publishable_TnvmYULWBMsZXJlyAUAxkA_WK5YEzJR';
  const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const TOKEN_KEY = 'alzeya_student_portal_token';
  const TOKEN_EXPIRES_KEY = 'alzeya_student_portal_token_expires';

  function getToken() {
    const token = sessionStorage.getItem(TOKEN_KEY);
    const expires = Number(sessionStorage.getItem(TOKEN_EXPIRES_KEY) || 0);
    if (token && expires && Date.now() >= expires) {
      clearToken();
      return null;
    }
    return token;
  }

  function setToken(token, ttlHours = 12) {
    sessionStorage.setItem(TOKEN_KEY, token);
    sessionStorage.setItem(TOKEN_EXPIRES_KEY, String(Date.now() + ttlHours * 60 * 60 * 1000));
  }

  function clearToken() {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(TOKEN_EXPIRES_KEY);
  }

  function esc(v) {
    return String(v ?? '').replace(/[&<>'"]/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    }[c]));
  }

  function fmtDate(v) {
    if (!v) return '—';
    const d = new Date(`${v}T00:00:00`);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  function getInitials(name) {
    const parts = String(name || 'Student').trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return 'S';
    return parts.slice(0, 2).map(part => part[0].toUpperCase()).join('');
  }

  function formatTimeLabel(value) {
    const raw = String(value || '').trim();
    if (!raw) return 'Time not published';
    return raw.replace(/\s*-\s*/g, ' – ');
  }

  function academyClock(now = new Date()) {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
    }).formatToParts(now).reduce((out, part) => { out[part.type] = part.value; return out; }, {});
    return {
      dateKey: `${parts.year}-${parts.month}-${parts.day}`,
      minutes: Number(parts.hour) * 60 + Number(parts.minute),
      year: Number(parts.year), month: Number(parts.month), day: Number(parts.day)
    };
  }

  function parseClassTime(value) {
    const raw = String(value || '').trim();
    const match = raw.match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?\s*(?:-|–|—|to)\s*(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?/i);
    if (!match) return null;
    const toMinutes = (hourValue, minuteValue, ap) => {
      let hour = Number(hourValue);
      const minute = Number(minuteValue || 0);
      if (ap) {
        const upper = ap.toUpperCase();
        if (upper === 'PM' && hour !== 12) hour += 12;
        if (upper === 'AM' && hour === 12) hour = 0;
      }
      return hour * 60 + minute;
    };
    const startAmPm = match[3] || match[6] || '';
    const endAmPm = match[6] || match[3] || '';
    const start = toMinutes(match[1], match[2], startAmPm);
    const end = toMinutes(match[4], match[5], endAmPm);
    if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
    return { start, end: end < start ? end + 24 * 60 : end };
  }

  function getClassAccess(item, now = new Date()) {
    const today = academyClock(now);
    const dateKey = String(item?.class_date || '').trim();
    const timing = parseClassTime(item?.class_time);
    if (!dateKey || !timing) return { state: 'upcoming', joinAvailable: false, reason: 'time_unavailable', timing };
    if (dateKey < today.dateKey) return { state: 'completed', joinAvailable: false, reason: 'past_date', timing };
    if (dateKey > today.dateKey) return { state: 'upcoming', joinAvailable: false, reason: 'future_date', timing };
    const openAt = timing.start - 15;
    const closeAt = timing.end + 15;
    if (today.minutes < openAt) return { state: 'upcoming', joinAvailable: false, reason: 'not_open_yet', timing, openAt, closeAt };
    if (today.minutes <= timing.end) return { state: 'live', joinAvailable: true, reason: 'live', timing, openAt, closeAt };
    if (today.minutes <= closeAt) return { state: 'catchup', joinAvailable: true, reason: 'catchup', timing, openAt, closeAt };
    return { state: 'completed', joinAvailable: false, reason: 'window_closed', timing, openAt, closeAt };
  }

  function classJoinUrl(item, rows = []) {
    const direct = String(item?.join_url || '').trim();
    if (direct) return direct;
    const subject = String(item?.subject || '').trim().toLowerCase();
    const courseId = String(item?.course_id || '').trim();
    if (!subject) return '';
    const match = (rows || []).find(row => String(row?.course_id || '').trim() === courseId && String(row?.subject || '').trim().toLowerCase() === subject && String(row?.join_url || '').trim());
    return String(match?.join_url || '').trim();
  }

  function classWindowText(access, item) {
    if (!access?.timing) return 'Join availability will be shown when class timing is published.';
    if (access.state === 'live') return 'Join window is open now.';
    if (access.state === 'catchup') return 'Class has ended, but the catch-up window is still open.';
    if (access.state === 'upcoming' && access.reason === 'not_open_yet') {
      const h = Math.floor((access.openAt % (24 * 60)) / 60);
      const m = access.openAt % 60;
      const suffix = h >= 12 ? 'PM' : 'AM';
      const hour12 = h % 12 || 12;
      return `Join opens at ${hour12}:${String(m).padStart(2, '0')} ${suffix} (15 min before class).`;
    }
    if (access.reason === 'future_date') return 'Join opens 15 minutes before the class starts.';
    return 'The join window for this class has closed.';
  }

  async function rpc(name, args) {
    const { data, error } = await sb.rpc(name, args || {});
    if (error) throw error;
    return data;
  }

  async function portalSnapshot() {
    const token = getToken();
    if (!token) throw new Error('Please sign in.');
    const data = await rpc('student_portal_snapshot', { p_token: token });
    if (!data?.ok) {
      clearToken();
      throw new Error(data?.message || 'Your session has expired. Please sign in again.');
    }
    return data;
  }

  function getGoogleDriveFileId(url) {
    if (!url) return '';
    const value = String(url).trim();
    const patterns = [
      /drive\.google\.com\/file\/d\/([^/]+)/i,
      /drive\.google\.com\/open\?id=([^&]+)/i,
      /drive\.google\.com\/uc\?(?:[^#]*&)?id=([^&]+)/i,
      /[?&]id=([^&]+)/i
    ];
    for (const pattern of patterns) {
      const match = value.match(pattern);
      if (match?.[1]) return decodeURIComponent(match[1]);
    }
    return '';
  }

  function getPlayableAudioUrl(url) {
    const fileId = getGoogleDriveFileId(url);
    if (!fileId) return String(url || '').trim();
    return `https://drive.google.com/uc?export=download&id=${encodeURIComponent(fileId)}`;
  }

  async function getStudentAudioUrl(token, audioId, audioPath) {
    const cleanToken = String(token || '').trim();
    const path = String(audioPath || '').trim();
    if (!cleanToken || !audioId || !path) throw new Error('Audio source is incomplete.');
    const response = await fetch(`${SUPABASE_URL}/functions/v1/student-audio-url`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({ token: cleanToken, audio_id: audioId, audio_path: path })
    });
    let payload = null;
    try { payload = await response.json(); } catch (_) {}
    if (!response.ok || !payload?.ok || !payload?.signed_url) {
      throw new Error(payload?.message || 'Unable to create the class audio playback link.');
    }
    return payload.signed_url;
  }

  // -------------------------------------------------------------------------
  // UPI PAYMENT CONFIG
  // Academy merchant UPI configuration.
  // The website never needs the UPI PIN, bank password, card details, or OTP.
  // -------------------------------------------------------------------------
  const PAYMENT_CONFIG = Object.freeze({
    upiId: 'alzeyaacademy@ybl',
    payeeName: 'Al Zeya Academy',
    currency: 'INR'
  });

  function buildUpiPaymentUrl({ amount, reference, note } = {}) {
    const upiId = String(PAYMENT_CONFIG.upiId || '').trim();
    const numericAmount = Number(amount || 0);
    if (!upiId) {
      throw new Error('UPI payment is not configured yet.');
    }
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      throw new Error('There is no payable fee amount for this payment.');
    }

    const params = new URLSearchParams({
      pa: upiId,
      pn: PAYMENT_CONFIG.payeeName,
      am: numericAmount.toFixed(2),
      cu: PAYMENT_CONFIG.currency
    });
    if (reference) params.set('tr', String(reference).slice(0, 35));
    if (note) params.set('tn', String(note).slice(0, 80));
    return `upi://pay?${params.toString()}`;
  }

  function getPaymentConfig() {
    return { ...PAYMENT_CONFIG };
  }

  function setupShell(student) {
    const name = String(student?.student_name || 'Student').trim() || 'Student';
    const hello = document.getElementById('helloChip');
    const avatar = document.getElementById('avatarInitials');
    if (hello) hello.textContent = name;
    if (avatar) avatar.textContent = getInitials(name);
  }

  async function changePassword(currentPassword, newPassword) {
    const token = getToken();
    if (!token) throw new Error('Please sign in again.');
    const data = await rpc('student_portal_change_password', {
      p_token: token,
      p_current_password: currentPassword,
      p_new_password: newPassword
    });
    if (!data?.ok) throw new Error(data?.message || 'Unable to change password.');
    return data;
  }

  async function goLogin() {
    try {
      const token = getToken();
      if (token) await rpc('student_portal_logout', { p_token: token });
    } catch (_) {
      // Logout should still clear local state even if the network is unavailable.
    }
    clearToken();
    window.location.replace('student-login.html');
  }

  async function loadPortal() {
    try {
      return await portalSnapshot();
    } catch (error) {
      clearToken();
      window.location.replace('student-login.html');
      throw error;
    }
  }

  window.StudentPortal = {
    sb, rpc, getToken, setToken, clearToken, esc, fmtDate, getInitials, formatTimeLabel, academyClock, parseClassTime, getClassAccess, classJoinUrl, classWindowText, setupShell, getPlayableAudioUrl, getStudentAudioUrl,
    buildUpiPaymentUrl, getPaymentConfig, loadPortal, goLogin, portalSnapshot, changePassword
  };
})(window);
