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
  async getUserProfile(firebaseUid) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('firebase_uid', firebaseUid)
      .single()
    return { data, error }
  },

  // Create/update user profile
  async upsertUserProfile(firebaseUid, profileData) {
    const { data, error } = await supabase
      .from('users')
      .upsert({ 
        firebase_uid: firebaseUid,
        ...profileData,
        updated_at: new Date().toISOString()
      })
      .select()
    return { data, error }
  },

  // Get potential matches (users not yet swiped)
  async getPotentialMatches(firebaseUid) {
    // Get current user's internal ID first
    const { data: currentUser } = await supabase
      .from('users')
      .select('id')
      .eq('firebase_uid', firebaseUid)
      .single()

    if (!currentUser) return { data: [], error: 'User not found' }

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .neq('firebase_uid', firebaseUid)
      .not('id', 'in', `(
        SELECT swiped_id FROM swipes 
        WHERE swiper_id = '${currentUser.id}'
      )`)
    return { data, error }
  },

  // Create a swipe
  async createSwipe(firebaseUid, swipedUserId, direction) {
    // Get swiper's internal ID
    const { data: swiper } = await supabase
      .from('users')
      .select('id')
      .eq('firebase_uid', firebaseUid)
      .single()

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
  async getUserMatches(firebaseUid) {
    // Get current user's internal ID
    const { data: currentUser } = await supabase
      .from('users')
      .select('id')
      .eq('firebase_uid', firebaseUid)
      .single()

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
