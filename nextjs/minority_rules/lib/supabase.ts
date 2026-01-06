import { createClient } from '@supabase/supabase-js'
import { Database } from '../types/database.types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env.local file.')
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true, // Enable for Realtime to work properly
  }
})

// Export types from generated database types
export type Game = Database['public']['Tables']['games']['Row']
export type GameInsert = Database['public']['Tables']['games']['Insert']
export type GameUpdate = Database['public']['Tables']['games']['Update']

export type GamePlayer = Database['public']['Tables']['game_players']['Row']
export type GamePlayerInsert = Database['public']['Tables']['game_players']['Insert']
export type GamePlayerUpdate = Database['public']['Tables']['game_players']['Update']

export type Round = Database['public']['Tables']['rounds']['Row']
export type RoundInsert = Database['public']['Tables']['rounds']['Insert']
export type RoundUpdate = Database['public']['Tables']['rounds']['Update']

export type Commit = Database['public']['Tables']['commits']['Row']
export type CommitInsert = Database['public']['Tables']['commits']['Insert']
export type CommitUpdate = Database['public']['Tables']['commits']['Update']

export type Reveal = Database['public']['Tables']['reveals']['Row']
export type RevealInsert = Database['public']['Tables']['reveals']['Insert']
export type RevealUpdate = Database['public']['Tables']['reveals']['Update']

export type UserProfile = Database['public']['Tables']['user_profiles']['Row']
export type UserProfileInsert = Database['public']['Tables']['user_profiles']['Insert']
export type UserProfileUpdate = Database['public']['Tables']['user_profiles']['Update']

export type PrizeDistribution = Database['public']['Tables']['prize_distributions']['Row']
export type PrizeDistributionInsert = Database['public']['Tables']['prize_distributions']['Insert']
export type PrizeDistributionUpdate = Database['public']['Tables']['prize_distributions']['Update']