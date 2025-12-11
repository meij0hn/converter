import { createClient } from '@supabase/supabase-js'
import { logger } from './logger'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  logger.error('Missing Supabase environment variables:')
  logger.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl)
  logger.error('NEXT_PUBLIC_SUPABASE_ANON_KEY:', supabaseAnonKey ? '***SET***' : 'NOT SET')
}

export const supabase = createClient(supabaseUrl!, supabaseAnonKey!)