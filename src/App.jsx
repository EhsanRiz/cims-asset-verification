import { useState, useEffect, createContext, useContext } from 'react'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Register from './pages/Register'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import Dashboard from './pages/Dashboard'
import Landing from './pages/Landing'
import Collect from './pages/Collect'
import { supabase, loadCurrentUserProfile, signOut as supabaseSignOut, canEdit, VIEW_ONLY_ROLES } from './lib/supabase'

// ── Auth Context ───────────────────────────────────────────────────────────────
const AuthContext = createContext(null)
export function useAuth() { return useContext(AuthContext) }

function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // Refresh the merged profile (auth.users + system_users) from Supabase.
  const refresh = async () => {
    try {
      const profile = await loadCurrentUserProfile()
      setUser(profile && profile.is_active ? profile : null)
    } catch (err) {
      console.error('Failed to load user profile', err)
      setUser(null)
    }
  }

  useEffect(() => {
    let active = true

    // Initial load.
    refresh().finally(() => { if (active) setLoading(false) })

    // React to sign-in / sign-out / token refresh from Supabase Auth.
    const { data: sub } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === 'SIGNED_OUT') {
        if (active) setUser(null)
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        await refresh()
      }
      // PASSWORD_RECOVERY is handled by ResetPassword.jsx; no global state change.
    })

    return () => {
      active = false
      sub?.subscription?.unsubscribe?.()
    }
  }, [])

  const login = (profile) => setUser(profile)
  const logout = async () => {
    await supabaseSignOut()
    setUser(null)
  }

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        backgroundColor: '#f8fafc',
      }}>
        <div style={{
          width: '40px', height: '40px',
          border: '3px solid #e5e7eb', borderTopColor: '#8cc63f',
          borderRadius: '50%', animation: 'spin 1s linear infinite',
        }} />
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, refresh, canEdit: canEdit(user?.role), isViewOnly: VIEW_ONLY_ROLES.has((user?.role || '').toLowerCase()) }}>
      {children}
    </AuthContext.Provider>
  )
}

function ProtectedRoute({ children }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  return children
}

// Role-aware landing.
//  - 'user' (Mamokuena, legacy field surveyor) lands on the Landing mode picker.
//  - All other roles (admin, clo, arco, rco, essm, assistant_clo, pm, ict_dmo, client) land on Dashboard.
function RoleHome() {
  const { user } = useAuth()
  const role = (user?.role || '').toLowerCase()
  if (role === 'user') return <Landing />
  return <Dashboard />
}

function App() {
  return (
    <HashRouter>
      <AuthProvider>
        <Routes>
          {/* Public auth routes */}
          <Route path="/login"           element={<Login />} />
          <Route path="/register"        element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password"  element={<ResetPassword />} />

          {/* Protected app routes */}
          <Route path="/landing"      element={<ProtectedRoute><Landing /></ProtectedRoute>} />
          <Route path="/collect"      element={<ProtectedRoute><Collect /></ProtectedRoute>} />
          <Route path="/dashboard/*"  element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/*"            element={<ProtectedRoute><RoleHome /></ProtectedRoute>} />
        </Routes>
      </AuthProvider>
    </HashRouter>
  )
}

export default App
