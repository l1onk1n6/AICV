import { createClient } from '@supabase/supabase-js';
import { tr } from './i18n';

// Werte entweder aus Build-Zeit-Env-Vars oder aus localStorage (Setup-Seite)
function getConfig() {
  const url =
    import.meta.env.VITE_SUPABASE_URL ||
    localStorage.getItem('aicv-supabase-url') ||
    '';
  const key =
    import.meta.env.VITE_SUPABASE_ANON_KEY ||
    localStorage.getItem('aicv-supabase-key') ||
    '';
  return { url, key };
}

export function isSupabaseConfigured(): boolean {
  const { url, key } = getConfig();
  return (
    /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(url.trim()) &&
    key.trim().startsWith('eyJ') &&
    key.trim().length > 100
  );
}

export function saveSupabaseConfig(url: string, key: string) {
  localStorage.setItem('aicv-supabase-url', url.trim());
  localStorage.setItem('aicv-supabase-key', key.trim());
}

// Lazy singleton – wird erst beim ersten Aufruf erstellt
let _client: ReturnType<typeof createClient> | null = null;

export function getSupabase() {
  if (_client) return _client;
  const { url, key } = getConfig();
  if (!url || !key) throw new Error(tr('Supabase nicht konfiguriert'));
  _client = createClient(url, key);
  return _client;
}

// Nach Konfigurationsänderung Client zurücksetzen
export function resetSupabaseClient() {
  _client = null;
}

// Client fuer den oeffentlichen Share-Zugriff: sendet den Share-Token als
// 'x-share-token'-Header mit. Die RLS-Policies auf resumes/documents/storage
// geben eine geteilte Mappe NUR frei, wenn dieser Header exakt den share_token
// der Zeile trifft — damit kann ein Anonymer nicht mehr alle geteilten Mappen
// auslesen, sondern ausschliesslich die zu seinem Link gehoerende.
// Kein persistSession: dieser Client haelt keine Anmeldung.
export function getSharedSupabase(shareToken: string) {
  const { url, key } = getConfig();
  if (!url || !key) throw new Error(tr('Supabase nicht konfiguriert'));
  return createClient(url, key, {
    global: { headers: { 'x-share-token': shareToken } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
