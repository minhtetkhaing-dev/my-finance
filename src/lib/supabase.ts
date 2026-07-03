import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, Platform } from 'react-native';
import { createClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if (!url || !key) throw new Error('Missing Supabase environment variables. Copy .env.example to .env.');

export const supabase = createClient(url, key, {
  auth: { storage: Platform.OS === 'web' ? undefined : AsyncStorage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: Platform.OS === 'web', flowType: 'pkce' },
});

if (Platform.OS !== 'web') AppState.addEventListener('change', (state) => state === 'active' ? supabase.auth.startAutoRefresh() : supabase.auth.stopAutoRefresh());
