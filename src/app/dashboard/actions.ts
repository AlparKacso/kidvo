'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function dismissOnboarding() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  await supabase.from('users').update({ onboarding_dismissed: true }).eq('id', user.id)
  revalidatePath('/dashboard')
}
