import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../App'
import { signInWithEmail } from '../lib/supabase'
import { LogIn, AlertCircle } from 'lucide-react'
import AuthShell from '../components/AuthShell'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { login } = useAuth()

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
