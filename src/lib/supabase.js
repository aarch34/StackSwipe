import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Helper functions for your app
export const supabaseService = {
  // Get user profile
  async getUserProfile(userId) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .or(`id.eq.${userId},firebase_uid.eq.${userId}`)
      .maybeSingle()
    return { data, error }
  },

  // Create/update user profile
  async upsertUserProfile(userId, profileData) {
    const { data, error } = await supabase
      .from('users')
      .upsert({ 
        id: userId,
        firebase_uid: userId, // Backwards compatibility for existing schema
        ...profileData,
        updated_at: new Date().toISOString()
      })
      .select()
    return { data, error }
  },

  // Get potential matches (users not yet swiped)
  async getPotentialMatches(userId) {
    // Get current user's internal ID first
    const { data: currentUser } = await supabase
      .from('users')
      .select('id')
      .or(`id.eq.${userId},firebase_uid.eq.${userId}`)
      .maybeSingle()

    if (!currentUser) return { data: [], error: 'User not found' }

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .neq('id', currentUser.id)
      .not('id', 'in', `(
        SELECT swiped_id FROM swipes 
        WHERE swiper_id = '${currentUser.id}'
      )`)
    return { data, error }
  },

  // Create a swipe
  async createSwipe(userId, swipedUserId, direction) {
    // Get swiper's internal ID
    const { data: swiper } = await supabase
      .from('users')
      .select('id')
      .or(`id.eq.${userId},firebase_uid.eq.${userId}`)
      .maybeSingle()

    if (!swiper) return { data: null, error: 'Swiper not found' }

    const { data, error } = await supabase
      .from('swipes')
      .insert({
        swiper_id: swiper.id,
        swiped_id: swipedUserId,
        direction
      })
    return { data, error }
  },

  // Get user's matches
  async getUserMatches(userId) {
    // Get current user's internal ID
    const { data: currentUser } = await supabase
      .from('users')
      .select('id')
      .or(`id.eq.${userId},firebase_uid.eq.${userId}`)
      .maybeSingle()

    if (!currentUser) return { data: [], error: 'User not found' }

    const { data, error } = await supabase
      .from('matches')
      .select('*')
      .contains('user_ids', [currentUser.id])

    return { data, error }
  },

  // Get messages for a match
  async getMessages(matchId) {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('match_id', matchId)
      .order('created_at', { ascending: true })
    return { data, error }
  },

  // Send a message
  async sendMessage(matchId, senderId, text) {
    const { data, error } = await supabase
      .from('messages')
      .insert({
        match_id: matchId,
        sender_id: senderId,
        text
      })
    return { data, error }
  }
}

/**
 * Headers that identify the signed-in user to this app's own API routes.
 * @returns {Promise<Record<string, string>>}
 */
export async function getAuthHeaders() {
  const { data: { session } } = await supabase.auth.getSession()
  return session ? { Authorization: `Bearer ${session.access_token}` } : {}
}
