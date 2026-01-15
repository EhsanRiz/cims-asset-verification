import { useState } from 'react'
import { useAuth } from '../App'
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import { Database, User, Users, LogOut, RefreshCw } from 'lucide-react'
import AllDataTab from '../components/AllDataTab'
import PersonalAssetTab from '../components/PersonalAssetTab'
import CommunalAssetTab from '../components/CommunalAssetTab'

export default function Dashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const tabs = [
    { id: 'all', label: 'Dashboard', icon: Database, path: '/' },
    { id: 'personal', label: 'Personal Asset', icon: User, path: '/personal' },
    { id: 'communal', label: 'Communal Asset', icon: Users, path: '/communal' },
  ]

  const currentTab = tabs.find(t => t.path === location.pathname) || tabs[0]

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const getInitials = (name) => {
    if (!name) return 'U'
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f7fa', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <header style={{ 
        backgroundColor: '#0088c4', 
        position: 'sticky', 
        top: 0, 
        zIndex: 50,
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
        <div style={{ 
          maxWidth: '1200px', 
          margin: '0 auto', 
          padding: '0 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: '56px',
        }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              backgroundColor: 'rgba(255,255,255,0.2)',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <img src="/logo-llwdp.png" alt="CIMS" style={{ width: '24px', height: '24px', objectFit: 'contain' }} />
            </div>
            <span style={{ color: 'white', fontWeight: '600', fontSize: '18px' }}>CIMS</span>
          </div>

          {/* Right side */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button 
              onClick={() => window.location.reload()}
              style={{
                padding: '8px',
                backgroundColor: 'transparent',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                color: 'rgba(255,255,255,0.8)',
              }}
            >
              <RefreshCw size={20} />
            </button>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                backgroundColor: '#8cc63f',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '14px',
                fontWeight: '600',
              }}>
                {getInitials(user?.full_name)}
              </div>
              <span style={{ color: 'white', fontSize: '14px' }}>{user?.full_name}</span>
            </div>

            <button
              onClick={handleLogout}
              style={{
                padding: '8px',
                backgroundColor: 'transparent',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                color: 'rgba(255,255,255,0.8)',
              }}
              title="Sign Out"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav style={{ 
        backgroundColor: 'white', 
        borderBottom: '1px solid #e5e7eb',
        position: 'sticky',
        top: '56px',
        zIndex: 40,
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 16px' }}>
          <div style={{ display: 'flex', gap: '4px' }}>
            {tabs.map(tab => {
              const isActive = currentTab.id === tab.id
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => navigate(tab.path)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '12px 16px',
                    backgroundColor: 'transparent',
                    border: 'none',
                    borderBottom: `2px solid ${isActive ? '#0088c4' : 'transparent'}`,
                    color: isActive ? '#0088c4' : '#6b7280',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer',
                  }}
                >
                  <Icon size={18} />
                  <span>{tab.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main style={{ flex: 1, maxWidth: '1200px', margin: '0 auto', padding: '24px 16px', width: '100%', boxSizing: 'border-box' }}>
        <Routes>
          <Route path="/" element={<AllDataTab />} />
          <Route path="/personal" element={<PersonalAssetTab />} />
          <Route path="/personal/:id" element={<PersonalAssetTab />} />
          <Route path="/communal" element={<CommunalAssetTab />} />
        </Routes>
      </main>

      {/* Footer */}
      <footer style={{ 
        backgroundColor: 'white', 
        borderTop: '1px solid #e5e7eb',
        padding: '12px 16px',
      }}>
        <div style={{ 
          maxWidth: '1200px', 
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
        }}>
          <img src="/logo-4d.png" alt="4D" style={{ height: '20px', opacity: 0.6 }} />
          <span style={{ fontSize: '12px', color: '#9ca3af' }}>
            Developed by <span style={{ color: '#0088c4' }}>4D Climate Solutions</span> for LLWDP III
          </span>
        </div>
      </footer>
    </div>
  )
}
