import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getHouseholds, getHouseholdById, updateHousehold, updateHouseholdAsset, updateCoOwner } from '../lib/supabase'
import { useAuth } from '../App'
import { 
  Search, Save, Printer, ArrowLeft, AlertTriangle, 
  CheckCircle, Upload, Camera, User, MapPin, FileText
} from 'lucide-react'

export default function PersonalAssetTab() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const printRef = useRef()
  
  const [searchResults, setSearchResults] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedHousehold, setSelectedHousehold] = useState(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  
  // Editable form data
  const [formData, setFormData] = useState({})
  const [assetData, setAssetData] = useState([])
  const [coOwnerData, setCoOwnerData] = useState([])

  useEffect(() => {
    if (id) {
      loadHousehold(id)
    }
  }, [id])

  useEffect(() => {
    if (searchQuery.length >= 2) {
      searchHouseholds()
    } else {
      setSearchResults([])
    }
  }, [searchQuery])

  const searchHouseholds = async () => {
    try {
      const data = await getHouseholds({ search: searchQuery })
      setSearchResults(data.slice(0, 10))
    } catch (err) {
      console.error('Search error:', err)
    }
  }

  const loadHousehold = async (householdId) => {
    try {
      setLoading(true)
      setError(null)
      const data = await getHouseholdById(householdId)
      setSelectedHousehold(data)
      setFormData({
        community_council: data.community_council || '',
        cellphone_no: data.cellphone_no || '',
        id_document_url: data.id_document_url || '',
        photograph_of_pap_url: data.photograph_of_pap_url || ''
      })
      setAssetData(data.household_assets?.map(a => ({
        id: a.id,
        asset_size: a.asset_size || '',
        size_unit: a.size_unit || 'sqm',
        easting: a.easting || '',
        northing: a.northing || '',
        acquisition_type: a.acquisition_type || ''
      })) || [])
      setCoOwnerData(data.co_owners?.map(c => ({
        id: c.id,
        id_document_url: c.id_document_url || ''
      })) || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const selectHousehold = (household) => {
    navigate(`/personal/${household.id}`)
    setSearchQuery('')
    setSearchResults([])
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      setError(null)
      setSuccess(null)

      // Update household
      await updateHousehold(selectedHousehold.id, {
        community_council: formData.community_council,
        cellphone_no: formData.cellphone_no,
        id_document_url: formData.id_document_url,
        photograph_of_pap_url: formData.photograph_of_pap_url,
        verification_status: 'verified',
        verified_at: new Date().toISOString(),
        verified_by: user.id
      })

      // Update assets
      for (const asset of assetData) {
        await updateHouseholdAsset(asset.id, {
          asset_size: asset.asset_size,
          size_unit: asset.size_unit,
          easting: asset.easting,
          northing: asset.northing,
          acquisition_type: asset.acquisition_type
        })
      }

      // Update co-owners
      for (const coOwner of coOwnerData) {
        await updateCoOwner(coOwner.id, {
          id_document_url: coOwner.id_document_url
        })
      }

      setSuccess('Changes saved successfully!')
      await loadHousehold(selectedHousehold.id)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  const updateAsset = (index, field, value) => {
    const newAssets = [...assetData]
    newAssets[index] = { ...newAssets[index], [field]: value }
    setAssetData(newAssets)
  }

  const updateCoOwner = (index, field, value) => {
    const newCoOwners = [...coOwnerData]
    newCoOwners[index] = { ...newCoOwners[index], [field]: value }
    setCoOwnerData(newCoOwners)
  }

  const isMissing = (value) => !value || value.trim() === ''

  return (
    <div className="flex gap-6">
      {/* Left Panel - Search */}
      <div className="w-80 flex-shrink-0 no-print">
        <div className="bg-white rounded-xl shadow-sm p-4 sticky top-32">
          <h2 className="font-semibold text-4d-gray mb-4 flex items-center gap-2">
            <Search size={20} />
            Search PAP
          </h2>
          
          <div className="relative">
            <input
              type="text"
              placeholder="Search by name or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-4d-blue outline-none"
            />
          </div>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="mt-2 border rounded-lg divide-y max-h-96 overflow-y-auto">
              {searchResults.map(h => (
                <button
                  key={h.id}
                  onClick={() => selectHousehold(h)}
                  className={`w-full text-left p-3 hover:bg-gray-50 transition ${
                    selectedHousehold?.id === h.id ? 'bg-4d-blue bg-opacity-10 border-l-4 border-4d-blue' : ''
                  }`}
                >
                  <p className="font-medium text-4d-gray">
                    {h.household_head_first_name} {h.household_head_surname}
                  </p>
                  <p className="text-xs text-gray-500">
                    ID: {h.id_number}
                  </p>
                  <p className="text-xs text-gray-500">
                    {h.hh_original_village_name}
                  </p>
                </button>
              ))}
            </div>
          )}

          {searchQuery.length >= 2 && searchResults.length === 0 && (
            <p className="mt-2 text-sm text-gray-500 text-center py-4">
              No results found
            </p>
          )}
        </div>
      </div>

      {/* Right Panel - Form Preview */}
      <div className="flex-1">
        {!selectedHousehold ? (
          <div className="bg-white rounded-xl shadow-sm p-8 text-center">
            <FileText size={48} className="mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-600">Select a PAP to view form</h3>
            <p className="text-sm text-gray-500 mt-2">
              Search for a Project Affected Person to generate their verification form
            </p>
          </div>
        ) : loading ? (
          <div className="bg-white rounded-xl shadow-sm p-8 text-center">
            <div className="spinner mx-auto mb-4"></div>
            <p className="text-gray-500">Loading household data...</p>
          </div>
        ) : (
          <>
            {/* Action Bar */}
            <div className="bg-white rounded-xl shadow-sm p-4 mb-4 flex items-center justify-between no-print">
              <button
                onClick={() => {
                  setSelectedHousehold(null)
                  navigate('/personal')
                }}
                className="flex items-center gap-2 text-gray-600 hover:text-4d-blue"
              >
                <ArrowLeft size={20} />
                Back to search
              </button>

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
                  Save Changes
                </button>
                <button
                  onClick={handlePrint}
                  className="flex items-center gap-2 px-4 py-2 bg-4d-blue text-white rounded-lg hover:bg-blue-600 transition"
                >
                  <Printer size={18} />
                  Print Form
                </button>
              </div>
            </div>

            {/* Printable Form */}
            <div ref={printRef} className="bg-white rounded-xl shadow-sm overflow-hidden">
              {/* PAGE 1 - Details */}
              <div className="print-page p-8 verification-form">
                {/* Header with Logos */}
                <div className="flex items-center justify-between mb-6 border-b pb-4">
                  <img src="/logo-lesotho.png" alt="Lesotho" className="h-16" />
                  <img src="/logo-llwdp.png" alt="LLWDP III" className="h-16" />
                  <img src="/logo-afdb.png" alt="AfDB" className="h-12" />
                  <img src="/logo-4d.png" alt="4D" className="h-10" />
                </div>

                {/* Title */}
                <div className="text-center mb-6">
                  <h1 className="text-xl font-bold text-4d-gray">Foromo E Ngoliso Ea Thepa</h1>
                  <h2 className="text-lg font-semibold text-gray-600">(Asset Verification Form - Owner)</h2>
                </div>

                {/* Household Details Section */}
                <div className="mb-6">
                  <h3 className="font-bold text-4d-blue border-b-2 border-4d-blue pb-1 mb-3">
                    Hlooho Ea Lelapa (Household Details)
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="form-label text-sm">Lebitso le fane ea Hlooho ea Lelapa (Household Name)</label>
                      <div className="form-field bg-gray-50">
                        {selectedHousehold.household_head_first_name} {selectedHousehold.household_head_surname}
                      </div>
                    </div>
                    <div>
                      <label className="form-label text-sm">Nomoro ea Boitsibiso (Beneficiary ID No)</label>
                      <div className="form-field bg-gray-50">{selectedHousehold.id_number}</div>
                    </div>
                    <div>
                      <label className="form-label text-sm">Motse (Original Village Name)</label>
                      <div className="form-field bg-gray-50">{selectedHousehold.hh_original_village_name}</div>
                    </div>
                    <div>
                      <label className="form-label text-sm">Nomoro ea mohala (Phone No)</label>
                      <input
                        type="text"
                        value={formData.cellphone_no}
                        onChange={(e) => setFormData(f => ({ ...f, cellphone_no: e.target.value }))}
                        className={`form-field w-full ${isMissing(formData.cellphone_no) ? 'field-missing' : 'bg-gray-50'} no-print-input`}
                        placeholder="Enter phone number"
                      />
                      <div className="form-field bg-gray-50 print-only hidden">{formData.cellphone_no || '_______________'}</div>
                    </div>
                    <div>
                      <label className="form-label text-sm">Moo hlooho ea lelapa e lulang (Current Address)</label>
                      <div className="form-field bg-gray-50">{selectedHousehold.hh_residential_village}</div>
                    </div>
                    <div>
                      <label className="form-label text-sm">Lekhotla la Puso Ea Libaka (Community Council)</label>
                      <input
                        type="text"
                        value={formData.community_council}
                        onChange={(e) => setFormData(f => ({ ...f, community_council: e.target.value }))}
                        className={`form-field w-full ${isMissing(formData.community_council) ? 'field-missing' : 'bg-gray-50'} no-print-input`}
                        placeholder="Enter community council"
                      />
                      <div className="form-field bg-gray-50 print-only hidden">{formData.community_council || '_______________'}</div>
                    </div>
                  </div>
                </div>

                {/* Beneficiaries Section */}
                {selectedHousehold.beneficiaries?.length > 0 && (
                  <div className="mb-6">
                    <h3 className="font-bold text-4d-blue border-b-2 border-4d-blue pb-1 mb-3">
                      Lebitso la Monga Thepa (Asset Owner/Beneficiary Details)
                    </h3>
                    {selectedHousehold.beneficiaries.map((ben, idx) => (
                      <div key={ben.id} className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          <label className="form-label text-sm">Lebitso (First Name)</label>
                          <div className="form-field bg-gray-50">{ben.first_name} {ben.surname}</div>
                        </div>
                        <div>
                          <label className="form-label text-sm">Nomoro ea Boitsibiso (ID No)</label>
                          <div className="form-field bg-gray-50">{ben.id_number}</div>
                        </div>
                        <div>
                          <label className="form-label text-sm">Sebaka Sa Bolulo (Physical Address)</label>
                          <div className="form-field bg-gray-50">{ben.physical_address || 'N/A'}</div>
                        </div>
                        <div>
                          <label className="form-label text-sm">Nomoro EA Mohala (Phone No)</label>
                          <div className="form-field bg-gray-50">{ben.cellphone_no || 'N/A'}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Co-owners Section */}
                {selectedHousehold.co_owners?.length > 0 && (
                  <div className="mb-6">
                    <h3 className="font-bold text-4d-blue border-b-2 border-4d-blue pb-1 mb-3">
                      Lebitso La Molekane (Co-Owner Details)
                    </h3>
                    {selectedHousehold.co_owners.map((co, idx) => (
                      <div key={co.id} className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          <label className="form-label text-sm">Lebitso le fane (Name & Surname)</label>
                          <div className="form-field bg-gray-50">{co.first_name} {co.surname}</div>
                        </div>
                        <div>
                          <label className="form-label text-sm">Nomoro EA Boitsibiso (ID Number)</label>
                          <div className="form-field bg-gray-50">{co.id_number}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Assets Section */}
                <div className="mb-6">
                  <h3 className="font-bold text-4d-blue border-b-2 border-4d-blue pb-1 mb-3">
                    Thepa (Asset Details)
                  </h3>
                  {selectedHousehold.household_assets?.map((asset, idx) => (
                    <div key={asset.id} className="border rounded-lg p-4 mb-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="form-label text-sm">Mofuta oa Asset (Asset Type)</label>
                          <div className="form-field bg-gray-50">{asset.asset_type}</div>
                        </div>
                        <div>
                          <label className="form-label text-sm">Motse (Village)</label>
                          <div className="form-field bg-gray-50">{asset.village}</div>
                        </div>
                        <div>
                          <label className="form-label text-sm">Palo/Boholo Ba Thepa (Asset Size)</label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={assetData[idx]?.asset_size || ''}
                              onChange={(e) => updateAsset(idx, 'asset_size', e.target.value)}
                              className={`form-field flex-1 ${isMissing(assetData[idx]?.asset_size) ? 'field-missing' : 'bg-gray-50'}`}
                              placeholder="Size"
                            />
                            <select
                              value={assetData[idx]?.size_unit || 'sqm'}
                              onChange={(e) => updateAsset(idx, 'size_unit', e.target.value)}
                              className="form-field bg-gray-50 w-24"
                            >
                              <option value="sqm">sqm</option>
                              <option value="m">m</option>
                              <option value="count">count</option>
                              <option value="ha">ha</option>
                            </select>
                          </div>
                        </div>
                        <div>
                          <label className="form-label text-sm">GPS Coordinates</label>
                          <div className="form-field bg-gray-50">{asset.gps_coordinates || 'N/A'}</div>
                        </div>
                        <div>
                          <label className="form-label text-sm">Bopotiele (Easting)</label>
                          <input
                            type="text"
                            value={assetData[idx]?.easting || ''}
                            onChange={(e) => updateAsset(idx, 'easting', e.target.value)}
                            className={`form-field w-full ${isMissing(assetData[idx]?.easting) ? 'field-missing' : 'bg-gray-50'}`}
                            placeholder="Easting"
                          />
                        </div>
                        <div>
                          <label className="form-label text-sm">Bopotiele (Northing)</label>
                          <input
                            type="text"
                            value={assetData[idx]?.northing || ''}
                            onChange={(e) => updateAsset(idx, 'northing', e.target.value)}
                            className={`form-field w-full ${isMissing(assetData[idx]?.northing) ? 'field-missing' : 'bg-gray-50'}`}
                            placeholder="Northing"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="form-label text-sm">Acquisition Type</label>
                          <div className="flex gap-4 mt-1">
                            <label className="flex items-center gap-2">
                              <input
                                type="radio"
                                name={`acquisition-${idx}`}
                                value="Temporary"
                                checked={assetData[idx]?.acquisition_type === 'Temporary'}
                                onChange={(e) => updateAsset(idx, 'acquisition_type', e.target.value)}
                                className="text-4d-blue"
                              />
                              Thepa e amehile nakoana (Temporary)
                            </label>
                            <label className="flex items-center gap-2">
                              <input
                                type="radio"
                                name={`acquisition-${idx}`}
                                value="Permanent"
                                checked={assetData[idx]?.acquisition_type === 'Permanent'}
                                onChange={(e) => updateAsset(idx, 'acquisition_type', e.target.value)}
                                className="text-4d-blue"
                              />
                              Thepa e amehile hoea hoile (Permanent)
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Declaration */}
                <div className="mb-6 text-sm leading-relaxed border-t pt-4">
                  <p className="mb-2">
                    <strong>Na/Rona re le Lelapa re netefatsa hore re lumetse ho ba karolo ea tsebetso ea Bopotiele le ngoliso ea thepa e hlalositsoeng ka holimo, e ngolisitsoe ka nepo mabitsong a ka holimo re le beng ba thepa ba lokelang ho tsilisoa ke morero oa phepelo ea metsi Mabalane moo ebang thepa ea rona eka angoa ke Morero.</strong>
                  </p>
                  <p className="text-gray-600 italic">
                    (We, the household, confirm that we have consented to participate in the cadastral survey and registration of assets described above, registered correctly in the names above as asset owners eligible for compensation by the Lowlands Water Supply Project where our assets may be affected by the Project.)
                  </p>
                </div>

                {/* Signatures */}
                <div className="grid grid-cols-2 gap-8 mt-8">
                  <div>
                    <p className="font-bold mb-4">Monga Thepa (Asset Owner)</p>
                    <div className="border-b border-gray-400 mb-1 h-12"></div>
                    <div className="flex justify-between text-sm text-gray-500">
                      <span>Lebitso (Name)</span>
                      <span>Motekeno (Signature)</span>
                      <span>Letsatsi (Date)</span>
                    </div>
                  </div>
                  <div>
                    <p className="font-bold mb-4">Molekane (Co-Owner)</p>
                    <div className="border-b border-gray-400 mb-1 h-12"></div>
                    <div className="flex justify-between text-sm text-gray-500">
                      <span>Lebitso (Name)</span>
                      <span>Motekeno (Signature)</span>
                      <span>Letsatsi (Date)</span>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="mt-8 pt-4 border-t grid grid-cols-4 gap-4 text-xs text-center">
                  <div>
                    <p className="font-semibold">E Hlophisitsoe ke 4D</p>
                    <p className="text-gray-500">(Prepared By)</p>
                  </div>
                  <div>
                    <p className="font-semibold">E hlohonolofalitsoe ke LLWDSP III</p>
                    <p className="text-gray-500">(Approved By)</p>
                  </div>
                  <div>
                    <p className="font-semibold">Bopaki Ba JC</p>
                    <p className="text-gray-500">(Witnessed By JC)</p>
                  </div>
                  <div>
                    <p className="font-semibold">Bopaki Ba Morena</p>
                    <p className="text-gray-500">(Witnessed By Chief)</p>
                  </div>
                </div>
              </div>

              {/* PAGE 2 - Photos & IDs */}
              <div className="print-page p-8 border-t-4 border-dashed border-gray-300">
                <div className="text-center mb-6">
                  <h2 className="text-xl font-bold text-4d-gray">Boitsibiso (Identification Documents)</h2>
                  <p className="text-gray-500">
                    {selectedHousehold.household_head_first_name} {selectedHousehold.household_head_surname} - {selectedHousehold.id_number}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-8">
                  {/* PAP Photo */}
                  <div className="text-center">
                    <h3 className="font-semibold text-4d-blue mb-3">Boitsibiso (Photo) ba Monga Thepa</h3>
                    <h4 className="text-sm text-gray-500 mb-3">(PAP Photograph)</h4>
                    {selectedHousehold.photograph_of_pap_url ? (
                      <img 
                        src={selectedHousehold.photograph_of_pap_url} 
                        alt="PAP Photo" 
                        className="w-48 h-48 object-cover mx-auto border-4 border-gray-200 rounded-lg"
                      />
                    ) : (
                      <div className="w-48 h-48 mx-auto border-4 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50">
                        <div className="text-center text-gray-400">
                          <Camera size={32} className="mx-auto mb-2" />
                          <span className="text-sm">No Photo</span>
                          <input
                            type="text"
                            value={formData.photograph_of_pap_url}
                            onChange={(e) => setFormData(f => ({ ...f, photograph_of_pap_url: e.target.value }))}
                            className="mt-2 text-xs px-2 py-1 border rounded w-full no-print"
                            placeholder="Enter photo URL"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* PAP ID Document */}
                  <div className="text-center">
                    <h3 className="font-semibold text-4d-blue mb-3">ID Document ba Monga Thepa</h3>
                    <h4 className="text-sm text-gray-500 mb-3">(PAP ID Document)</h4>
                    {selectedHousehold.id_document_url ? (
                      <img 
                        src={selectedHousehold.id_document_url} 
                        alt="PAP ID" 
                        className="w-full max-w-xs h-48 object-contain mx-auto border-4 border-gray-200 rounded-lg bg-gray-50"
                      />
                    ) : (
                      <div className="w-full max-w-xs h-48 mx-auto border-4 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50">
                        <div className="text-center text-gray-400">
                          <FileText size={32} className="mx-auto mb-2" />
                          <span className="text-sm">No ID Document</span>
                          <input
                            type="text"
                            value={formData.id_document_url}
                            onChange={(e) => setFormData(f => ({ ...f, id_document_url: e.target.value }))}
                            className="mt-2 text-xs px-2 py-1 border rounded w-full no-print"
                            placeholder="Enter ID document URL"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Co-owner IDs */}
                {selectedHousehold.co_owners?.length > 0 && (
                  <div className="mt-8 pt-6 border-t">
                    <h3 className="font-semibold text-4d-blue mb-4 text-center">Boitsibiso ba Molekane (Co-Owner ID Documents)</h3>
                    <div className="grid grid-cols-2 gap-8">
                      {selectedHousehold.co_owners.map((co, idx) => (
                        <div key={co.id} className="text-center">
                          <h4 className="font-medium mb-2">{co.first_name} {co.surname}</h4>
                          <p className="text-sm text-gray-500 mb-3">ID: {co.id_number}</p>
                          {co.id_document_url ? (
                            <img 
                              src={co.id_document_url} 
                              alt={`${co.first_name} ID`}
                              className="w-full max-w-xs h-40 object-contain mx-auto border-4 border-gray-200 rounded-lg bg-gray-50"
                            />
                          ) : (
                            <div className="w-full max-w-xs h-40 mx-auto border-4 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50">
                              <div className="text-center text-gray-400">
                                <FileText size={24} className="mx-auto mb-2" />
                                <span className="text-xs">No ID Document</span>
                                <input
                                  type="text"
                                  value={coOwnerData[idx]?.id_document_url || ''}
                                  onChange={(e) => {
                                    const newData = [...coOwnerData]
                                    newData[idx] = { ...newData[idx], id_document_url: e.target.value }
                                    setCoOwnerData(newData)
                                  }}
                                  className="mt-2 text-xs px-2 py-1 border rounded w-full no-print"
                                  placeholder="Enter ID URL"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Page 2 Footer */}
                <div className="mt-8 pt-4 border-t text-center text-xs text-gray-500">
                  <p>Lesotho Lowlands Water Development Project Phase III</p>
                  <p>Asset Verification Form - Page 2 of 2</p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
