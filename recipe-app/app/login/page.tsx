
'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleGoogleLogin = async () => {
    setLoading(true)
    setError('')

    const supabase = createClient()

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/`,
      },
    })

    if (error) {
      setError('ログインに失敗しました。もう一度お試しください。')
      setLoading(false)
    }
  }

  return (
    <main style={{
      minHeight: '100vh',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      background: '#f8faf7',
      padding: '24px',
    }}>
      <div style={{
        width: '100%',
        maxWidth: '400px',
        padding: '40px',
        background: 'white',
        borderRadius: '16px',
        textAlign: 'center',
        boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
      }}>
        <h1 style={{ fontSize: '32px', color: '#476b50' }}>
          Recipia
        </h1>

        <p style={{ color: '#666', marginBottom: '32px' }}>
          アレルギーに配慮したレシピを見つけよう。
        </p>

        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          style={{
            width: '100%',
            padding: '14px',
            border: '1px solid #ddd',
            borderRadius: '8px',
            background: 'white',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '15px',
          }}
        >
          {loading ? 'ログイン中...' : 'Googleでログイン'}
        </button>

        {error && (
          <p style={{ color: 'red', marginTop: '16px' }}>
            {error}
          </p>
        )}
      </div>
    </main>
  )
}
