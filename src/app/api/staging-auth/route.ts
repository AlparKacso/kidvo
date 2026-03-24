import { NextResponse, type NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  const { password } = await request.json()
  const stagingPassword = process.env.STAGING_PASSWORD

  if (!stagingPassword || password !== stagingPassword) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const response = NextResponse.json({ ok: true })
  response.cookies.set('staging_auth', stagingPassword, {
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    httpOnly: true,
    sameSite: 'lax',
  })
  return response
}
