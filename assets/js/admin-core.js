/* Al-Zeya Academy — shared admin runtime. Visual design remains page-owned. */
(function (window, document) {
  'use strict';

  const SUPABASE_URL = 'https://wzwtzsomjehurrhplntz.supabase.co';
  const SUPABASE_ANON_KEY = 'sb_publishable_TnvmYULWBMsZXJlyAUAxkA_WK5YEzJR';

  if (!window.supabase) {
    console.error('Supabase client library is unavailable.');
    return;
  }

  const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  });

  const AdminCore = {
    supabase: supabaseClient,
    currentUser: null,
    profile: null,
    _ready: null,

    async requireAdmin() {
      if (this._ready) return this._ready;
      this._ready = (async () => {
        const { data, error } = await supabaseClient.auth.getSession();
        if (error || !data?.session) {
          window.location.replace('admin-login.html');
          return false;
        }

        this.currentUser = data.session.user;

        // The upgraded database exposes a protected profile RPC. If it does not
        // exist yet, fail closed rather than silently treating any authenticated
        // account as an administrator.
        const { data: profile, error: profileError } = await supabaseClient.rpc('current_admin_profile');
        if (profileError || !profile?.is_staff) {
          console.error('Administrator authorization failed:', profileError || profile);
          await supabaseClient.auth.signOut();
          window.location.replace('admin-login.html?reason=unauthorized');
          return false;
        }

        this.profile = profile;
        const el = document.getElementById('adminEmail');
        if (el) el.textContent = this.currentUser.email || 'Administrator';
        return true;
      })();

      return this._ready;
    },

    async signOut() {
      try { await supabaseClient.auth.signOut(); } finally {
        window.location.replace('admin-login.html');
      }
    },

    escape(value) {
      return String(value ?? '').replace(/[&<>\"']/g, ch => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
      }[ch]));
    },

    money(value) {
      return `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
    },

    date(value) {
      if (!value) return '—';
      const d = new Date(`${value}T00:00:00`);
      if (Number.isNaN(d.getTime())) return '—';
      return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    },

    async safeQuery(queryFactory) {
      try {
        return await queryFactory();
      } catch (error) {
        console.error(error);
        return { data: null, error };
      }
    },

    toast(message, type = 'success') {
      let el = document.getElementById('globalToast');
      if (!el) {
        el = document.createElement('div');
        el.id = 'globalToast';
        el.setAttribute('role', 'status');
        el.setAttribute('aria-live', 'polite');
        document.body.appendChild(el);
      }
      el.textContent = message;
      el.dataset.type = type;
      el.classList.add('show');
      window.clearTimeout(this._toastTimer);
      this._toastTimer = window.setTimeout(() => el.classList.remove('show'), 3200);
    }
  };

  // Preserve the identifiers used by existing page-local scripts while removing
  // the duplicated Supabase configuration and authentication implementation.
  window.supabaseClient = supabaseClient;
  window.AdminCore = AdminCore;
  window.currentUser = null;
  window.guardAdmin = () => AdminCore.requireAdmin().then(ok => {
    window.currentUser = AdminCore.currentUser;
    return ok;
  });
  window.escapeHtml = AdminCore.escape.bind(AdminCore);

  document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('logoutBtn')?.addEventListener('click', () => AdminCore.signOut());
    document.getElementById('menuBtn')?.addEventListener('click', () => {
      document.getElementById('sidebar')?.classList.toggle('open');
    });
  });

  // Prevent accidental navigation with stale admin sessions.
  supabaseClient.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_OUT' && !/admin-login\.html$/i.test(window.location.pathname)) {
      window.location.replace('admin-login.html');
    }
  });
})(window, document);

var supabaseClient = window.supabaseClient;
var guardAdmin = window.guardAdmin;
