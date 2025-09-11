import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// If env vars are configured, export a real Supabase client.
if (url && anonKey) {
  // eslint-disable-next-line import/no-default-export
  export const supabase = createClient(url, anonKey);
} else {
  // Graceful no-op fallback so the app works without Supabase.
  // Operations become no-ops and reads return empty arrays.
  type AnyObj = Record<string, any>;

  const makeChain = (): AnyObj => {
    return {
      select: async (): Promise<{ data: any[]; error: null }> => ({ data: [], error: null }),
      insert: () => ({ throwOnError: async () => ({ data: null, error: null }) }),
      update: () => ({ eq: () => ({ throwOnError: async () => ({ data: null, error: null }) }) }),
      delete: () => ({ neq: () => ({ throwOnError: async () => ({ data: null, error: null }) }) }),
      upsert: () => ({ throwOnError: async () => ({ data: null, error: null }) }),
      eq: () => ({ throwOnError: async () => ({ data: null, error: null }) }),
      neq: () => ({ throwOnError: async () => ({ data: null, error: null }) }),
      throwOnError: async () => ({ data: null, error: null }),
    };
  };

  export const supabase: AnyObj = {
    from: () => makeChain(),
  };
}
