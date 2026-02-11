import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../App'
import { supabase } from '../lib/supabase'
import { 
  LogOut, Search, Users, Home, ChevronRight, ChevronLeft,
  CreditCard, FileText, User, Printer, Edit2, 
  Save, Upload, MapPin, Camera, Check, XCircle, Building2, TreePine
} from 'lucide-react'

// 4D Climate Solutions Color Scheme (Lipalo-inspired)
const colors = {
  primary: '#1a3a4a',      // Dark navy/teal
  primaryDark: '#0f2a36',  // Darker navy
  accent: '#8cc63f',       // 4D Lime green
  accentHover: '#7ab62f',  // Darker green
  success: '#22c55e',      // Success green
  warning: '#f59e0b',      // Warning orange
  error: '#ef4444',        // Error red
  textDark: '#1f2937',     // Dark text
  textMuted: '#6b7280',    // Muted text
  textLight: '#9ca3af',    // Light text
  bgLight: '#f8fafc',      // Light background
  bgCard: '#ffffff',       // Card background
  border: '#e2e8f0',       // Border color
  rural: '#059669',        // Rural green
  urban: '#7c3aed',        // Urban purple
}

// Map icon component (to avoid conflict with JS Map)
const MapIcon = ({ size = 24, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"></polygon>
    <line x1="8" y1="2" x2="8" y2="18"></line>
    <line x1="16" y1="6" x2="16" y2="22"></line>
  </svg>
)

export default function Dashboard() {
  const { user, logout } = useAuth()
  const [households, setHouseholds] = useState([])
  const [routes, setRoutes] = useState([])
  const [loading, setLoading] = useState(true)
  
  const [view, setView] = useState('routes')
  const [selectedRoute, setSelectedRoute] = useState(null)
  const [selectedHousehold, setSelectedHousehold] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  
  const [activeTab, setActiveTab] = useState('details')
  const [editMode, setEditMode] = useState(false)
  const [editedData, setEditedData] = useState({})
  const [saving, setSaving] = useState(false)

  const isAdmin = user?.role === 'Admin' || user?.role === 'admin'

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const { data: householdData, error } = await supabase
        .from('households')
        .select('*')
        .order('household_head_surname', { ascending: true })
      
      if (error) throw error
      
      setHouseholds(householdData || [])
      
      const routeMap = new Map()
      householdData?.forEach(h => {
        const routeName = h.route_name
        if (routeName) {
          if (!routeMap.has(routeName)) {
            routeMap.set(routeName, {
              name: routeName,
              type: h.route_type || 'Unknown',
              pap_count: 0
            })
          }
          routeMap.get(routeName).pap_count++
        }
      })
      
      const sortedRoutes = Array.from(routeMap.values()).sort((a, b) => a.name.localeCompare(b.name))
      setRoutes(sortedRoutes)
      
    } catch (err) {
      console.error('Error loading data:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadPAPDetails = async (pap) => {
    try {
      const { data, error } = await supabase
        .from('households')
        .select(`*, beneficiaries (*), banking_details (*), household_assets (*)`)
        .eq('id', pap.id)
        .single()
      if (error) throw error
      return data
    } catch (err) {
      console.error('Error loading PAP details:', err)
      return pap
    }
  }

  const stats = {
    total: households.length,
    routes: routes.length,
    verified: households.filter(h => h.verification_status === 'verified' || h.approval_status === 'approved').length,
    withGPS: households.filter(h => h.latitude && h.longitude).length
  }

  const ruralRoutes = routes.filter(r => r.type === 'Rural')
  const urbanRoutes = routes.filter(r => r.type === 'Urban')

  const filteredPAPs = selectedRoute 
    ? households.filter(h => {
        if (h.route_name !== selectedRoute.name) return false
        if (!searchQuery) return true
        const search = searchQuery.toLowerCase()
        return (
          h.household_head_first_name?.toLowerCase().includes(search) ||
          h.household_head_surname?.toLowerCase().includes(search) ||
          h.id_number?.toLowerCase().includes(search) ||
          h.file_number?.toLowerCase().includes(search)
        )
      })
    : []

  const handleSelectRoute = (route) => {
    setSelectedRoute(route)
    setSearchQuery('')
    setView('paps')
  }

  const handleSelectPAP = async (h) => {
    const fullData = await loadPAPDetails(h)
    setSelectedHousehold(fullData)
    setEditedData({ ...fullData })
    setEditMode(false)
    setActiveTab('details')
    setView('detail')
  }

  const handleBack = () => {
    if (view === 'detail') {
      setSelectedHousehold(null)
      setView('paps')
    } else if (view === 'paps') {
      setSelectedRoute(null)
      setView('routes')
    }
  }

  const handleFieldChange = (field, value) => {
    setEditedData(prev => ({ ...prev, [field]: value }))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const { error } = await supabase
        .from('households')
        .update({
          household_head_first_name: editedData.household_head_first_name,
          household_head_surname: editedData.household_head_surname,
          gender: editedData.gender,
          id_number: editedData.id_number,
          cellphone_no: editedData.cellphone_no,
          file_number: editedData.file_number,
          occupation_of_pap: editedData.occupation_of_pap,
          community_council: editedData.community_council,
          photograph_of_pap_url: editedData.photograph_of_pap_url,
          id_document_url: editedData.id_document_url,
          asset_photo_url: editedData.asset_photo_url,
          map_url: editedData.map_url,
          verification_status: editedData.verification_status,
        })
        .eq('id', editedData.id)

      if (error) throw error

      await loadData()
      const updated = households.find(h => h.id === editedData.id)
      if (updated) setSelectedHousehold(updated)
      setEditMode(false)
      alert('Changes saved successfully!')
    } catch (err) {
      console.error('Save error:', err)
      alert('Error saving: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const handlePhotoUpload = async (field, file) => {
    if (!file) return
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${selectedHousehold.id}_${field}_${Date.now()}.${fileExt}`
      const filePath = `photos/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('cims-documents')
        .upload(filePath, file, { upsert: true })

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('cims-documents')
        .getPublicUrl(filePath)

      await supabase.from('households').update({ [field]: publicUrl }).eq('id', selectedHousehold.id)

      setEditedData(prev => ({ ...prev, [field]: publicUrl }))
      setSelectedHousehold(prev => ({ ...prev, [field]: publicUrl }))
      alert('Photo uploaded!')
    } catch (err) {
      console.error('Upload error:', err)
      alert('Upload error: ' + err.message)
    }
  }

  const handlePrint = () => {
    const data = editedData.id ? editedData : selectedHousehold
    const printWindow = window.open('', '_blank')
    printWindow.document.write(generatePrintHTML(data))
    printWindow.document.close()
    setTimeout(() => printWindow.print(), 500)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: colors.bgLight }}>
      {/* Header - 4D Dark Navy */}
      <header style={{ 
        background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.primaryDark} 100%)`,
        padding: '0 20px', 
        flexShrink: 0, 
        zIndex: 100,
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '60px', maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            {view !== 'routes' && (
              <button onClick={handleBack} style={{ 
                display: 'flex', alignItems: 'center', gap: '4px', padding: '8px 14px', 
                backgroundColor: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', 
                borderRadius: '8px', color: 'white', cursor: 'pointer', fontSize: '13px', fontWeight: '500',
                transition: 'all 0.2s'
              }}
              onMouseOver={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.2)'}
              onMouseOut={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'}>
                <ChevronLeft size={18} /> Back
              </button>
            )}
            <div style={{ 
              width: '40px', height: '40px', 
              backgroundColor: colors.accent, 
              borderRadius: '10px', 
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(140, 198, 63, 0.3)'
            }}>
              <img src="/logo-llwdp.png" alt="CIMS" style={{ width: '30px', height: '30px', objectFit: 'contain' }} onError={(e) => { e.target.style.display = 'none' }} />
            </div>
            <div>
              <h1 style={{ color: 'white', fontSize: '18px', fontWeight: '700', margin: 0, letterSpacing: '-0.5px' }}>CIMS</h1>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '11px', margin: 0 }}>Asset Registration & Verification</p>
            </div>
            {selectedRoute && view !== 'routes' && (
              <div style={{ marginLeft: '8px', padding: '6px 14px', backgroundColor: colors.accent, borderRadius: '6px' }}>
                <span style={{ color: colors.primaryDark, fontSize: '13px', fontWeight: '600' }}>{selectedRoute.name}</span>
              </div>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ 
              width: '38px', height: '38px', borderRadius: '50%', 
              background: `linear-gradient(135deg, ${colors.accent} 0%, ${colors.accentHover} 100%)`,
              color: colors.primaryDark, 
              display: 'flex', alignItems: 'center', justifyContent: 'center', 
              fontSize: '14px', fontWeight: '700',
              boxShadow: '0 2px 8px rgba(140, 198, 63, 0.3)'
            }}>
              {user?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U'}
            </div>
            <div className="user-info" style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ color: 'white', fontSize: '14px', fontWeight: '500' }}>{user?.full_name}</span>
              <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '11px' }}>{user?.role}</span>
            </div>
            <button onClick={() => { logout(); window.location.href = '/login' }} 
              style={{ padding: '8px', backgroundColor: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '8px', color: 'rgba(255,255,255,0.8)', cursor: 'pointer', transition: 'all 0.2s' }}
              onMouseOver={e => e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.3)'}
              onMouseOut={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'}>
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ flex: 1, overflow: 'auto', padding: '24px' }}>
        <div style={{ maxWidth: '1300px', margin: '0 auto' }}>
          
          {/* ROUTES VIEW */}
          {view === 'routes' && (
            <>
              {/* Stats Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                <StatCard label="Total PAPs" value={stats.total} color={colors.primary} icon={Users} />
                <StatCard label="Routes" value={stats.routes} color={colors.accent} iconComponent={MapIcon} />
                <StatCard label="Verified" value={stats.verified} color={colors.success} icon={Check} />
                <StatCard label="With GPS" value={stats.withGPS} color={colors.warning} icon={MapPin} />
              </div>

              {/* Routes Card */}
              <div style={{ 
                backgroundColor: colors.bgCard, 
                borderRadius: '16px', 
                padding: '24px', 
                border: `1px solid ${colors.border}`,
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
              }}>
                <h2 style={{ 
                  fontSize: '18px', fontWeight: '700', color: colors.textDark, 
                  margin: '0 0 20px 0', display: 'flex', alignItems: 'center', gap: '10px' 
                }}>
                  <div style={{ padding: '8px', backgroundColor: `${colors.primary}10`, borderRadius: '8px' }}>
                    <MapIcon size={22} color={colors.primary} />
                  </div>
                  Select a Route
                </h2>

                {loading ? (
                  <div style={{ padding: '60px', textAlign: 'center' }}>
                    <div style={{ 
                      width: '44px', height: '44px', 
                      border: `3px solid ${colors.border}`, borderTopColor: colors.accent, 
                      borderRadius: '50%', margin: '0 auto', animation: 'spin 1s linear infinite' 
                    }} />
                    <p style={{ color: colors.textMuted, marginTop: '16px', fontSize: '14px' }}>Loading routes...</p>
                  </div>
                ) : routes.length === 0 ? (
                  <div style={{ padding: '60px', textAlign: 'center', color: colors.textMuted }}>
                    <MapIcon size={48} color={colors.border} />
                    <p style={{ marginTop: '12px' }}>No routes found. Please import data first.</p>
                    <button onClick={loadData} style={{ 
                      marginTop: '16px', padding: '10px 20px', 
                      backgroundColor: colors.accent, color: colors.primaryDark, 
                      border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600'
                    }}>
                      Reload Data
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Rural Routes */}
                    {ruralRoutes.length > 0 && (
                      <div style={{ marginBottom: '28px' }}>
                        <h3 style={{ 
                          fontSize: '13px', fontWeight: '700', color: colors.rural, 
                          margin: '0 0 14px 0', display: 'flex', alignItems: 'center', gap: '8px',
                          textTransform: 'uppercase', letterSpacing: '0.5px'
                        }}>
                          <TreePine size={18} /> Rural Routes ({ruralRoutes.length})
                        </h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '12px' }}>
                          {ruralRoutes.map(route => (
                            <RouteCard key={route.name} route={route} onClick={() => handleSelectRoute(route)} type="rural" />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Urban Routes */}
                    {urbanRoutes.length > 0 && (
                      <div>
                        <h3 style={{ 
                          fontSize: '13px', fontWeight: '700', color: colors.urban, 
                          margin: '0 0 14px 0', display: 'flex', alignItems: 'center', gap: '8px',
                          textTransform: 'uppercase', letterSpacing: '0.5px'
                        }}>
                          <Building2 size={18} /> Urban Routes ({urbanRoutes.length})
                        </h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '12px' }}>
                          {urbanRoutes.map(route => (
                            <RouteCard key={route.name} route={route} onClick={() => handleSelectRoute(route)} type="urban" />
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </>
          )}

          {/* PAPS LIST VIEW */}
          {view === 'paps' && selectedRoute && (
            <div style={{ 
              backgroundColor: colors.bgCard, 
              borderRadius: '16px', 
              border: `1px solid ${colors.border}`, 
              overflow: 'hidden',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
            }}>
              <div style={{ 
                padding: '20px 24px', 
                borderBottom: `1px solid ${colors.border}`, 
                background: `linear-gradient(135deg, ${colors.bgLight} 0%, ${colors.bgCard} 100%)`
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
                  <div>
                    <h2 style={{ fontSize: '20px', fontWeight: '700', color: colors.textDark, margin: 0 }}>{selectedRoute.name}</h2>
                    <p style={{ fontSize: '14px', color: colors.textMuted, margin: '4px 0 0 0' }}>
                      <span style={{ 
                        color: selectedRoute.type === 'Rural' ? colors.rural : colors.urban, 
                        fontWeight: '600' 
                      }}>{selectedRoute.type}</span> • {filteredPAPs.length} PAPs
                    </p>
                  </div>
                  <div style={{ position: 'relative', width: '260px' }}>
                    <Search size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: colors.textLight }} />
                    <input
                      type="text"
                      placeholder="Search PAPs..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      style={{ 
                        width: '100%', padding: '12px 14px 12px 44px', 
                        backgroundColor: colors.bgCard, 
                        border: `1px solid ${colors.border}`, 
                        borderRadius: '10px', fontSize: '14px', outline: 'none', boxSizing: 'border-box',
                        transition: 'border-color 0.2s'
                      }}
                      onFocus={e => e.target.style.borderColor = colors.accent}
                      onBlur={e => e.target.style.borderColor = colors.border}
                    />
                  </div>
                </div>
              </div>

              <div style={{ maxHeight: '65vh', overflowY: 'auto' }}>
                {filteredPAPs.length === 0 ? (
                  <div style={{ padding: '60px', textAlign: 'center', color: colors.textMuted }}>
                    <Users size={48} style={{ opacity: 0.3 }} />
                    <p style={{ marginTop: '12px' }}>No PAPs found</p>
                  </div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ backgroundColor: colors.bgLight }}>
                        {['PAP Name', 'File No.', 'Land Use', 'GPS', 'Status', ''].map((header, i) => (
                          <th key={i} style={{ 
                            padding: '14px 20px', textAlign: i === 5 ? 'right' : 'left', 
                            fontSize: '11px', fontWeight: '700', color: colors.textMuted, 
                            textTransform: 'uppercase', letterSpacing: '0.5px',
                            borderBottom: `1px solid ${colors.border}`
                          }}>{header}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPAPs.map((pap) => (
                        <tr key={pap.id} onClick={() => handleSelectPAP(pap)} 
                          style={{ cursor: 'pointer', borderBottom: `1px solid ${colors.border}`, transition: 'background-color 0.15s' }}
                          onMouseOver={(e) => e.currentTarget.style.backgroundColor = colors.bgLight}
                          onMouseOut={(e) => e.currentTarget.style.backgroundColor = colors.bgCard}>
                          <td style={{ padding: '16px 20px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <div style={{ 
                                width: '40px', height: '40px', borderRadius: '10px', 
                                background: `linear-gradient(135deg, ${colors.primary}15 0%, ${colors.primary}25 100%)`,
                                color: colors.primary, 
                                display: 'flex', alignItems: 'center', justifyContent: 'center', 
                                fontSize: '13px', fontWeight: '700' 
                              }}>
                                {pap.household_head_first_name?.[0]}{pap.household_head_surname?.[0]}
                              </div>
                              <span style={{ fontWeight: '600', color: colors.textDark, fontSize: '14px' }}>
                                {pap.household_head_first_name} {pap.household_head_surname}
                              </span>
                            </div>
                          </td>
                          <td style={{ padding: '16px 20px', color: colors.textMuted, fontSize: '14px' }}>{pap.file_number || '-'}</td>
                          <td style={{ padding: '16px 20px', color: colors.textMuted, fontSize: '14px' }}>{pap.land_use || '-'}</td>
                          <td style={{ padding: '16px 20px' }}>
                            {pap.latitude ? (
                              <span style={{ color: colors.success, fontSize: '13px', fontWeight: '600' }}>✓ Yes</span>
                            ) : (
                              <span style={{ color: colors.textLight, fontSize: '13px' }}>-</span>
                            )}
                          </td>
                          <td style={{ padding: '16px 20px' }}>
                            <span style={{ 
                              padding: '5px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '600',
                              backgroundColor: pap.verification_status === 'verified' ? `${colors.success}20` : `${colors.warning}20`,
                              color: pap.verification_status === 'verified' ? colors.success : colors.warning
                            }}>
                              {pap.verification_status || 'pending'}
                            </span>
                          </td>
                          <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                            <ChevronRight size={20} color={colors.textLight} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* PAP DETAIL VIEW */}
          {view === 'detail' && selectedHousehold && (
            <DetailView
              household={selectedHousehold}
              editedData={editedData}
              editMode={editMode}
              isAdmin={isAdmin}
              saving={saving}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              setEditMode={setEditMode}
              setEditedData={setEditedData}
              onFieldChange={handleFieldChange}
              onSave={handleSave}
              onPhotoUpload={handlePhotoUpload}
              onPrint={handlePrint}
              colors={colors}
            />
          )}
        </div>
      </main>

      {/* Footer - 4D Branded */}
      <footer style={{ 
        backgroundColor: colors.bgCard, 
        borderTop: `1px solid ${colors.border}`, 
        padding: '12px 20px', 
        flexShrink: 0 
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
          <img src="/logo-4d.png" alt="4D" style={{ height: '20px', opacity: 0.7 }} onError={(e) => e.target.style.display = 'none'} />
          <span style={{ fontSize: '12px', color: colors.textLight }}>
            Developed by <span style={{ color: colors.accent, fontWeight: '600' }}>4D Climate Solutions</span> for LLWDSP III
          </span>
        </div>
      </footer>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @media (max-width: 768px) { .user-info { display: none !important; } }
        ::-webkit-scrollbar { width: 8px; }
        ::-webkit-scrollbar-track { background: ${colors.bgLight}; }
        ::-webkit-scrollbar-thumb { background: ${colors.border}; border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: ${colors.textLight}; }
      `}</style>
    </div>
  )
}

// Route Card Component
function RouteCard({ route, onClick, type }) {
  const isRural = type === 'rural'
  const cardColors = isRural 
    ? { bg: '#ecfdf5', border: '#a7f3d0', text: colors.rural, hover: '#dcfce7' }
    : { bg: '#f5f3ff', border: '#c4b5fd', text: colors.urban, hover: '#ede9fe' }
  
  return (
    <div onClick={onClick} 
      style={{ 
        padding: '18px 20px', 
        backgroundColor: cardColors.bg, 
        border: `1px solid ${cardColors.border}`, 
        borderRadius: '12px', 
        cursor: 'pointer', 
        transition: 'all 0.2s ease'
      }}
      onMouseOver={(e) => { 
        e.currentTarget.style.transform = 'translateY(-2px)' 
        e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.08)'
        e.currentTarget.style.backgroundColor = cardColors.hover
      }}
      onMouseOut={(e) => { 
        e.currentTarget.style.transform = 'none' 
        e.currentTarget.style.boxShadow = 'none'
        e.currentTarget.style.backgroundColor = cardColors.bg
      }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <p style={{ fontWeight: '600', color: colors.textDark, margin: 0, fontSize: '14px' }}>{route.name}</p>
          <p style={{ fontSize: '13px', color: cardColors.text, margin: '4px 0 0 0', fontWeight: '600' }}>{route.pap_count} PAPs</p>
        </div>
        <div style={{ 
          width: '32px', height: '32px', borderRadius: '8px', 
          backgroundColor: `${cardColors.text}15`,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <ChevronRight size={18} color={cardColors.text} />
        </div>
      </div>
    </div>
  )
}

// Stat Card Component
function StatCard({ label, value, color, icon: Icon, iconComponent: IconComponent }) {
  return (
    <div style={{ 
      backgroundColor: colors.bgCard, 
      borderRadius: '14px', 
      padding: '20px 24px', 
      border: `1px solid ${colors.border}`,
      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      transition: 'all 0.2s ease'
    }}
    onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.08)' }}
    onMouseOut={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <p style={{ fontSize: '12px', fontWeight: '600', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>{label}</p>
          <p style={{ fontSize: '32px', fontWeight: '800', color: colors.textDark, margin: '4px 0 0 0', letterSpacing: '-1px' }}>{value}</p>
        </div>
        <div style={{ 
          padding: '14px', borderRadius: '12px', 
          background: `linear-gradient(135deg, ${color}15 0%, ${color}25 100%)`
        }}>
          {IconComponent ? <IconComponent size={24} color={color} /> : Icon && <Icon size={24} color={color} />}
        </div>
      </div>
    </div>
  )
}

// Detail View Component
function DetailView({ household, editedData, editMode, isAdmin, saving, activeTab, setActiveTab, setEditMode, setEditedData, onFieldChange, onSave, onPhotoUpload, onPrint, colors }) {
  const data = editMode ? editedData : household

  return (
    <div>
      {/* Header */}
      <div style={{ 
        backgroundColor: colors.bgCard, 
        borderRadius: '14px', 
        padding: '20px 24px', 
        marginBottom: '20px', 
        border: `1px solid ${colors.border}`,
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' 
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ 
            width: '56px', height: '56px', borderRadius: '14px', 
            background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.primaryDark} 100%)`,
            color: 'white', 
            display: 'flex', alignItems: 'center', justifyContent: 'center', 
            fontSize: '20px', fontWeight: '700',
            boxShadow: '0 4px 12px rgba(26, 58, 74, 0.2)'
          }}>
            {household.household_head_first_name?.[0]}{household.household_head_surname?.[0]}
          </div>
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: '700', color: colors.textDark, margin: 0 }}>
              {data.household_head_first_name} {data.household_head_surname}
            </h2>
            <p style={{ fontSize: '14px', color: colors.textMuted, margin: '4px 0 0 0' }}>
              {household.route_name} • {household.land_use || 'N/A'}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          {isAdmin && !editMode && (
            <button onClick={() => setEditMode(true)} style={{ 
              display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 18px', 
              backgroundColor: colors.warning, color: 'white', 
              border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '600', cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(245, 158, 11, 0.3)'
            }}>
              <Edit2 size={16} /> Edit
            </button>
          )}
          {editMode && (
            <>
              <button onClick={onSave} disabled={saving} style={{ 
                display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 18px', 
                backgroundColor: colors.success, color: 'white', 
                border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '600', cursor: 'pointer',
                opacity: saving ? 0.7 : 1
              }}>
                <Save size={16} /> {saving ? 'Saving...' : 'Save'}
              </button>
              <button onClick={() => { setEditMode(false); setEditedData({ ...household }) }} style={{ 
                display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 18px', 
                backgroundColor: colors.error, color: 'white', 
                border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '600', cursor: 'pointer'
              }}>
                <XCircle size={16} /> Cancel
              </button>
            </>
          )}
          <button onClick={onPrint} style={{ 
            display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 18px', 
            backgroundColor: colors.primary, color: 'white', 
            border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '600', cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(26, 58, 74, 0.2)'
          }}>
            <Printer size={16} /> Print
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ 
        display: 'flex', gap: '4px', marginBottom: '20px', 
        backgroundColor: colors.bgCard, padding: '6px', borderRadius: '12px', 
        border: `1px solid ${colors.border}` 
      }}>
        {[
          { id: 'details', label: 'Details', icon: User },
          { id: 'valuation', label: 'Valuation', icon: FileText },
          { id: 'documents', label: 'Documents', icon: Camera },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{ 
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', 
            padding: '12px 16px', 
            background: activeTab === tab.id ? `linear-gradient(135deg, ${colors.primary} 0%, ${colors.primaryDark} 100%)` : 'transparent', 
            color: activeTab === tab.id ? 'white' : colors.textMuted, 
            border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '600', cursor: 'pointer',
            transition: 'all 0.2s'
          }}>
            <tab.icon size={18} /> {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === 'details' && (
        <div style={{ display: 'grid', gap: '20px' }}>
          <Card title="PAP Information" icon={User} color={colors.primary} colors={colors}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
              <Field label="First Name" value={data.household_head_first_name} field="household_head_first_name" editMode={editMode && isAdmin} onChange={onFieldChange} colors={colors} />
              <Field label="Surname" value={data.household_head_surname} field="household_head_surname" editMode={editMode && isAdmin} onChange={onFieldChange} colors={colors} />
              <Field label="File Number" value={data.file_number} field="file_number" editMode={editMode} onChange={onFieldChange} colors={colors} />
              <Field label="ID Number" value={data.id_number} field="id_number" editMode={editMode} onChange={onFieldChange} colors={colors} />
              <Field label="Phone" value={data.cellphone_no} field="cellphone_no" editMode={editMode} onChange={onFieldChange} colors={colors} />
              <Field label="Gender" value={data.gender} field="gender" editMode={editMode && isAdmin} onChange={onFieldChange} colors={colors} />
            </div>
          </Card>

          <Card title="Location" icon={MapPin} color={colors.accent} colors={colors}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
              <Field label="Route" value={data.route_name} colors={colors} />
              <Field label="Route Type" value={data.route_type} colors={colors} />
              <Field label="Land Use" value={data.land_use} colors={colors} />
              <Field label="GPS Coordinates" value={data.gps_coordinates} colors={colors} />
              <Field label="Latitude" value={data.latitude} colors={colors} />
              <Field label="Longitude" value={data.longitude} colors={colors} />
            </div>
          </Card>

          {data.banking_details?.length > 0 && (
            <Card title="Banking Details" icon={CreditCard} color={colors.urban} colors={colors}>
              {data.banking_details.map((bank) => (
                <div key={bank.id} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '14px' }}>
                  <Field label="Bank" value={bank.bank_name} colors={colors} />
                  <Field label="Account No." value={bank.account_number} colors={colors} />
                  <Field label="Account Holder" value={bank.account_holder_name} colors={colors} />
                </div>
              ))}
            </Card>
          )}
        </div>
      )}

      {activeTab === 'valuation' && (
        <div style={{ display: 'grid', gap: '20px' }}>
          <Card title="Affected Area & Compensation" icon={Home} color={colors.primary} colors={colors}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
              <Field label="Permanent Area (sqm)" value={data.affected_area_perm} colors={colors} />
              <Field label="Temporary Area (sqm)" value={data.affected_area_temp} colors={colors} />
              <Field label="Perm. Rate (M/sqm)" value={data.rate_perm} colors={colors} />
              <Field label="Temp. Rate (M/sqm)" value={data.rate_temp} colors={colors} />
              <Field label="Disturbance Allowance (M)" value={data.disturbance_allowance} colors={colors} />
              <Field label="Total Compensation (M)" value={data.total_compensation} highlight colors={colors} />
            </div>
          </Card>

          {data.other_assets_json && (
            <Card title="Other Affected Assets" icon={TreePine} color={colors.rural} colors={colors}>
              <OtherAssets assets={data.other_assets_json} colors={colors} />
            </Card>
          )}
        </div>
      )}

      {activeTab === 'documents' && (
        <Card title="Documents & Photos" icon={Camera} color={colors.primary} colors={colors}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <PhotoFrame label="PAP Photo" field="photograph_of_pap_url" url={data.photograph_of_pap_url} onUpload={onPhotoUpload} colors={colors} />
            <PhotoFrame label="ID Document" field="id_document_url" url={data.id_document_url} onUpload={onPhotoUpload} colors={colors} />
            <PhotoFrame label="Asset Photo" field="asset_photo_url" url={data.asset_photo_url} onUpload={onPhotoUpload} colors={colors} />
            <PhotoFrame label="Location Map" field="map_url" url={data.map_url} onUpload={onPhotoUpload} colors={colors} />
          </div>
        </Card>
      )}
    </div>
  )
}

// Card wrapper
function Card({ title, icon: Icon, color, colors, children }) {
  return (
    <div style={{ 
      backgroundColor: colors.bgCard, 
      borderRadius: '14px', 
      padding: '20px 24px', 
      border: `1px solid ${colors.border}`,
      boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
    }}>
      <h3 style={{ 
        fontSize: '15px', fontWeight: '700', color: color, 
        margin: '0 0 18px 0', display: 'flex', alignItems: 'center', gap: '10px' 
      }}>
        <div style={{ padding: '6px', backgroundColor: `${color}15`, borderRadius: '8px' }}>
          <Icon size={18} />
        </div>
        {title}
      </h3>
      {children}
    </div>
  )
}

// Field component
function Field({ label, value, field, editMode, onChange, highlight, colors }) {
  const displayValue = value !== null && value !== undefined ? String(value) : ''
  
  return (
    <div>
      <p style={{ fontSize: '12px', color: colors.textMuted, margin: '0 0 6px 0', fontWeight: '500' }}>{label}</p>
      {editMode && onChange ? (
        <input type="text" value={displayValue} onChange={(e) => onChange(field, e.target.value)} 
          style={{ 
            width: '100%', padding: '10px 14px', 
            border: `2px solid ${colors.accent}`, borderRadius: '8px', 
            fontSize: '14px', outline: 'none', boxSizing: 'border-box', 
            backgroundColor: `${colors.accent}10`,
            transition: 'all 0.2s'
          }} />
      ) : (
        <p style={{ 
          fontSize: '14px', fontWeight: highlight ? '700' : '600', 
          color: displayValue ? (highlight ? colors.accent : colors.textDark) : colors.textLight, 
          margin: 0 
        }}>
          {displayValue || 'N/A'}
        </p>
      )}
    </div>
  )
}

// Other Assets display
function OtherAssets({ assets, colors }) {
  let parsed = []
  try {
    parsed = typeof assets === 'string' ? JSON.parse(assets) : assets
  } catch (e) {
    return <p style={{ color: colors.textMuted, fontSize: '14px' }}>No other assets</p>
  }
  
  if (!parsed || parsed.length === 0) {
    return <p style={{ color: colors.textMuted, fontSize: '14px' }}>No other assets recorded</p>
  }
  
  return (
    <div style={{ display: 'grid', gap: '10px' }}>
      {parsed.map((asset, idx) => (
        <div key={idx} style={{ 
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '12px 16px', backgroundColor: colors.bgLight, borderRadius: '10px', fontSize: '14px' 
        }}>
          <span style={{ fontWeight: '600', color: colors.textDark }}>{asset.type}</span>
          <span style={{ color: colors.textMuted }}>
            Qty: {asset.quantity} | Rate: M{asset.rate} | Value: <span style={{ fontWeight: '600', color: colors.accent }}>M{asset.value}</span>
          </span>
        </div>
      ))}
    </div>
  )
}

// Photo Frame
function PhotoFrame({ label, field, url, onUpload, colors }) {
  const inputRef = useRef(null)
  
  return (
    <div style={{ border: `1px solid ${colors.border}`, borderRadius: '12px', overflow: 'hidden' }}>
      <div style={{ 
        padding: '10px 14px', backgroundColor: colors.bgLight, 
        borderBottom: `1px solid ${colors.border}`, 
        display: 'flex', alignItems: 'center', justifyContent: 'space-between' 
      }}>
        <span style={{ fontSize: '13px', fontWeight: '600', color: colors.textDark }}>{label}</span>
        <button onClick={() => inputRef.current?.click()} style={{ 
          padding: '6px 10px', backgroundColor: colors.warning, 
          border: 'none', borderRadius: '6px', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: '4px'
        }}>
          <Edit2 size={12} color="white" />
        </button>
        <input ref={inputRef} type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && onUpload(field, e.target.files[0])} style={{ display: 'none' }} />
      </div>
      <div style={{ 
        height: '140px', display: 'flex', alignItems: 'center', justifyContent: 'center', 
        padding: '12px', backgroundColor: colors.bgLight 
      }}>
        {url ? (
          <img src={url} alt={label} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: '8px' }} />
        ) : (
          <div style={{ textAlign: 'center', color: colors.textLight }}>
            <Upload size={28} style={{ opacity: 0.4 }} />
            <p style={{ fontSize: '12px', margin: '8px 0 0 0' }}>Click to upload</p>
          </div>
        )}
      </div>
    </div>
  )
}

// Print HTML Generator
function generatePrintHTML(data) {
  const otherAssets = data.other_assets_json ? (typeof data.other_assets_json === 'string' ? JSON.parse(data.other_assets_json) : data.other_assets_json) : []
  const assetsHtml = otherAssets.map(a => `<tr><td style="padding:6px 10px;border:1px solid #e2e8f0">${a.type}</td><td style="padding:6px 10px;border:1px solid #e2e8f0;text-align:center">${a.quantity}</td><td style="padding:6px 10px;border:1px solid #e2e8f0;text-align:right">M ${a.value}</td></tr>`).join('')
  
  return `<!DOCTYPE html><html><head><title>CIMS - ${data.household_head_first_name} ${data.household_head_surname}</title>
<style>
@page{size:A4;margin:12mm}
body{font-family:'Segoe UI',Arial,sans-serif;font-size:10pt;color:#1f2937;margin:0;padding:0}
.page{padding:8mm}
.header{display:flex;justify-content:space-between;align-items:center;border-bottom:3px solid #1a3a4a;padding-bottom:12px;margin-bottom:16px}
.header img{height:40px}
.title{text-align:center;margin-bottom:18px}
.title h1{font-size:18pt;color:#1a3a4a;margin:0;font-weight:700}
.title p{margin:4px 0 0 0;color:#6b7280}
.section{margin-bottom:14px}
.section-title{font-size:11pt;font-weight:700;color:#1a3a4a;border-bottom:2px solid #8cc63f;padding-bottom:4px;margin-bottom:10px}
table{width:100%;border-collapse:collapse;font-size:9pt}
td{padding:6px 10px;border:1px solid #e2e8f0}
.label{background:#f8fafc;font-weight:600;width:35%;color:#1a3a4a}
.page-break{page-break-after:always}
.photo-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.photo-box{border:1px solid #e2e8f0;border-radius:8px;overflow:hidden}
.photo-box-title{padding:8px 12px;background:#f8fafc;font-weight:600;font-size:9pt;border-bottom:1px solid #e2e8f0;color:#1a3a4a}
.photo-box-content{height:120px;display:flex;align-items:center;justify-content:center;background:#f8fafc}
.photo-box-content img{max-width:100%;max-height:100%;object-fit:contain}
.signature{margin-top:24px;display:flex;gap:30px}
.signature>div{flex:1}
.sig-line{border-bottom:1px solid #1a3a4a;height:35px;margin-bottom:4px}
</style></head><body>
<div class="page">
<div class="header">
<img src="/logo-lesotho.png" onerror="this.style.display='none'">
<img src="/logo-llwdp.png" onerror="this.style.display='none'">
<img src="/logo-afdb.png" onerror="this.style.display='none'">
<img src="/logo-4d.png" onerror="this.style.display='none'">
</div>
<div class="title"><h1>Asset Verification Form</h1><p>Foromo E Netefatso Ea Thepa • ${data.route_name || ''}</p></div>

<div class="section">
<div class="section-title">PAP Information / Tlhahisoleseling Ea Mong'a Thepa</div>
<table>
<tr><td class="label">Name / Lebitso</td><td>${data.household_head_first_name || ''} ${data.household_head_surname || ''}</td><td class="label">File No.</td><td>${data.file_number || '-'}</td></tr>
<tr><td class="label">ID Number / Nomoro Ea ID</td><td>${data.id_number || '-'}</td><td class="label">Phone / Mohala</td><td>${data.cellphone_no || '-'}</td></tr>
<tr><td class="label">Route</td><td>${data.route_name || '-'}</td><td class="label">Land Use</td><td>${data.land_use || '-'}</td></tr>
<tr><td class="label">GPS</td><td colspan="3">${data.gps_coordinates || '-'}</td></tr>
</table>
</div>

<div class="section">
<div class="section-title">Valuation / Tlhahlobo Ea Boleng</div>
<table>
<tr><td class="label">Permanent Area (sqm)</td><td>${data.affected_area_perm || '-'}</td><td class="label">Temporary Area (sqm)</td><td>${data.affected_area_temp || '-'}</td></tr>
<tr><td class="label">Disturbance Allowance</td><td>M ${data.disturbance_allowance || '-'}</td><td class="label">Total Compensation</td><td style="font-weight:700;color:#8cc63f">M ${data.total_compensation || '-'}</td></tr>
</table>
</div>

${otherAssets.length > 0 ? `
<div class="section">
<div class="section-title">Other Assets / Thepa E Nngoe</div>
<table><tr><th style="padding:6px 10px;border:1px solid #e2e8f0;background:#f8fafc;text-align:left;font-weight:600">Asset Type</th><th style="padding:6px 10px;border:1px solid #e2e8f0;background:#f8fafc;font-weight:600">Qty</th><th style="padding:6px 10px;border:1px solid #e2e8f0;background:#f8fafc;text-align:right;font-weight:600">Value</th></tr>${assetsHtml}</table>
</div>` : ''}
</div>

<div class="page-break"></div>

<div class="page">
<div class="header">
<img src="/logo-lesotho.png" style="height:35px" onerror="this.style.display='none'">
<div style="text-align:center"><strong style="color:#1a3a4a;font-size:12pt">Documents & Photos</strong><br><span style="font-size:9pt;color:#6b7280">${data.household_head_first_name || ''} ${data.household_head_surname || ''}</span></div>
<img src="/logo-4d.png" style="height:30px" onerror="this.style.display='none'">
</div>

<div class="photo-grid">
<div class="photo-box"><div class="photo-box-title">PAP Photograph</div><div class="photo-box-content">${data.photograph_of_pap_url ? `<img src="${data.photograph_of_pap_url}">` : '<span style="color:#9ca3af">No photo</span>'}</div></div>
<div class="photo-box"><div class="photo-box-title">ID Document</div><div class="photo-box-content">${data.id_document_url ? `<img src="${data.id_document_url}">` : '<span style="color:#9ca3af">No document</span>'}</div></div>
<div class="photo-box"><div class="photo-box-title">Asset Photo</div><div class="photo-box-content">${data.asset_photo_url ? `<img src="${data.asset_photo_url}">` : '<span style="color:#9ca3af">No photo</span>'}</div></div>
<div class="photo-box"><div class="photo-box-title">Location Map</div><div class="photo-box-content">${data.map_url ? `<img src="${data.map_url}">` : '<span style="color:#9ca3af">No map</span>'}</div></div>
</div>

<div class="signature">
<div><p style="font-size:9pt;color:#6b7280;margin:0 0 6px">PAP Signature / Tekeno Ea Mong'a Thepa:</p><div class="sig-line"></div></div>
<div><p style="font-size:9pt;color:#6b7280;margin:0 0 6px">Verified By / Netefalitsoe Ke:</p><div class="sig-line"></div></div>
<div><p style="font-size:9pt;color:#6b7280;margin:0 0 6px">Date / Letsatsi:</p><div class="sig-line"></div></div>
</div>

<div style="margin-top:20px;text-align:center;padding-top:12px;border-top:1px solid #e2e8f0">
<p style="font-size:8pt;color:#9ca3af;margin:0">LLWDSP III - Lesotho Lowlands Water Supply & Sanitation Project Phase III</p>
<p style="font-size:8pt;color:#8cc63f;margin:4px 0 0 0;font-weight:600">4D Climate Solutions</p>
</div>
</div>
</body></html>`
}
