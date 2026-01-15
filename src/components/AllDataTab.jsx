import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getHouseholds, getVillages, getRoutes } from '../lib/supabase'
import { 
  Search, ChevronDown, ChevronRight, Users, Home, 
  FileText, Download, AlertCircle, MapPin, Phone, 
  Calendar, CheckCircle, Clock, XCircle
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

  // Stats calculations
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

  return (
    <div className="space-y-6">
      {/* Stats Cards - Rekisa Style */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Households */}
        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">TOTAL HOUSEHOLDS</p>
              <p className="text-3xl font-bold mt-1" style={{ color: '#333' }}>{totalHouseholds}</p>
              <p className="text-sm mt-1" style={{ color: '#0088c4' }}>{villages.length} villages</p>
            </div>
            <div className="p-2 rounded-lg" style={{ backgroundColor: '#e8f4fc' }}>
              <Users size={20} style={{ color: '#0088c4' }} />
            </div>
          </div>
        </div>

        {/* Approved */}
        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">APPROVED</p>
              <p className="text-3xl font-bold mt-1" style={{ color: '#333' }}>{approvedCount}</p>
              <p className="text-sm mt-1" style={{ color: '#8cc63f' }}>verified</p>
            </div>
            <div className="p-2 rounded-lg" style={{ backgroundColor: '#e8f5e9' }}>
              <CheckCircle size={20} style={{ color: '#8cc63f' }} />
            </div>
          </div>
        </div>

        {/* Pending */}
        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">PENDING</p>
              <p className="text-3xl font-bold mt-1" style={{ color: '#333' }}>{pendingCount}</p>
              <p className="text-sm mt-1" style={{ color: '#f59e0b' }}>awaiting</p>
            </div>
            <div className="p-2 rounded-lg" style={{ backgroundColor: '#fef3c7' }}>
              <Clock size={20} style={{ color: '#f59e0b' }} />
            </div>
          </div>
        </div>

        {/* Total Assets */}
        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">TOTAL ASSETS</p>
              <p className="text-3xl font-bold mt-1" style={{ color: '#333' }}>{totalAssets}</p>
              <p className="text-sm mt-1" style={{ color: '#0088c4' }}>registered</p>
            </div>
            <div className="p-2 rounded-lg" style={{ backgroundColor: '#e8f4fc' }}>
              <Home size={20} style={{ color: '#0088c4' }} />
            </div>
          </div>
        </div>
      </div>

      {/* Households List Section */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-gray-100">
          <div className="flex flex-col lg:flex-row lg:items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg" style={{ backgroundColor: '#e8f4fc' }}>
                <FileText size={18} style={{ color: '#0088c4' }} />
              </div>
              <h2 className="font-semibold text-gray-800">Registered Households</h2>
            </div>
            
            <div className="flex-1 flex flex-col sm:flex-row gap-3">
              {/* Search */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder="Search by name or ID..."
                  value={filters.search}
                  onChange={(e) => setFilters(f => ({ ...f, search: e.target.value }))}
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none transition-all"
                  style={{ fontSize: '14px' }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#0088c4'
                    e.target.style.backgroundColor = '#fff'
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#e5e7eb'
                    e.target.style.backgroundColor = '#f9fafb'
                  }}
                />
              </div>

              {/* Filters */}
              <div className="flex flex-wrap gap-2">
                <select
                  value={filters.village}
                  onChange={(e) => setFilters(f => ({ ...f, village: e.target.value }))}
                  className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none"
                  style={{ fontSize: '14px' }}
                >
                  <option value="">All Villages</option>
                  {villages.map(v => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>

                <select
                  value={filters.approval_status}
                  onChange={(e) => setFilters(f => ({ ...f, approval_status: e.target.value }))}
                  className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none"
                  style={{ fontSize: '14px' }}
                >
                  <option value="">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>

                <button
                  onClick={exportCSV}
                  className="flex items-center gap-2 px-4 py-2.5 text-white rounded-lg text-sm font-medium transition-colors"
                  style={{ backgroundColor: '#8cc63f' }}
                  onMouseOver={(e) => e.target.style.backgroundColor = '#7ab536'}
                  onMouseOut={(e) => e.target.style.backgroundColor = '#8cc63f'}
                >
                  <Download size={16} />
                  Export
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="p-8 text-center">
            <div className="w-8 h-8 border-3 border-gray-200 rounded-full animate-spin mx-auto" style={{ borderTopColor: '#0088c4' }}></div>
            <p className="text-gray-500 mt-3 text-sm">Loading households...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="p-4 m-4 bg-red-50 border border-red-100 text-red-600 rounded-lg flex items-center gap-2 text-sm">
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        {/* Empty State */}
        {!loading && households.length === 0 && (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText size={24} className="text-gray-400" />
            </div>
            <p className="text-gray-500">No households found</p>
          </div>
        )}

        {/* Table */}
        {!loading && households.length > 0 && (
          <div className="divide-y divide-gray-100">
            {/* Table Header */}
            <div className="hidden md:grid grid-cols-12 gap-4 px-4 py-3 bg-gray-50 text-xs font-medium text-gray-500 uppercase tracking-wide">
              <div className="col-span-1"></div>
              <div className="col-span-3">Name</div>
              <div className="col-span-2">ID Number</div>
              <div className="col-span-2">Village</div>
              <div className="col-span-1">Assets</div>
              <div className="col-span-1">Status</div>
              <div className="col-span-2 text-right">Action</div>
            </div>

            {/* Rows */}
            {households.map(household => (
              <div key={household.id} className="hover:bg-gray-50 transition-colors">
                {/* Main Row */}
                <div 
                  className="grid grid-cols-12 gap-4 px-4 py-4 items-center cursor-pointer"
                  onClick={() => toggleRow(household.id)}
                >
                  <div className="col-span-1">
                    <button className="p-1 hover:bg-gray-100 rounded transition-colors">
                      {expandedRows.has(household.id) ? (
                        <ChevronDown size={18} className="text-gray-400" />
                      ) : (
                        <ChevronRight size={18} className="text-gray-400" />
                      )}
                    </button>
                  </div>
                  
                  <div className="col-span-3">
                    <p className="font-medium text-gray-800">
                      {household.household_head_first_name} {household.household_head_surname}
                    </p>
                    <p className="text-xs text-gray-500 md:hidden">
                      {household.hh_original_village_name}
                    </p>
                  </div>
                  
                  <div className="col-span-2 text-sm text-gray-600 hidden md:block">
                    {household.id_number}
                  </div>
                  
                  <div className="col-span-2 text-sm text-gray-600 hidden md:block">
                    {household.hh_original_village_name}
                  </div>
                  
                  <div className="col-span-1 hidden md:block">
                    <span 
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium"
                      style={{ backgroundColor: '#e8f4fc', color: '#0088c4' }}
                    >
                      {household.household_assets?.length || 0}
                    </span>
                  </div>
                  
                  <div className="col-span-1 hidden md:block">
                    {household.approval_status === 'approved' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: '#e8f5e9', color: '#16a34a' }}>
                        <CheckCircle size={12} /> Approved
                      </span>
                    ) : household.approval_status === 'rejected' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: '#fee2e2', color: '#dc2626' }}>
                        <XCircle size={12} /> Rejected
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: '#fef3c7', color: '#d97706' }}>
                        <Clock size={12} /> Pending
                      </span>
                    )}
                  </div>
                  
                  <div className="col-span-2 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        navigate(`/personal/${household.id}`)
                      }}
                      className="px-4 py-2 rounded-lg text-sm font-medium transition-colors border"
                      style={{ 
                        borderColor: '#0088c4', 
                        color: '#0088c4',
                      }}
                      onMouseOver={(e) => {
                        e.target.style.backgroundColor = '#0088c4'
                        e.target.style.color = '#fff'
                      }}
                      onMouseOut={(e) => {
                        e.target.style.backgroundColor = 'transparent'
                        e.target.style.color = '#0088c4'
                      }}
                    >
                      Generate Form
                    </button>
                  </div>
                </div>

                {/* Expanded Content */}
                {expandedRows.has(household.id) && (
                  <div className="px-4 pb-4 bg-gray-50 border-t border-gray-100">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4">
                      {/* Contact Info */}
                      <div className="bg-white rounded-lg p-4 border border-gray-100">
                        <h4 className="font-medium text-gray-700 mb-3 flex items-center gap-2">
                          <Phone size={16} style={{ color: '#0088c4' }} /> Contact
                        </h4>
                        <div className="space-y-2 text-sm">
                          <p><span className="text-gray-500">Phone:</span> {household.cellphone_no || 'N/A'}</p>
                          <p><span className="text-gray-500">Gender:</span> {household.gender}</p>
                          <p><span className="text-gray-500">ID Type:</span> {household.type_of_identification}</p>
                        </div>
                      </div>

                      {/* Beneficiaries */}
                      <div className="bg-white rounded-lg p-4 border border-gray-100">
                        <h4 className="font-medium text-gray-700 mb-3 flex items-center gap-2">
                          <Users size={16} style={{ color: '#8cc63f' }} /> Beneficiaries ({household.beneficiaries?.length || 0})
                        </h4>
                        {household.beneficiaries?.length > 0 ? (
                          <div className="space-y-2">
                            {household.beneficiaries.slice(0, 3).map(b => (
                              <p key={b.id} className="text-sm text-gray-600">{b.first_name} {b.surname}</p>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-400">None registered</p>
                        )}
                      </div>

                      {/* Assets */}
                      <div className="bg-white rounded-lg p-4 border border-gray-100">
                        <h4 className="font-medium text-gray-700 mb-3 flex items-center gap-2">
                          <Home size={16} style={{ color: '#0088c4' }} /> Assets ({household.household_assets?.length || 0})
                        </h4>
                        {household.household_assets?.length > 0 ? (
                          <div className="space-y-2">
                            {household.household_assets.slice(0, 3).map(a => (
                              <p key={a.id} className="text-sm text-gray-600">{a.asset_type}</p>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-400">None registered</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 text-sm text-gray-500">
          Showing {households.length} households
        </div>
      </div>
    </div>
  )
}
