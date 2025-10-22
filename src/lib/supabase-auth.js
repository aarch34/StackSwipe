import { supabase } from './supabase'

export const setSupabaseAuth = async (firebaseUser) => {
  if (!firebaseUser) {
    await supabase.auth.signOut()
    return
  }

  // Get Firebase ID token
  const token = await firebaseUser.getIdToken()
  
  // Set the JWT in Supabase for RLS
  await supabase.auth.setSession({
    access_token: token,
    refresh_token: token
  })
}
