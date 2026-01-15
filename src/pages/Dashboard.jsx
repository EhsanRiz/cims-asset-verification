import { useState } from 'react'
import { useAuth } from '../App'
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import { Database, User, Users, LogOut, Menu, X } from 'lucide-react'
import AllDataTab from '../components/AllDataTab'
import PersonalAssetTab from '../components/PersonalAssetTab'
import CommunalAssetTab from '../components/CommunalAssetTab'

export default function Dashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const tabs = [
    { id: 'all', label: 'All Data', icon: Database, path: '/' },
    { id: 'personal', label: 'Personal Asset', icon: User, path: '/personal' },
    { id: 'communal', label: 'Communal Asset', icon: Users, path: '/communal' },
  ]

  const currentTab = tabs.find(t => t.path === location.pathname) || tabs[0]

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-4d-light">
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo & Title */}
            <div className="flex items-center gap-3">
              <img src="/logo-4d.png" alt="4D" className="h-10" />
              <div className="hidden sm:block">
                <h1 className="text-lg font-bold text-4d-gray leading-tight">CIMS</h1>
                <p className="text-xs text-gray-500 leading-tight">Asset Registration & Verification</p>
              </div>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => navigate(tab.path)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
                    currentTab.id === tab.id
                      ? 'bg-4d-blue text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <tab.icon size={18} />
                  <span className="font-medium">{tab.label}</span>
                </button>
              ))}
            </nav>

            {/* User Menu */}
            <div className="flex items-center gap-3">
              <div className="hidden sm:block text-right">
                <p className="text-sm font-medium text-4d-gray">{user?.full_name}</p>
                <p className="text-xs text-gray-500">{user?.role}</p>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                title="Sign Out"
              >
                <LogOut size={20} />
              </button>
              
              {/* Mobile menu button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <nav className="md:hidden border-t bg-white px-4 py-2">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => {
                  navigate(tab.path)
                  setMobileMenuOpen(false)
                }}
                className={`flex items-center gap-3 w-full px-4 py-3 rounded-lg transition ${
                  currentTab.id === tab.id
                    ? 'bg-4d-blue text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <tab.icon size={20} />
                <span className="font-medium">{tab.label}</span>
              </button>
            ))}
          </nav>
        )}
      </header>

      {/* Partner Logos Bar */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-2">
          <div className="flex items-center justify-center gap-6 opacity-70">
            <img src="/logo-lesotho.png" alt="Lesotho" className="h-8" />
            <img src="/logo-llwdp.png" alt="LLWDP III" className="h-8" />
            <img src="/logo-afdb.png" alt="AfDB" className="h-6" />
          </div>
        </div>
      </div>

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
      <footer className="bg-white border-t mt-auto">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <p className="text-center text-xs text-gray-500">
            Lesotho Lowlands Water Development Project Phase III • Compensation Information Management System
          </p>
        </div>
      </footer>
    </div>
  )
}
