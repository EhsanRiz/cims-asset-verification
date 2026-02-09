import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../App'
import { getHouseholds, getVillages, getRoutes, supabase } from '../lib/supabase'
import { 
  Menu, X, LogOut, Search, Users, Home, ChevronRight, ChevronLeft,
  Phone, CreditCard, FileText, User, Printer, Edit2, 
  Save, Upload, MapPin, Camera, Check, XCircle, Map, Building2, TreePine
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
  const [sidebarOpen, setSidebarOpen] = useState(false)
  
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
      const householdData = await getHouseholds({})
      setHouseholds(householdData)
      
      // Extract unique routes from households
      const routeMap = new Map()
      householdData.forEach(h => {
        const routeKey = h.route_name || h.route_code || 'Unknown'
        if (!routeMap.has(routeKey)) {
          routeMap.set(routeKey, {
            route_name: h.route_name || 'Unknown Route',
            route_code: h.route_code || '',
            route_type: determineRouteType(h.route_name),
            pap_count: 0
          })
        }
        routeMap.get(routeKey).pap_count++
      })
      
      setRoutes(Array.from(routeMap.values()).sort((a, b) => a.route_name.localeCompare(b.route_name)))
    } catch (err) {
      console.error('Error loading data:', err)
    } finally {
      setLoading(false)
    }
  }

  const determineRouteType = (routeName) => {
    if (!routeName) return 'Unknown'
    const urbanKeywords = ['Rampai', 'Serutle', 'Mopeli', 'Sechele', 'Majara', 'Matlakeng', 'Chepeseli', 'Manamela', 'Makong']
    return urbanKeywords.some(k => routeName.includes(k)) ? 'Urban' : 'Rural'
  }

  const stats = {
    total: households.length,
    routes: routes.length,
    verified: households.filter(h => h.approval_status === 'approved').length,
    assets: households.reduce((acc, h) => acc + (h.household_assets?.length || 0), 0)
  }

  const ruralRoutes = routes.filter(r => r.route_type === 'Rural')
  const urbanRoutes = routes.filter(r => r.route_type === 'Urban')

  const handleSelectRoute = (route) => {
    setSelectedRoute(route)
    setSearchQuery('')
    setView('paps')
  }

  const handleSelectPAP = (h) => {
    setSelectedHousehold(h)
    setEditedData({
      ...h,
      beneficiaries: [...(h.beneficiaries || [])],
      household_assets: [...(h.household_assets || [])],
    })
    setEditMode(false)
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

  const filteredPAPs = selectedRoute 
    ? households.filter(h => {
        const matchesRoute = (h.route_name === selectedRoute.route_name) || 
                            (h.route_code === selectedRoute.route_code)
        if (!matchesRoute) return false
        if (!searchQuery) return true
        const search = searchQuery.toLowerCase()
        return (
          h.household_head_first_name?.toLowerCase().includes(search) ||
          h.household_head_surname?.toLowerCase().includes(search) ||
          h.id_number?.toLowerCase().includes(search) ||
          h.hh_original_village_name?.toLowerCase().includes(search)
        )
      })
    : []

  // Edit handlers
  const handleFieldChange = (field, value) => {
    setEditedData(prev => ({ ...prev, [field]: value }))
  }

  const handleBeneficiaryChange = (idx, field, value) => {
    setEditedData(prev => {
      const bens = [...prev.beneficiaries]
      bens[idx] = { ...bens[idx], [field]: value }
      return { ...prev, beneficiaries: bens }
    })
  }

  const handleAssetChange = (idx, field, value) => {
    setEditedData(prev => {
      const assets = [...prev.household_assets]
      assets[idx] = { ...assets[idx], [field]: value }
      return { ...prev, household_assets: assets }
    })
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const { error: hhError } = await supabase
        .from('households')
        .update({
          household_head_first_name: editedData.household_head_first_name,
          household_head_surname: editedData.household_head_surname,
          gender: editedData.gender,
          type_of_identification: editedData.type_of_identification,
          id_number: editedData.id_number,
          expiry_date: editedData.expiry_date,
          cellphone_no: editedData.cellphone_no,
          occupation_of_pap: editedData.occupation_of_pap,
          hh_original_village_name: editedData.hh_original_village_name,
          hh_residential_village: editedData.hh_residential_village,
          community_council: editedData.community_council,
          photograph_of_pap_url: editedData.photograph_of_pap_url,
          id_document_url: editedData.id_document_url,
          asset_photo_url: editedData.asset_photo_url,
          map_url: editedData.map_url,
        })
        .eq('id', editedData.id)

      if (hhError) throw hhError

      for (const ben of editedData.beneficiaries || []) {
        if (ben.id) {
          await supabase.from('beneficiaries').update({
            first_name: ben.first_name,
            surname: ben.surname,
            id_number: ben.id_number,
            cellphone_no: ben.cellphone_no,
            village_name: ben.village_name,
          }).eq('id', ben.id)
        }
      }

      for (const asset of editedData.household_assets || []) {
        if (asset.id) {
          await supabase.from('household_assets').update({
            asset_type: asset.asset_type,
            village: asset.village,
            asset_size: asset.asset_size,
            size_unit: asset.size_unit,
            gps_coordinates: asset.gps_coordinates,
            easting: asset.easting,
            northing: asset.northing,
            acquisition_type: asset.acquisition_type,
          }).eq('id', asset.id)
        }
      }

      await loadData()
      setSelectedHousehold({ ...editedData })
      setEditMode(false)
      alert('Changes saved successfully!')
    } catch (err) {
      console.error('Save error:', err)
      alert('Error saving changes: ' + err.message)
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
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('cims-documents')
        .getPublicUrl(filePath)

      await supabase.from('households').update({ [field]: publicUrl }).eq('id', selectedHousehold.id)

      setEditedData(prev => ({ ...prev, [field]: publicUrl }))
      setSelectedHousehold(prev => ({ ...prev, [field]: publicUrl }))
      alert('Photo uploaded successfully!')
    } catch (err) {
      console.error('Upload error:', err)
      alert('Error uploading photo: ' + err.message)
    }
  }

  const handlePrint = () => {
    const data = editedData.id ? editedData : selectedHousehold
    const printWindow = window.open('', '_blank', 'width=800,height=600')
    printWindow.document.write(generatePrintHTML(data))
    printWindow.document.close()
    printWindow.onload = () => setTimeout(() => printWindow.print(), 500)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: '#f5f7fa' }}>
      {/* Header */}
      <header style={{ backgroundColor: '#0088c4', padding: '0 16px', flexShrink: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '56px', maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {view !== 'routes' && (
              <button onClick={handleBack} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '8px 12px', backgroundColor: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '8px', color: 'white', cursor: 'pointer', fontSize: '13px' }}>
                <ChevronLeft size={18} /> Back
              </button>
            )}
            <div style={{ width: '36px', height: '36px', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img src="/logo-llwdp.png" alt="CIMS" style={{ width: '28px', height: '28px', objectFit: 'contain' }} />
            </div>
            <div>
              <h1 style={{ color: 'white', fontSize: '16px', fontWeight: '600', margin: 0, lineHeight: 1.2 }}>CIMS</h1>
              <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '11px', margin: 0 }}>Asset Registration & Verification</p>
            </div>
            {selectedRoute && view !== 'routes' && (
              <div style={{ marginLeft: '12px', padding: '4px 12px', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: '6px' }}>
                <span style={{ color: 'white', fontSize: '13px' }}>{selectedRoute.route_name}</span>
              </div>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#8cc63f', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: '600' }}>
              {user?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U'}
            </div>
            <span style={{ color: 'white', fontSize: '14px' }} className="user-name">{user?.full_name}</span>
            <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '11px', padding: '2px 8px', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '4px' }}>{user?.role}</span>
            <button onClick={() => { logout(); window.location.href = '/login' }} style={{ padding: '8px', backgroundColor: 'transparent', border: 'none', borderRadius: '8px', color: 'rgba(255,255,255,0.8)', cursor: 'pointer' }} title="Sign Out">
              <LogOut size={20} />
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
              {/* Stats */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                <StatCard label="Total PAPs" value={stats.total} subtext="households" color="#0088c4" icon={Users} />
                <StatCard label="Routes" value={stats.routes} subtext="total" color="#8cc63f" icon={Map} />
                <StatCard label="Verified" value={stats.verified} subtext="approved" color="#16a34a" icon={Check} />
                <StatCard label="Assets" value={stats.assets} subtext="registered" color="#f59e0b" icon={Home} />
              </div>

              {/* Routes Grid */}
              <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '24px', border: '1px solid #e5e7eb' }}>
                <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#1f2937', margin: '0 0 20px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Map size={22} color="#0088c4" /> Select a Route
                </h2>

                {loading ? (
                  <div style={{ padding: '40px', textAlign: 'center' }}>
                    <div style={{ width: '40px', height: '40px', border: '3px solid #e5e7eb', borderTopColor: '#0088c4', borderRadius: '50%', margin: '0 auto', animation: 'spin 1s linear infinite' }} />
                    <p style={{ color: '#6b7280', marginTop: '12px' }}>Loading routes...</p>
                  </div>
                ) : (
                  <>
                    {/* Rural Routes */}
                    <div style={{ marginBottom: '24px' }}>
                      <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#059669', margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <TreePine size={18} /> Rural Routes ({ruralRoutes.length})
                      </h3>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px' }}>
                        {ruralRoutes.map(route => (
                          <RouteCard key={route.route_name} route={route} onClick={() => handleSelectRoute(route)} />
                        ))}
                      </div>
                    </div>

                    {/* Urban Routes */}
                    <div>
                      <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#7c3aed', margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Building2 size={18} /> Urban Routes ({urbanRoutes.length})
                      </h3>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px' }}>
                        {urbanRoutes.map(route => (
                          <RouteCard key={route.route_name} route={route} onClick={() => handleSelectRoute(route)} isUrban />
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </>
          )}

          {/* PAPS LIST VIEW */}
          {view === 'paps' && selectedRoute && (
            <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
              {/* Header */}
              <div style={{ padding: '20px 24px', borderBottom: '1px solid #e5e7eb', backgroundColor: '#f9fafb' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
                  <div>
                    <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#1f2937', margin: 0 }}>
                      {selectedRoute.route_name}
                    </h2>
                    <p style={{ fontSize: '13px', color: '#6b7280', margin: '4px 0 0 0' }}>
                      {selectedRoute.route_type} Route • {filteredPAPs.length} PAPs
                    </p>
                  </div>
                  <div style={{ position: 'relative', minWidth: '250px' }}>
                    <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                    <input
                      type="text"
                      placeholder="Search PAPs..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      style={{ width: '100%', padding: '10px 12px 10px 40px', backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>
              </div>

              {/* PAP List */}
              <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                {filteredPAPs.length === 0 ? (
                  <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
                    No PAPs found for this route
                  </div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                        <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>PAP Name</th>
                        <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>ID Number</th>
                        <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Village</th>
                        <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Assets</th>
                        <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPAPs.map((pap, idx) => (
                        <tr key={pap.id} style={{ borderBottom: '1px solid #f3f4f6', cursor: 'pointer' }} onClick={() => handleSelectPAP(pap)}>
                          <td style={{ padding: '14px 16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#e0f2fe', color: '#0088c4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '600' }}>
                                {pap.household_head_first_name?.[0]}{pap.household_head_surname?.[0]}
                              </div>
                              <span style={{ fontWeight: '500', color: '#1f2937' }}>
                                {pap.household_head_first_name} {pap.household_head_surname}
                              </span>
                            </div>
                          </td>
                          <td style={{ padding: '14px 16px', color: '#6b7280', fontSize: '14px' }}>{pap.id_number || 'N/A'}</td>
                          <td style={{ padding: '14px 16px', color: '#6b7280', fontSize: '14px' }}>{pap.hh_original_village_name || 'N/A'}</td>
                          <td style={{ padding: '14px 16px' }}>
                            <span style={{ padding: '4px 10px', backgroundColor: '#e0f2fe', color: '#0088c4', borderRadius: '12px', fontSize: '12px', fontWeight: '500' }}>
                              {pap.household_assets?.length || 0}
                            </span>
                          </td>
                          <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                            <button style={{ padding: '6px 14px', backgroundColor: '#0088c4', color: 'white', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: '500', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              View <ChevronRight size={16} />
                            </button>
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
              onBeneficiaryChange={handleBeneficiaryChange}
              onAssetChange={handleAssetChange}
              onSave={handleSave}
              onPhotoUpload={handlePhotoUpload}
              onPrint={handlePrint}
            />
          )}
        </div>
      </main>

      {/* Footer */}
      <footer style={{ backgroundColor: 'white', borderTop: '1px solid #e5e7eb', padding: '10px 16px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
          <img src="/logo-4d.png" alt="4D" style={{ height: '18px', opacity: 0.6 }} />
          <span style={{ fontSize: '11px', color: '#9ca3af' }}>
            Developed by <span style={{ color: '#0088c4' }}>4D Climate Solutions</span> for LLWDSP III
          </span>
        </div>
      </footer>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @media (max-width: 768px) {
          .user-name { display: none !important; }
        }
      `}</style>
    </div>
  )
}

// Route Card Component
function RouteCard({ route, onClick, isUrban }) {
  const bgColor = isUrban ? '#f5f3ff' : '#ecfdf5'
  const borderColor = isUrban ? '#c4b5fd' : '#a7f3d0'
  const textColor = isUrban ? '#7c3aed' : '#059669'
  
  return (
    <div
      onClick={onClick}
      style={{
        padding: '16px',
        backgroundColor: bgColor,
        border: `1px solid ${borderColor}`,
        borderRadius: '10px',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
      }}
      onMouseOver={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)'
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.boxShadow = 'none'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <p style={{ fontWeight: '600', color: '#1f2937', margin: 0, fontSize: '14px' }}>{route.route_name}</p>
          <p style={{ fontSize: '12px', color: textColor, margin: '4px 0 0 0', fontWeight: '500' }}>
            {route.pap_count} PAPs
          </p>
        </div>
        <ChevronRight size={20} color={textColor} />
      </div>
    </div>
  )
}

// Stat Card Component
function StatCard({ label, value, subtext, color, icon: Icon }) {
  return (
    <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '16px 20px', border: '1px solid #e5e7eb', transition: 'all 0.2s ease' }}
      onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.1)' }}
      onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p style={{ fontSize: '11px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>{label}</p>
          <p style={{ fontSize: '28px', fontWeight: '700', color: '#1f2937', margin: '4px 0' }}>{value}</p>
          <p style={{ fontSize: '12px', color: color, margin: 0, fontWeight: '500' }}>{subtext}</p>
        </div>
        <div style={{ padding: '10px', borderRadius: '10px', backgroundColor: `${color}15` }}>
          <Icon size={22} color={color} />
        </div>
      </div>
    </div>
  )
}

// Detail View Component (extracted for clarity)
function DetailView({ household, editedData, editMode, isAdmin, saving, activeTab, setActiveTab, setEditMode, setEditedData, onFieldChange, onBeneficiaryChange, onAssetChange, onSave, onPhotoUpload, onPrint }) {
  const data = editMode ? editedData : household

  return (
    <div>
      {/* Header Card */}
      <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '20px 24px', marginBottom: '20px', border: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '12px', backgroundColor: '#0088c4', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: '600' }}>
            {household.household_head_first_name?.[0]}{household.household_head_surname?.[0]}
          </div>
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#1f2937', margin: 0 }}>
              {data.household_head_first_name} {data.household_head_surname}
            </h2>
            <p style={{ fontSize: '14px', color: '#6b7280', margin: '4px 0 0 0' }}>
              ID: {household.id_number} • {household.hh_original_village_name}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {isAdmin && !editMode && (
            <button onClick={() => setEditMode(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 16px', backgroundColor: '#f59e0b', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '500', cursor: 'pointer' }}>
              <Edit2 size={18} /> Edit
            </button>
          )}
          {editMode && (
            <>
              <button onClick={onSave} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 16px', backgroundColor: '#16a34a', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '500', cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
                <Save size={18} /> {saving ? 'Saving...' : 'Save'}
              </button>
              <button onClick={() => { setEditMode(false); setEditedData({ ...household }) }} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 16px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '500', cursor: 'pointer' }}>
                <XCircle size={18} /> Cancel
              </button>
            </>
          )}
          <button onClick={onPrint} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 16px', backgroundColor: '#0088c4', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '500', cursor: 'pointer' }}>
            <Printer size={18} /> Print Form
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', backgroundColor: 'white', padding: '4px', borderRadius: '10px', border: '1px solid #e5e7eb' }}>
        {[
          { id: 'details', label: 'Personal Details', icon: User },
          { id: 'assets', label: 'Assets', icon: Home },
          { id: 'documents', label: 'Documents', icon: FileText },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px 16px', backgroundColor: activeTab === tab.id ? '#0088c4' : 'transparent', color: activeTab === tab.id ? 'white' : '#6b7280', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '500', cursor: 'pointer' }}>
            <tab.icon size={18} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'details' && <DetailsTab data={data} editMode={editMode} isAdmin={isAdmin} onFieldChange={onFieldChange} onBeneficiaryChange={onBeneficiaryChange} />}
      {activeTab === 'assets' && <AssetsTab assets={data.household_assets} editMode={editMode} isAdmin={isAdmin} onAssetChange={onAssetChange} />}
      {activeTab === 'documents' && <DocumentsTab data={data} onUpload={onPhotoUpload} />}
    </div>
  )
}

// Include all the sub-components (DetailsTab, AssetsTab, DocumentsTab, etc.) from the previous version
// ... (keeping them the same as cims-v5-fix)

function EditableField({ label, value, field, editMode, onChange, type = 'text' }) {
  return (
    <div>
      <p style={{ fontSize: '12px', color: '#6b7280', margin: '0 0 4px 0' }}>{label}</p>
      {editMode ? (
        <input type={type} value={value || ''} onChange={(e) => onChange(field, e.target.value)} style={{ width: '100%', padding: '8px 12px', border: '1px solid #0088c4', borderRadius: '6px', fontSize: '14px', outline: 'none', boxSizing: 'border-box', backgroundColor: '#f0f9ff' }} />
      ) : (
        <p style={{ fontSize: '14px', fontWeight: '500', color: value ? '#1f2937' : '#d1d5db', margin: 0 }}>{value || 'N/A'}</p>
      )}
    </div>
  )
}

function DetailsTab({ data, editMode, isAdmin, onFieldChange, onBeneficiaryChange }) {
  return (
    <div style={{ display: 'grid', gap: '20px' }}>
      <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '20px 24px', border: '1px solid #e5e7eb' }}>
        <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#0088c4', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}><User size={20} /> Household Head Details</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
          <EditableField label="First Name" value={data.household_head_first_name} field="household_head_first_name" editMode={editMode && isAdmin} onChange={onFieldChange} />
          <EditableField label="Surname" value={data.household_head_surname} field="household_head_surname" editMode={editMode && isAdmin} onChange={onFieldChange} />
          <EditableField label="Gender" value={data.gender} field="gender" editMode={editMode && isAdmin} onChange={onFieldChange} />
          <EditableField label="ID Number" value={data.id_number} field="id_number" editMode={editMode && isAdmin} onChange={onFieldChange} />
          <EditableField label="Phone" value={data.cellphone_no} field="cellphone_no" editMode={editMode && isAdmin} onChange={onFieldChange} />
          <EditableField label="Village" value={data.hh_original_village_name} field="hh_original_village_name" editMode={editMode && isAdmin} onChange={onFieldChange} />
          <EditableField label="Route" value={data.route_name} field="route_name" editMode={false} onChange={() => {}} />
          <EditableField label="Community Council" value={data.community_council} field="community_council" editMode={editMode && isAdmin} onChange={onFieldChange} />
        </div>
      </div>
      {data.beneficiaries?.length > 0 && (
        <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '20px 24px', border: '1px solid #e5e7eb' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#8cc63f', margin: '0 0 16px 0' }}>Beneficiaries ({data.beneficiaries.length})</h3>
          {data.beneficiaries.map((ben, idx) => (
            <div key={ben.id} style={{ padding: '12px', backgroundColor: '#f9fafb', borderRadius: '8px', marginBottom: '8px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px' }}>
                <EditableField label="Name" value={`${ben.first_name} ${ben.surname}`} field="name" editMode={false} onChange={() => {}} />
                <EditableField label="ID" value={ben.id_number} field="id_number" editMode={false} onChange={() => {}} />
                <EditableField label="Phone" value={ben.cellphone_no} field="cellphone_no" editMode={false} onChange={() => {}} />
              </div>
            </div>
          ))}
        </div>
      )}
      {data.banking_details?.length > 0 && (
        <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '20px 24px', border: '1px solid #e5e7eb' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#6366f1', margin: '0 0 16px 0' }}>Banking Details</h3>
          {data.banking_details.map((bank) => (
            <div key={bank.id} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px' }}>
              <EditableField label="Bank" value={bank.bank_name} editMode={false} onChange={() => {}} />
              <EditableField label="Account" value={bank.account_number} editMode={false} onChange={() => {}} />
              <EditableField label="Holder" value={bank.account_holder_name} editMode={false} onChange={() => {}} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function AssetsTab({ assets, editMode, isAdmin, onAssetChange }) {
  return (
    <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '20px 24px', border: '1px solid #e5e7eb' }}>
      <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#0088c4', margin: '0 0 16px 0' }}>Assets ({assets?.length || 0})</h3>
      {assets?.length > 0 ? assets.map((asset, idx) => (
        <div key={asset.id} style={{ padding: '16px', backgroundColor: '#f9fafb', borderRadius: '8px', marginBottom: '12px', border: '1px solid #e5e7eb' }}>
          <p style={{ fontWeight: '600', color: '#1f2937', margin: '0 0 12px 0' }}>{asset.asset_type}</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
            <EditableField label="Village" value={asset.village} field="village" editMode={editMode && isAdmin} onChange={(f, v) => onAssetChange(idx, f, v)} />
            <EditableField label="Size" value={asset.asset_size} field="asset_size" editMode={editMode && isAdmin} onChange={(f, v) => onAssetChange(idx, f, v)} />
            <EditableField label="GPS" value={asset.gps_coordinates} field="gps_coordinates" editMode={editMode && isAdmin} onChange={(f, v) => onAssetChange(idx, f, v)} />
            <EditableField label="Acquisition" value={asset.acquisition_type} field="acquisition_type" editMode={editMode && isAdmin} onChange={(f, v) => onAssetChange(idx, f, v)} />
          </div>
        </div>
      )) : <p style={{ color: '#9ca3af', textAlign: 'center', padding: '20px' }}>No assets registered</p>}
    </div>
  )
}

function DocumentsTab({ data, onUpload }) {
  const photoFields = [
    { field: 'photograph_of_pap_url', label: 'PAP Photograph', icon: Camera },
    { field: 'id_document_url', label: 'ID Document', icon: FileText },
    { field: 'asset_photo_url', label: 'Asset Photo', icon: Home },
    { field: 'map_url', label: 'Location Map', icon: MapPin },
  ]
  return (
    <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '20px 24px', border: '1px solid #e5e7eb' }}>
      <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#0088c4', margin: '0 0 16px 0' }}>Documents & Photos</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        {photoFields.map(({ field, label, icon: Icon }) => (
          <PhotoFrame key={field} label={label} icon={Icon} url={data[field]} onUpload={(file) => onUpload(field, file)} />
        ))}
      </div>
    </div>
  )
}

function PhotoFrame({ label, icon: Icon, url, onUpload }) {
  const fileInputRef = useRef(null)
  return (
    <div style={{ border: '1px solid #e5e7eb', borderRadius: '10px', overflow: 'hidden' }}>
      <div style={{ padding: '10px 14px', backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Icon size={16} color="#0088c4" />
          <span style={{ fontSize: '12px', fontWeight: '500', color: '#374151' }}>{label}</span>
        </div>
        <button onClick={() => fileInputRef.current?.click()} style={{ padding: '4px 8px', backgroundColor: '#f59e0b', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
          <Edit2 size={12} color="white" />
        </button>
        <input ref={fileInputRef} type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0])} style={{ display: 'none' }} />
      </div>
      <div style={{ height: '140px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px', backgroundColor: '#fafafa' }}>
        {url ? <img src={url} alt={label} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: '6px' }} /> : <div style={{ textAlign: 'center', color: '#9ca3af' }}><Upload size={24} style={{ opacity: 0.4 }} /><p style={{ fontSize: '11px', margin: '4px 0 0 0' }}>No photo</p></div>}
      </div>
    </div>
  )
}

function generatePrintHTML(data) {
  return `<!DOCTYPE html><html><head><title>CIMS - ${data.household_head_first_name} ${data.household_head_surname}</title><style>@page{size:A4;margin:15mm}body{font-family:Arial,sans-serif;font-size:11pt;color:#333}.page{max-width:210mm;margin:0 auto;padding:10mm}.header{display:flex;justify-content:space-between;align-items:center;border-bottom:3px solid #0088c4;padding-bottom:12px;margin-bottom:16px}.header img{height:45px}.title{text-align:center;margin-bottom:20px}.title h1{font-size:18pt;color:#0088c4;margin:0}.section{margin-bottom:16px}.section-title{font-size:12pt;font-weight:bold;color:#0088c4;border-bottom:2px solid #0088c4;padding-bottom:4px;margin-bottom:8px}table{width:100%;border-collapse:collapse;font-size:10pt}td{padding:6px 10px;border:1px solid #ddd}.page-break{page-break-after:always}.photo-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}.photo-box{border:1px solid #ddd;border-radius:8px}.photo-box-header{padding:8px;background:#f0f9ff;border-bottom:1px solid #ddd;font-weight:500}.photo-box-content{height:140px;display:flex;align-items:center;justify-content:center;padding:8px}.photo-box-content img{max-width:100%;max-height:100%;object-fit:contain}</style></head><body><div class="page"><div class="header"><img src="/logo-lesotho.png" onerror="this.style.display='none'"><img src="/logo-llwdp.png" onerror="this.style.display='none'"><img src="/logo-afdb.png" onerror="this.style.display='none'"><img src="/logo-4d.png" onerror="this.style.display='none'"></div><div class="title"><h1>Asset Verification Form</h1><p>Foromo E Ngoliso Ea Thepa</p></div><div class="section"><div class="section-title">Household Head / Hlooho Ea Lelapa</div><table><tr><td style="width:40%;background:#f9fafb;font-weight:500">Name</td><td>${data.household_head_first_name||''} ${data.household_head_surname||''}</td></tr><tr><td style="background:#f9fafb;font-weight:500">ID Number</td><td>${data.id_number||'N/A'}</td></tr><tr><td style="background:#f9fafb;font-weight:500">Phone</td><td>${data.cellphone_no||'N/A'}</td></tr><tr><td style="background:#f9fafb;font-weight:500">Village</td><td>${data.hh_original_village_name||'N/A'}</td></tr><tr><td style="background:#f9fafb;font-weight:500">Route</td><td>${data.route_name||'N/A'}</td></tr></table></div>${data.household_assets?.length?`<div class="section"><div class="section-title">Assets (${data.household_assets.length})</div><table>${data.household_assets.map(a=>`<tr><td style="background:#f9fafb;font-weight:500">${a.asset_type}</td><td>${a.village||'N/A'} - ${a.asset_size||'N/A'} sqm</td></tr>`).join('')}</table></div>`:''}</div><div class="page-break"></div><div class="page"><div class="header"><img src="/logo-lesotho.png" style="height:40px" onerror="this.style.display='none'"><div style="text-align:center"><h2 style="font-size:14pt;margin:0;color:#0088c4">Documents & Photos</h2><p style="margin:4px 0 0 0">${data.household_head_first_name||''} ${data.household_head_surname||''}</p></div><img src="/logo-4d.png" style="height:35px" onerror="this.style.display='none'"></div><div class="photo-grid"><div class="photo-box"><div class="photo-box-header">PAP Photograph</div><div class="photo-box-content">${data.photograph_of_pap_url?`<img src="${data.photograph_of_pap_url}">`:'<span style="color:#999">No photo</span>'}</div></div><div class="photo-box"><div class="photo-box-header">ID Document</div><div class="photo-box-content">${data.id_document_url?`<img src="${data.id_document_url}">`:'<span style="color:#999">No document</span>'}</div></div><div class="photo-box"><div class="photo-box-header">Asset Photo</div><div class="photo-box-content">${data.asset_photo_url?`<img src="${data.asset_photo_url}">`:'<span style="color:#999">No photo</span>'}</div></div><div class="photo-box"><div class="photo-box-header">Location Map</div><div class="photo-box-content">${data.map_url?`<img src="${data.map_url}">`:'<span style="color:#999">No map</span>'}</div></div></div><div style="margin-top:30px;display:grid;grid-template-columns:1fr 1fr;gap:40px"><div><p style="font-size:10pt;color:#666;margin:0 0 8px">Verified By:</p><div style="border-bottom:1px solid #333;height:40px"></div></div><div><p style="font-size:10pt;color:#666;margin:0 0 8px">Date:</p><div style="border-bottom:1px solid #333;height:40px"></div></div></div></div></body></html>`
}
