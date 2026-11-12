
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const requestedNext = searchParams.get('next') ?? '/'

  const next =
    requestedNext.startsWith('/') &&
    !requestedNext.startsWith('//')
      ? requestedNext
      : '/'

  if (code) {
    const supabase = await createClient()

    const { error } =
      await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert(
            {
              id: user.id,
              name:
                user.user_metadata.full_name ??
                user.user_metadata.name ??
                user.email ??
                'ユーザー',
              avatar_url:
                user.user_metadata.avatar_url ??
                user.user_metadata.picture ??
                null,
            },
            {
              onConflict: 'id',
              ignoreDuplicates: true,
            }
          )

        if (profileError) {
          console.error('プロフィール登録エラー:', profileError)
          return NextResponse.redirect(
            new URL('/login?error=profile', origin)
          )
        }
      }

      return NextResponse.redirect(new URL(next, origin))
    }
  }

  return NextResponse.redirect(
    new URL('/login?error=auth', origin)
  )
}
