import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const isDemoMode = !supabaseUrl || !supabaseAnonKey

let supabase: SupabaseClient | null = null

if (!isDemoMode) {
  supabase = createClient(supabaseUrl!, supabaseAnonKey!)
} else {
  console.info(
    '[NatalNanny] Running in demo mode — no Supabase credentials found. ' +
    'Copy frontend/.env.example to frontend/.env to connect to a real backend.'
  )
}

export { supabase }
