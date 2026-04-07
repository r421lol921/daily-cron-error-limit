import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import LeftSidebar from '@/components/LeftSidebar'
import RightSidebar from '@/components/RightSidebar'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return (
    <div className="min-h-screen bg-background flex justify-center">
      <div className="flex w-full max-w-[1280px] relative">
        {/* Left sidebar */}
        <LeftSidebar profile={profile} />

        {/* Main content — ml-0 on mobile (full width), ml-[88px] on sm+, xl offset */}
        <main className="flex-1 min-h-screen border-x border-border max-w-[600px] w-full ml-0 sm:ml-[88px] xl:ml-[275px] pb-16 sm:pb-0">
          {children}
        </main>

        {/* Right sidebar */}
        <div className="hidden lg:block w-[350px] ml-8 pt-2 sticky top-0 self-start h-screen overflow-y-auto">
          <RightSidebar currentUserId={user.id} />
        </div>
      </div>
    </div>
  )
}
