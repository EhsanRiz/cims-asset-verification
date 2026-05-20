import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../App'
import { signInWithEmail, supabase, loadCurrentUserProfile } from '../lib/supabase'
import { LogIn, AlertCircle } from 'lucide-react'
import AuthShell from '../components/AuthShell'

// Mirrors the pattern in ResetPassword.jsx: HashRouter + Supabase email links
// produce /#/login#access_token=..., which the SDK can't auto-detect since
// detectSessionInUrl is globally off.
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

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [autoSigningIn, setAutoSigningIn] = useState(false)
  const navigate = useNavigate()
  const { login } = useAuth()
  const initRan = useRef(false)

  // If the user just clicked an email-confirm or magic-link, the URL hash
  // carries access_token + refresh_token. Consume them on the main Supabase
  // client (so the session persists), load the merged profile, hand off to
  // AuthProvider via login(), and route into the app.
  useEffect(() => {
    if (initRan.current) return
    initRan.current = true

    const tokens = extractTokensFromHash()
    if (!tokens?.access_token) return  // no token in URL — show the form

    let cancelled = false
    setAutoSigningIn(true)
    ;(async () => {
      try {
        const { error: sessErr } = await supabase.auth.setSession({
          access_token:  tokens.access_token,
          refresh_token: tokens.refresh_token,
        })
        if (sessErr) throw sessErr

        const profile = await loadCurrentUserProfile()
        if (!profile) {
          await supabase.auth.signOut().catch(() => {})
          throw new Error('Your account is not yet authorised for CIMS. Please contact the administrator.')
        }
        if (!profile.is_active) {
          await supabase.auth.signOut().catch(() => {})
          throw new Error('Your account has been deactivated. Please contact the administrator.')
        }

        // Clear tokens from the address bar so a refresh doesn't try to re-consume them.
        window.history.replaceState(null, '', '#/login')
        if (cancelled) return
        login(profile)
        navigate('/')
      } catch (err) {
        console.error('Auto sign-in from email link failed:', err)
        if (!cancelled) {
          setError(err.message || 'This sign-in link is invalid or expired. Please sign in below.')
          window.history.replaceState(null, '', '#/login')
        }
      } finally {
        if (!cancelled) setAutoSigningIn(false)
      }
    })()

    return () => { cancelled = true }
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const profile = await signInWithEmail(email.trim().toLowerCase(), password)
      login(profile)
      navigate('/')
    } catch (err) {
      setError(err.message || 'Failed to sign in')
    } finally {
      setLoading(false)
    }
  }

  // Mid auto-sign-in: show a spinner so the user doesn't see the form
  // flash briefly before being redirected.
  if (autoSigningIn) {
    return (
      <AuthShell title="Signing you in…" subtitle="Confirming your email and starting your session">
        <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 0' }}>
          <div style={{
            width: '32px', height: '32px',
            border: '3px solid #e5e7eb', borderTopColor: '#0088c4',
            borderRadius: '50%', animation: 'spin 1s linear infinite',
          }} />
        </div>
      </AuthShell>
    )
  }

  return (
    <AuthShell title="Sign in to CIMS" subtitle="Compensation Information Management System">
      <form onSubmit={handleSubmit}>
        {error && (
          <div style={errorBox}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <Field label="Email">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@llwdp3.org.ls"
            required
            autoComplete="email"
            style={inputStyle}
          />
        </Field>

        <Field label="Password">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            required
            autoComplete="current-password"
            style={inputStyle}
          />
        </Field>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '-8px', marginBottom: '20px' }}>
          <Link to="/forgot-password" style={linkStyle}>Forgot password?</Link>
        </div>

        <button type="submit" disabled={loading} style={primaryButton(loading)}>
          {loading ? <Spinner /> : <><LogIn size={20} /> Sign In</>}
        </button>

        <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '14px', color: '#6b7280' }}>
          New here? <Link to="/register" style={linkStyle}>Create your account</Link>
        </div>
      </form>
    </AuthShell>
  )
}

// ── shared styles used by Register / ForgotPassword / ResetPassword too ──
const inputStyle = {
  width: '100%',
  padding: '12px 16px',
  backgroundColor: '#f9fafb',
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
  fontSize: '15px',
  outline: 'none',
  boxSizing: 'border-box',
  transition: 'all 0.2s',
}

const errorBox = {
  backgroundColor: '#fef2f2',
  border: '1px solid #fecaca',
  color: '#dc2626',
  padding: '12px 16px',
  borderRadius: '8px',
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  fontSize: '14px',
  marginBottom: '16px',
}

const linkStyle = {
  color: '#0088c4',
  textDecoration: 'none',
  fontSize: '13px',
  fontWeight: '500',
}

const primaryButton = (loading) => ({
  width: '100%',
  padding: '14px',
  backgroundColor: '#0088c4',
  color: 'white',
  border: 'none',
  borderRadius: '8px',
  fontSize: '15px',
  fontWeight: '600',
  cursor: loading ? 'not-allowed' : 'pointer',
  opacity: loading ? 0.7 : 1,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px',
  transition: 'all 0.2s',
})

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: '16px' }}>
      <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
        {label}
      </label>
      {children}
    </div>
  )
}

function Spinner() {
  return (
    <div style={{
      width: '20px', height: '20px',
      border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white',
      borderRadius: '50%', animation: 'spin 1s linear infinite',
    }} />
  )
}

export { inputStyle, errorBox, linkStyle, primaryButton, Field, Spinner }
