import { useState, useEffect } from 'react'
import { useAuth } from '../App'
import { getHouseholds, getVillages } from '../lib/supabase'
import { 
  Menu, X, LogOut, Search, Users, Home, CheckCircle, 
  Clock, ChevronRight, Phone, MapPin, CreditCard, FileText,
  User, Building, Printer, Save
} from 'lucide-react'

export default function Dashboard() {
  const { user, logout } = useAuth()
  const [households, setHouseholds] = useState([])
  const [villages, setVillages] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedHousehold, setSelectedHousehold] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('details') // details, assets, documents

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
    approved: households.filter(h => h.approval_status === 'approved').length,
    villages: villages.length,
    assets: households.reduce((acc, h) => acc + (h.household_assets?.length || 0), 0)
  }

  const StatCard = ({ label, value, subtext, color, icon: Icon }) => (
    <div 
      style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '16px 20px',
        border: '1px solid #e5e7eb',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
      }}
      onMouseOver={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)'
        e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.1)'
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.boxShadow = 'none'
      }}
    >
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

  const handlePrint = () => {
    window.print()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: '#f5f7fa' }}>
      {/* Header */}
      <header style={{ 
        backgroundColor: '#0088c4', 
        padding: '0 16px',
        flexShrink: 0,
        zIndex: 100,
      }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          height: '56px',
          maxWidth: '1400px',
          margin: '0 auto',
          width: '100%',
        }}>
          {/* Left - Logo & Title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              style={{
                display: 'none',
                padding: '8px',
                backgroundColor: 'rgba(255,255,255,0.1)',
                border: 'none',
                borderRadius: '8px',
                color: 'white',
                cursor: 'pointer',
              }}
              className="mobile-menu-btn"
            >
              {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
            <div style={{
              width: '36px',
              height: '36px',
              backgroundColor: 'rgba(255,255,255,0.2)',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <img src="/logo-llwdp.png" alt="CIMS" style={{ width: '28px', height: '28px', objectFit: 'contain' }} />
            </div>
            <div>
              <h1 style={{ color: 'white', fontSize: '16px', fontWeight: '600', margin: 0, lineHeight: 1.2 }}>
                CIMS
              </h1>
              <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '11px', margin: 0 }}>
                Asset Registration & Verification
              </p>
            </div>
          </div>

          {/* Right - User */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
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
              {user?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U'}
            </div>
            <span style={{ color: 'white', fontSize: '14px', display: 'none' }} className="user-name">{user?.full_name}</span>
            <button
              onClick={() => { logout(); window.location.href = '/login' }}
              style={{
                padding: '8px',
                backgroundColor: 'transparent',
                border: 'none',
                borderRadius: '8px',
                color: 'rgba(255,255,255,0.8)',
                cursor: 'pointer',
              }}
              title="Sign Out"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Sidebar - Beneficiary List */}
        <aside 
          style={{
            width: '320px',
            backgroundColor: 'white',
            borderRight: '1px solid #e5e7eb',
            display: 'flex',
            flexDirection: 'column',
            flexShrink: 0,
          }}
          className="sidebar"
        >
          {/* Sidebar Header */}
          <div style={{ padding: '16px', borderBottom: '1px solid #e5e7eb' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <Users size={20} color="#0088c4" />
              <h2 style={{ fontSize: '15px', fontWeight: '600', color: '#1f2937', margin: 0 }}>
                Beneficiaries
              </h2>
              <span style={{ 
                backgroundColor: '#0088c4', 
                color: 'white', 
                fontSize: '11px', 
                fontWeight: '600',
                padding: '2px 8px', 
                borderRadius: '10px',
                marginLeft: 'auto',
              }}>
                {filteredHouseholds.length}
              </span>
            </div>
            <div style={{ position: 'relative' }}>
              <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
              <input
                type="text"
                placeholder="Search beneficiaries..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px 10px 40px',
                  backgroundColor: '#f9fafb',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          {/* Beneficiary List */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {loading ? (
              <div style={{ padding: '40px', textAlign: 'center' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  border: '3px solid #e5e7eb',
                  borderTopColor: '#0088c4',
                  borderRadius: '50%',
                  margin: '0 auto',
                  animation: 'spin 1s linear infinite',
                }} />
                <p style={{ color: '#6b7280', marginTop: '12px', fontSize: '14px' }}>Loading...</p>
              </div>
            ) : (
              filteredHouseholds.map((h, idx) => (
                <div
                  key={h.id}
                  onClick={() => {
                    setSelectedHousehold(h)
                    setSidebarOpen(false)
                  }}
                  style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid #f3f4f6',
                    cursor: 'pointer',
                    backgroundColor: selectedHousehold?.id === h.id ? '#e0f2fe' : 'white',
                    borderLeft: selectedHousehold?.id === h.id ? '3px solid #0088c4' : '3px solid transparent',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseOver={(e) => {
                    if (selectedHousehold?.id !== h.id) {
                      e.currentTarget.style.backgroundColor = '#f9fafb'
                    }
                  }}
                  onMouseOut={(e) => {
                    if (selectedHousehold?.id !== h.id) {
                      e.currentTarget.style.backgroundColor = 'white'
                    }
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      backgroundColor: selectedHousehold?.id === h.id ? '#0088c4' : '#e5e7eb',
                      color: selectedHousehold?.id === h.id ? 'white' : '#6b7280',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '14px',
                      fontWeight: '600',
                      flexShrink: 0,
                    }}>
                      {h.household_head_first_name?.[0]}{h.household_head_surname?.[0]}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ 
                        fontWeight: '500', 
                        color: '#1f2937', 
                        margin: 0,
                        fontSize: '14px',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}>
                        {h.household_head_first_name} {h.household_head_surname}
                      </p>
                      <p style={{ fontSize: '12px', color: '#6b7280', margin: '2px 0 0 0' }}>
                        {h.hh_original_village_name}
                      </p>
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
            /* Dashboard View */
            <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
              {/* Stats */}
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                gap: '16px',
                marginBottom: '24px',
              }}>
                <StatCard label="Total Households" value={stats.total} subtext={`${stats.villages} villages`} color="#0088c4" icon={Users} />
                <StatCard label="Verified" value={stats.approved} subtext="approved" color="#16a34a" icon={CheckCircle} />
                <StatCard label="Total Assets" value={stats.assets} subtext="registered" color="#8cc63f" icon={Home} />
              </div>

              {/* Welcome Message */}
              <div style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                padding: '40px',
                textAlign: 'center',
                border: '1px solid #e5e7eb',
              }}>
                <div style={{
                  width: '80px',
                  height: '80px',
                  margin: '0 auto 20px',
                  backgroundColor: '#f0f9ff',
                  borderRadius: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <img src="/logo-llwdp.png" alt="LLWDSP III" style={{ width: '50px', height: '50px', objectFit: 'contain' }} />
                </div>
                <h2 style={{ fontSize: '24px', fontWeight: '600', color: '#1f2937', margin: '0 0 8px 0' }}>
                  Welcome to CIMS
                </h2>
                <p style={{ color: '#6b7280', margin: '0 0 4px 0' }}>
                  Compensation Information Management System
                </p>
                <p style={{ color: '#9ca3af', fontSize: '14px', margin: 0 }}>
                  Select a beneficiary from the left panel to view their details
                </p>
              </div>
            </div>
          ) : (
            /* Beneficiary Detail View */
            <div style={{ maxWidth: '1000px', margin: '0 auto' }} className="no-print">
              {/* Header */}
              <div style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                padding: '20px 24px',
                marginBottom: '20px',
                border: '1px solid #e5e7eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '16px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '12px',
                    backgroundColor: '#0088c4',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '20px',
                    fontWeight: '600',
                  }}>
                    {selectedHousehold.household_head_first_name?.[0]}{selectedHousehold.household_head_surname?.[0]}
                  </div>
                  <div>
                    <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#1f2937', margin: 0 }}>
                      {selectedHousehold.household_head_first_name} {selectedHousehold.household_head_surname}
                    </h2>
                    <p style={{ fontSize: '14px', color: '#6b7280', margin: '4px 0 0 0' }}>
                      ID: {selectedHousehold.id_number} • {selectedHousehold.hh_original_village_name}
                    </p>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={handlePrint}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '10px 16px',
                      backgroundColor: '#0088c4',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: '500',
                      cursor: 'pointer',
                    }}
                  >
                    <Printer size={18} />
                    Print Form
                  </button>
                </div>
              </div>

              {/* Tabs */}
              <div style={{ 
                display: 'flex', 
                gap: '4px', 
                marginBottom: '20px',
                backgroundColor: 'white',
                padding: '4px',
                borderRadius: '10px',
                border: '1px solid #e5e7eb',
              }}>
                {[
                  { id: 'details', label: 'Personal Details', icon: User },
                  { id: 'assets', label: 'Assets', icon: Home },
                  { id: 'documents', label: 'Documents', icon: FileText },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      padding: '10px 16px',
                      backgroundColor: activeTab === tab.id ? '#0088c4' : 'transparent',
                      color: activeTab === tab.id ? 'white' : '#6b7280',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: '500',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <tab.icon size={18} />
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              {activeTab === 'details' && (
                <div style={{ display: 'grid', gap: '20px' }}>
                  {/* Household Head */}
                  <div style={{
                    backgroundColor: 'white',
                    borderRadius: '12px',
                    padding: '20px 24px',
                    border: '1px solid #e5e7eb',
                  }}>
                    <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#0088c4', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <User size={20} /> Household Head Details
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                      <InfoField label="First Name" value={selectedHousehold.household_head_first_name} />
                      <InfoField label="Surname" value={selectedHousehold.household_head_surname} />
                      <InfoField label="Gender" value={selectedHousehold.gender} />
                      <InfoField label="ID Type" value={selectedHousehold.type_of_identification} />
                      <InfoField label="ID Number" value={selectedHousehold.id_number} />
                      <InfoField label="ID Expiry" value={selectedHousehold.expiry_date} />
                      <InfoField label="Phone" value={selectedHousehold.cellphone_no} />
                      <InfoField label="Occupation" value={selectedHousehold.occupation_of_pap} />
                      <InfoField label="Original Village" value={selectedHousehold.hh_original_village_name} />
                      <InfoField label="Residential Village" value={selectedHousehold.hh_residential_village} />
                      <InfoField label="Route" value={`${selectedHousehold.route_code} - ${selectedHousehold.route_name}`} />
                      <InfoField label="Community Council" value={selectedHousehold.community_council} />
                    </div>
                  </div>

                  {/* Beneficiaries */}
                  {selectedHousehold.beneficiaries?.length > 0 && (
                    <div style={{
                      backgroundColor: 'white',
                      borderRadius: '12px',
                      padding: '20px 24px',
                      border: '1px solid #e5e7eb',
                    }}>
                      <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#8cc63f', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Users size={20} /> Beneficiaries ({selectedHousehold.beneficiaries.length})
                      </h3>
                      {selectedHousehold.beneficiaries.map((ben, idx) => (
                        <div key={ben.id} style={{ 
                          padding: '16px', 
                          backgroundColor: '#f9fafb', 
                          borderRadius: '8px',
                          marginBottom: idx < selectedHousehold.beneficiaries.length - 1 ? '12px' : 0,
                        }}>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                            <InfoField label="Name" value={`${ben.first_name} ${ben.surname}`} small />
                            <InfoField label="ID Number" value={ben.id_number} small />
                            <InfoField label="Village" value={ben.village_name} small />
                            <InfoField label="Phone" value={ben.cellphone_no} small />
                            <InfoField label="Minor" value={ben.is_minor} small />
                            <InfoField label="DOB" value={ben.date_of_birth} small />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Co-owners */}
                  {selectedHousehold.co_owners?.length > 0 && (
                    <div style={{
                      backgroundColor: 'white',
                      borderRadius: '12px',
                      padding: '20px 24px',
                      border: '1px solid #e5e7eb',
                    }}>
                      <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#f59e0b', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Users size={20} /> Co-Owners ({selectedHousehold.co_owners.length})
                      </h3>
                      {selectedHousehold.co_owners.map((co, idx) => (
                        <div key={co.id} style={{ 
                          padding: '16px', 
                          backgroundColor: '#f9fafb', 
                          borderRadius: '8px',
                          marginBottom: idx < selectedHousehold.co_owners.length - 1 ? '12px' : 0,
                        }}>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                            <InfoField label="Name" value={`${co.first_name} ${co.surname}`} small />
                            <InfoField label="ID Number" value={co.id_number} small />
                            <InfoField label="Phone" value={co.cellphone_no} small />
                            <InfoField label="Address" value={co.physical_address} small />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Banking */}
                  {selectedHousehold.banking_details?.length > 0 && (
                    <div style={{
                      backgroundColor: 'white',
                      borderRadius: '12px',
                      padding: '20px 24px',
                      border: '1px solid #e5e7eb',
                    }}>
                      <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#6366f1', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <CreditCard size={20} /> Banking Details
                      </h3>
                      {selectedHousehold.banking_details.map((bank, idx) => (
                        <div key={bank.id} style={{ 
                          padding: '16px', 
                          backgroundColor: '#f9fafb', 
                          borderRadius: '8px',
                        }}>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                            <InfoField label="Bank" value={bank.bank_name} small />
                            <InfoField label="Account Number" value={bank.account_number} small />
                            <InfoField label="Account Holder" value={bank.account_holder_name} small />
                            <InfoField label="Account Type" value={bank.account_type} small />
                            <InfoField label="Branch Code" value={bank.branch_code} small />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'assets' && (
                <div style={{
                  backgroundColor: 'white',
                  borderRadius: '12px',
                  padding: '20px 24px',
                  border: '1px solid #e5e7eb',
                }}>
                  <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#0088c4', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Home size={20} /> Registered Assets ({selectedHousehold.household_assets?.length || 0})
                  </h3>
                  {selectedHousehold.household_assets?.length > 0 ? (
                    <div style={{ display: 'grid', gap: '12px' }}>
                      {selectedHousehold.household_assets.map((asset, idx) => (
                        <div key={asset.id} style={{ 
                          padding: '16px', 
                          backgroundColor: '#f9fafb', 
                          borderRadius: '8px',
                          border: '1px solid #e5e7eb',
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                            <div style={{
                              width: '40px',
                              height: '40px',
                              borderRadius: '8px',
                              backgroundColor: '#e0f2fe',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}>
                              <Home size={20} color="#0088c4" />
                            </div>
                            <div>
                              <p style={{ fontWeight: '600', color: '#1f2937', margin: 0 }}>{asset.asset_type}</p>
                              <p style={{ fontSize: '13px', color: '#6b7280', margin: '2px 0 0 0' }}>{asset.village}</p>
                            </div>
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px' }}>
                            <InfoField label="Size" value={asset.asset_size ? `${asset.asset_size} ${asset.size_unit || 'sqm'}` : 'N/A'} small />
                            <InfoField label="GPS" value={asset.gps_coordinates} small />
                            <InfoField label="Easting" value={asset.easting} small />
                            <InfoField label="Northing" value={asset.northing} small />
                            <InfoField label="Acquisition" value={asset.acquisition_type} small />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ color: '#9ca3af', textAlign: 'center', padding: '40px' }}>No assets registered</p>
                  )}
                </div>
              )}

              {activeTab === 'documents' && (
                <div style={{
                  backgroundColor: 'white',
                  borderRadius: '12px',
                  padding: '20px 24px',
                  border: '1px solid #e5e7eb',
                }}>
                  <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#0088c4', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FileText size={20} /> Documents & Photos
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                    <DocumentCard label="PAP Photograph" url={selectedHousehold.photograph_of_pap_url} />
                    <DocumentCard label="ID Document" url={selectedHousehold.id_document_url} />
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Footer */}
      <footer style={{ 
        backgroundColor: 'white', 
        borderTop: '1px solid #e5e7eb',
        padding: '10px 16px',
        flexShrink: 0,
      }}>
        <div style={{ 
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
        }}>
          <img src="/logo-4d.png" alt="4D" style={{ height: '18px', opacity: 0.6 }} />
          <span style={{ fontSize: '11px', color: '#9ca3af' }}>
            Developed by <span style={{ color: '#0088c4' }}>4D Climate Solutions</span> for LLWDSP III
          </span>
        </div>
      </footer>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @media (max-width: 768px) {
          .sidebar {
            position: fixed;
            left: ${sidebarOpen ? '0' : '-320px'};
            top: 56px;
            bottom: 0;
            z-index: 50;
            transition: left 0.3s ease;
            box-shadow: ${sidebarOpen ? '4px 0 20px rgba(0,0,0,0.15)' : 'none'};
          }
          .mobile-menu-btn {
            display: flex !important;
          }
          .user-name {
            display: none !important;
          }
        }
        @media (min-width: 769px) {
          .user-name {
            display: block !important;
          }
        }
        @media print {
          .no-print { display: none !important; }
          .sidebar { display: none !important; }
          header, footer { display: none !important; }
        }
      `}</style>
    </div>
  )
}

// Helper Components
function InfoField({ label, value, small }) {
  return (
    <div>
      <p style={{ fontSize: small ? '11px' : '12px', color: '#6b7280', margin: '0 0 2px 0' }}>{label}</p>
      <p style={{ fontSize: small ? '13px' : '14px', fontWeight: '500', color: value ? '#1f2937' : '#d1d5db', margin: 0 }}>
        {value || 'N/A'}
      </p>
    </div>
  )
}

function DocumentCard({ label, url }) {
  return (
    <div style={{
      padding: '16px',
      backgroundColor: '#f9fafb',
      borderRadius: '8px',
      border: '1px solid #e5e7eb',
      textAlign: 'center',
    }}>
      <p style={{ fontSize: '13px', fontWeight: '500', color: '#374151', margin: '0 0 12px 0' }}>{label}</p>
      {url ? (
        <img src={url} alt={label} style={{ 
          maxWidth: '100%', 
          maxHeight: '150px', 
          borderRadius: '8px',
          objectFit: 'contain',
        }} />
      ) : (
        <div style={{
          height: '120px',
          backgroundColor: '#e5e7eb',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#9ca3af',
          fontSize: '13px',
        }}>
          No document
        </div>
      )}
    </div>
  )
}
