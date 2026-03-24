import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

async function checkPassword(formData: FormData) {
  'use server'
  const password = formData.get('password') as string
  const stagingPassword = process.env.STAGING_PASSWORD
  if (stagingPassword && password === stagingPassword) {
    const cookieStore = await cookies()
    cookieStore.set('staging_auth', stagingPassword, {
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
      httpOnly: true,
      sameSite: 'lax',
    })
    redirect('/')
  }
}

export default function StagingLogin({ searchParams }: { searchParams: { error?: string } }) {
  const hasError = !!searchParams?.error

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4">
      <div className="w-full max-w-[340px]">
        <div className="text-center mb-8">
          <span className="font-display font-black text-[28px] tracking-[-1px]">
            <span className="text-ink">kid</span><span className="text-primary">vo</span>
          </span>
          <p className="font-display text-[13px] text-ink-muted mt-1">Staging environment</p>
        </div>
        <div className="bg-white border border-border rounded-[18px] p-7 shadow-card">
          <h1 className="font-display text-[18px] font-extrabold text-ink mb-4">Enter password</h1>
          <form action={checkPassword} className="flex flex-col gap-3">
            <input
              type="password"
              name="password"
              autoFocus
              required
              placeholder="••••••••"
              className="w-full px-3.5 py-2.5 border border-border rounded-[10px] font-display text-[13.5px] text-ink outline-none focus:border-primary transition-all"
            />
            {hasError && (
              <p className="font-display text-[12px] text-red-500">Incorrect password</p>
            )}
            <button
              type="submit"
              className="w-full py-2.5 rounded-[10px] font-display text-[13.5px] font-semibold bg-primary text-white hover:bg-primary-deep transition-colors"
            >
              Enter
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
