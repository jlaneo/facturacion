import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../config';

let supabase: SupabaseClient | null = null;
let isConfigured = false;
let configurationError: string | null = null;

const supabaseUrl = SUPABASE_URL;
const supabaseAnonKey = SUPABASE_ANON_KEY;

// FIX: Cast Supabase credentials to string to prevent TypeScript from inferring a too-narrow literal type,
// which causes a compile error when comparing against placeholder values after they have been configured.
if ((supabaseUrl as string) === "PON_AQUÍ_TU_URL_DE_SUPABASE" || (supabaseAnonKey as string) === "PON_AQUÍ_TU_CLAVE_ANON_DE_SUPABASE") {
    configurationError = "CONFIGURACIÓN REQUERIDA: Por favor, introduce tus credenciales de Supabase en el fichero `config.ts`.";
} else if (!supabaseUrl || !supabaseAnonKey) {
    configurationError = "Supabase URL y Anon Key son requeridos y no pueden estar vacíos en `config.ts`.";
} else {
    isConfigured = true;
    supabase = createClient(supabaseUrl, supabaseAnonKey);
}

export { supabase, isConfigured, configurationError };