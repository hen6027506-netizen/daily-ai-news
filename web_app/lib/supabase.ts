import { createClient } from '@supabase/supabase-js';

// ⚠️ 記得填入你的 Supabase URL 和 ANON Key
const supabaseUrl = 'https://gujepdwzojlclwngcvxr.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd1amVwZHd6b2psY2x3bmdjdnhyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODc0NzQxNCwiZXhwIjoyMDg0MzIzNDE0fQ._ikcfZWJKFx1H1vWIWAZVgs5vFPt_00OVpx6d9CG45I';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);