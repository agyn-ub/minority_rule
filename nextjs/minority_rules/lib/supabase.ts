import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env.local file.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false, // We're using Flow wallet authentication, not Supabase auth
  }
})

// Database types for TypeScript
export type Game = {
  game_id: number
  question_text: string
  entry_fee: number
  creator_address: string
  current_round: number
  game_state: 'commit_phase' | 'reveal_phase' | 'completed'
  commit_deadline: string | null
  reveal_deadline: string | null
  total_players: number
  created_at: string
}

export type GamePlayer = {
  game_id: number
  player_address: string
  joined_at: string
  status: 'active' | 'eliminated' | 'winner'
}

export type Commit = {
  game_id: number
  round_number: number
  player_address: string
  commit_hash: string
  committed_at: string
}

export type Reveal = {
  game_id: number
  round_number: number
  player_address: string
  vote_value: boolean
  salt: string
  revealed_at: string
}

export type UserProfile = {
  player_address: string
  display_name: string | null
  total_games: number
  total_wins: number
  total_earnings: number
  created_at: string
  updated_at: string
}