import { useState } from 'react'
import { Link } from 'react-router-dom'
import { requestPasswordReset } from '../lib/supabase'
import { Mail, AlertCircle, CheckCircle } from 'lucide-react'
import AuthShell from '../components/AuthShell'
import { inputStyle, errorBox, linkStyle, primaryButton, Field, Spinner } from './Login'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await requestPasswordReset(email.trim().toLowerCase())
      setSent(true)
    } catch (err) {
      setError(err.message || 'Could not send reset email.')
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <AuthShell title="Check your email" subtitle="Password reset link sent">
        <div style={{ textAlign: 'center', padding: '8px 0 16px 0' }}>
          <CheckCircle size={56} color="#16a34a" style={{ margin: '0 auto 16px auto', display: 'block' }} />
          <p style={{ fontSize: '15px', color: '#374151', lineHeight: '1.6', margin: '0 0 12px 0' }}>
            If <strong>{email}</strong> is registered for CIMS, you'll receive a password reset email shortly.
          </p>
          <p style={{ fontSize: '14px', color: '#6b7280', lineHeight: '1.6', margin: 0 }}>
            The link is valid for one hour. If it doesn't arrive within a minute, check your junk/spam folder.
          </p>
        </div>
        <Link to="/login" style={{ textDecoration: 'none' }}>
          <button style={primaryButton(false)}>Back to sign in</button>
        </Link>
      </AuthShell>
    )
  }

  return (
    <AuthShell title="Forgot your password?" subtitle="We'll email you a reset link">
      <form onSubmit={handleSubmit}>
        {error && (
          <div style={errorBox}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <Field label="Your email address">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your registered email"
            required
            autoComplete="email"
            style={inputStyle}
          />
        </Field>

        <button type="submit" disabled={loading} style={primaryButton(loading)}>
          {loading ? <Spinner /> : <><Mail size={20} /> Send Reset Link</>}
        </button>

        <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '14px', color: '#6b7280' }}>
          <Link to="/login" style={linkStyle}>← Back to sign in</Link>
        </div>
      </form>
    </AuthShell>
  )
}
