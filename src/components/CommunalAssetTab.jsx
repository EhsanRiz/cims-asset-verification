import { useState, useEffect, useRef } from 'react'
import { getCommunalAssets, updateCommunalAsset, createCommunalAsset, getVillages } from '../lib/supabase'
import { useAuth } from '../App'
import { 
  Search, Save, Printer, Plus, AlertTriangle, 
  CheckCircle, MapPin, Users, Home
} from 'lucide-react'

const ASSET_TYPES = [
  'Residential Plot',
  'Business Plot', 
  'Agricultural Fields/Arable Land',
  'Food Garden',
  'Primary Dwelling House',
  'Outbuilding/Secondary Structure',
  'Kraal, stable, pigsty, Chicken coop',
  'Fencing',
  'Graves',
  'Fruit Trees',
  'Saplings (Fruit Trees)',
  'Timber Trees',
  'Thickets',
  'Agave/Aloes/Prickly pear',
  'Reeds',
  'Other (Specify)'
]

export default function CommunalAssetTab() {
  const { user } = useAuth()
  const printRef = useRef()
  
  const [villages, setVillages] = useState([])
  const [communalAssets, setCommunalAssets] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedVillage, setSelectedVillage] = useState(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  
  const [formData, setFormData] = useState({
    village_name: '',
    community_council: '',
    chief_name: '',
    chief_id_number: '',
    chief_phone: '',
    chief_address: '',
    councillor_name: '',
    councillor_surname: '',
    councillor_id_number: '',
    councillor_address: '',
    easting: '',
    northing: ''
  })
  
  const [assetRows, setAssetRows] = useState(
    ASSET_TYPES.map(type => ({
      asset_type: type,
      temporary_count: 0,
      permanent_count: 0
    }))
  )

  useEffect(() => {
    loadVillages()
    loadCommunalAssets()
  }, [])

  const loadVillages = async () => {
    try {
      const data = await getVillages()
      setVillages(data)
    } catch (err) {
      console.error('Error loading villages:', err)
    }
  }

  const loadCommunalAssets = async () => {
    try {
      setLoading(true)
      const data = await getCommunalAssets({ search: searchQuery })
      setCommunalAssets(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const debounce = setTimeout(() => {
      loadCommunalAssets()
    }, 300)
    return () => clearTimeout(debounce)
  }, [searchQuery])

  const selectVillage = (villageName) => {
    setSelectedVillage(villageName)
    
    const villageAssets = communalAssets.filter(a => a.village_name === villageName)
    
    if (villageAssets.length > 0) {
      const first = villageAssets[0]
      setFormData({
        village_name: villageName,
        community_council: first.community_council || '',
        chief_name: first.chief_name || '',
        chief_id_number: first.chief_id_number || '',
        chief_phone: first.chief_phone || '',
        chief_address: first.chief_address || '',
        councillor_name: first.councillor_name || '',
        councillor_surname: first.councillor_surname || '',
        councillor_id_number: first.councillor_id_number || '',
        councillor_address: first.councillor_address || '',
        easting: first.easting || '',
        northing: first.northing || ''
      })
      
      const newRows = ASSET_TYPES.map(type => {
        const existing = villageAssets.find(a => a.asset_type === type)
        return {
          id: existing?.id,
          asset_type: type,
          temporary_count: existing?.temporary_count || 0,
          permanent_count: existing?.permanent_count || 0
        }
      })
      setAssetRows(newRows)
    } else {
      setFormData({
        village_name: villageName,
        community_council: '',
        chief_name: '',
        chief_id_number: '',
        chief_phone: '',
        chief_address: '',
        councillor_name: '',
        councillor_surname: '',
        councillor_id_number: '',
        councillor_address: '',
        easting: '',
        northing: ''
      })
      setAssetRows(ASSET_TYPES.map(type => ({
        asset_type: type,
        temporary_count: 0,
        permanent_count: 0
      })))
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      setError(null)
      setSuccess(null)

      for (const row of assetRows) {
        if (row.temporary_count > 0 || row.permanent_count > 0 || row.id) {
          const assetData = {
            village_name: formData.village_name,
            community_council: formData.community_council,
            chief_name: formData.chief_name,
            chief_id_number: formData.chief_id_number,
            chief_phone: formData.chief_phone,
            chief_address: formData.chief_address,
            councillor_name: formData.councillor_name,
            councillor_surname: formData.councillor_surname,
            councillor_id_number: formData.councillor_id_number,
            councillor_address: formData.councillor_address,
            easting: formData.easting,
            northing: formData.northing,
            asset_type: row.asset_type,
            temporary_count: row.temporary_count,
            permanent_count: row.permanent_count,
            verification_status: 'verified',
            verified_at: new Date().toISOString(),
            verified_by: user.id
          }

          if (row.id) {
            await updateCommunalAsset(row.id, assetData)
          } else if (row.temporary_count > 0 || row.permanent_count > 0) {
            assetData.created_by = user.id
            await createCommunalAsset(assetData)
          }
        }
      }

      setSuccess('Communal assets saved successfully!')
      await loadCommunalAssets()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  const updateAssetRow = (index, field, value) => {
    const newRows = [...assetRows]
    newRows[index] = { ...newRows[index], [field]: parseInt(value) || 0 }
    setAssetRows(newRows)
  }

  const communalVillages = [...new Set(communalAssets.map(a => a.village_name))].sort()
  const filteredVillages = searchQuery 
    ? villages.filter(v => v.toLowerCase().includes(searchQuery.toLowerCase()))
    : villages

  const getAssetCount = (villageName) => {
    return communalAssets.filter(a => a.village_name === villageName && (a.temporary_count > 0 || a.permanent_count > 0)).length
  }

  return (
    <div className="flex gap-6">
      {/* Left Panel */}
      <div className="w-80 flex-shrink-0 no-print">
        <div className="bg-white rounded-xl shadow-sm p-4 sticky top-32">
          <h2 className="font-semibold text-4d-gray mb-4 flex items-center gap-2">
            <MapPin size={20} />
            Select Village
          </h2>
          
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search villages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-4d-blue outline-none"
            />
          </div>

          {communalVillages.length > 0 && (
            <div className="mb-4">
              <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">
                With Communal Assets
              </h3>
              <div className="border rounded-lg divide-y max-h-40 overflow-y-auto">
                {communalVillages.map(v => (
                  <button
                    key={v}
                    onClick={() => selectVillage(v)}
                    className={`w-full text-left p-3 hover:bg-gray-50 transition flex items-center justify-between ${
                      selectedVillage === v ? 'bg-4d-blue bg-opacity-10 border-l-4 border-4d-blue' : ''
                    }`}
                  >
                    <span className="font-medium text-4d-gray">{v}</span>
                    <span className="text-xs bg-4d-green text-white px-2 py-1 rounded">
                      {getAssetCount(v)} assets
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">
              All Villages ({filteredVillages.length})
            </h3>
            <div className="border rounded-lg divide-y max-h-60 overflow-y-auto">
              {filteredVillages.map(v => (
                <button
                  key={v}
                  onClick={() => selectVillage(v)}
                  className={`w-full text-left p-3 hover:bg-gray-50 transition ${
                    selectedVillage === v ? 'bg-4d-blue bg-opacity-10 border-l-4 border-4d-blue' : ''
                  }`}
                >
                  <span className="font-medium text-4d-gray">{v}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1">
        {!selectedVillage ? (
          <div className="bg-white rounded-xl shadow-sm p-8 text-center">
            <Users size={48} className="mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-600">Select a Village</h3>
            <p className="text-sm text-gray-500 mt-2">
              Choose a village to view or create communal asset verification form
            </p>
          </div>
        ) : (
          <>
            {/* Action Bar */}
            <div className="bg-white rounded-xl shadow-sm p-4 mb-4 flex items-center justify-between no-print">
              <h2 className="font-semibold text-4d-gray">
                Communal Assets: {selectedVillage}
              </h2>

              <div className="flex items-center gap-2">
                {error && (
                  <span className="text-red-600 text-sm flex items-center gap-1">
                    <AlertTriangle size={16} /> {error}
                  </span>
                )}
                {success && (
                  <span className="text-green-600 text-sm flex items-center gap-1">
                    <CheckCircle size={16} /> {success}
                  </span>
                )}
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-4d-green text-white rounded-lg hover:bg-green-600 transition disabled:opacity-50"
                >
                  {saving ? <div className="spinner border-white border-t-transparent"></div> : <Save size={18} />}
                  Save
                </button>
                <button
                  onClick={handlePrint}
                  className="flex items-center gap-2 px-4 py-2 bg-4d-blue text-white rounded-lg hover:bg-blue-600 transition"
                >
                  <Printer size={18} />
                  Print
                </button>
              </div>
            </div>

            {/* Printable Form */}
            <div ref={printRef} className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="print-page p-8 verification-form">
                {/* Header */}
                <div className="flex items-center justify-between mb-6 border-b pb-4">
                  <img src="/logo-lesotho.png" alt="Lesotho" className="h-16" />
                  <img src="/logo-llwdp.png" alt="LLWDP III" className="h-16" />
                  <img src="/logo-afdb.png" alt="AfDB" className="h-12" />
                  <img src="/logo-4d.png" alt="4D" className="h-10" />
                </div>

                {/* Title */}
                <div className="text-center mb-6">
                  <h1 className="text-xl font-bold text-4d-gray">Foromo e Netefatsang Ngoliso ea Thepa ea Sechaba</h1>
                  <h2 className="text-lg font-semibold text-gray-600">(Asset Verification Form for Communal Asset)</h2>
                </div>

                {/* Location Info */}
                <div className="mb-6">
                  <h3 className="font-bold text-4d-blue border-b-2 border-4d-blue pb-1 mb-3">
                    Sebaka moo Thepa e Amehileng (Asset Location)
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="form-label text-sm">Lebitso la Motse (Village Name)</label>
                      <div className="form-field bg-gray-50">{formData.village_name}</div>
                    </div>
                    <div>
                      <label className="form-label text-sm">Lebitso la K'hansele (Council)</label>
                      <input
                        type="text"
                        value={formData.community_council}
                        onChange={(e) => setFormData(f => ({ ...f, community_council: e.target.value }))}
                        className="form-field w-full bg-gray-50"
                        placeholder="Enter council name"
                      />
                    </div>
                  </div>
                </div>

                {/* Councillor Details */}
                <div className="mb-6">
                  <h3 className="font-bold text-4d-blue border-b-2 border-4d-blue pb-1 mb-3">
                    Mok'hanselara (Community Councillor's Details)
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="form-label text-sm">Fane (Surname)</label>
                      <input
                        type="text"
                        value={formData.councillor_surname}
                        onChange={(e) => setFormData(f => ({ ...f, councillor_surname: e.target.value }))}
                        className="form-field w-full bg-gray-50"
                      />
                    </div>
                    <div>
                      <label className="form-label text-sm">Lebitso (Name)</label>
                      <input
                        type="text"
                        value={formData.councillor_name}
                        onChange={(e) => setFormData(f => ({ ...f, councillor_name: e.target.value }))}
                        className="form-field w-full bg-gray-50"
                      />
                    </div>
                    <div>
                      <label className="form-label text-sm">Nomoro ea Boitsebiso (ID No.)</label>
                      <input
                        type="text"
                        value={formData.councillor_id_number}
                        onChange={(e) => setFormData(f => ({ ...f, councillor_id_number: e.target.value }))}
                        className="form-field w-full bg-gray-50"
                      />
                    </div>
                    <div>
                      <label className="form-label text-sm">Sebaka sa Bolulo (Physical Address)</label>
                      <input
                        type="text"
                        value={formData.councillor_address}
                        onChange={(e) => setFormData(f => ({ ...f, councillor_address: e.target.value }))}
                        className="form-field w-full bg-gray-50"
                      />
                    </div>
                  </div>
                </div>

                {/* Chief Details */}
                <div className="mb-6">
                  <h3 className="font-bold text-4d-blue border-b-2 border-4d-blue pb-1 mb-3">
                    Morena (Village Chief's Details)
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="form-label text-sm">Lebitso (Name)</label>
                      <input
                        type="text"
                        value={formData.chief_name}
                        onChange={(e) => setFormData(f => ({ ...f, chief_name: e.target.value }))}
                        className="form-field w-full bg-gray-50"
                      />
                    </div>
                    <div>
                      <label className="form-label text-sm">Nomoro ea Boitsebiso (ID No.)</label>
                      <input
                        type="text"
                        value={formData.chief_id_number}
                        onChange={(e) => setFormData(f => ({ ...f, chief_id_number: e.target.value }))}
                        className="form-field w-full bg-gray-50"
                      />
                    </div>
                    <div>
                      <label className="form-label text-sm">Sebaka sa Bolulo (Physical Address)</label>
                      <input
                        type="text"
                        value={formData.chief_address}
                        onChange={(e) => setFormData(f => ({ ...f, chief_address: e.target.value }))}
                        className="form-field w-full bg-gray-50"
                      />
                    </div>
                    <div>
                      <label className="form-label text-sm">Nomoro ea Mohala (Phone No.)</label>
                      <input
                        type="text"
                        value={formData.chief_phone}
                        onChange={(e) => setFormData(f => ({ ...f, chief_phone: e.target.value }))}
                        className="form-field w-full bg-gray-50"
                      />
                    </div>
                  </div>
                </div>

                {/* Coordinates */}
                <div className="mb-6">
                  <h3 className="font-bold text-4d-blue border-b-2 border-4d-blue pb-1 mb-3">
                    Thepa (Asset Details)
                  </h3>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="form-label text-sm">Bopotiele Bochabela (Easting)</label>
                      <input
                        type="text"
                        value={formData.easting}
                        onChange={(e) => setFormData(f => ({ ...f, easting: e.target.value }))}
                        className="form-field w-full bg-gray-50"
                      />
                    </div>
                    <div>
                      <label className="form-label text-sm">Bopotiele Bophirima (Northing)</label>
                      <input
                        type="text"
                        value={formData.northing}
                        onChange={(e) => setFormData(f => ({ ...f, northing: e.target.value }))}
                        className="form-field w-full bg-gray-50"
                      />
                    </div>
                  </div>
                </div>

                {/* Asset Table */}
                <div className="mb-6">
                  <table className="w-full border-collapse border border-gray-300 text-sm">
                    <thead>
                      <tr className="bg-4d-blue text-white">
                        <th className="border border-gray-300 p-2 text-left">ASSETS</th>
                        <th className="border border-gray-300 p-2 text-center w-32">
                          Thepa e amehileng nakoana<br/>(Temporary)
                        </th>
                        <th className="border border-gray-300 p-2 text-center w-32">
                          Thepa e ameheileng hoea hoile<br/>(Permanent)
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {assetRows.map((row, idx) => (
                        <tr key={idx} className={idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                          <td className="border border-gray-300 p-2">{row.asset_type}</td>
                          <td className="border border-gray-300 p-1">
                            <input
                              type="number"
                              min="0"
                              value={row.temporary_count}
                              onChange={(e) => updateAssetRow(idx, 'temporary_count', e.target.value)}
                              className="w-full text-center p-1 border-0 bg-transparent"
                            />
                          </td>
                          <td className="border border-gray-300 p-1">
                            <input
                              type="number"
                              min="0"
                              value={row.permanent_count}
                              onChange={(e) => updateAssetRow(idx, 'permanent_count', e.target.value)}
                              className="w-full text-center p-1 border-0 bg-transparent"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Declaration */}
                <div className="mb-6 text-sm leading-relaxed border-t pt-4">
                  <p className="mb-2">
                    <strong>We, the undersigned confirm that we have consented freely to participate in the Cadastral Survey and Asset Registration and confirm that we are the representatives of the community shown above, and eligible for any compensation to be paid by the Lesotho Lowlands Water Development and Sanitation III.</strong>
                  </p>
                  <p className="text-gray-600 italic text-xs">
                    (Rona re le baemeli ba sechaba, re netefatsa hore re lumetse ho ba karolo ea ts'ebetso ea bopotiele le ngoliso ea thepa, ka hoo re netefatsa hore thepa e hlalositsoeng kaholimo, e ngolisitsoe ka nepo mabitsong a sechaba sa bo rona se lokelang ho ts'elisoa ke Morero oa Metsi a Mabalane Lesotho.)
                  </p>
                </div>

                {/* Signatures */}
                <div className="grid grid-cols-2 gap-8 mt-8">
                  <div>
                    <p className="font-bold mb-4">MOK'HANSELARA (Councillor)</p>
                    <div className="border-b border-gray-400 mb-1 h-12"></div>
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>Lebitso</span>
                      <span>Motekeno</span>
                      <span>Letsatsi</span>
                    </div>
                  </div>
                  <div>
                    <p className="font-bold mb-4">MORENA (Chief)</p>
                    <div className="border-b border-gray-400 mb-1 h-12"></div>
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>Lebitso</span>
                      <span>Motekeno</span>
                      <span>Letsatsi</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-8 mt-6">
                  <div>
                    <p className="font-bold mb-4">Witnessed By</p>
                    <div className="border-b border-gray-400 mb-1 h-8"></div>
                  </div>
                  <div>
                    <p className="font-bold mb-4">Moemeli oa Sechaba (Community Rep)</p>
                    <div className="border-b border-gray-400 mb-1 h-8"></div>
                  </div>
                </div>

                {/* Footer */}
                <div className="mt-8 pt-4 border-t grid grid-cols-3 gap-4 text-xs text-center">
                  <div>
                    <p className="font-semibold">Prepared By: Consultant</p>
                  </div>
                  <div>
                    <p className="font-semibold">Witnessed By: Moemeli oa Sechaba</p>
                  </div>
                  <div>
                    <p className="font-semibold">Approved By: LLWDSP</p>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
