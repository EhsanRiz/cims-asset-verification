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
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#f0f7fa' }}>
      {/* Top Logo Bar */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center justify-center gap-8">
            <img src="/logo-lesotho.png" alt="Lesotho" className="h-12 object-contain" />
            <img src="/logo-llwdp.png" alt="LLWDP III" className="h-12 object-contain" />
            <img src="/logo-afdb.png" alt="AfDB" className="h-10 object-contain" />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          {/* Login Card */}
          <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
            {/* Header */}
            <div className="px-8 pt-8 pb-6 text-center" style={{ borderBottom: '3px solid #0088c4' }}>
              <h1 className="text-3xl font-bold" style={{ color: '#0088c4' }}>CIMS</h1>
              <p className="text-gray-600 mt-1">Compensation Information Management System</p>
              <p className="text-sm mt-1" style={{ color: '#8cc63f' }}>Asset Registration and Verification</p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-8 space-y-5">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2 text-sm">
                  <AlertCircle size={18} />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg outline-none transition"
                  style={{ 
                    boxShadow: 'none'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#0088c4'
                    e.target.style.boxShadow = '0 0 0 3px rgba(0, 136, 196, 0.1)'
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#d1d5db'
                    e.target.style.boxShadow = 'none'
                  }}
                  placeholder="Enter your username"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg outline-none transition"
                  onFocus={(e) => {
                    e.target.style.borderColor = '#0088c4'
                    e.target.style.boxShadow = '0 0 0 3px rgba(0, 136, 196, 0.1)'
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#d1d5db'
                    e.target.style.boxShadow = 'none'
                  }}
                  placeholder="Enter your password"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full text-white font-semibold py-3 px-4 rounded-lg transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ 
                  backgroundColor: '#0088c4',
                }}
                onMouseOver={(e) => e.target.style.backgroundColor = '#006a9c'}
                onMouseOut={(e) => e.target.style.backgroundColor = '#0088c4'}
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <LogIn size={20} />
                    Sign In
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Footer with 4D Branding */}
      <footer className="bg-white border-t">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex flex-col items-center gap-3">
            <img src="/logo-4d.png" alt="4D Climate Solutions" className="h-10" />
            <p className="text-sm text-gray-500 text-center">
              Developed by <span style={{ color: '#0088c4', fontWeight: '600' }}>4D Climate Solutions</span> for 
              <span style={{ color: '#8cc63f', fontWeight: '600' }}> LLWDP III</span> Project
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
