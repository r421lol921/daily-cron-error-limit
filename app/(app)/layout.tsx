import { createClient } from '@/lib/supabase/server'
import LeftSidebar from '@/components/LeftSidebar'
import RightSidebar from '@/components/RightSidebar'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let { data: profile } = user
    ? await supabase.from('profiles').select('*').eq('id', user.id).single()
    : { data: null }

  // Auto-create profile row if the auth user exists but no profile row does yet
  if (user && !profile) {
    const username =
      user.user_metadata?.username ||
      user.user_metadata?.full_name?.replace(/\s+/g, '').toLowerCase() ||
      user.email?.split('@')[0] ||
      `user_${user.id.slice(0, 8)}`
    const { data: created } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        username,
        display_name: user.user_metadata?.full_name || username,
        email: user.email,
      }, { onConflict: 'id' })
      .select()
      .single()
    profile = created
  }

  return (
    <div className="min-h-screen bg-background flex justify-center">
      <div className="flex w-full max-w-[1400px] relative">
        {/* Left sidebar */}
        <LeftSidebar profile={profile} />

        {/* Main content — wider feed */}
        <main className="flex-1 min-h-[100dvh] border-x border-border max-w-[740px] w-full ml-0 sm:ml-16 pb-[72px] sm:pb-0 overflow-x-hidden">
          {children}
        </main>

        {/* Right sidebar — only shown when logged in */}
        {user && (
          <div className="hidden lg:block w-[380px] ml-6 pt-2 sticky top-0 self-start h-screen overflow-y-auto flex-shrink-0">
            <RightSidebar currentUserId={user.id} />
          </div>
        )}
      </div>
    </div>
  )
}
