import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { checkEmailAuthorized, registerWithEmail } from '../lib/supabase'
import { UserPlus, AlertCircle, CheckCircle } from 'lucide-react'
import AuthShell from '../components/AuthShell'
import { inputStyle, errorBox, linkStyle, primaryButton, Field, Spinner } from './Login'

// Two-step registration:
//  1. User enters email — we call check_email_authorized RPC; if authorized, advance to password step.
//  2. User chooses + confirms password; we call supabase.auth.signUp. Trigger handles system_users.
export default function Register() {
  const navigate = useNavigate()
  const [step, setStep] = useState('email') // 'email' | 'password' | 'success'
  const [email, setEmail] = useState('')
  const [authorization, setAuthorization] = useState(null) // { role, full_name, job_title, already_registered }
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleCheckEmail = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const normalized = email.trim().toLowerCase()
      const result = await checkEmailAuthorized(normalized)
      if (!result?.authorized) {
        setError('This email is not authorised for CIMS access. Please contact the administrator.')
        return
      }
      if (result.already_registered) {
        setError('This email is already registered. Please sign in instead, or use "Forgot password" to reset your password.')
        return
      }
      setEmail(normalized)
      setAuthorization(result)
      setStep('password')
    } catch (err) {
      setError(err.message || 'Could not verify email. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateAccount = async (e) => {
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
      await registerWithEmail(email, password)
      setStep('success')
    } catch (err) {
      setError(err.message || 'Failed to create account.')
    } finally {
      setLoading(false)
    }
  }

  if (step === 'success') {
    return (
      <AuthShell title="Check your email" subtitle="Confirm to complete registration">
        <div style={{ textAlign: 'center', padding: '8px 0 16px 0' }}>
          <CheckCircle size={56} color="#16a34a" style={{ margin: '0 auto 16px auto', display: 'block' }} />
          <p style={{ fontSize: '15px', color: '#374151', lineHeight: '1.6', margin: '0 0 12px 0' }}>
            We've sent a confirmation email to <strong>{email}</strong>.
          </p>
          <p style={{ fontSize: '14px', color: '#6b7280', lineHeight: '1.6', margin: 0 }}>
            Click the link in that email to confirm your address, then return here to sign in.
            If it isn't in your inbox after a minute, check your junk/spam folder.
          </p>
        </div>
        <button onClick={() => navigate('/login')} style={primaryButton(false)}>
          Back to sign in
        </button>
      </AuthShell>
    )
  }

  if (step === 'password') {
    return (
      <AuthShell title="Create your password" subtitle={`Welcome, ${authorization.full_name}`}>
        <form onSubmit={handleCreateAccount}>
          {error && (
            <div style={errorBox}>
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          <div style={{
            backgroundColor: '#f0f9ff',
            border: '1px solid #bae6fd',
            color: '#075985',
            padding: '12px 16px',
            borderRadius: '8px',
            fontSize: '13px',
            marginBottom: '20px',
          }}>
            <div style={{ fontWeight: '600', marginBottom: '4px' }}>Account details</div>
            <div>Email: {email}</div>
            {authorization.job_title && <div>Role: {authorization.job_title}</div>}
          </div>

          <Field label="Password (at least 8 characters)">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Choose a strong password"
              required
              minLength={8}
              autoComplete="new-password"
              style={inputStyle}
            />
          </Field>

          <Field label="Confirm password">
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Type it again"
              required
              minLength={8}
              autoComplete="new-password"
              style={inputStyle}
            />
          </Field>

          <button type="submit" disabled={loading} style={primaryButton(loading)}>
            {loading ? <Spinner /> : <><UserPlus size={20} /> Create Account</>}
          </button>

          <div style={{ textAlign: 'center', marginTop: '16px' }}>
            <button
              type="button"
              onClick={() => { setStep('email'); setError(''); setPassword(''); setConfirmPassword('') }}
              style={{ background: 'none', border: 'none', color: '#6b7280', fontSize: '13px', cursor: 'pointer' }}
            >
              ← Use a different email
            </button>
          </div>
        </form>
      </AuthShell>
    )
  }

  // step === 'email'
  return (
    <AuthShell title="Register for CIMS" subtitle="Staff registration — pre-authorised emails only">
      <form onSubmit={handleCheckEmail}>
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
            placeholder="Enter the email the administrator added you with"
            required
            autoComplete="email"
            style={inputStyle}
          />
        </Field>

        <p style={{ fontSize: '13px', color: '#6b7280', margin: '-4px 0 20px 0', lineHeight: '1.5' }}>
          This must match the email the CIMS administrator added to the authorised staff list.
          If you don't know which email was used, please ask the administrator.
        </p>

        <button type="submit" disabled={loading} style={primaryButton(loading)}>
          {loading ? <Spinner /> : <><UserPlus size={20} /> Continue</>}
        </button>

        <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '14px', color: '#6b7280' }}>
          Already have an account? <Link to="/login" style={linkStyle}>Sign in</Link>
        </div>
      </form>
    </AuthShell>
  )
}
