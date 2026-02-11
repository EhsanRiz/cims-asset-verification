import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../App'
import { supabase } from '../lib/supabase'
import { 
  Menu, X, LogOut, Search, Users, Home, ChevronRight, ChevronLeft,
  CreditCard, FileText, User, Printer, Edit2, 
  Save, Upload, MapPin, Camera, Check, XCircle, MapIcon, Building2, TreePine
} from 'lucide-react'

export default function Dashboard() {
  const { user, logout } = useAuth()
  const [households, setHouseholds] = useState([])
  const [routes, setRoutes] = useState([])
  const [loading, setLoading] = useState(true)
  
  // Navigation state
  const [view, setView] = useState('routes') // 'routes' | 'paps' | 'detail'
  const [selectedRoute, setSelectedRoute] = useState(null)
  const [selectedHousehold, setSelectedHousehold] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  
  // Detail view state
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
      console.log('Loading households...')
      
      // First, load just households without joins to ensure we get route_name
      const { data: householdData, error } = await supabase
        .from('households')
        .select('*')
        .order('household_head_surname', { ascending: true })
      
      if (error) {
        console.error('Supabase error:', error)
        throw error
      }
      
      console.log('Loaded households:', householdData?.length)
      console.log('Sample household:', householdData?.[0])
      
      // Check route_name in data
      const withRoutes = householdData?.filter(h => h.route_name) || []
      console.log('Households with route_name:', withRoutes.length)
      
      setHouseholds(householdData || [])
      
      // Extract unique routes from households
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
      
      console.log('Unique routes found:', routeMap.size)
      console.log('Routes:', Array.from(routeMap.keys()))
      
      // Sort routes by name
      const sortedRoutes = Array.from(routeMap.values()).sort((a, b) => a.name.localeCompare(b.name))
      setRoutes(sortedRoutes)
      
    } catch (err) {
      console.error('Error loading data:', err)
    } finally {
      setLoading(false)
    }
  }

  // Load related data when selecting a PAP
  const loadPAPDetails = async (pap) => {
    try {
      const { data, error } = await supabase
        .from('households')
        .select(`
          *,
          beneficiaries (*),
          banking_details (*),
          household_assets (*)
        `)
        .eq('id', pap.id)
        .single()
      
      if (error) throw error
      return data
    } catch (err) {
      console.error('Error loading PAP details:', err)
      return pap
    }
  }

  // Stats
  const stats = {
    total: households.length,
    routes: routes.length,
    verified: households.filter(h => h.verification_status === 'verified' || h.approval_status === 'approved').length,
    withGPS: households.filter(h => h.latitude && h.longitude).length
  }

  // Group routes by type
  const ruralRoutes = routes.filter(r => r.type === 'Rural')
  const urbanRoutes = routes.filter(r => r.type === 'Urban')

  // Filter PAPs by selected route
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
    // Load full details including related data
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

  // Field change handlers
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
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: '#f5f7fa' }}>
      {/* Header */}
      <header style={{ backgroundColor: '#0088c4', padding: '0 16px', flexShrink: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '56px', maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {view !== 'routes' && (
              <button onClick={handleBack} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '8px 12px', backgroundColor: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '8px', color: 'white', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}>
                <ChevronLeft size={18} /> Back
              </button>
            )}
            <div style={{ width: '36px', height: '36px', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img src="/logo-llwdp.png" alt="CIMS" style={{ width: '28px', height: '28px', objectFit: 'contain' }} onError={(e) => e.target.style.display = 'none'} />
            </div>
            <div>
              <h1 style={{ color: 'white', fontSize: '16px', fontWeight: '600', margin: 0 }}>CIMS</h1>
              <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '11px', margin: 0 }}>Asset Registration & Verification</p>
            </div>
            {selectedRoute && view !== 'routes' && (
              <div style={{ marginLeft: '8px', padding: '4px 12px', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: '6px' }}>
                <span style={{ color: 'white', fontSize: '13px', fontWeight: '500' }}>{selectedRoute.name}</span>
              </div>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '34px', height: '34px', borderRadius: '50%', backgroundColor: '#8cc63f', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '600' }}>
              {user?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U'}
            </div>
            <span style={{ color: 'white', fontSize: '14px' }} className="user-name">{user?.full_name}</span>
            <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '11px', padding: '2px 8px', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '4px' }}>{user?.role}</span>
            <button onClick={() => { logout(); window.location.href = '/login' }} style={{ padding: '6px', backgroundColor: 'transparent', border: 'none', color: 'rgba(255,255,255,0.8)', cursor: 'pointer' }}>
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ flex: 1, overflow: 'auto', padding: '20px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          
          {/* ROUTES VIEW */}
          {view === 'routes' && (
            <>
              {/* Stats Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '20px' }}>
                <StatCard label="Total PAPs" value={stats.total} color="#0088c4" icon={Users} />
                <StatCard label="Routes" value={stats.routes} color="#8cc63f" icon={MapIcon} />
                <StatCard label="Verified" value={stats.verified} color="#16a34a" icon={Check} />
                <StatCard label="With GPS" value={stats.withGPS} color="#f59e0b" icon={MapPin} />
              </div>

              {/* Routes */}
              <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '20px', border: '1px solid #e5e7eb' }}>
                <h2 style={{ fontSize: '17px', fontWeight: '600', color: '#1f2937', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <MapIcon size={20} color="#0088c4" /> Select a Route
                </h2>

                {loading ? (
                  <div style={{ padding: '40px', textAlign: 'center' }}>
                    <div style={{ width: '36px', height: '36px', border: '3px solid #e5e7eb', borderTopColor: '#0088c4', borderRadius: '50%', margin: '0 auto', animation: 'spin 1s linear infinite' }} />
                    <p style={{ color: '#6b7280', marginTop: '12px', fontSize: '14px' }}>Loading routes...</p>
                  </div>
                ) : routes.length === 0 ? (
                  <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
                    <MapIcon size={40} style={{ opacity: 0.3, marginBottom: '8px' }} />
                    <p>No routes found. Please check if data is imported correctly.</p>
                    <p style={{ fontSize: '12px', marginTop: '8px' }}>Total households loaded: {households.length}</p>
                    <button onClick={loadData} style={{ marginTop: '12px', padding: '8px 16px', backgroundColor: '#0088c4', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                      Reload Data
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Rural Routes */}
                    {ruralRoutes.length > 0 && (
                      <div style={{ marginBottom: '20px' }}>
                        <h3 style={{ fontSize: '13px', fontWeight: '600', color: '#059669', margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          <TreePine size={16} /> Rural Routes ({ruralRoutes.length})
                        </h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '10px' }}>
                          {ruralRoutes.map(route => (
                            <RouteCard key={route.name} route={route} onClick={() => handleSelectRoute(route)} type="rural" />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Urban Routes */}
                    {urbanRoutes.length > 0 && (
                      <div>
                        <h3 style={{ fontSize: '13px', fontWeight: '600', color: '#7c3aed', margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          <Building2 size={16} /> Urban Routes ({urbanRoutes.length})
                        </h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '10px' }}>
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
            <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb', backgroundColor: '#f9fafb' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <h2 style={{ fontSize: '17px', fontWeight: '600', color: '#1f2937', margin: 0 }}>{selectedRoute.name}</h2>
                    <p style={{ fontSize: '13px', color: '#6b7280', margin: '2px 0 0 0' }}>
                      <span style={{ color: selectedRoute.type === 'Rural' ? '#059669' : '#7c3aed', fontWeight: '500' }}>{selectedRoute.type}</span> • {filteredPAPs.length} PAPs
                    </p>
                  </div>
                  <div style={{ position: 'relative', width: '220px' }}>
                    <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                    <input
                      type="text"
                      placeholder="Search PAPs..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      style={{ width: '100%', padding: '8px 10px 8px 34px', backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>
              </div>

              <div style={{ maxHeight: '65vh', overflowY: 'auto' }}>
                {filteredPAPs.length === 0 ? (
                  <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>No PAPs found</div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f9fafb' }}>
                        <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', borderBottom: '1px solid #e5e7eb' }}>PAP Name</th>
                        <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', borderBottom: '1px solid #e5e7eb' }}>File No.</th>
                        <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', borderBottom: '1px solid #e5e7eb' }}>Land Use</th>
                        <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', borderBottom: '1px solid #e5e7eb' }}>GPS</th>
                        <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', borderBottom: '1px solid #e5e7eb' }}>Status</th>
                        <th style={{ padding: '10px 16px', textAlign: 'right', fontSize: '11px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', borderBottom: '1px solid #e5e7eb' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPAPs.map((pap) => (
                        <tr key={pap.id} onClick={() => handleSelectPAP(pap)} style={{ cursor: 'pointer', borderBottom: '1px solid #f3f4f6' }}
                          onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                          onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'white'}>
                          <td style={{ padding: '12px 16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#e0f2fe', color: '#0088c4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '600' }}>
                                {pap.household_head_first_name?.[0]}{pap.household_head_surname?.[0]}
                              </div>
                              <span style={{ fontWeight: '500', color: '#1f2937', fontSize: '14px' }}>
                                {pap.household_head_first_name} {pap.household_head_surname}
                              </span>
                            </div>
                          </td>
                          <td style={{ padding: '12px 16px', color: '#6b7280', fontSize: '13px' }}>{pap.file_number || '-'}</td>
                          <td style={{ padding: '12px 16px', color: '#6b7280', fontSize: '13px' }}>{pap.land_use || '-'}</td>
                          <td style={{ padding: '12px 16px' }}>
                            {pap.latitude ? (
                              <span style={{ color: '#059669', fontSize: '12px' }}>✓ Yes</span>
                            ) : (
                              <span style={{ color: '#9ca3af', fontSize: '12px' }}>-</span>
                            )}
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <span style={{ 
                              padding: '3px 8px', 
                              borderRadius: '10px', 
                              fontSize: '11px', 
                              fontWeight: '500',
                              backgroundColor: pap.verification_status === 'verified' ? '#dcfce7' : '#fef3c7',
                              color: pap.verification_status === 'verified' ? '#16a34a' : '#d97706'
                            }}>
                              {pap.verification_status || 'pending'}
                            </span>
                          </td>
                          <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                            <ChevronRight size={16} color="#9ca3af" />
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
            />
          )}
        </div>
      </main>

      {/* Footer */}
      <footer style={{ backgroundColor: 'white', borderTop: '1px solid #e5e7eb', padding: '8px 16px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
          <img src="/logo-4d.png" alt="4D" style={{ height: '16px', opacity: 0.5 }} onError={(e) => e.target.style.display = 'none'} />
          <span style={{ fontSize: '11px', color: '#9ca3af' }}>
            Developed by <span style={{ color: '#0088c4' }}>4D Climate Solutions</span> for LLWDSP III
          </span>
        </div>
      </footer>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @media (max-width: 768px) { .user-name { display: none !important; } }
      `}</style>
    </div>
  )
}

// Route Card
function RouteCard({ route, onClick, type }) {
  const colors = type === 'rural' 
    ? { bg: '#ecfdf5', border: '#a7f3d0', text: '#059669' }
    : { bg: '#f5f3ff', border: '#c4b5fd', text: '#7c3aed' }
  
  return (
    <div onClick={onClick} style={{ padding: '14px 16px', backgroundColor: colors.bg, border: `1px solid ${colors.border}`, borderRadius: '8px', cursor: 'pointer', transition: 'all 0.15s' }}
      onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)' }}
      onMouseOut={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <p style={{ fontWeight: '600', color: '#1f2937', margin: 0, fontSize: '13px' }}>{route.name}</p>
          <p style={{ fontSize: '12px', color: colors.text, margin: '3px 0 0 0', fontWeight: '500' }}>{route.pap_count} PAPs</p>
        </div>
        <ChevronRight size={18} color={colors.text} />
      </div>
    </div>
  )
}

// Stat Card
function StatCard({ label, value, color, icon: Icon }) {
  return (
    <div style={{ backgroundColor: 'white', borderRadius: '10px', padding: '14px 16px', border: '1px solid #e5e7eb' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <p style={{ fontSize: '11px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', margin: 0 }}>{label}</p>
          <p style={{ fontSize: '24px', fontWeight: '700', color: '#1f2937', margin: '2px 0 0 0' }}>{value}</p>
        </div>
        <div style={{ padding: '8px', borderRadius: '8px', backgroundColor: `${color}15` }}>
          <Icon size={20} color={color} />
        </div>
      </div>
    </div>
  )
}

// Detail View
function DetailView({ household, editedData, editMode, isAdmin, saving, activeTab, setActiveTab, setEditMode, setEditedData, onFieldChange, onSave, onPhotoUpload, onPrint }) {
  const data = editMode ? editedData : household

  return (
    <div>
      {/* Header */}
      <div style={{ backgroundColor: 'white', borderRadius: '10px', padding: '16px 20px', marginBottom: '16px', border: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '50px', height: '50px', borderRadius: '10px', backgroundColor: '#0088c4', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: '600' }}>
            {household.household_head_first_name?.[0]}{household.household_head_surname?.[0]}
          </div>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#1f2937', margin: 0 }}>
              {data.household_head_first_name} {data.household_head_surname}
            </h2>
            <p style={{ fontSize: '13px', color: '#6b7280', margin: '2px 0 0 0' }}>
              {household.route_name} • {household.land_use || 'N/A'}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {isAdmin && !editMode && (
            <button onClick={() => setEditMode(true)} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '8px 14px', backgroundColor: '#f59e0b', color: 'white', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: '500', cursor: 'pointer' }}>
              <Edit2 size={16} /> Edit
            </button>
          )}
          {editMode && (
            <>
              <button onClick={onSave} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '8px 14px', backgroundColor: '#16a34a', color: 'white', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: '500', cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
                <Save size={16} /> {saving ? 'Saving...' : 'Save'}
              </button>
              <button onClick={() => { setEditMode(false); setEditedData({ ...household }) }} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '8px 14px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: '500', cursor: 'pointer' }}>
                <XCircle size={16} /> Cancel
              </button>
            </>
          )}
          <button onClick={onPrint} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '8px 14px', backgroundColor: '#0088c4', color: 'white', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: '500', cursor: 'pointer' }}>
            <Printer size={16} /> Print
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '16px', backgroundColor: 'white', padding: '4px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
        {[
          { id: 'details', label: 'Details', icon: User },
          { id: 'valuation', label: 'Valuation', icon: FileText },
          { id: 'documents', label: 'Documents', icon: Camera },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '9px 14px', backgroundColor: activeTab === tab.id ? '#0088c4' : 'transparent', color: activeTab === tab.id ? 'white' : '#6b7280', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: '500', cursor: 'pointer' }}>
            <tab.icon size={16} /> {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === 'details' && (
        <div style={{ display: 'grid', gap: '16px' }}>
          <Card title="PAP Information" icon={User} color="#0088c4">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '14px' }}>
              <Field label="First Name" value={data.household_head_first_name} field="household_head_first_name" editMode={editMode && isAdmin} onChange={onFieldChange} />
              <Field label="Surname" value={data.household_head_surname} field="household_head_surname" editMode={editMode && isAdmin} onChange={onFieldChange} />
              <Field label="File Number" value={data.file_number} field="file_number" editMode={editMode} onChange={onFieldChange} />
              <Field label="ID Number" value={data.id_number} field="id_number" editMode={editMode} onChange={onFieldChange} />
              <Field label="Phone" value={data.cellphone_no} field="cellphone_no" editMode={editMode} onChange={onFieldChange} />
              <Field label="Gender" value={data.gender} field="gender" editMode={editMode && isAdmin} onChange={onFieldChange} />
            </div>
          </Card>

          <Card title="Location" icon={MapPin} color="#8cc63f">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '14px' }}>
              <Field label="Route" value={data.route_name} />
              <Field label="Route Type" value={data.route_type} />
              <Field label="Land Use" value={data.land_use} />
              <Field label="GPS Coordinates" value={data.gps_coordinates} />
              <Field label="Latitude" value={data.latitude} />
              <Field label="Longitude" value={data.longitude} />
            </div>
          </Card>

          {data.banking_details?.length > 0 && (
            <Card title="Banking Details" icon={CreditCard} color="#6366f1">
              {data.banking_details.map((bank) => (
                <div key={bank.id} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
                  <Field label="Bank" value={bank.bank_name} />
                  <Field label="Account No." value={bank.account_number} />
                  <Field label="Account Holder" value={bank.account_holder_name} />
                </div>
              ))}
            </Card>
          )}
        </div>
      )}

      {activeTab === 'valuation' && (
        <div style={{ display: 'grid', gap: '16px' }}>
          <Card title="Affected Area & Compensation" icon={Home} color="#0088c4">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '14px' }}>
              <Field label="Permanent Area (sqm)" value={data.affected_area_perm} />
              <Field label="Temporary Area (sqm)" value={data.affected_area_temp} />
              <Field label="Perm. Rate (M/sqm)" value={data.rate_perm} />
              <Field label="Temp. Rate (M/sqm)" value={data.rate_temp} />
              <Field label="Disturbance Allowance (M)" value={data.disturbance_allowance} />
              <Field label="Total Compensation (M)" value={data.total_compensation} highlight />
            </div>
          </Card>

          {data.other_assets_json && (
            <Card title="Other Affected Assets" icon={TreePine} color="#059669">
              <OtherAssets assets={data.other_assets_json} />
            </Card>
          )}
        </div>
      )}

      {activeTab === 'documents' && (
        <Card title="Documents & Photos" icon={Camera} color="#0088c4">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
            <PhotoFrame label="PAP Photo" field="photograph_of_pap_url" url={data.photograph_of_pap_url} onUpload={onPhotoUpload} />
            <PhotoFrame label="ID Document" field="id_document_url" url={data.id_document_url} onUpload={onPhotoUpload} />
            <PhotoFrame label="Asset Photo" field="asset_photo_url" url={data.asset_photo_url} onUpload={onPhotoUpload} />
            <PhotoFrame label="Location Map" field="map_url" url={data.map_url} onUpload={onPhotoUpload} />
          </div>
        </Card>
      )}
    </div>
  )
}

// Card wrapper
function Card({ title, icon: Icon, color, children }) {
  return (
    <div style={{ backgroundColor: 'white', borderRadius: '10px', padding: '16px 20px', border: '1px solid #e5e7eb' }}>
      <h3 style={{ fontSize: '14px', fontWeight: '600', color: color, margin: '0 0 14px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
        <Icon size={18} /> {title}
      </h3>
      {children}
    </div>
  )
}

// Field component
function Field({ label, value, field, editMode, onChange, highlight }) {
  const displayValue = value !== null && value !== undefined ? String(value) : ''
  
  return (
    <div>
      <p style={{ fontSize: '11px', color: '#6b7280', margin: '0 0 3px 0' }}>{label}</p>
      {editMode && onChange ? (
        <input type="text" value={displayValue} onChange={(e) => onChange(field, e.target.value)} 
          style={{ width: '100%', padding: '7px 10px', border: '1px solid #0088c4', borderRadius: '5px', fontSize: '13px', outline: 'none', boxSizing: 'border-box', backgroundColor: '#f0f9ff' }} />
      ) : (
        <p style={{ fontSize: '13px', fontWeight: highlight ? '600' : '500', color: displayValue ? (highlight ? '#0088c4' : '#1f2937') : '#d1d5db', margin: 0 }}>
          {displayValue || 'N/A'}
        </p>
      )}
    </div>
  )
}

// Other Assets display
function OtherAssets({ assets }) {
  let parsed = []
  try {
    parsed = typeof assets === 'string' ? JSON.parse(assets) : assets
  } catch (e) {
    return <p style={{ color: '#6b7280', fontSize: '13px' }}>No other assets</p>
  }
  
  if (!parsed || parsed.length === 0) {
    return <p style={{ color: '#6b7280', fontSize: '13px' }}>No other assets recorded</p>
  }
  
  return (
    <div style={{ display: 'grid', gap: '8px' }}>
      {parsed.map((asset, idx) => (
        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', backgroundColor: '#f9fafb', borderRadius: '6px', fontSize: '13px' }}>
          <span style={{ fontWeight: '500' }}>{asset.type}</span>
          <span style={{ color: '#6b7280' }}>Qty: {asset.quantity} | Rate: M{asset.rate} | Value: M{asset.value}</span>
        </div>
      ))}
    </div>
  )
}

// Photo Frame
function PhotoFrame({ label, field, url, onUpload }) {
  const inputRef = useRef(null)
  
  return (
    <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
      <div style={{ padding: '8px 12px', backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '12px', fontWeight: '500', color: '#374151' }}>{label}</span>
        <button onClick={() => inputRef.current?.click()} style={{ padding: '4px 8px', backgroundColor: '#f59e0b', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
          <Edit2 size={12} color="white" />
        </button>
        <input ref={inputRef} type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && onUpload(field, e.target.files[0])} style={{ display: 'none' }} />
      </div>
      <div style={{ height: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px', backgroundColor: '#fafafa' }}>
        {url ? (
          <img src={url} alt={label} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: '4px' }} />
        ) : (
          <div style={{ textAlign: 'center', color: '#9ca3af' }}>
            <Upload size={20} style={{ opacity: 0.4 }} />
            <p style={{ fontSize: '10px', margin: '4px 0 0 0' }}>Click to upload</p>
          </div>
        )}
      </div>
    </div>
  )
}

// Print HTML Generator
function generatePrintHTML(data) {
  const otherAssets = data.other_assets_json ? (typeof data.other_assets_json === 'string' ? JSON.parse(data.other_assets_json) : data.other_assets_json) : []
  const assetsHtml = otherAssets.map(a => `<tr><td style="padding:5px 8px;border:1px solid #ddd">${a.type}</td><td style="padding:5px 8px;border:1px solid #ddd;text-align:center">${a.quantity}</td><td style="padding:5px 8px;border:1px solid #ddd;text-align:right">M ${a.value}</td></tr>`).join('')
  
  return `<!DOCTYPE html><html><head><title>CIMS - ${data.household_head_first_name} ${data.household_head_surname}</title>
<style>
@page{size:A4;margin:12mm}
body{font-family:Arial,sans-serif;font-size:10pt;color:#333;margin:0;padding:0}
.page{padding:5mm}
.header{display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #0088c4;padding-bottom:10px;margin-bottom:12px}
.header img{height:40px}
.title{text-align:center;margin-bottom:15px}
.title h1{font-size:16pt;color:#0088c4;margin:0}
.title p{margin:3px 0 0 0;color:#666}
.section{margin-bottom:12px}
.section-title{font-size:11pt;font-weight:bold;color:#0088c4;border-bottom:1px solid #0088c4;padding-bottom:3px;margin-bottom:8px}
table{width:100%;border-collapse:collapse;font-size:9pt}
td{padding:5px 8px;border:1px solid #ddd}
.label{background:#f5f5f5;font-weight:500;width:35%}
.page-break{page-break-after:always}
.photo-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.photo-box{border:1px solid #ddd;border-radius:6px;overflow:hidden}
.photo-box-title{padding:6px 10px;background:#f0f9ff;font-weight:500;font-size:9pt;border-bottom:1px solid #ddd}
.photo-box-content{height:110px;display:flex;align-items:center;justify-content:center;background:#fafafa}
.photo-box-content img{max-width:100%;max-height:100%;object-fit:contain}
.signature{margin-top:20px;display:flex;gap:30px}
.signature>div{flex:1}
.sig-line{border-bottom:1px solid #333;height:30px;margin-bottom:3px}
.sig-label{font-size:8pt;color:#666}
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
<tr><td class="label">Disturbance Allowance</td><td>M ${data.disturbance_allowance || '-'}</td><td class="label">Total Compensation</td><td style="font-weight:bold;color:#0088c4">M ${data.total_compensation || '-'}</td></tr>
</table>
</div>

${otherAssets.length > 0 ? `
<div class="section">
<div class="section-title">Other Assets / Thepa E Nngoe</div>
<table><tr><th style="padding:5px 8px;border:1px solid #ddd;background:#f5f5f5;text-align:left">Asset Type</th><th style="padding:5px 8px;border:1px solid #ddd;background:#f5f5f5">Qty</th><th style="padding:5px 8px;border:1px solid #ddd;background:#f5f5f5;text-align:right">Value</th></tr>${assetsHtml}</table>
</div>` : ''}
</div>

<div class="page-break"></div>

<div class="page">
<div class="header">
<img src="/logo-lesotho.png" style="height:35px" onerror="this.style.display='none'">
<div style="text-align:center"><strong style="color:#0088c4">Documents & Photos</strong><br><span style="font-size:9pt">${data.household_head_first_name || ''} ${data.household_head_surname || ''}</span></div>
<img src="/logo-4d.png" style="height:30px" onerror="this.style.display='none'">
</div>

<div class="photo-grid">
<div class="photo-box"><div class="photo-box-title">PAP Photograph</div><div class="photo-box-content">${data.photograph_of_pap_url ? `<img src="${data.photograph_of_pap_url}">` : '<span style="color:#999">No photo</span>'}</div></div>
<div class="photo-box"><div class="photo-box-title">ID Document</div><div class="photo-box-content">${data.id_document_url ? `<img src="${data.id_document_url}">` : '<span style="color:#999">No document</span>'}</div></div>
<div class="photo-box"><div class="photo-box-title">Asset Photo</div><div class="photo-box-content">${data.asset_photo_url ? `<img src="${data.asset_photo_url}">` : '<span style="color:#999">No photo</span>'}</div></div>
<div class="photo-box"><div class="photo-box-title">Location Map</div><div class="photo-box-content">${data.map_url ? `<img src="${data.map_url}">` : '<span style="color:#999">No map</span>'}</div></div>
</div>

<div class="signature">
<div><p style="font-size:9pt;color:#666;margin:0 0 5px">PAP Signature / Tekeno Ea Mong'a Thepa:</p><div class="sig-line"></div></div>
<div><p style="font-size:9pt;color:#666;margin:0 0 5px">Verified By / Netefalitsoe Ke:</p><div class="sig-line"></div></div>
<div><p style="font-size:9pt;color:#666;margin:0 0 5px">Date / Letsatsi:</p><div class="sig-line"></div></div>
</div>

<div style="margin-top:15px;text-align:center;padding-top:10px;border-top:1px solid #e5e7eb">
<p style="font-size:8pt;color:#999;margin:0">LLWDSP III - Lesotho Lowlands Water Supply & Sanitation Project Phase III</p>
</div>
</div>
</body></html>`
}
