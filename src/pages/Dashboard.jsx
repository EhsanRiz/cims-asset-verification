import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../App'
import { getHouseholds, getVillages, supabase } from '../lib/supabase'
import { 
  Menu, X, LogOut, Search, Users, Home, ChevronRight, 
  Phone, CreditCard, FileText, User, Printer, Edit2, 
  Save, Upload, MapPin, Camera, Check, XCircle
} from 'lucide-react'

export default function Dashboard() {
  const { user, logout } = useAuth()
  const [households, setHouseholds] = useState([])
  const [villages, setVillages] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedHousehold, setSelectedHousehold] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('details')
  const [editMode, setEditMode] = useState(false)
  const [editedData, setEditedData] = useState({})
  const [saving, setSaving] = useState(false)
  const [showPrintView, setShowPrintView] = useState(false)
  const printRef = useRef(null)

  const isAdmin = user?.role === 'Admin' || user?.role === 'admin'

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [householdData, villageData] = await Promise.all([
        getHouseholds({}),
        getVillages()
      ])
      setHouseholds(householdData)
      setVillages(villageData)
    } catch (err) {
      console.error('Error loading data:', err)
    } finally {
      setLoading(false)
    }
  }

  const filteredHouseholds = households.filter(h => {
    if (!searchQuery) return true
    const search = searchQuery.toLowerCase()
    return (
      h.household_head_first_name?.toLowerCase().includes(search) ||
      h.household_head_surname?.toLowerCase().includes(search) ||
      h.id_number?.toLowerCase().includes(search) ||
      h.hh_original_village_name?.toLowerCase().includes(search)
    )
  })

  const stats = {
    total: households.length,
    verified: households.filter(h => h.approval_status === 'approved').length,
    assets: households.reduce((acc, h) => acc + (h.household_assets?.length || 0), 0)
  }

  const handleSelectHousehold = (h) => {
    setSelectedHousehold(h)
    setEditedData({
      ...h,
      beneficiaries: [...(h.beneficiaries || [])],
      household_assets: [...(h.household_assets || [])],
    })
    setEditMode(false)
    setSidebarOpen(false)
  }

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
      // Update household
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

      // Update beneficiaries
      for (const ben of editedData.beneficiaries) {
        await supabase
          .from('beneficiaries')
          .update({
            first_name: ben.first_name,
            surname: ben.surname,
            id_number: ben.id_number,
            cellphone_no: ben.cellphone_no,
            village_name: ben.village_name,
          })
          .eq('id', ben.id)
      }

      // Update assets
      for (const asset of editedData.household_assets) {
        await supabase
          .from('household_assets')
          .update({
            asset_type: asset.asset_type,
            village: asset.village,
            asset_size: asset.asset_size,
            size_unit: asset.size_unit,
            gps_coordinates: asset.gps_coordinates,
            easting: asset.easting,
            northing: asset.northing,
            acquisition_type: asset.acquisition_type,
          })
          .eq('id', asset.id)
      }

      // Refresh data
      await loadData()
      const updated = households.find(h => h.id === editedData.id) || editedData
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

      // Update in database
      await supabase
        .from('households')
        .update({ [field]: publicUrl })
        .eq('id', selectedHousehold.id)

      // Update local state
      setEditedData(prev => ({ ...prev, [field]: publicUrl }))
      setSelectedHousehold(prev => ({ ...prev, [field]: publicUrl }))
      
      alert('Photo uploaded successfully!')
    } catch (err) {
      console.error('Upload error:', err)
      alert('Error uploading photo: ' + err.message)
    }
  }

  const handlePrint = () => {
    setShowPrintView(true)
    setTimeout(() => {
      window.print()
      setShowPrintView(false)
    }, 500)
  }

  // Print View Component
  if (showPrintView && selectedHousehold) {
    return <PrintView household={editedData} onClose={() => setShowPrintView(false)} />
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: '#f5f7fa' }}>
      {/* Header */}
      <header style={{ backgroundColor: '#0088c4', padding: '0 16px', flexShrink: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '56px', maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="mobile-menu-btn" style={{ display: 'none', padding: '8px', backgroundColor: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '8px', color: 'white', cursor: 'pointer' }}>
              {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
            <div style={{ width: '36px', height: '36px', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img src="/logo-llwdp.png" alt="CIMS" style={{ width: '28px', height: '28px', objectFit: 'contain' }} />
            </div>
            <div>
              <h1 style={{ color: 'white', fontSize: '16px', fontWeight: '600', margin: 0, lineHeight: 1.2 }}>CIMS</h1>
              <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '11px', margin: 0 }}>Asset Registration & Verification</p>
            </div>
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
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Sidebar */}
        <aside className="sidebar" style={{ width: '300px', backgroundColor: 'white', borderRight: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
          <div style={{ padding: '16px', borderBottom: '1px solid #e5e7eb' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <Users size={20} color="#0088c4" />
              <h2 style={{ fontSize: '15px', fontWeight: '600', color: '#1f2937', margin: 0 }}>Beneficiaries</h2>
              <span style={{ backgroundColor: '#0088c4', color: 'white', fontSize: '11px', fontWeight: '600', padding: '2px 8px', borderRadius: '10px', marginLeft: 'auto' }}>{filteredHouseholds.length}</span>
            </div>
            <div style={{ position: 'relative' }}>
              <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
              <input type="text" placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ width: '100%', padding: '10px 12px 10px 40px', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
            </div>
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {loading ? (
              <div style={{ padding: '40px', textAlign: 'center' }}>
                <div className="spinner" style={{ width: '32px', height: '32px', border: '3px solid #e5e7eb', borderTopColor: '#0088c4', borderRadius: '50%', margin: '0 auto', animation: 'spin 1s linear infinite' }} />
              </div>
            ) : (
              filteredHouseholds.map((h) => (
                <div key={h.id} onClick={() => handleSelectHousehold(h)} style={{ padding: '12px 16px', borderBottom: '1px solid #f3f4f6', cursor: 'pointer', backgroundColor: selectedHousehold?.id === h.id ? '#e0f2fe' : 'white', borderLeft: selectedHousehold?.id === h.id ? '3px solid #0088c4' : '3px solid transparent', transition: 'all 0.15s ease' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: selectedHousehold?.id === h.id ? '#0088c4' : '#e5e7eb', color: selectedHousehold?.id === h.id ? 'white' : '#6b7280', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '600', flexShrink: 0 }}>
                      {h.household_head_first_name?.[0]}{h.household_head_surname?.[0]}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontWeight: '500', color: '#1f2937', margin: 0, fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {h.household_head_first_name} {h.household_head_surname}
                      </p>
                      <p style={{ fontSize: '12px', color: '#6b7280', margin: '2px 0 0 0' }}>{h.hh_original_village_name}</p>
                    </div>
                    <ChevronRight size={16} color="#9ca3af" />
                  </div>
                </div>
              ))
            )}
          </div>
        </aside>

        {/* Main Panel */}
        <main style={{ flex: 1, overflow: 'auto', padding: '20px' }}>
          {!selectedHousehold ? (
            <WelcomeView stats={stats} villages={villages} />
          ) : (
            <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
              {/* Header Card */}
              <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '20px 24px', marginBottom: '20px', border: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ width: '56px', height: '56px', borderRadius: '12px', backgroundColor: '#0088c4', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: '600' }}>
                    {selectedHousehold.household_head_first_name?.[0]}{selectedHousehold.household_head_surname?.[0]}
                  </div>
                  <div>
                    <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#1f2937', margin: 0 }}>
                      {editMode ? editedData.household_head_first_name : selectedHousehold.household_head_first_name} {editMode ? editedData.household_head_surname : selectedHousehold.household_head_surname}
                    </h2>
                    <p style={{ fontSize: '14px', color: '#6b7280', margin: '4px 0 0 0' }}>
                      ID: {selectedHousehold.id_number} • {selectedHousehold.hh_original_village_name}
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
                      <button onClick={handleSave} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 16px', backgroundColor: '#16a34a', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '500', cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
                        <Save size={18} /> {saving ? 'Saving...' : 'Save'}
                      </button>
                      <button onClick={() => { setEditMode(false); setEditedData({ ...selectedHousehold }) }} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 16px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '500', cursor: 'pointer' }}>
                        <XCircle size={18} /> Cancel
                      </button>
                    </>
                  )}
                  <button onClick={handlePrint} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 16px', backgroundColor: '#0088c4', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '500', cursor: 'pointer' }}>
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
                  <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px 16px', backgroundColor: activeTab === tab.id ? '#0088c4' : 'transparent', color: activeTab === tab.id ? 'white' : '#6b7280', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '500', cursor: 'pointer', transition: 'all 0.15s ease' }}>
                    <tab.icon size={18} />
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              {activeTab === 'details' && (
                <DetailsTab 
                  data={editMode ? editedData : selectedHousehold} 
                  editMode={editMode} 
                  isAdmin={isAdmin}
                  onFieldChange={handleFieldChange}
                  onBeneficiaryChange={handleBeneficiaryChange}
                />
              )}

              {activeTab === 'assets' && (
                <AssetsTab 
                  assets={editMode ? editedData.household_assets : selectedHousehold.household_assets} 
                  editMode={editMode}
                  isAdmin={isAdmin}
                  onAssetChange={handleAssetChange}
                />
              )}

              {activeTab === 'documents' && (
                <DocumentsTab 
                  data={editMode ? editedData : selectedHousehold}
                  onUpload={handlePhotoUpload}
                />
              )}
            </div>
          )}
        </main>
      </div>

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
          .sidebar { position: fixed; left: ${sidebarOpen ? '0' : '-300px'}; top: 56px; bottom: 0; z-index: 50; transition: left 0.3s ease; box-shadow: ${sidebarOpen ? '4px 0 20px rgba(0,0,0,0.15)' : 'none'}; }
          .mobile-menu-btn { display: flex !important; }
          .user-name { display: none !important; }
        }
        @media print { body { display: none; } }
      `}</style>
    </div>
  )
}

// Welcome View with Stats
function WelcomeView({ stats, villages }) {
  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <StatCard label="Total Households" value={stats.total} subtext={`${villages.length} villages`} color="#0088c4" icon={Users} />
        <StatCard label="Verified" value={stats.verified} subtext="approved" color="#16a34a" icon={Check} />
        <StatCard label="Total Assets" value={stats.assets} subtext="registered" color="#8cc63f" icon={Home} />
      </div>
      <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '40px', textAlign: 'center', border: '1px solid #e5e7eb' }}>
        <div style={{ width: '80px', height: '80px', margin: '0 auto 20px', backgroundColor: '#f0f9ff', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <img src="/logo-llwdp.png" alt="LLWDSP III" style={{ width: '50px', height: '50px', objectFit: 'contain' }} />
        </div>
        <h2 style={{ fontSize: '24px', fontWeight: '600', color: '#1f2937', margin: '0 0 8px 0' }}>Welcome to CIMS</h2>
        <p style={{ color: '#6b7280', margin: '0 0 4px 0' }}>Compensation Information Management System</p>
        <p style={{ color: '#9ca3af', fontSize: '14px', margin: 0 }}>Select a beneficiary from the left panel to view their details</p>
      </div>
    </div>
  )
}

// Stat Card
function StatCard({ label, value, subtext, color, icon: Icon }) {
  return (
    <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '16px 20px', border: '1px solid #e5e7eb', cursor: 'pointer', transition: 'all 0.2s ease' }}
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

// Editable Field Component
function EditableField({ label, value, field, editMode, onChange, type = 'text' }) {
  return (
    <div>
      <p style={{ fontSize: '12px', color: '#6b7280', margin: '0 0 4px 0' }}>{label}</p>
      {editMode ? (
        <input
          type={type}
          value={value || ''}
          onChange={(e) => onChange(field, e.target.value)}
          style={{ width: '100%', padding: '8px 12px', border: '1px solid #0088c4', borderRadius: '6px', fontSize: '14px', outline: 'none', boxSizing: 'border-box', backgroundColor: '#f0f9ff' }}
        />
      ) : (
        <p style={{ fontSize: '14px', fontWeight: '500', color: value ? '#1f2937' : '#d1d5db', margin: 0 }}>{value || 'N/A'}</p>
      )}
    </div>
  )
}

// Details Tab
function DetailsTab({ data, editMode, isAdmin, onFieldChange, onBeneficiaryChange }) {
  return (
    <div style={{ display: 'grid', gap: '20px' }}>
      {/* Household Head */}
      <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '20px 24px', border: '1px solid #e5e7eb' }}>
        <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#0088c4', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <User size={20} /> Household Head Details
          {editMode && <Edit2 size={16} color="#f59e0b" style={{ marginLeft: 'auto' }} />}
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
          <EditableField label="First Name" value={data.household_head_first_name} field="household_head_first_name" editMode={editMode && isAdmin} onChange={onFieldChange} />
          <EditableField label="Surname" value={data.household_head_surname} field="household_head_surname" editMode={editMode && isAdmin} onChange={onFieldChange} />
          <EditableField label="Gender" value={data.gender} field="gender" editMode={editMode && isAdmin} onChange={onFieldChange} />
          <EditableField label="ID Type" value={data.type_of_identification} field="type_of_identification" editMode={editMode && isAdmin} onChange={onFieldChange} />
          <EditableField label="ID Number" value={data.id_number} field="id_number" editMode={editMode && isAdmin} onChange={onFieldChange} />
          <EditableField label="ID Expiry" value={data.expiry_date} field="expiry_date" editMode={editMode && isAdmin} onChange={onFieldChange} type="date" />
          <EditableField label="Phone" value={data.cellphone_no} field="cellphone_no" editMode={editMode && isAdmin} onChange={onFieldChange} />
          <EditableField label="Occupation" value={data.occupation_of_pap} field="occupation_of_pap" editMode={editMode && isAdmin} onChange={onFieldChange} />
          <EditableField label="Original Village" value={data.hh_original_village_name} field="hh_original_village_name" editMode={editMode && isAdmin} onChange={onFieldChange} />
          <EditableField label="Residential Village" value={data.hh_residential_village} field="hh_residential_village" editMode={editMode && isAdmin} onChange={onFieldChange} />
          <EditableField label="Community Council" value={data.community_council} field="community_council" editMode={editMode && isAdmin} onChange={onFieldChange} />
          <EditableField label="Route" value={`${data.route_code || ''} - ${data.route_name || ''}`} field="route" editMode={false} onChange={() => {}} />
        </div>
      </div>

      {/* Beneficiaries */}
      {data.beneficiaries?.length > 0 && (
        <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '20px 24px', border: '1px solid #e5e7eb' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#8cc63f', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Users size={20} /> Beneficiaries ({data.beneficiaries.length})
            {editMode && <Edit2 size={16} color="#f59e0b" style={{ marginLeft: 'auto' }} />}
          </h3>
          {data.beneficiaries.map((ben, idx) => (
            <div key={ben.id} style={{ padding: '16px', backgroundColor: '#f9fafb', borderRadius: '8px', marginBottom: idx < data.beneficiaries.length - 1 ? '12px' : 0 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px' }}>
                <EditableField label="First Name" value={ben.first_name} field="first_name" editMode={editMode && isAdmin} onChange={(f, v) => onBeneficiaryChange(idx, f, v)} />
                <EditableField label="Surname" value={ben.surname} field="surname" editMode={editMode && isAdmin} onChange={(f, v) => onBeneficiaryChange(idx, f, v)} />
                <EditableField label="ID Number" value={ben.id_number} field="id_number" editMode={editMode && isAdmin} onChange={(f, v) => onBeneficiaryChange(idx, f, v)} />
                <EditableField label="Phone" value={ben.cellphone_no} field="cellphone_no" editMode={editMode && isAdmin} onChange={(f, v) => onBeneficiaryChange(idx, f, v)} />
                <EditableField label="Village" value={ben.village_name} field="village_name" editMode={editMode && isAdmin} onChange={(f, v) => onBeneficiaryChange(idx, f, v)} />
                <EditableField label="Minor" value={ben.is_minor} field="is_minor" editMode={false} onChange={() => {}} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Co-owners */}
      {data.co_owners?.length > 0 && (
        <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '20px 24px', border: '1px solid #e5e7eb' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#f59e0b', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Users size={20} /> Co-Owners ({data.co_owners.length})
          </h3>
          {data.co_owners.map((co, idx) => (
            <div key={co.id} style={{ padding: '16px', backgroundColor: '#f9fafb', borderRadius: '8px', marginBottom: idx < data.co_owners.length - 1 ? '12px' : 0 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px' }}>
                <EditableField label="Name" value={`${co.first_name} ${co.surname}`} field="name" editMode={false} onChange={() => {}} />
                <EditableField label="ID Number" value={co.id_number} field="id_number" editMode={false} onChange={() => {}} />
                <EditableField label="Phone" value={co.cellphone_no} field="cellphone_no" editMode={false} onChange={() => {}} />
                <EditableField label="Address" value={co.physical_address} field="physical_address" editMode={false} onChange={() => {}} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Banking Details */}
      {data.banking_details?.length > 0 && (
        <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '20px 24px', border: '1px solid #e5e7eb' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#6366f1', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CreditCard size={20} /> Banking Details
          </h3>
          {data.banking_details.map((bank) => (
            <div key={bank.id} style={{ padding: '16px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px' }}>
                <EditableField label="Bank" value={bank.bank_name} field="bank_name" editMode={false} onChange={() => {}} />
                <EditableField label="Account Number" value={bank.account_number} field="account_number" editMode={false} onChange={() => {}} />
                <EditableField label="Account Holder" value={bank.account_holder_name} field="account_holder_name" editMode={false} onChange={() => {}} />
                <EditableField label="Account Type" value={bank.account_type} field="account_type" editMode={false} onChange={() => {}} />
                <EditableField label="Branch Code" value={bank.branch_code} field="branch_code" editMode={false} onChange={() => {}} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Assets Tab
function AssetsTab({ assets, editMode, isAdmin, onAssetChange }) {
  return (
    <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '20px 24px', border: '1px solid #e5e7eb' }}>
      <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#0088c4', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Home size={20} /> Registered Assets ({assets?.length || 0})
        {editMode && <Edit2 size={16} color="#f59e0b" style={{ marginLeft: 'auto' }} />}
      </h3>
      {assets?.length > 0 ? (
        <div style={{ display: 'grid', gap: '12px' }}>
          {assets.map((asset, idx) => (
            <div key={asset.id} style={{ padding: '16px', backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '8px', backgroundColor: '#e0f2fe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Home size={20} color="#0088c4" />
                </div>
                <div>
                  <p style={{ fontWeight: '600', color: '#1f2937', margin: 0 }}>{asset.asset_type}</p>
                  <p style={{ fontSize: '13px', color: '#6b7280', margin: '2px 0 0 0' }}>{asset.village}</p>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
                <EditableField label="Size" value={asset.asset_size} field="asset_size" editMode={editMode && isAdmin} onChange={(f, v) => onAssetChange(idx, f, v)} />
                <EditableField label="Unit" value={asset.size_unit || 'sqm'} field="size_unit" editMode={editMode && isAdmin} onChange={(f, v) => onAssetChange(idx, f, v)} />
                <EditableField label="GPS Coordinates" value={asset.gps_coordinates} field="gps_coordinates" editMode={editMode && isAdmin} onChange={(f, v) => onAssetChange(idx, f, v)} />
                <EditableField label="Easting" value={asset.easting} field="easting" editMode={editMode && isAdmin} onChange={(f, v) => onAssetChange(idx, f, v)} />
                <EditableField label="Northing" value={asset.northing} field="northing" editMode={editMode && isAdmin} onChange={(f, v) => onAssetChange(idx, f, v)} />
                <EditableField label="Acquisition" value={asset.acquisition_type} field="acquisition_type" editMode={editMode && isAdmin} onChange={(f, v) => onAssetChange(idx, f, v)} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p style={{ color: '#9ca3af', textAlign: 'center', padding: '40px' }}>No assets registered</p>
      )}
    </div>
  )
}

// Documents Tab with 4 Photo Frames + Map
function DocumentsTab({ data, onUpload }) {
  const photoFields = [
    { field: 'photograph_of_pap_url', label: 'PAP Photograph', icon: Camera },
    { field: 'id_document_url', label: 'ID Document', icon: FileText },
    { field: 'asset_photo_url', label: 'Asset Photo', icon: Home },
    { field: 'map_url', label: 'Location Map', icon: MapPin },
  ]

  return (
    <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '20px 24px', border: '1px solid #e5e7eb' }}>
      <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#0088c4', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <FileText size={20} /> Documents & Photos
      </h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        {photoFields.map(({ field, label, icon: Icon }) => (
          <PhotoFrame
            key={field}
            label={label}
            icon={Icon}
            url={data[field]}
            onUpload={(file) => onUpload(field, file)}
          />
        ))}
      </div>
    </div>
  )
}

// Photo Frame Component
function PhotoFrame({ label, icon: Icon, url, onUpload }) {
  const fileInputRef = useRef(null)

  const handleClick = () => {
    fileInputRef.current?.click()
  }

  const handleChange = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      onUpload(file)
    }
  }

  return (
    <div style={{ border: '1px solid #e5e7eb', borderRadius: '12px', overflow: 'hidden', backgroundColor: '#fafafa' }}>
      <div style={{ padding: '12px 16px', backgroundColor: 'white', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Icon size={18} color="#0088c4" />
          <span style={{ fontSize: '13px', fontWeight: '500', color: '#374151' }}>{label}</span>
        </div>
        <button onClick={handleClick} style={{ padding: '6px', backgroundColor: '#f59e0b', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Upload/Change">
          <Edit2 size={14} color="white" />
        </button>
        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleChange} style={{ display: 'none' }} />
      </div>
      <div style={{ height: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '12px' }}>
        {url ? (
          <img src={url} alt={label} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: '8px' }} />
        ) : (
          <div style={{ textAlign: 'center', color: '#9ca3af' }}>
            <Upload size={32} style={{ marginBottom: '8px', opacity: 0.5 }} />
            <p style={{ fontSize: '12px', margin: 0 }}>No {label.toLowerCase()}</p>
            <p style={{ fontSize: '11px', margin: '4px 0 0 0' }}>Click pencil to upload</p>
          </div>
        )}
      </div>
    </div>
  )
}

// Print View Component
function PrintView({ household, onClose }) {
  useEffect(() => {
    const handleAfterPrint = () => onClose()
    window.addEventListener('afterprint', handleAfterPrint)
    return () => window.removeEventListener('afterprint', handleAfterPrint)
  }, [onClose])

  return (
    <div style={{ backgroundColor: 'white', padding: '20px', minHeight: '100vh' }}>
      {/* Page 1 - Details */}
      <div style={{ maxWidth: '210mm', margin: '0 auto', padding: '10mm', fontSize: '11pt', lineHeight: '1.4' }}>
        {/* Header with Logos */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', paddingBottom: '12px', borderBottom: '2px solid #0088c4' }}>
          <img src="/logo-lesotho.png" alt="Lesotho" style={{ height: '50px' }} />
          <img src="/logo-llwdp.png" alt="LLWDSP III" style={{ height: '50px' }} />
          <img src="/logo-afdb.png" alt="AfDB" style={{ height: '45px' }} />
          <img src="/logo-4d.png" alt="4D" style={{ height: '40px' }} />
        </div>

        <h1 style={{ textAlign: 'center', fontSize: '16pt', margin: '0 0 4px 0', color: '#0088c4' }}>
          Asset Verification Form - Owner
        </h1>
        <p style={{ textAlign: 'center', fontSize: '12pt', margin: '0 0 16px 0', color: '#666' }}>
          Foromo E Ngoliso Ea Thepa
        </p>

        {/* Household Details */}
        <div style={{ marginBottom: '16px' }}>
          <h3 style={{ fontSize: '12pt', color: '#0088c4', borderBottom: '1px solid #0088c4', paddingBottom: '4px', marginBottom: '8px' }}>
            Household Head Details / Hlooho Ea Lelapa
          </h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10pt' }}>
            <tbody>
              <PrintRow label="Name / Lebitso" value={`${household.household_head_first_name} ${household.household_head_surname}`} />
              <PrintRow label="ID Number / Nomoro ea Boitsibiso" value={household.id_number} />
              <PrintRow label="Gender / Bong" value={household.gender} />
              <PrintRow label="Phone / Mohala" value={household.cellphone_no} />
              <PrintRow label="Village / Motse" value={household.hh_original_village_name} />
              <PrintRow label="Community Council / Lekhotla" value={household.community_council} />
              <PrintRow label="Occupation / Mosebetsi" value={household.occupation_of_pap} />
            </tbody>
          </table>
        </div>

        {/* Beneficiaries */}
        {household.beneficiaries?.length > 0 && (
          <div style={{ marginBottom: '16px' }}>
            <h3 style={{ fontSize: '12pt', color: '#8cc63f', borderBottom: '1px solid #8cc63f', paddingBottom: '4px', marginBottom: '8px' }}>
              Beneficiaries / Babaholo ({household.beneficiaries.length})
            </h3>
            {household.beneficiaries.map((ben, idx) => (
              <table key={ben.id} style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10pt', marginBottom: '8px' }}>
                <tbody>
                  <PrintRow label="Name" value={`${ben.first_name} ${ben.surname}`} />
                  <PrintRow label="ID Number" value={ben.id_number} />
                  <PrintRow label="Phone" value={ben.cellphone_no} />
                </tbody>
              </table>
            ))}
          </div>
        )}

        {/* Assets */}
        {household.household_assets?.length > 0 && (
          <div style={{ marginBottom: '16px' }}>
            <h3 style={{ fontSize: '12pt', color: '#0088c4', borderBottom: '1px solid #0088c4', paddingBottom: '4px', marginBottom: '8px' }}>
              Assets / Thepa ({household.household_assets.length})
            </h3>
            {household.household_assets.map((asset, idx) => (
              <table key={asset.id} style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10pt', marginBottom: '8px' }}>
                <tbody>
                  <PrintRow label="Type / Mofuta" value={asset.asset_type} />
                  <PrintRow label="Village / Motse" value={asset.village} />
                  <PrintRow label="Size / Boholo" value={asset.asset_size ? `${asset.asset_size} ${asset.size_unit || 'sqm'}` : 'N/A'} />
                  <PrintRow label="GPS" value={asset.gps_coordinates || 'N/A'} />
                </tbody>
              </table>
            ))}
          </div>
        )}

        {/* Banking */}
        {household.banking_details?.length > 0 && (
          <div>
            <h3 style={{ fontSize: '12pt', color: '#6366f1', borderBottom: '1px solid #6366f1', paddingBottom: '4px', marginBottom: '8px' }}>
              Banking Details / Banka
            </h3>
            {household.banking_details.map((bank) => (
              <table key={bank.id} style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10pt' }}>
                <tbody>
                  <PrintRow label="Bank" value={bank.bank_name} />
                  <PrintRow label="Account" value={bank.account_number} />
                  <PrintRow label="Holder" value={bank.account_holder_name} />
                </tbody>
              </table>
            ))}
          </div>
        )}
      </div>

      {/* Page Break */}
      <div style={{ pageBreakAfter: 'always' }}></div>

      {/* Page 2 - Photos */}
      <div style={{ maxWidth: '210mm', margin: '0 auto', padding: '10mm' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', paddingBottom: '12px', borderBottom: '2px solid #0088c4' }}>
          <img src="/logo-lesotho.png" alt="Lesotho" style={{ height: '40px' }} />
          <div style={{ textAlign: 'center' }}>
            <h2 style={{ fontSize: '14pt', margin: 0, color: '#0088c4' }}>Documents & Photos</h2>
            <p style={{ fontSize: '10pt', margin: 0, color: '#666' }}>{household.household_head_first_name} {household.household_head_surname}</p>
          </div>
          <img src="/logo-4d.png" alt="4D" style={{ height: '35px' }} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <PrintPhoto label="PAP Photograph" url={household.photograph_of_pap_url} />
          <PrintPhoto label="ID Document" url={household.id_document_url} />
          <PrintPhoto label="Asset Photo" url={household.asset_photo_url} />
          <PrintPhoto label="Location Map" url={household.map_url} />
        </div>

        {/* Signature Section */}
        <div style={{ marginTop: '24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
          <div>
            <p style={{ fontSize: '10pt', margin: '0 0 8px 0', color: '#666' }}>Verified By / Netefatsoa ke:</p>
            <div style={{ borderBottom: '1px solid #333', height: '40px' }}></div>
            <p style={{ fontSize: '9pt', margin: '4px 0 0 0', color: '#999' }}>Name & Signature</p>
          </div>
          <div>
            <p style={{ fontSize: '10pt', margin: '0 0 8px 0', color: '#666' }}>Date / Letsatsi:</p>
            <div style={{ borderBottom: '1px solid #333', height: '40px' }}></div>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          body * { visibility: hidden; }
          #print-view, #print-view * { visibility: visible; }
          #print-view { position: absolute; left: 0; top: 0; width: 100%; }
          @page { margin: 10mm; size: A4; }
        }
      `}</style>
    </div>
  )
}

function PrintRow({ label, value }) {
  return (
    <tr>
      <td style={{ padding: '4px 8px', border: '1px solid #ddd', fontWeight: '500', width: '40%', backgroundColor: '#f9fafb' }}>{label}</td>
      <td style={{ padding: '4px 8px', border: '1px solid #ddd' }}>{value || 'N/A'}</td>
    </tr>
  )
}

function PrintPhoto({ label, url }) {
  return (
    <div style={{ border: '1px solid #ddd', borderRadius: '8px', overflow: 'hidden' }}>
      <div style={{ padding: '8px 12px', backgroundColor: '#f0f9ff', borderBottom: '1px solid #ddd' }}>
        <p style={{ fontSize: '10pt', fontWeight: '500', margin: 0 }}>{label}</p>
      </div>
      <div style={{ height: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px', backgroundColor: '#fafafa' }}>
        {url ? (
          <img src={url} alt={label} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
        ) : (
          <p style={{ color: '#999', fontSize: '10pt' }}>No {label.toLowerCase()}</p>
        )}
      </div>
    </div>
  )
}
