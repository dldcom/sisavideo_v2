import { createClient } from '@supabase/supabase-js';
export function admin(){const url=process.env.VITE_SUPABASE_URL||process.env.SUPABASE_URL,key=process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY;if(!url||!key)throw new Error('VITE_SUPABASE_URL / SUPABASE_SECRET_KEY 필요');return createClient(url,key,{auth:{persistSession:false}});}
export function data(result){if(result.error)throw result.error;return result.data;}
