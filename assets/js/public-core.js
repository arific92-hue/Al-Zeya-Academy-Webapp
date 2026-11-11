/* Shared public-site runtime. Kept separate so every public page uses the same Supabase client. */

(() => {
  const SUPABASE_URL = 'https://wzwtzsomjehurrhplntz.supabase.co';
  const SUPABASE_ANON_KEY = 'sb_publishable_TnvmYULWBMsZXJlyAUAxkA_WK5YEzJR';

  if (!window.supabase?.createClient) {
    console.error('Supabase client library failed to load.');
    return;
  }

  window.supabaseClient = window.supabaseClient || window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }
  );

  window.escapeHtml = window.escapeHtml || ((value = '') => String(value).replace(/[&<>'"]/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  }[char])));
})();
