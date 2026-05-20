import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { createClient } from '@supabase/supabase-js'
import { supabaseUrl, supabaseAnonKey } from '../lib/supabase'
import { KeyRound, AlertCircle, CheckCircle } from 'lucide-react'
import AuthShell from '../components/AuthShell'
import { inputStyle, errorBox, primaryButton, Field, Spinner } from './Login'

// Dedicated, isolated Supabase client for the recovery flow.
//   - persistSession: false   → no localStorage writes; doesn't disturb the main app's session
//   - autoRefreshToken: false → no background refresh racing with our setSession / updateUser
//   - detectSessionInUrl: false → we parse the URL fragment ourselves
//   - storageKey: a separate namespace → the navigator.locks key is different from the main
//     client's, so we don't deadlock on _acquireLock when the user is already signed in
//     somewhere else in the app.
const recoveryClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
    storageKey: 'cims-recovery-auth',
  },
})

function extractTokensFromHash() {
  const hash = window.location.hash || ''
  const lastHashIdx = hash.lastIndexOf('#')
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

export default function ResetPassword() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [hasRecoverySession, setHasRecoverySession] = useState(false)
  const initRan = useRef(false)

  useEffect(() => {
    if (initRan.current) return
    initRan.current = true

    let mounted = true

    const init = async () => {
      const tokens = extractTokensFromHash()
      if (!tokens?.access_token) {
        if (mounted) setError('No recovery token found in the URL. Request a new reset link.')
        return
      }

      const { error: sessionError } = await recoveryClient.auth.setSession({
        access_token:  tokens.access_token,
        refresh_token: tokens.refresh_token,
      })
      if (sessionError) {
        console.error('Recovery setSession failed:', sessionError)
        if (mounted) setError('Reset link is invalid or expired. Request a new one.')
        return
      }
      if (mounted) {
        setHasRecoverySession(true)
        // Strip tokens from address bar so a refresh doesn't try to re-consume them.
        window.history.replaceState(null, '', '#/reset-password')
      }
    }

    init()
    return () => { mounted = false }
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
      const { error: updateError } = await recoveryClient.auth.updateUser({ password })
      if (updateError) throw updateError

      // Cleanup: sign out of the recovery client so its session doesn't linger.
      await recoveryClient.auth.signOut().catch(() => {})

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
        {error ? (
          <div style={errorBox}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 0' }}>
            <div style={{
              width: '32px', height: '32px',
              border: '3px solid #e5e7eb', borderTopColor: '#0088c4',
              borderRadius: '50%', animation: 'spin 1s linear infinite',
            }} />
          </div>
        )}
        <p style={{ fontSize: '13px', color: '#6b7280', textAlign: 'center', margin: '8px 0 0 0' }}>
          If this hangs or the link has expired, request a new one from the{' '}
          <a href="#/forgot-password" style={{ color: '#0088c4' }}>Forgot password</a> page.
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
