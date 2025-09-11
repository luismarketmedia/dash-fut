import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

type AnyObj = Record<string, any>;

function makeNoopChain(): AnyObj {
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
}

let supabaseVar: AnyObj;

if (url && anonKey) {
  supabaseVar = createClient(url, anonKey);
} else {
  supabaseVar = {
    from: () => makeNoopChain(),
  } as AnyObj;
}

export const supabase = supabaseVar;
