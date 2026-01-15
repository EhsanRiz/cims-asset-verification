import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getHouseholds, getVillages, getRoutes } from '../lib/supabase'
import { 
  Search, ChevronDown, ChevronRight, Users, Home, 
  FileText, Download, AlertCircle, Phone, 
  CheckCircle, Clock, XCircle
} from 'lucide-react'

export default function AllDataTab() {
  const [households, setHouseholds] = useState([])
  const [villages, setVillages] = useState([])
  const [routes, setRoutes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [expandedRows, setExpandedRows] = useState(new Set())
  const [filters, setFilters] = useState({
    search: '',
    village: '',
    route_code: '',
    approval_status: ''
  })
  const navigate = useNavigate()

  useEffect(() => {
    loadData()
    loadFilters()
  }, [])

  useEffect(() => {
    const debounce = setTimeout(() => {
      loadData()
    }, 300)
    return () => clearTimeout(debounce)
  }, [filters])

  const loadData = async () => {
    try {
      setLoading(true)
      const data = await getHouseholds(filters)
      setHouseholds(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const loadFilters = async () => {
    try {
      const [villageData, routeData] = await Promise.all([
        getVillages(),
        getRoutes()
      ])
      setVillages(villageData)
      setRoutes(routeData)
    } catch (err) {
      console.error('Error loading filters:', err)
    }
  }

  const toggleRow = (id) => {
    const newExpanded = new Set(expandedRows)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedRows(newExpanded)
  }

  const totalHouseholds = households.length
  const approvedCount = households.filter(h => h.approval_status === 'approved').length
  const pendingCount = households.filter(h => h.approval_status === 'pending' || !h.approval_status).length
  const totalAssets = households.reduce((acc, h) => acc + (h.household_assets?.length || 0), 0)

  const exportCSV = () => {
    const headers = ['Name', 'ID Number', 'Village', 'Phone', 'Assets', 'Status']
    const rows = households.map(h => [
      `${h.household_head_first_name} ${h.household_head_surname}`,
      h.id_number,
      h.hh_original_village_name,
      h.cellphone_no || '',
      h.household_assets?.length || 0,
      h.approval_status || 'pending'
    ])
    
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'households_export.csv'
    a.click()
  }

  const cardStyle = {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '20px',
    border: '1px solid #e5e7eb',
    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
  }

  const statIconStyle = (bgColor) => ({
    padding: '8px',
    borderRadius: '8px',
    backgroundColor: bgColor,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={{ fontSize: '12px', fontWeight: '500', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Households</p>
              <p style={{ fontSize: '28px', fontWeight: '700', color: '#1f2937', marginTop: '4px' }}>{totalHouseholds}</p>
              <p style={{ fontSize: '13px', color: '#0088c4', marginTop: '4px' }}>{villages.length} villages</p>
            </div>
            <div style={statIconStyle('#e0f2fe')}>
              <Users size={20} color="#0088c4" />
            </div>
          </div>
        </div>

        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={{ fontSize: '12px', fontWeight: '500', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Approved</p>
              <p style={{ fontSize: '28px', fontWeight: '700', color: '#1f2937', marginTop: '4px' }}>{approvedCount}</p>
              <p style={{ fontSize: '13px', color: '#16a34a', marginTop: '4px' }}>verified</p>
            </div>
            <div style={statIconStyle('#dcfce7')}>
              <CheckCircle size={20} color="#16a34a" />
            </div>
          </div>
        </div>

        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={{ fontSize: '12px', fontWeight: '500', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pending</p>
              <p style={{ fontSize: '28px', fontWeight: '700', color: '#1f2937', marginTop: '4px' }}>{pendingCount}</p>
              <p style={{ fontSize: '13px', color: '#d97706', marginTop: '4px' }}>awaiting</p>
            </div>
            <div style={statIconStyle('#fef3c7')}>
              <Clock size={20} color="#d97706" />
            </div>
          </div>
        </div>

        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={{ fontSize: '12px', fontWeight: '500', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Assets</p>
              <p style={{ fontSize: '28px', fontWeight: '700', color: '#1f2937', marginTop: '4px' }}>{totalAssets}</p>
              <p style={{ fontSize: '13px', color: '#0088c4', marginTop: '4px' }}>registered</p>
            </div>
            <div style={statIconStyle('#e0f2fe')}>
              <Home size={20} color="#0088c4" />
            </div>
          </div>
        </div>
      </div>

      {/* Households List */}
      <div style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={statIconStyle('#e0f2fe')}>
                <FileText size={18} color="#0088c4" />
              </div>
              <h2 style={{ fontWeight: '600', color: '#1f2937', margin: 0 }}>Registered Households</h2>
            </div>
            
            <div style={{ flex: 1, display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'flex-end' }}>
              <div style={{ position: 'relative' }}>
                <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                <input
                  type="text"
                  placeholder="Search..."
                  value={filters.search}
                  onChange={(e) => setFilters(f => ({ ...f, search: e.target.value }))}
                  style={{
                    paddingLeft: '40px',
                    paddingRight: '12px',
                    paddingTop: '10px',
                    paddingBottom: '10px',
                    backgroundColor: '#f9fafb',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '14px',
                    outline: 'none',
                    width: '200px',
                  }}
                />
              </div>

              <select
                value={filters.village}
                onChange={(e) => setFilters(f => ({ ...f, village: e.target.value }))}
                style={{
                  padding: '10px 12px',
                  backgroundColor: '#f9fafb',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '14px',
                  outline: 'none',
                }}
              >
                <option value="">All Villages</option>
                {villages.map(v => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>

              <select
                value={filters.approval_status}
                onChange={(e) => setFilters(f => ({ ...f, approval_status: e.target.value }))}
                style={{
                  padding: '10px 12px',
                  backgroundColor: '#f9fafb',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '14px',
                  outline: 'none',
                }}
              >
                <option value="">All Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>

              <button
                onClick={exportCSV}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '10px 16px',
                  backgroundColor: '#8cc63f',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                }}
              >
                <Download size={16} />
                Export
              </button>
            </div>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div style={{ padding: '48px', textAlign: 'center' }}>
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
        )}

        {/* Error */}
        {error && (
          <div style={{ margin: '16px', padding: '12px 16px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#dc2626', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        {/* Empty */}
        {!loading && households.length === 0 && (
          <div style={{ padding: '48px', textAlign: 'center' }}>
            <FileText size={32} color="#d1d5db" style={{ margin: '0 auto 12px' }} />
            <p style={{ color: '#6b7280' }}>No households found</p>
          </div>
        )}

        {/* Rows */}
        {!loading && households.length > 0 && (
          <div>
            {households.map((household, idx) => (
              <div key={household.id} style={{ borderTop: idx > 0 ? '1px solid #f3f4f6' : 'none' }}>
                <div 
                  onClick={() => toggleRow(household.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '16px 20px',
                    cursor: 'pointer',
                    backgroundColor: expandedRows.has(household.id) ? '#f9fafb' : 'white',
                  }}
                >
                  <div style={{ marginRight: '12px', color: '#9ca3af' }}>
                    {expandedRows.has(household.id) ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                  </div>
                  
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: '500', color: '#1f2937', margin: 0 }}>
                      {household.household_head_first_name} {household.household_head_surname}
                    </p>
                    <p style={{ fontSize: '13px', color: '#6b7280', margin: '2px 0 0 0' }}>
                      ID: {household.id_number} • {household.hh_original_village_name}
                    </p>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{
                      padding: '4px 10px',
                      borderRadius: '9999px',
                      fontSize: '12px',
                      fontWeight: '500',
                      backgroundColor: '#e0f2fe',
                      color: '#0088c4',
                    }}>
                      {household.household_assets?.length || 0} assets
                    </span>

                    {household.approval_status === 'approved' ? (
                      <span style={{ padding: '4px 10px', borderRadius: '9999px', fontSize: '12px', fontWeight: '500', backgroundColor: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <CheckCircle size={12} /> Approved
                      </span>
                    ) : household.approval_status === 'rejected' ? (
                      <span style={{ padding: '4px 10px', borderRadius: '9999px', fontSize: '12px', fontWeight: '500', backgroundColor: '#fee2e2', color: '#dc2626', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <XCircle size={12} /> Rejected
                      </span>
                    ) : (
                      <span style={{ padding: '4px 10px', borderRadius: '9999px', fontSize: '12px', fontWeight: '500', backgroundColor: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={12} /> Pending
                      </span>
                    )}

                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        navigate(`/personal/${household.id}`)
                      }}
                      style={{
                        padding: '8px 16px',
                        border: '1px solid #0088c4',
                        borderRadius: '8px',
                        backgroundColor: 'white',
                        color: '#0088c4',
                        fontSize: '13px',
                        fontWeight: '500',
                        cursor: 'pointer',
                      }}
                    >
                      Generate Form
                    </button>
                  </div>
                </div>

                {/* Expanded */}
                {expandedRows.has(household.id) && (
                  <div style={{ padding: '0 20px 20px 52px', backgroundColor: '#f9fafb' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                      <div style={{ backgroundColor: 'white', padding: '16px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                        <h4 style={{ fontSize: '13px', fontWeight: '600', color: '#374151', margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Phone size={14} color="#0088c4" /> Contact
                        </h4>
                        <p style={{ fontSize: '13px', color: '#4b5563', margin: '4px 0' }}>Phone: {household.cellphone_no || 'N/A'}</p>
                        <p style={{ fontSize: '13px', color: '#4b5563', margin: '4px 0' }}>Gender: {household.gender}</p>
                      </div>
                      
                      <div style={{ backgroundColor: 'white', padding: '16px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                        <h4 style={{ fontSize: '13px', fontWeight: '600', color: '#374151', margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Users size={14} color="#8cc63f" /> Beneficiaries ({household.beneficiaries?.length || 0})
                        </h4>
                        {household.beneficiaries?.slice(0, 2).map(b => (
                          <p key={b.id} style={{ fontSize: '13px', color: '#4b5563', margin: '4px 0' }}>{b.first_name} {b.surname}</p>
                        )) || <p style={{ fontSize: '13px', color: '#9ca3af' }}>None</p>}
                      </div>

                      <div style={{ backgroundColor: 'white', padding: '16px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                        <h4 style={{ fontSize: '13px', fontWeight: '600', color: '#374151', margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Home size={14} color="#0088c4" /> Assets ({household.household_assets?.length || 0})
                        </h4>
                        {household.household_assets?.slice(0, 2).map(a => (
                          <p key={a.id} style={{ fontSize: '13px', color: '#4b5563', margin: '4px 0' }}>{a.asset_type}</p>
                        )) || <p style={{ fontSize: '13px', color: '#9ca3af' }}>None</p>}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div style={{ padding: '12px 20px', backgroundColor: '#f9fafb', borderTop: '1px solid #e5e7eb', fontSize: '13px', color: '#6b7280' }}>
          Showing {households.length} households
        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
