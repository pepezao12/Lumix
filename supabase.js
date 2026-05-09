import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const supabaseUrl = "https://moexkwpmazfsmsdohcwl.supabase.co";
const supabaseKey = "sb_publishable_pSQfqQ2K8zzuRa0P3Ln-sQ_U-YOFN_v";

export const supabase = createClient(supabaseUrl, supabaseKey);
