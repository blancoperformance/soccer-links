import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "./database.types";

/**
 * The same Supabase client, typed with the real schema (src/lib/database.types.ts).
 * src/integrations/supabase/types.ts is regenerated empty by Lovable, so the client it types knows no
 * tables; this is the one cast at the database boundary instead of one per call site.
 */
export const db = supabase as unknown as SupabaseClient<Database>;
