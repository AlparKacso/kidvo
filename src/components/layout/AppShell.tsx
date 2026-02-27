import { createClient } from '@/lib/supabase/server'
import { Sidebar }    from './Sidebar'
import { Topbar }     from './Topbar'
import { BottomNav }  from './BottomNav'

interface AppShellProps {
  children:     React.ReactNode
  showListCta?: boolean
}

export async function AppShell({ children }: AppShellProps) {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()

  let userName   = ''
  let userSub    = 'Timișoara'
  let initials   = '?'
  let isProvider = false
  let userEmail  = authUser?.email ?? ''

  if (authUser) {
    const { data: profileRaw } = await supabase
      .from('users')
      .select('full_name, role')
      .eq('id', authUser.id)
      .single()

    const profile = profileRaw as unknown as { full_name: string; role: string } | null

    if (profile) {
      userName   = profile.full_name
      isProvider = profile.role === 'provider' || profile.role === 'both'
      initials   = profile.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
      userSub    = isProvider ? 'Provider · Timișoara' : 'Parent · Timișoara'
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* Sidebar — desktop only */}
      <div className="hidden md:flex">
        <Sidebar
          isProvider={isProvider}
          userName={userName}
          userSub={userSub}
          initials={initials}
          userEmail={userEmail}
        />
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        <Topbar />
        {/* Extra bottom padding on mobile for BottomNav */}
        <main className="flex-1 px-4 pt-5 pb-24 md:px-[28px] md:pt-[26px] md:pb-14">
          {children}
        </main>
      </div>

      {/* Bottom nav — mobile only */}
      <BottomNav isProvider={isProvider} userEmail={userEmail} />
    </div>
  )
}
