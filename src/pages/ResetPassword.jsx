import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, updatePassword } from '../lib/supabase'
import { KeyRound, AlertCircle, CheckCircle } from 'lucide-react'
import AuthShell from '../components/AuthShell'
import { inputStyle, errorBox, primaryButton, Field, Spinner } from './Login'

export default function ResetPassword() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [hasRecoverySession, setHasRecoverySession] = useState(false)

  useEffect(() => {
    // Supabase Auth places the recovery tokens in the URL hash on redirect. With HashRouter,
    // the URL ends up looking like `/#/reset-password#access_token=...&type=recovery&...` —
    // two `#` signs. The SDK's `detectSessionInUrl` auto-parse can't reliably handle the
    // double-hash, so we extract the tokens ourselves and call setSession directly.
    let mounted = true

    const extractTokens = () => {
      const hash = window.location.hash || ''
      const lastHashIdx = hash.lastIndexOf('#')
      // Need at least two hashes (one for HashRouter route, one for the tokens)
      if (lastHashIdx <= 0) return null
      const fragment = hash.substring(lastHashIdx + 1)
      if (!fragment.includes('access_token')) return null
      const params = new URLSearchParams(fragment)
      return {
        access_token:  params.get('access_token'),
        refresh_token: params.get('refresh_token') || '',
        type:          params.get('type'),
      }
    }

    const init = async () => {
      const tokens = extractTokens()
      if (tokens?.access_token) {
        const { error } = await supabase.auth.setSession({
          access_token:  tokens.access_token,
          refresh_token: tokens.refresh_token,
        })
        if (!error && mounted) {
          setHasRecoverySession(true)
          // Clean the address bar so a refresh doesn't try to re-consume the token.
          window.history.replaceState(null, '', '#/reset-password')
          return
        }
        if (error) console.error('setSession failed for recovery token:', error)
      }
      // Fallback: SDK auto-detect may have already established a session.
      const { data: { session } } = await supabase.auth.getSession()
      if (session && mounted) setHasRecoverySession(true)
    }

    init()

    // Also subscribe — covers the case where the SDK fires PASSWORD_RECOVERY late
    // (e.g. on a single-hash URL from a different routing setup).
    const { data: subscription } = supabase.auth.onAuthStateChange((event) => {
      if (mounted && (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN')) {
        setHasRecoverySession(true)
      }
    })

    return () => {
      mounted = false
      subscription?.subscription?.unsubscribe?.()
    }
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    setLoading(true)
    try {
      await updatePassword(password)
      setDone(true)
      setTimeout(() => navigate('/login'), 2500)
    } catch (err) {
      setError(err.message || 'Could not update password.')
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <AuthShell title="Password updated" subtitle="You can now sign in">
        <div style={{ textAlign: 'center', padding: '8px 0 16px 0' }}>
          <CheckCircle size={56} color="#16a34a" style={{ margin: '0 auto 16px auto', display: 'block' }} />
          <p style={{ fontSize: '15px', color: '#374151', lineHeight: '1.6', margin: 0 }}>
            Your password has been changed. Redirecting you to sign in…
          </p>
        </div>
      </AuthShell>
    )
  }

  if (!hasRecoverySession) {
    return (
      <AuthShell title="Reset password" subtitle="Verifying reset link…">
        <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 0' }}>
          <div style={{
            width: '32px', height: '32px',
            border: '3px solid #e5e7eb', borderTopColor: '#0088c4',
            borderRadius: '50%', animation: 'spin 1s linear infinite',
          }} />
        </div>
        <p style={{ fontSize: '13px', color: '#6b7280', textAlign: 'center', margin: '8px 0 0 0' }}>
          If this hangs for more than a few seconds, the reset link may have expired.
          Request a new one from the <a href="#/forgot-password" style={{ color: '#0088c4' }}>Forgot password</a> page.
        </p>
      </AuthShell>
    )
  }

  return (
    <AuthShell title="Set a new password" subtitle="Choose a strong password">
      <form onSubmit={handleSubmit}>
        {error && (
          <div style={errorBox}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <Field label="New password (at least 8 characters)">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
            style={inputStyle}
          />
        </Field>

        <Field label="Confirm new password">
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
            style={inputStyle}
          />
        </Field>

        <button type="submit" disabled={loading} style={primaryButton(loading)}>
          {loading ? <Spinner /> : <><KeyRound size={20} /> Update Password</>}
        </button>
      </form>
    </AuthShell>
  )
}
