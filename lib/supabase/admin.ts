import { createClient } from "@supabase/supabase-js";

// Cliente com service role — NUNCA expor ao browser
// Use apenas em Server Actions, API Routes e scripts server-side
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
