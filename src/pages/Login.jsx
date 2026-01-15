import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../App'
import { signIn } from '../lib/supabase'
import { LogIn, AlertCircle, Database, FileText, Users } from 'lucide-react'

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
    <div 
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background: 'linear-gradient(135deg, #0088c4 0%, #005a7c 50%, #003d54 100%)',
      }}
    >
      {/* Decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div 
          className="absolute -top-1/4 -left-1/4 w-1/2 h-1/2 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #8cc63f 0%, transparent 70%)' }}
        />
        <div 
          className="absolute -bottom-1/4 -right-1/4 w-1/2 h-1/2 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #8cc63f 0%, transparent 70%)' }}
        />
      </div>

      {/* Login Card */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Logo Section */}
        <div className="pt-8 pb-4 px-8">
          <div className="w-24 h-24 mx-auto bg-gray-50 rounded-2xl flex items-center justify-center shadow-sm border border-gray-100">
            <img src="/logo-llwdp.png" alt="LLWDP" className="w-16 h-16 object-contain" />
          </div>
          <p className="text-center text-gray-500 text-sm mt-3">Asset Registration & Verification</p>
        </div>

        {/* Tabs - Visual only */}
        <div className="flex border-b border-gray-100 px-8">
          <button 
            className="flex-1 py-3 text-center font-medium border-b-2 transition-colors"
            style={{ borderColor: '#0088c4', color: '#0088c4' }}
          >
            Sign In
          </button>
          <button 
            className="flex-1 py-3 text-center font-medium text-gray-400 border-b-2 border-transparent"
            disabled
          >
            About
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-8 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl flex items-center gap-2 text-sm">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
            </div>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-xl outline-none transition-all text-gray-700"
              style={{ 
                fontSize: '15px',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#0088c4'
                e.target.style.backgroundColor = '#fff'
                e.target.style.boxShadow = '0 0 0 4px rgba(0, 136, 196, 0.1)'
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#e5e7eb'
                e.target.style.backgroundColor = '#f9fafb'
                e.target.style.boxShadow = 'none'
              }}
              placeholder="Username"
              required
            />
          </div>

          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-xl outline-none transition-all text-gray-700"
              style={{ fontSize: '15px' }}
              onFocus={(e) => {
                e.target.style.borderColor = '#0088c4'
                e.target.style.backgroundColor = '#fff'
                e.target.style.boxShadow = '0 0 0 4px rgba(0, 136, 196, 0.1)'
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#e5e7eb'
                e.target.style.backgroundColor = '#f9fafb'
                e.target.style.boxShadow = 'none'
              }}
              placeholder="Password"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full text-white font-semibold py-4 px-4 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ 
              backgroundColor: '#0088c4',
              fontSize: '15px',
            }}
            onMouseOver={(e) => {
              if (!loading) e.target.style.backgroundColor = '#006a9c'
            }}
            onMouseOut={(e) => {
              e.target.style.backgroundColor = '#0088c4'
            }}
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        {/* Features */}
        <div className="px-8 pb-6">
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 rounded-full text-xs text-gray-500 border border-gray-100">
              <Database size={12} style={{ color: '#0088c4' }} />
              Households
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 rounded-full text-xs text-gray-500 border border-gray-100">
              <FileText size={12} style={{ color: '#8cc63f' }} />
              Assets
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 rounded-full text-xs text-gray-500 border border-gray-100">
              <Users size={12} style={{ color: '#0088c4' }} />
              Verification
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 px-8 py-4">
          <div className="flex flex-col items-center gap-2">
            <img src="/logo-4d.png" alt="4D Climate Solutions" className="h-6 opacity-70" />
            <p className="text-xs text-gray-400">
              A <span style={{ color: '#8cc63f' }}>4D Climate Solutions</span> Initiative
            </p>
            <p className="text-xs text-gray-300">© 2026 · Version 1.0</p>
          </div>
        </div>
      </div>
    </div>
  )
}
