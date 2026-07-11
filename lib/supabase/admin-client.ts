import { createClient } from '@supabase/supabase-js';

// DANGER: This client bypasses Row Level Security (RLS) entirely!
// It MUST ONLY be used on the server-side (Server Components, Route Handlers, Server Actions)
// and ONLY after verifying the user is the Super Admin.

export const createAdminClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase URL or Service Role Key is missing from environment variables.');
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
};
