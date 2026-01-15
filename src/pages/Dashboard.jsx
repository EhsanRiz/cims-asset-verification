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

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f8fafb' }}>
      {/* Top Header Bar - Green like Rekisa */}
      <header 
        className="sticky top-0 z-50 shadow-sm"
        style={{ backgroundColor: '#0088c4' }}
      >
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-14">
            {/* Logo & Title */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                <img src="/logo-llwdp.png" alt="CIMS" className="w-6 h-6 object-contain" />
              </div>
              <span className="text-white font-semibold text-lg">CIMS</span>
            </div>

            {/* Right side */}
            <div className="flex items-center gap-3">
              <button 
                className="p-2 text-white text-opacity-80 hover:text-opacity-100 hover:bg-white hover:bg-opacity-10 rounded-lg transition"
                onClick={() => window.location.reload()}
              >
                <RefreshCw size={20} />
              </button>
              
              {/* User Avatar */}
              <div className="flex items-center gap-2">
                <div 
                  className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold"
                  style={{ backgroundColor: '#8cc63f', color: 'white' }}
                >
                  {user?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
                </div>
                <span className="text-white text-sm hidden sm:block">{user?.full_name}</span>
              </div>

              <button
                onClick={handleLogout}
                className="p-2 text-white text-opacity-80 hover:text-opacity-100 hover:bg-white hover:bg-opacity-10 rounded-lg transition"
                title="Sign Out"
              >
                <LogOut size={20} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="bg-white border-b border-gray-200 sticky top-14 z-40">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center gap-1 overflow-x-auto">
            {tabs.map(tab => {
              const isActive = currentTab.id === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => navigate(tab.path)}
                  className="flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap border-b-2"
                  style={{ 
                    borderColor: isActive ? '#0088c4' : 'transparent',
                    color: isActive ? '#0088c4' : '#6b7280'
                  }}
                >
                  <tab.icon size={18} />
                  <span>{tab.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        <Routes>
          <Route path="/" element={<AllDataTab />} />
          <Route path="/personal" element={<PersonalAssetTab />} />
          <Route path="/personal/:id" element={<PersonalAssetTab />} />
          <Route path="/communal" element={<CommunalAssetTab />} />
        </Routes>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-100 mt-auto">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-center gap-2">
            <img src="/logo-4d.png" alt="4D" className="h-5 opacity-60" />
            <span className="text-xs text-gray-400">
              Developed by <span style={{ color: '#0088c4' }}>4D Climate Solutions</span> for LLWDP III
            </span>
          </div>
        </div>
      </footer>
    </div>
  )
}
