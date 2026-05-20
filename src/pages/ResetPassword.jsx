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
    // Supabase Auth places the recovery tokens in the URL hash on the redirect; the SDK
    // (with detectSessionInUrl: true) automatically establishes a session and fires PASSWORD_RECOVERY.
    const { data: subscription } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
        setHasRecoverySession(true)
      }
    })
    // Also check current session immediately in case the event fired before we mounted.
    supabase.auth.getSession().then(({ data }) => {
      if (data?.session) setHasRecoverySession(true)
    })
    return () => subscription?.subscription?.unsubscribe?.()
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
