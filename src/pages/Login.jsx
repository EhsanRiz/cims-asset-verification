import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../App'
import { signIn } from '../lib/supabase'
import { LogIn, AlertCircle } from 'lucide-react'

export default function Login() {
  const [username, setUsername] = useState('')
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
      const user = await signIn(username, password)
      login(user)
      navigate('/')
    } catch (err) {
      setError(err.message || 'Failed to sign in')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      background: 'linear-gradient(135deg, #0088c4 0%, #005a7c 50%, #003d54 100%)',
    }}>
      {/* Login Card */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '16px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        width: '100%',
        maxWidth: '420px',
        overflow: 'hidden',
      }}>
        {/* Partner Logos */}
        <div style={{ 
          padding: '24px 32px 16px 32px', 
          backgroundColor: '#f8f9fa',
          borderBottom: '1px solid #e9ecef',
        }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            gap: '16px',
            flexWrap: 'wrap',
          }}>
            <img src="/logo-lesotho.png" alt="Government of Lesotho" style={{ height: '50px', objectFit: 'contain' }} />
            <img src="/logo-llwdp.png" alt="LLWDSP III" style={{ height: '50px', objectFit: 'contain' }} />
            <img src="/logo-afdb.png" alt="African Development Bank" style={{ height: '45px', objectFit: 'contain' }} />
          </div>
        </div>

        {/* Title Section */}
        <div style={{ padding: '24px 32px 16px 32px', textAlign: 'center' }}>
          <h1 style={{ 
            fontSize: '28px', 
            fontWeight: '700', 
            color: '#0088c4', 
            margin: '0 0 4px 0' 
          }}>
            CIMS
          </h1>
          <p style={{ 
            fontSize: '14px', 
            color: '#6b7280', 
            margin: '0 0 4px 0' 
          }}>
            Compensation Information Management System
          </p>
          <p style={{ 
            fontSize: '13px', 
            color: '#8cc63f', 
            margin: 0,
            fontWeight: '500',
          }}>
            Asset Registration & Verification
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: '8px 32px 32px 32px' }}>
          {error && (
            <div style={{
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
            }}>
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              required
              style={{
                width: '100%',
                padding: '12px 16px',
                backgroundColor: '#f9fafb',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '15px',
                outline: 'none',
                boxSizing: 'border-box',
                transition: 'all 0.2s',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#0088c4'
                e.target.style.backgroundColor = '#fff'
                e.target.style.boxShadow = '0 0 0 3px rgba(0, 136, 196, 0.1)'
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#e5e7eb'
                e.target.style.backgroundColor = '#f9fafb'
                e.target.style.boxShadow = 'none'
              }}
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              style={{
                width: '100%',
                padding: '12px 16px',
                backgroundColor: '#f9fafb',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '15px',
                outline: 'none',
                boxSizing: 'border-box',
                transition: 'all 0.2s',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#0088c4'
                e.target.style.backgroundColor = '#fff'
                e.target.style.boxShadow = '0 0 0 3px rgba(0, 136, 196, 0.1)'
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#e5e7eb'
                e.target.style.backgroundColor = '#f9fafb'
                e.target.style.boxShadow = 'none'
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
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
            }}
            onMouseOver={(e) => { if (!loading) e.target.style.backgroundColor = '#006a9c' }}
            onMouseOut={(e) => { e.target.style.backgroundColor = '#0088c4' }}
          >
            {loading ? (
              <div style={{
                width: '20px',
                height: '20px',
                border: '2px solid rgba(255,255,255,0.3)',
                borderTopColor: 'white',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
              }} />
            ) : (
              <>
                <LogIn size={20} />
                Sign In
              </>
            )}
          </button>
        </form>

        {/* Footer */}
        <div style={{
          borderTop: '1px solid #f3f4f6',
          padding: '20px 32px',
          textAlign: 'center',
          backgroundColor: '#fafafa',
        }}>
          <img src="/logo-4d.png" alt="4D Climate Solutions" style={{ height: '28px', marginBottom: '8px' }} />
          <p style={{ fontSize: '12px', color: '#9ca3af', margin: 0 }}>
            Developed by <span style={{ color: '#0088c4', fontWeight: '600' }}>4D Climate Solutions</span>
          </p>
          <p style={{ fontSize: '11px', color: '#d1d5db', marginTop: '4px' }}>
            © 2026 · LLWDSP III
          </p>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
