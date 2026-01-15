import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getHouseholds, getVillages, getRoutes } from '../lib/supabase'
import { 
  Search, ChevronDown, ChevronRight, Users, Home, 
  FileText, Filter, Download, AlertCircle, CheckCircle,
  Clock, MapPin, Phone, CreditCard
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

  const getCompleteness = (household) => {
    let total = 10
    let filled = 0
    if (household.household_head_first_name) filled++
    if (household.household_head_surname) filled++
    if (household.id_number) filled++
    if (household.cellphone_no) filled++
    if (household.hh_original_village_name) filled++
    if (household.hh_residential_village) filled++
    if (household.community_council) filled++
    if (household.photograph_of_pap_url) filled++
    if (household.id_document_url) filled++
    if (household.household_assets?.length > 0) filled++
    return Math.round((filled / total) * 100)
  }

  const getStatusBadge = (status) => {
    const styles = {
      approved: 'bg-green-100 text-green-700',
      pending: 'bg-yellow-100 text-yellow-700',
      rejected: 'bg-red-100 text-red-700'
    }
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || styles.pending}`}>
        {status || 'pending'}
      </span>
    )
  }

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
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search by name or ID number..."
              value={filters.search}
              onChange={(e) => setFilters(f => ({ ...f, search: e.target.value }))}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-4d-blue focus:border-transparent outline-none"
            />
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-2">
            <select
              value={filters.village}
              onChange={(e) => setFilters(f => ({ ...f, village: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-4d-blue outline-none"
            >
              <option value="">All Villages</option>
              {villages.map(v => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>

            <select
              value={filters.route_code}
              onChange={(e) => setFilters(f => ({ ...f, route_code: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-4d-blue outline-none"
            >
              <option value="">All Routes</option>
              {routes.map(r => (
                <option key={r.route_code} value={r.route_code}>
                  {r.route_code} - {r.route_name}
                </option>
              ))}
            </select>

            <select
              value={filters.approval_status}
              onChange={(e) => setFilters(f => ({ ...f, approval_status: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-4d-blue outline-none"
            >
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>

            <button
              onClick={exportCSV}
              className="flex items-center gap-2 px-4 py-2 bg-4d-green text-white rounded-lg hover:bg-green-600 transition"
            >
              <Download size={18} />
              Export
            </button>
          </div>
        </div>
      </div>

      {/* Results count */}
      <div className="flex items-center justify-between text-sm text-gray-600">
        <span>Showing {households.length} households</span>
        {loading && <span className="flex items-center gap-2"><div className="spinner"></div> Loading...</span>}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
          <AlertCircle size={20} />
          {error}
        </div>
      )}

      {/* Data Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {households.length === 0 && !loading ? (
          <div className="p-8 text-center text-gray-500">
            No households found matching your criteria
          </div>
        ) : (
          <div className="divide-y">
            {households.map(household => (
              <div key={household.id} className="hover:bg-gray-50">
                {/* Main Row */}
                <div 
                  className="flex items-center gap-4 p-4 cursor-pointer"
                  onClick={() => toggleRow(household.id)}
                >
                  <button className="text-gray-400 hover:text-4d-blue">
                    {expandedRows.has(household.id) ? (
                      <ChevronDown size={20} />
                    ) : (
                      <ChevronRight size={20} />
                    )}
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-4d-gray truncate">
                        {household.household_head_first_name} {household.household_head_surname}
                      </h3>
                      {getStatusBadge(household.approval_status)}
                    </div>
                    <p className="text-sm text-gray-500 truncate">
                      ID: {household.id_number} • {household.hh_original_village_name}
                    </p>
                  </div>

                  <div className="hidden md:flex items-center gap-6 text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                      <Home size={16} />
                      <span>{household.household_assets?.length || 0} assets</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Users size={16} />
                      <span>{household.beneficiaries?.length || 0} beneficiaries</span>
                    </div>
                    <div className="w-20">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span>{getCompleteness(household)}%</span>
                      </div>
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${getCompleteness(household) === 100 ? 'bg-4d-green' : 'bg-4d-blue'}`}
                          style={{ width: `${getCompleteness(household)}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      navigate(`/personal/${household.id}`)
                    }}
                    className="px-3 py-1 text-4d-blue hover:bg-4d-blue hover:text-white rounded-lg transition text-sm font-medium"
                  >
                    Generate Form
                  </button>
                </div>

                {/* Expanded Content */}
                {expandedRows.has(household.id) && (
                  <div className="px-4 pb-4 ml-10 bg-gray-50 rounded-b-lg">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
                      {/* Basic Info */}
                      <div className="space-y-2">
                        <h4 className="font-semibold text-4d-gray flex items-center gap-2">
                          <Users size={16} /> Household Details
                        </h4>
                        <div className="text-sm space-y-1">
                          <p><span className="text-gray-500">Gender:</span> {household.gender}</p>
                          <p><span className="text-gray-500">ID Type:</span> {household.type_of_identification}</p>
                          <p><span className="text-gray-500">Residential Village:</span> {household.hh_residential_village}</p>
                          <p><span className="text-gray-500">Occupation:</span> {household.occupation_of_pap || <span className="text-yellow-600">Missing</span>}</p>
                          <p><span className="text-gray-500">Phone:</span> {household.cellphone_no || <span className="text-yellow-600">Missing</span>}</p>
                          <p><span className="text-gray-500">Community Council:</span> {household.community_council || <span className="text-yellow-600">Missing</span>}</p>
                        </div>
                      </div>

                      {/* Beneficiaries */}
                      <div className="space-y-2">
                        <h4 className="font-semibold text-4d-gray flex items-center gap-2">
                          <Users size={16} /> Beneficiaries ({household.beneficiaries?.length || 0})
                        </h4>
                        {household.beneficiaries?.length > 0 ? (
                          <ul className="text-sm space-y-2">
                            {household.beneficiaries.map(b => (
                              <li key={b.id} className="bg-white p-2 rounded border">
                                <p className="font-medium">{b.first_name} {b.surname}</p>
                                <p className="text-gray-500 text-xs">ID: {b.id_number}</p>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-sm text-gray-500">No beneficiaries registered</p>
                        )}
                      </div>

                      {/* Co-owners */}
                      <div className="space-y-2">
                        <h4 className="font-semibold text-4d-gray flex items-center gap-2">
                          <Users size={16} /> Co-owners ({household.co_owners?.length || 0})
                        </h4>
                        {household.co_owners?.length > 0 ? (
                          <ul className="text-sm space-y-2">
                            {household.co_owners.map(c => (
                              <li key={c.id} className="bg-white p-2 rounded border">
                                <p className="font-medium">{c.first_name} {c.surname}</p>
                                <p className="text-gray-500 text-xs">ID: {c.id_number}</p>
                                <p className="text-gray-500 text-xs">Phone: {c.cellphone_no || 'N/A'}</p>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-sm text-gray-500">No co-owners registered</p>
                        )}
                      </div>

                      {/* Assets */}
                      <div className="space-y-2 md:col-span-2 lg:col-span-3">
                        <h4 className="font-semibold text-4d-gray flex items-center gap-2">
                          <Home size={16} /> Assets ({household.household_assets?.length || 0})
                        </h4>
                        {household.household_assets?.length > 0 ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                            {household.household_assets.map(a => (
                              <div key={a.id} className="bg-white p-3 rounded border">
                                <p className="font-medium">{a.asset_type}</p>
                                <p className="text-gray-500 text-xs flex items-center gap-1">
                                  <MapPin size={12} /> {a.village}
                                </p>
                                <p className="text-gray-500 text-xs">
                                  GPS: {a.gps_coordinates || <span className="text-yellow-600">Missing</span>}
                                </p>
                                <p className="text-gray-500 text-xs">
                                  Size: {a.asset_size ? `${a.asset_size} ${a.size_unit || 'sqm'}` : <span className="text-yellow-600">Missing</span>}
                                </p>
                                <p className="text-gray-500 text-xs">
                                  Type: {a.acquisition_type || <span className="text-yellow-600">Missing</span>}
                                </p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500">No assets registered</p>
                        )}
                      </div>

                      {/* Banking */}
                      {household.banking_details?.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="font-semibold text-4d-gray flex items-center gap-2">
                            <CreditCard size={16} /> Banking Details
                          </h4>
                          {household.banking_details.map(b => (
                            <div key={b.id} className="bg-white p-2 rounded border text-sm">
                              <p className="font-medium">{b.bank_name}</p>
                              <p className="text-gray-500 text-xs">Account: {b.account_number}</p>
                              <p className="text-gray-500 text-xs">Holder: {b.account_holder_name}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
