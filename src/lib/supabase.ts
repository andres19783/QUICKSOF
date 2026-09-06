import { createClient } from '@supabase/supabase-js';

const defaultSupabaseUrl = 'https://jhxybbyeajqilxodgrzx.supabase.co';

const envUrl = import.meta.env.VITE_SUPABASE_URL;
const envAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Si el usuario no cargó la variable de entorno pero guardó la key en localStorage o env
const storedAnonKey = typeof window !== 'undefined' ? localStorage.getItem('supabase_anon_key') || '' : '';

export const supabaseUrl = (envUrl && envUrl.startsWith('https://')) ? envUrl : defaultSupabaseUrl;
export const supabaseAnonKey = envAnonKey || storedAnonKey;

export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  supabaseAnonKey.length > 10 &&
  supabaseUrl.startsWith('https://')
);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export const setSupabaseCredentials = (key: string, url?: string) => {
  if (typeof window !== 'undefined') {
    if (key) localStorage.setItem('supabase_anon_key', key.trim());
    if (url) localStorage.setItem('supabase_project_url', url.trim());
    window.location.reload();
  }
};
