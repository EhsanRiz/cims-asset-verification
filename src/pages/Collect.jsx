import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../App'
import { supabase, apiFetch } from '../lib/supabase'
import {
  MapPin, Home, Users, UserPlus, CreditCard, CheckCircle2, Camera,
  Upload, Plus, Trash2, ArrowLeft, ArrowRight, LogOut, Check, X,
  RefreshCw, Edit2, User, Info
} from 'lucide-react'

// ---------- Styling ----------
const c = {
  primary: '#1a3a4a',
  accent: '#8cc63f',
  accentHover: '#7ab62f',
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',
  textDark: '#1f2937',
  textMuted: '#6b7280',
  bgLight: '#f8fafc',
  bgCard: '#ffffff',
  border: '#e2e8f0',
  purple: '#7c3aed',
  orange: '#ea580c',
  blue: '#2563eb',
}

const s = {
  page: { minHeight: '100vh', background: 'linear-gradient(135deg,#f0fdf4 0%,#eff6ff 100%)', paddingBottom: 40 },
  topBar: {
    background: c.bgCard, borderBottom: `1px solid ${c.border}`, padding: '12px 20px',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12,
  },
  stepStrip: { display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', justifyContent: 'center', padding: '14px 20px', background: c.bgCard, borderBottom: `1px solid ${c.border}` },
  container: { maxWidth: 800, margin: '0 auto', padding: '24px 16px' },
  card: { background: c.bgCard, borderRadius: 16, padding: 24, boxShadow: '0 4px 18px rgba(15,42,54,0.06)', marginBottom: 16 },
  heroIcon: { width: 60, height: 60, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: '#fff' },
  heroTitle: { fontSize: 26, fontWeight: 700, textAlign: 'center', color: c.textDark, margin: '0 0 6px 0' },
  heroSub: { fontSize: 14, textAlign: 'center', color: c.textMuted, margin: '0 0 18px 0' },
  routePill: {
    display: 'flex', alignItems: 'center', gap: 10, background: '#ecfdf5', border: '1px solid #a7f3d0',
    padding: '10px 14px', borderRadius: 10, margin: '16px 0', color: '#065f46',
  },
  label: { display: 'block', fontSize: 13, fontWeight: 600, color: c.textDark, marginBottom: 6 },
  input: {
    width: '100%', padding: '10px 12px', border: `1px solid ${c.border}`, borderRadius: 8,
    fontSize: 14, outline: 'none', background: '#fff', boxSizing: 'border-box',
  },
  row: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 },
  btn: (bg, fg = '#fff') => ({
    background: bg, color: fg, border: 'none', padding: '12px 18px', borderRadius: 10,
    fontWeight: 600, fontSize: 14, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
  }),
  btnGhost: { background: c.bgCard, color: c.textDark, border: `1px solid ${c.border}`, padding: '10px 16px', borderRadius: 10, fontWeight: 600, fontSize: 14, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8 },
  navRow: { display: 'flex', gap: 12, marginTop: 20 },
  required: { color: c.error, marginLeft: 2 },
  modeCard: {
    display: 'flex', alignItems: 'center', gap: 14, padding: 16, borderRadius: 12,
    border: `2px solid ${c.border}`, cursor: 'pointer', marginBottom: 10, background: '#fff',
  },
  modeCardActive: { borderColor: c.accent, background: '#f0fdf4' },
  modeIcon: { width: 44, height: 44, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' },
}

const STEPS = [
  { key: 'route', label: 'Route', icon: MapPin, color: c.accent },
  { key: 'household', label: 'Household', icon: Home, color: c.purple },
  { key: 'assets', label: 'Assets', icon: Home, color: c.accent },
  { key: 'beneficiaries', label: 'Beneficiaries', icon: Users, color: c.purple },
  { key: 'coowners', label: 'Co-owners', icon: UserPlus, color: c.orange },
  { key: 'banking', label: 'Banking', icon: CreditCard, color: c.blue },
  { key: 'review', label: 'Review', icon: CheckCircle2, color: c.success },
]

const ID_TYPES = ['None', 'Passport', 'ID']
const GENDERS = ['Male', 'Female', 'Other']
const ASSET_TYPES = [
  'Residential Plot', 'Business Plot', 'Agricultural Fields/Arable Land', 'Food Garden',
  'Primary Dwelling House', 'Outbuilding / Secondary Structure', 'Toilet', 'Business Structure',
  'Kraal, Stable, pigsty, chicken coop', 'Fencing', 'Graves', 'Fruit Trees',
  'Saplings (fruit Trees)', 'Timber Trees', 'Thickets', 'Agave/ Aloes /prickly pear',
  'Reeds', 'Other (specify)',
]
const BANKS = ['Standard Lesotho Bank', 'Nedbank Lesotho', 'First National Bank Lesotho', 'Post Bank Lesotho', 'Other']
const ACCOUNT_TYPES = ['Savings', 'Current/Cheque', 'Transmission', 'Other']

export default function Collect() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const [step, setStep] = useState('dashboard') // dashboard | wizard
  const [wizardStep, setWizardStep] = useState(0)
  const [routes, setRoutes] = useState([])
  const [routesLoading, setRoutesLoading] = useState(true)
  const [mySubs, setMySubs] = useState([])
  const [listFilter, setListFilter] = useState('all') // all | pending | approved | rejected
  const [toast, setToast] = useState(null) // { type, title, message }

  // Wizard state
  const [routeSel, setRouteSel] = useState('')
  const [hh, setHh] = useState(emptyHousehold())
  const [assets, setAssets] = useState([])
  const [currentAsset, setCurrentAsset] = useState(emptyAsset())
  const [benMode, setBenMode] = useState(null) // 'head_only' | 'multiple'
  const [beneficiaries, setBeneficiaries] = useState([emptyBeneficiary()])
  const [coMode, setCoMode] = useState('no') // 'yes' | 'no'
  const [coowners, setCoowners] = useState([emptyCoowner()])
  const [bankMode, setBankMode] = useState('skip') // 'yes' | 'skip'
  const [bank, setBank] = useState(emptyBank())
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  useEffect(() => {
    loadRoutes()
    loadMySubmissions()
  }, [])

  // Realtime: when an admin approves/rejects one of this surveyor's registrations,
  // refresh the list and pop a toast.
  useEffect(() => {
    if (!user?.id) return

    const hhChannel = supabase
      .channel(`my-households-${user.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'households', filter: `created_by_user=eq.${user.id}` },
        (payload) => {
          loadMySubmissions()
          const newRow = payload.new || {}
          const oldRow = payload.old || {}
          if (newRow.approval_status && newRow.approval_status !== oldRow.approval_status) {
            const name = `${newRow.household_head_first_name || ''} ${newRow.household_head_surname || ''}`.trim()
            if (newRow.approval_status === 'approved') {
              setToast({ type: 'approval', title: 'Registration approved ✅', message: `${name} on ${newRow.route_name || 'route'} is now approved.` })
            } else if (newRow.approval_status === 'rejected') {
              setToast({ type: 'rejection', title: 'Registration not approved', message: `${name} was rejected. ${newRow.admin_notes ? 'Note: ' + newRow.admin_notes : 'Check with your supervisor.'}` })
            }
          }
        }
      )
      .subscribe()

    const notifChannel = supabase
      .channel(`my-notifs-${user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        (payload) => {
          const n = payload.new
          if (!n) return
          setToast({
            type: n.type === 'approval' ? 'approval' : 'rejection',
            title: n.title || (n.type === 'approval' ? 'Approved' : 'Update'),
            message: n.message || '',
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(hhChannel)
      supabase.removeChannel(notifChannel)
    }
  }, [user?.id])

  // Auto-dismiss toast after 6 seconds
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 6000)
    return () => clearTimeout(t)
  }, [toast])

  function emptyHousehold() {
    return {
      household_head_first_name: '', household_head_surname: '', gender: '',
      type_of_identification: '', id_number: '', expiry_date: '',
      hh_original_village_name: '', hh_residential_village: '',
      occupation_of_pap: '', cellphone_no: '',
      photograph_of_pap_url: '',
    }
  }
  function emptyAsset() {
    return { asset_type: '', village: '', gps_coordinates: '', asset_photo_url: '', asset_contract_name: '' }
  }
  function emptyBeneficiary() {
    return {
      first_name: '', surname: '', village_name: '', is_minor: 'No',
      date_of_birth: '', physical_address: '', postal_address: '',
      cellphone_no: '', type_of_identification: 'None', id_number: 'N/A', expiry_date: '',
    }
  }
  function emptyCoowner() {
    return {
      first_name: '', surname: '', physical_address: '', cellphone_no: '', land_line: '',
      type_of_identification: 'None', id_number: 'N/A',
    }
  }
  function emptyBank() {
    return { bank_name: '', account_number: '', branch_code: '', account_holder_name: '', account_type: '' }
  }

  const loadRoutes = async () => {
    setRoutesLoading(true)
    try {
      const { data, error } = await supabase.from('routes').select('*').order('route_name')
      if (error) throw error
      setRoutes(data || [])
    } catch (err) { console.error('Load routes:', err) }
    finally { setRoutesLoading(false) }
  }

  const loadMySubmissions = async () => {
    if (!user?.id) return
    try {
      const { data } = await supabase
        .from('households')
        .select('id, household_head_first_name, household_head_surname, hh_residential_village, route_name, approval_status, admin_notes, file_number, created_at')
        .eq('created_by_user', user.id)
        .order('created_at', { ascending: false })
        .limit(50)
      setMySubs(data || [])
    } catch (err) { console.error('Load my subs:', err) }
  }

  const resetWizard = () => {
    setWizardStep(0); setRouteSel('')
    setHh(emptyHousehold())
    setAssets([]); setCurrentAsset(emptyAsset())
    setBenMode(null); setBeneficiaries([emptyBeneficiary()])
    setCoMode('no'); setCoowners([emptyCoowner()])
    setBankMode('skip'); setBank(emptyBank())
    setSubmitError('')
  }

  const goToWizard = () => { resetWizard(); setStep('wizard') }
  const backToDashboard = () => { setStep('dashboard'); loadMySubmissions() }

  // -------- File Upload (R2) --------
  const uploadFile = async (file, category) => {
    const fd = new FormData()
    fd.append('file', file)
    fd.append('routeName', routeSel || 'collect')
    fd.append('papName', `${hh.household_head_first_name || 'x'}_${hh.household_head_surname || 'x'}`)
    fd.append('category', category)
    const resp = await apiFetch('/api/upload', { method: 'POST', body: fd })
    if (!resp.ok) throw new Error('Upload failed')
    return resp.json()
  }

  // -------- Validation --------
  const stepValid = (idx) => {
    if (idx === 0) return !!routeSel
    if (idx === 1) return hh.household_head_first_name && hh.household_head_surname && hh.gender && hh.type_of_identification && hh.hh_original_village_name && hh.hh_residential_village
    if (idx === 2) return assets.length > 0
    if (idx === 3) {
      if (benMode === 'head_only') return true
      if (benMode === 'multiple') return beneficiaries.every(b => b.first_name && b.surname && b.village_name)
      return false
    }
    if (idx === 4) {
      if (coMode === 'no') return true
      return coowners.every(co => co.first_name && co.surname)
    }
    if (idx === 5) {
      if (bankMode === 'skip') return true
      return bank.bank_name && bank.account_number && bank.branch_code && bank.account_holder_name && bank.account_type
    }
    return true
  }

  const next = () => { if (stepValid(wizardStep) && wizardStep < STEPS.length - 1) setWizardStep(wizardStep + 1) }
  const prev = () => { if (wizardStep > 0) setWizardStep(wizardStep - 1) }

  // -------- Submit --------
  const handleSubmit = async () => {
    if (submitting) return
    setSubmitting(true); setSubmitError('')
    try {
      const route = routes.find(r => r.route_name === routeSel)
      const record = {
        ...hh,
        route_name: routeSel,
        route_type: route?.route_type || 'Rural',
        approval_status: 'pending',
        verification_status: 'pending',
        submitted_at: new Date().toISOString(),
        submitted_by: user?.full_name || user?.username,
        created_by_user: user?.id,
        last_edited_by: user?.id,
        last_edited_by_name: user?.full_name,
        last_edited_at: new Date().toISOString(),
        pending_approval: true,
      }
      // strip empty strings
      Object.keys(record).forEach(k => { if (record[k] === '') record[k] = null })

      const { data: inserted, error: insErr } = await supabase
        .from('households').insert(record).select().single()
      if (insErr) throw insErr
      const hhId = inserted.id

      // Assets
      if (assets.length) {
        const rows = assets.map(a => ({
          household_id: hhId,
          asset_type: a.asset_type,
          village: a.village,
          gps_coordinates: a.gps_coordinates || null,
          asset_photo_url: a.asset_photo_url || null,
        }))
        const { error: aErr } = await supabase.from('household_assets').insert(rows)
        if (aErr) throw aErr
      }

      // Beneficiaries
      if (benMode === 'head_only') {
        await supabase.from('beneficiaries').insert({
          household_id: hhId,
          first_name: hh.household_head_first_name,
          surname: hh.household_head_surname,
          village_name: hh.hh_residential_village,
          is_minor: 'No',
          type_of_identification: hh.type_of_identification || 'None',
          id_number: hh.id_number || 'N/A',
        })
      } else if (benMode === 'multiple') {
        const rows = beneficiaries.map(b => ({
          household_id: hhId,
          first_name: b.first_name,
          surname: b.surname,
          village_name: b.village_name,
          is_minor: b.is_minor || 'No',
          date_of_birth: b.date_of_birth || null,
          physical_address: b.physical_address || null,
          postal_address: b.postal_address || null,
          cellphone_no: b.cellphone_no || null,
          type_of_identification: b.type_of_identification || 'None',
          id_number: b.id_number || 'N/A',
          expiry_date: b.expiry_date || null,
        }))
        const { error: bErr } = await supabase.from('beneficiaries').insert(rows)
        if (bErr) throw bErr
      }

      // Co-owners
      if (coMode === 'yes') {
        const rows = coowners
          .filter(co => co.first_name && co.surname)
          .map(co => ({
            household_id: hhId,
            first_name: co.first_name,
            surname: co.surname,
            physical_address: co.physical_address || null,
            cellphone_no: co.cellphone_no || null,
            land_line: co.land_line || null,
            type_of_identification: co.type_of_identification || 'None',
            id_number: co.id_number || 'N/A',
          }))
        if (rows.length) {
          const { error: cErr } = await supabase.from('co_owners').insert(rows)
          if (cErr) throw cErr
        }
      }

      // Banking
      if (bankMode === 'yes') {
        const { error: bkErr } = await supabase.from('banking_details').insert({
          household_id: hhId,
          bank_name: bank.bank_name,
          account_number: bank.account_number,
          branch_code: bank.branch_code,
          account_holder_name: bank.account_holder_name,
          account_type: bank.account_type,
        })
        if (bkErr) throw bkErr
      }

      // Notify approvers (admins + Mamokuena). The Dashboard already listens for user_role='approver'.
      await supabase.from('notifications').insert({
        user_role: 'approver',
        type: 'new_registration',
        title: 'New PAP Registration',
        message: `${user?.full_name || user?.username} registered ${hh.household_head_first_name} ${hh.household_head_surname} on ${routeSel}`,
        reference_type: 'household',
        reference_id: hhId,
      })

      await loadMySubmissions()
      setStep('dashboard')
      alert('Registration submitted successfully! An admin will review and approve.')
    } catch (err) {
      console.error('Submit error:', err)
      setSubmitError(err.message || 'Submission failed')
    } finally {
      setSubmitting(false)
    }
  }

  // ---------- RENDER ----------
  if (step === 'dashboard') {
    return <MyFieldDashboard
      user={user}
      mySubs={mySubs}
      filter={listFilter}
      onFilterChange={setListFilter}
      toast={toast}
      onDismissToast={() => setToast(null)}
      onStart={goToWizard}
      onRefresh={loadMySubmissions}
      onLogout={() => { logout(); navigate('/login') }}
      onBackToLanding={() => navigate('/landing')}
    />
  }

  const CurrentIcon = STEPS[wizardStep].icon
  return (
    <div style={s.page}>
      <TopBar
        title={`Step ${wizardStep + 1} of ${STEPS.length}: ${STEPS[wizardStep].label}`}
        user={user}
        onBack={backToDashboard}
        onLogout={() => { logout(); navigate('/login') }}
      />
      <StepStrip step={wizardStep} />

      <div style={s.container}>
        {routeSel && wizardStep > 0 && (
          <div style={s.routePill}>
            <MapPin size={18} />
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, opacity: 0.8 }}>Current Route:</div>
              <div style={{ fontSize: 14, fontWeight: 700 }}>{routeSel}</div>
            </div>
          </div>
        )}

        {wizardStep === 0 && (
          <RouteStep
            routes={routes} loading={routesLoading}
            value={routeSel} onChange={setRouteSel}
            onNext={next}
          />
        )}
        {wizardStep === 1 && (
          <HouseholdStep
            hh={hh} setHh={setHh}
            onPhoto={async (file) => {
              try { const r = await uploadFile(file, 'photos'); setHh({ ...hh, photograph_of_pap_url: r.url }) }
              catch (e) { alert('Photo upload failed: ' + e.message) }
            }}
            onPrev={prev} onNext={next} canNext={stepValid(1)}
          />
        )}
        {wizardStep === 2 && (
          <AssetsStep
            assets={assets} setAssets={setAssets}
            currentAsset={currentAsset} setCurrentAsset={setCurrentAsset}
            onUpload={async (file) => {
              try { const r = await uploadFile(file, 'photos'); return r.url }
              catch (e) { alert('Upload failed: ' + e.message); return '' }
            }}
            onPrev={prev} onNext={next} canNext={stepValid(2)}
          />
        )}
        {wizardStep === 3 && (
          <BeneficiariesStep
            hh={hh}
            mode={benMode} setMode={setBenMode}
            list={beneficiaries} setList={setBeneficiaries}
            onPrev={prev} onNext={next} canNext={stepValid(3)}
          />
        )}
        {wizardStep === 4 && (
          <CoownersStep
            mode={coMode} setMode={setCoMode}
            list={coowners} setList={setCoowners}
            onPrev={prev} onNext={next} canNext={stepValid(4)}
          />
        )}
        {wizardStep === 5 && (
          <BankingStep
            mode={bankMode} setMode={setBankMode}
            bank={bank} setBank={setBank}
            onPrev={prev} onNext={next} canNext={stepValid(5)}
          />
        )}
        {wizardStep === 6 && (
          <ReviewStep
            routeSel={routeSel} hh={hh} assets={assets}
            benMode={benMode} beneficiaries={beneficiaries}
            coMode={coMode} coowners={coowners}
            bankMode={bankMode} bank={bank}
            submitting={submitting} submitError={submitError}
            onPrev={prev} onSubmit={handleSubmit}
            onEditStep={(i) => setWizardStep(i)}
          />
        )}
      </div>
    </div>
  )
}

// ==================================================================
// Sub-components
// ==================================================================

function TopBar({ title, user, onBack, onLogout }) {
  return (
    <div style={s.topBar}>
      <button onClick={onBack} style={s.btnGhost}>
        <ArrowLeft size={16} /> My Registrations
      </button>
      <div style={{ fontWeight: 700, color: c.textDark, fontSize: 15 }}>{title}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 13, color: c.textMuted }}>
          <User size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
          {user?.full_name || user?.username} <span style={{ color: c.accent, fontWeight: 600 }}>(Surveyor)</span>
        </span>
        <button onClick={onLogout} style={s.btnGhost}><LogOut size={14} /> Logout</button>
      </div>
    </div>
  )
}

function StepStrip({ step }) {
  return (
    <div style={s.stepStrip}>
      {STEPS.map((st, i) => {
        const Icon = st.icon
        const done = i < step
        const active = i === step
        return (
          <div key={st.key} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              background: done ? c.accent : active ? c.primary : '#e5e7eb',
              color: done || active ? '#fff' : c.textMuted,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, fontWeight: 700,
            }}>
              {done ? <Check size={16} /> : <Icon size={15} />}
            </div>
            <span style={{ fontSize: 12, fontWeight: active ? 700 : 500, color: active ? c.textDark : c.textMuted, marginRight: 4 }}>{st.label}</span>
            {i < STEPS.length - 1 && <div style={{ width: 16, height: 2, background: done ? c.accent : '#e5e7eb' }} />}
          </div>
        )
      })}
    </div>
  )
}

// -------- My Field Dashboard (shows surveyor's registrations + Register button) --------
function MyFieldDashboard({ user, mySubs, filter, onFilterChange, toast, onDismissToast, onStart, onRefresh, onLogout, onBackToLanding }) {
  const stats = {
    total: mySubs.length,
    pending: mySubs.filter(m => m.approval_status === 'pending' || !m.approval_status).length,
    approved: mySubs.filter(m => m.approval_status === 'approved').length,
    rejected: mySubs.filter(m => m.approval_status === 'rejected').length,
  }
  const filtered = filter === 'all'
    ? mySubs
    : mySubs.filter(m => (m.approval_status || 'pending') === filter)
  const filterLabels = { all: 'All Submissions', pending: 'Pending Review', approved: 'Approved', rejected: 'Rejected' }

  return (
    <div style={s.page}>
      <div style={s.topBar}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, color: c.textDark }}>PAP Registrations</h1>
          <div style={{ fontSize: 13, color: c.textMuted }}>View and manage your PAP registrations</div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 13, color: c.textMuted }}>{user?.full_name || user?.username} <span style={{ color: c.accent, fontWeight: 600 }}>(Surveyor)</span></span>
          <button onClick={onStart} style={s.btn(c.accent)}><Plus size={16} /> Register New Household</button>
          <button onClick={onRefresh} style={s.btn(c.primary)}><RefreshCw size={14} /> Refresh</button>
          <button onClick={onBackToLanding} style={s.btnGhost}>Switch Mode</button>
          <button onClick={onLogout} style={s.btnGhost}><LogOut size={14} /> Logout</button>
        </div>
      </div>

      {/* Toast for live approval events */}
      {toast && (
        <div style={{
          position: 'fixed', top: 70, right: 20, zIndex: 2000,
          background: toast.type === 'approval' ? '#ecfdf5' : '#fef2f2',
          border: `1px solid ${toast.type === 'approval' ? '#a7f3d0' : '#fecaca'}`,
          color: toast.type === 'approval' ? '#065f46' : '#991b1b',
          padding: '12px 16px', borderRadius: 10, boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
          maxWidth: 360, display: 'flex', gap: 10, alignItems: 'flex-start',
        }}>
          {toast.type === 'approval' ? <Check size={18} /> : <X size={18} />}
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 13 }}>{toast.title}</div>
            <div style={{ fontSize: 12, marginTop: 2, opacity: 0.85 }}>{toast.message}</div>
          </div>
          <button onClick={onDismissToast} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', opacity: 0.6 }}>×</button>
        </div>
      )}

      <div style={{ ...s.container, maxWidth: 1100 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 12, marginBottom: 16 }}>
          <StatCard label="Total Submissions" value={stats.total} color={c.blue} active={filter === 'all'} onClick={() => onFilterChange('all')} />
          <StatCard label="Pending Review" value={stats.pending} color={c.warning} active={filter === 'pending'} onClick={() => onFilterChange('pending')} />
          <StatCard label="Approved" value={stats.approved} color={c.success} active={filter === 'approved'} onClick={() => onFilterChange('approved')} />
          <StatCard label="Rejected" value={stats.rejected} color={c.error} active={filter === 'rejected'} onClick={() => onFilterChange('rejected')} />
        </div>

        <div style={s.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h3 style={{ margin: 0, fontSize: 16 }}>
              {filterLabels[filter]} ({filtered.length})
            </h3>
            {filter !== 'all' && (
              <button onClick={() => onFilterChange('all')} style={{
                background: 'none', border: `1px solid ${c.border}`, borderRadius: 6,
                padding: '4px 10px', fontSize: 12, color: c.textMuted, cursor: 'pointer',
              }}>Clear filter</button>
            )}
          </div>
          {mySubs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: c.textMuted }}>
              <Users size={44} color={c.textMuted} style={{ margin: '0 auto 10px', display: 'block' }} />
              <div style={{ fontWeight: 600, color: c.textDark, marginBottom: 4 }}>No households registered yet</div>
              <div style={{ fontSize: 13, marginBottom: 16 }}>Start by registering your first household.</div>
              <button onClick={onStart} style={s.btn(c.accent)}><Plus size={16} /> Register Your First Household</button>
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 30, color: c.textMuted, fontSize: 13 }}>
              No registrations in <strong>{filterLabels[filter]}</strong>.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ textAlign: 'left', color: c.textMuted, borderBottom: `1px solid ${c.border}` }}>
                    <th style={{ padding: 10 }}>Household Head</th>
                    <th style={{ padding: 10 }}>Village</th>
                    <th style={{ padding: 10 }}>Route</th>
                    <th style={{ padding: 10 }}>Status</th>
                    <th style={{ padding: 10 }}>Submitted</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(r => (
                    <tr key={r.id} style={{ borderBottom: `1px solid ${c.border}` }}>
                      <td style={{ padding: 10, fontWeight: 600 }}>
                        {r.household_head_first_name} {r.household_head_surname}
                      </td>
                      <td style={{ padding: 10 }}>{r.hh_residential_village || '—'}</td>
                      <td style={{ padding: 10 }}>{r.route_name || '—'}</td>
                      <td style={{ padding: 10 }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          <StatusPill status={r.approval_status} />
                          {r.approval_status === 'rejected' && r.admin_notes && (
                            <span
                              title={`Reason: ${r.admin_notes}`}
                              style={{ display: 'inline-flex', color: c.error, cursor: 'help' }}
                              aria-label={`Rejection reason: ${r.admin_notes}`}
                            >
                              <Info size={14} />
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: 10, color: c.textMuted }}>{r.created_at ? new Date(r.created_at).toLocaleDateString() : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, color, active, onClick }) {
  const clickable = typeof onClick === 'function'
  return (
    <div
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onClick={onClick}
      onKeyDown={clickable ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick() } } : undefined}
      style={{
        ...s.card,
        margin: 0,
        borderLeft: `4px solid ${color}`,
        cursor: clickable ? 'pointer' : 'default',
        transition: 'all 0.15s ease',
        outline: 'none',
        boxShadow: active ? `0 0 0 2px ${color}, 0 4px 18px rgba(15,42,54,0.08)` : '0 4px 18px rgba(15,42,54,0.06)',
        background: active ? `${color}10` : c.bgCard,
      }}
    >
      <div style={{ fontSize: 13, color: c.textMuted, fontWeight: 500 }}>{label}</div>
      <div style={{ fontSize: 30, fontWeight: 700, color: c.textDark, marginTop: 6 }}>{value}</div>
    </div>
  )
}

function StatusPill({ status }) {
  const map = {
    pending: { bg: '#fef3c7', color: '#92400e', label: 'Pending' },
    approved: { bg: '#d1fae5', color: '#065f46', label: 'Approved' },
    rejected: { bg: '#fee2e2', color: '#991b1b', label: 'Rejected' },
  }
  const conf = map[status] || map.pending
  return (
    <span style={{
      background: conf.bg, color: conf.color, padding: '3px 10px', borderRadius: 20,
      fontSize: 12, fontWeight: 600, display: 'inline-block',
    }}>{conf.label}</span>
  )
}

// -------- Step 0: Route --------
function RouteStep({ routes, loading, value, onChange, onNext }) {
  return (
    <div style={s.card}>
      <div style={{ ...s.heroIcon, background: c.accent }}><MapPin size={28} /></div>
      <div style={s.heroTitle}>Select Route</div>
      <div style={s.heroSub}>Choose the route you'll be working on for household registration</div>

      <label style={s.label}>Select the Route<span style={s.required}>*</span></label>
      <select value={value} onChange={e => onChange(e.target.value)} style={s.input} disabled={loading}>
        <option value="">{loading ? 'Loading routes…' : 'Choose a route…'}</option>
        {routes.map(r => (
          <option key={r.id} value={r.route_name}>{r.route_name} ({r.route_type})</option>
        ))}
      </select>

      {value && (
        <div style={{ marginTop: 14, padding: 14, borderRadius: 10, background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
          <div style={{ fontWeight: 700, color: '#065f46', fontSize: 14 }}>Selected Route:</div>
          <div style={{ color: '#047857', fontSize: 15, marginTop: 3 }}>{value}</div>
          <div style={{ fontSize: 12, color: '#059669', marginTop: 3 }}>You'll be registering households along this route</div>
        </div>
      )}

      <button disabled={!value} onClick={onNext}
        style={{ ...s.btn(value ? c.accent : '#cbd5e1'), width: '100%', marginTop: 20, padding: 14 }}>
        Continue to Household Registration <ArrowRight size={16} />
      </button>

      <div style={{ marginTop: 16, padding: 12, background: '#eef2ff', borderRadius: 10, fontSize: 12, color: '#3730a3' }}>
        <strong>Important Note</strong><br />
        Once you select a route, all household registrations will be associated with this route.
      </div>
    </div>
  )
}

// -------- Step 1: Household Information --------
function HouseholdStep({ hh, setHh, onPhoto, onPrev, onNext, canNext }) {
  const fileRef = useRef(null)
  const u = (k, v) => setHh({ ...hh, [k]: v })
  return (
    <div style={s.card}>
      <div style={{ ...s.heroIcon, background: c.purple }}><Home size={28} /></div>
      <div style={s.heroTitle}>Household Information</div>
      <div style={s.heroSub}>Please provide the following details about the household head</div>

      <h4 style={{ marginTop: 18, marginBottom: 10, color: c.purple }}>Personal Information</h4>
      <div style={s.row}>
        <div>
          <label style={s.label}>First Name<span style={s.required}>*</span></label>
          <input style={s.input} value={hh.household_head_first_name} onChange={e => u('household_head_first_name', e.target.value)} placeholder="Enter first name" />
        </div>
        <div>
          <label style={s.label}>Surname<span style={s.required}>*</span></label>
          <input style={s.input} value={hh.household_head_surname} onChange={e => u('household_head_surname', e.target.value)} placeholder="Enter surname" />
        </div>
      </div>
      <label style={s.label}>Gender<span style={s.required}>*</span></label>
      <select style={s.input} value={hh.gender} onChange={e => u('gender', e.target.value)}>
        <option value="">Select gender</option>
        {GENDERS.map(g => <option key={g}>{g}</option>)}
      </select>

      <h4 style={{ marginTop: 18, marginBottom: 10, color: c.purple }}>Identification</h4>
      <label style={s.label}>Type of Identification<span style={s.required}>*</span></label>
      <select style={s.input} value={hh.type_of_identification} onChange={e => u('type_of_identification', e.target.value)}>
        <option value="">Select ID type</option>
        {ID_TYPES.map(t => <option key={t}>{t}</option>)}
      </select>
      {hh.type_of_identification && hh.type_of_identification !== 'None' && (
        <div style={{ ...s.row, marginTop: 10 }}>
          <div>
            <label style={s.label}>ID Number</label>
            <input style={s.input} value={hh.id_number} onChange={e => u('id_number', e.target.value)} placeholder="Enter ID number" />
          </div>
          <div>
            <label style={s.label}>Expiry Date</label>
            <input type="date" style={s.input} value={hh.expiry_date} onChange={e => u('expiry_date', e.target.value)} />
          </div>
        </div>
      )}

      <h4 style={{ marginTop: 18, marginBottom: 10, color: c.purple }}>Location Information</h4>
      <div style={s.row}>
        <div>
          <label style={s.label}>Original Village<span style={s.required}>*</span></label>
          <input style={s.input} value={hh.hh_original_village_name} onChange={e => u('hh_original_village_name', e.target.value)} placeholder="Enter original village name" />
        </div>
        <div>
          <label style={s.label}>Residential Village<span style={s.required}>*</span></label>
          <input style={s.input} value={hh.hh_residential_village} onChange={e => u('hh_residential_village', e.target.value)} placeholder="Enter residential village" />
        </div>
      </div>

      <h4 style={{ marginTop: 18, marginBottom: 10, color: c.purple }}>Additional Information</h4>
      <div style={s.row}>
        <div>
          <label style={s.label}>Occupation</label>
          <input style={s.input} value={hh.occupation_of_pap} onChange={e => u('occupation_of_pap', e.target.value)} placeholder="Occupation (optional)" />
        </div>
        <div>
          <label style={s.label}>Cellphone</label>
          <input style={s.input} value={hh.cellphone_no} onChange={e => u('cellphone_no', e.target.value)} placeholder="Phone number (optional)" />
        </div>
      </div>

      <h4 style={{ marginTop: 18, marginBottom: 10, color: c.purple }}>Photograph</h4>
      <div style={{ border: `2px dashed ${c.border}`, borderRadius: 10, padding: 20, textAlign: 'center' }}>
        {hh.photograph_of_pap_url ? (
          <img src={hh.photograph_of_pap_url} alt="PAP" style={{ maxWidth: 160, borderRadius: 8 }} />
        ) : (
          <>
            <Camera size={44} color={c.textMuted} style={{ margin: '0 auto 8px', display: 'block' }} />
            <div style={{ fontSize: 13, color: c.textMuted, marginBottom: 10 }}>Take a photo of the PAP</div>
          </>
        )}
        <input ref={fileRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={e => e.target.files?.[0] && onPhoto(e.target.files[0])} />
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 8 }}>
          <button onClick={() => fileRef.current?.click()} style={s.btn(c.purple)}><Camera size={14} /> {hh.photograph_of_pap_url ? 'Replace Photo' : 'Take Photo'}</button>
        </div>
      </div>

      <div style={s.navRow}>
        <button onClick={onPrev} style={s.btnGhost}><ArrowLeft size={14} /> Previous</button>
        <button disabled={!canNext} onClick={onNext} style={{ ...s.btn(canNext ? c.purple : '#cbd5e1'), flex: 1 }}>
          Continue to Next Step <ArrowRight size={14} />
        </button>
      </div>
    </div>
  )
}

// -------- Step 2: Assets --------
function AssetsStep({ assets, setAssets, currentAsset, setCurrentAsset, onUpload, onPrev, onNext, canNext }) {
  const fileRef = useRef(null)
  const u = (k, v) => setCurrentAsset({ ...currentAsset, [k]: v })
  const addAsset = () => {
    if (!currentAsset.asset_type || !currentAsset.village) { alert('Asset type and village are required.'); return }
    setAssets([...assets, currentAsset])
    setCurrentAsset({ asset_type: '', village: '', gps_coordinates: '', asset_photo_url: '', asset_contract_name: '' })
  }
  const captureGPS = () => {
    if (!navigator.geolocation) { alert('Geolocation not supported on this device'); return }
    navigator.geolocation.getCurrentPosition(
      pos => u('gps_coordinates', `${pos.coords.latitude.toFixed(6)}, ${pos.coords.longitude.toFixed(6)}`),
      err => alert('GPS error: ' + err.message)
    )
  }
  return (
    <div style={s.card}>
      <div style={{ ...s.heroIcon, background: c.accent }}><Home size={28} /></div>
      <div style={s.heroTitle}>Asset Details</div>
      <div style={s.heroSub}>Add information about all assets owned by the household</div>

      <h4 style={{ marginTop: 10 }}><Plus size={16} style={{ verticalAlign: 'middle', color: c.accent }} /> Add New Asset</h4>
      <label style={s.label}>Asset Type<span style={s.required}>*</span></label>
      <select style={s.input} value={currentAsset.asset_type} onChange={e => u('asset_type', e.target.value)}>
        <option value="">Select asset type</option>
        {ASSET_TYPES.map(t => <option key={t}>{t}</option>)}
      </select>
      <div style={{ ...s.row, marginTop: 12 }}>
        <div>
          <label style={s.label}>Village<span style={s.required}>*</span></label>
          <input style={s.input} value={currentAsset.village} onChange={e => u('village', e.target.value)} placeholder="Enter village name" />
        </div>
        <div>
          <label style={s.label}>GPS Coordinates</label>
          <div style={{ display: 'flex', gap: 6 }}>
            <input style={s.input} value={currentAsset.gps_coordinates} onChange={e => u('gps_coordinates', e.target.value)} placeholder="Latitude, Longitude" />
            <button onClick={captureGPS} style={{ ...s.btn(c.accent), padding: '8px 12px' }}><MapPin size={14} /></button>
          </div>
        </div>
      </div>
      <label style={s.label}>Asset Photos</label>
      <div style={{ border: `2px dashed ${c.border}`, borderRadius: 10, padding: 14, textAlign: 'center' }}>
        {currentAsset.asset_photo_url ? <img src={currentAsset.asset_photo_url} alt="Asset" style={{ maxWidth: 120, borderRadius: 8 }} /> : <div style={{ fontSize: 13, color: c.textMuted }}>No photo yet</div>}
        <input ref={fileRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }}
          onChange={async e => {
            const f = e.target.files?.[0]
            if (!f) return
            const url = await onUpload(f)
            if (url) u('asset_photo_url', url)
          }} />
        <button onClick={() => fileRef.current?.click()} style={{ ...s.btn(c.accent), marginTop: 8 }}><Camera size={14} /> {currentAsset.asset_photo_url ? 'Replace' : 'Take Photo'}</button>
      </div>

      <button onClick={addAsset} style={{ ...s.btn(c.accent), width: '100%', marginTop: 14 }}><Plus size={16} /> Add This Asset</button>

      {assets.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <h4 style={{ margin: '0 0 10px', color: c.accent }}><CheckCircle2 size={16} style={{ verticalAlign: 'middle' }} /> Added Assets ({assets.length})</h4>
          {assets.map((a, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: 12, border: `1px solid ${c.border}`, borderRadius: 10, marginBottom: 8,
            }}>
              <div>
                <div style={{ fontWeight: 700 }}>{i + 1}. {a.asset_type}</div>
                <div style={{ fontSize: 12, color: c.textMuted }}>Village: {a.village}{a.asset_photo_url ? ' • Photo uploaded' : ''}</div>
              </div>
              <button onClick={() => setAssets(assets.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', color: c.error, cursor: 'pointer' }}><Trash2 size={16} /></button>
            </div>
          ))}
        </div>
      )}

      <div style={s.navRow}>
        <button onClick={onPrev} style={s.btnGhost}><ArrowLeft size={14} /> Previous</button>
        <button disabled={!canNext} onClick={onNext} style={{ ...s.btn(canNext ? c.accent : '#cbd5e1'), flex: 1 }}>
          Next Step ({assets.length} asset{assets.length === 1 ? '' : 's'}) <ArrowRight size={14} />
        </button>
      </div>
    </div>
  )
}

// -------- Step 3: Beneficiaries --------
function BeneficiariesStep({ hh, mode, setMode, list, setList, onPrev, onNext, canNext }) {
  const update = (i, k, v) => { const arr = [...list]; arr[i] = { ...arr[i], [k]: v }; setList(arr) }
  const add = () => setList([...list, { first_name: '', surname: '', village_name: '', is_minor: 'No', date_of_birth: '', physical_address: '', postal_address: '', cellphone_no: '', type_of_identification: 'None', id_number: 'N/A', expiry_date: '' }])
  const remove = (i) => setList(list.filter((_, j) => j !== i))

  if (!mode) {
    return (
      <div style={s.card}>
        <div style={{ ...s.heroIcon, background: c.purple }}><Users size={28} /></div>
        <div style={s.heroTitle}>Beneficiary Details</div>
        <div style={s.heroSub}>Let's identify who the beneficiaries are for this household</div>

        <div style={{ background: '#faf5ff', border: `1px solid #e9d5ff`, borderRadius: 12, padding: 14, margin: '14px 0' }}>
          <div style={{ fontSize: 12, color: c.purple, fontWeight: 700 }}>Household Head:</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: c.textDark, marginTop: 2 }}>{hh.household_head_first_name} {hh.household_head_surname}</div>
          <div style={{ fontSize: 12, color: c.textMuted, marginTop: 2 }}><MapPin size={11} style={{ verticalAlign: 'middle' }} /> {hh.hh_residential_village}</div>
        </div>

        <div onClick={() => setMode('head_only')} style={s.modeCard}>
          <div style={{ ...s.modeIcon, background: '#e9d5ff' }}><User size={20} color={c.purple} /></div>
          <div>
            <div style={{ fontWeight: 700, color: c.textDark }}>Household Head Only</div>
            <div style={{ fontSize: 12, color: c.textMuted }}>The household head is the only beneficiary</div>
          </div>
        </div>
        <div onClick={() => setMode('multiple')} style={s.modeCard}>
          <div style={{ ...s.modeIcon, background: '#e9d5ff' }}><Users size={20} color={c.purple} /></div>
          <div>
            <div style={{ fontWeight: 700, color: c.textDark }}>Multiple Beneficiaries</div>
            <div style={{ fontSize: 12, color: c.textMuted }}>Add details for all household beneficiaries</div>
          </div>
        </div>

        <div style={s.navRow}>
          <button onClick={onPrev} style={s.btnGhost}><ArrowLeft size={14} /> Previous Step</button>
        </div>
      </div>
    )
  }

  if (mode === 'head_only') {
    return (
      <div style={s.card}>
        <div style={{ ...s.heroIcon, background: c.success }}><CheckCircle2 size={28} /></div>
        <div style={s.heroTitle}>Beneficiary Confirmed</div>
        <div style={s.heroSub}>The household head will be registered as the sole beneficiary</div>

        <div style={{ background: '#fff', border: `1px solid ${c.border}`, borderRadius: 12, padding: 14, margin: '16px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ ...s.modeIcon, background: '#e9d5ff' }}><User size={20} color={c.purple} /></div>
            <div>
              <div style={{ fontWeight: 700, color: c.textDark }}>{hh.household_head_first_name} {hh.household_head_surname}</div>
              <div style={{ fontSize: 12, color: c.textMuted }}>Household Head &amp; Beneficiary</div>
            </div>
          </div>
        </div>

        <div style={s.navRow}>
          <button onClick={() => setMode(null)} style={s.btnGhost}><ArrowLeft size={14} /> Change Selection</button>
          <button onClick={onNext} style={{ ...s.btn(c.purple), flex: 1 }}>Confirm &amp; Continue <ArrowRight size={14} /></button>
        </div>
      </div>
    )
  }

  // multiple
  return (
    <div style={s.card}>
      <div style={{ ...s.heroIcon, background: c.purple }}><Users size={28} /></div>
      <div style={s.heroTitle}>Beneficiary Details</div>
      <div style={s.heroSub}>Add information about all beneficiaries for this household</div>

      <div style={{ textAlign: 'center', margin: '10px 0' }}>
        <button onClick={() => setMode(null)} style={{ ...s.btnGhost, color: c.purple }}><ArrowLeft size={14} /> Change Selection</button>
      </div>

      {list.map((b, i) => (
        <div key={i} style={{ marginBottom: 16, paddingBottom: 14, borderBottom: `1px solid ${c.border}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <h4 style={{ margin: 0, color: c.purple }}>Beneficiary {i + 1}</h4>
            {list.length > 1 && <button onClick={() => remove(i)} style={{ background: 'none', border: 'none', color: c.error, cursor: 'pointer' }}><Trash2 size={16} /></button>}
          </div>
          <div style={s.row}>
            <div>
              <label style={s.label}>First Name<span style={s.required}>*</span></label>
              <input style={s.input} value={b.first_name} onChange={e => update(i, 'first_name', e.target.value)} />
            </div>
            <div>
              <label style={s.label}>Surname<span style={s.required}>*</span></label>
              <input style={s.input} value={b.surname} onChange={e => update(i, 'surname', e.target.value)} />
            </div>
          </div>
          <div style={s.row}>
            <div>
              <label style={s.label}>Village Name<span style={s.required}>*</span></label>
              <input style={s.input} value={b.village_name} onChange={e => update(i, 'village_name', e.target.value)} />
            </div>
            <div>
              <label style={s.label}>Is Minor?</label>
              <select style={s.input} value={b.is_minor} onChange={e => update(i, 'is_minor', e.target.value)}>
                <option>No</option><option>Yes</option>
              </select>
            </div>
          </div>
          <div style={s.row}>
            <div>
              <label style={s.label}>Date of Birth</label>
              <input type="date" style={s.input} value={b.date_of_birth} onChange={e => update(i, 'date_of_birth', e.target.value)} />
            </div>
            <div>
              <label style={s.label}>Cellphone</label>
              <input style={s.input} value={b.cellphone_no} onChange={e => update(i, 'cellphone_no', e.target.value)} />
            </div>
          </div>
          <div style={s.row}>
            <div>
              <label style={s.label}>Physical Address</label>
              <input style={s.input} value={b.physical_address} onChange={e => update(i, 'physical_address', e.target.value)} />
            </div>
            <div>
              <label style={s.label}>Postal Address</label>
              <input style={s.input} value={b.postal_address} onChange={e => update(i, 'postal_address', e.target.value)} />
            </div>
          </div>
          <label style={s.label}>Type of Identification</label>
          <select style={s.input} value={b.type_of_identification} onChange={e => update(i, 'type_of_identification', e.target.value)}>
            {ID_TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
      ))}
      <button onClick={add} style={{ ...s.btn('#faf5ff', c.purple), border: `1px dashed ${c.purple}`, width: '100%' }}><Plus size={14} /> Add Another Beneficiary</button>

      <div style={s.navRow}>
        <button onClick={onPrev} style={s.btnGhost}><ArrowLeft size={14} /> Previous Step</button>
        <button disabled={!canNext} onClick={onNext} style={{ ...s.btn(canNext ? c.purple : '#cbd5e1'), flex: 1 }}>Next Step <ArrowRight size={14} /></button>
      </div>
    </div>
  )
}

// -------- Step 4: Co-owners --------
function CoownersStep({ mode, setMode, list, setList, onPrev, onNext, canNext }) {
  const update = (i, k, v) => { const arr = [...list]; arr[i] = { ...arr[i], [k]: v }; setList(arr) }
  const add = () => setList([...list, { first_name: '', surname: '', physical_address: '', cellphone_no: '', land_line: '', type_of_identification: 'None', id_number: 'N/A' }])
  const remove = (i) => setList(list.filter((_, j) => j !== i))
  return (
    <div style={s.card}>
      <div style={{ ...s.heroIcon, background: c.orange }}><UserPlus size={28} /></div>
      <div style={s.heroTitle}>Co-owner Details</div>
      <div style={s.heroSub}>Add information about co-owners if applicable</div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 14, border: `1px solid ${c.border}`, borderRadius: 12, margin: '14px 0' }}>
        <div>
          <div style={{ fontWeight: 700, color: c.textDark }}>Add Co-owner?</div>
          <div style={{ fontSize: 12, color: c.textMuted }}>Select whether this household has any co-owners</div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={() => setMode('no')} style={{ ...s.btn(mode === 'no' ? c.primary : c.bgCard, mode === 'no' ? '#fff' : c.textDark), border: `1px solid ${c.border}` }}>No</button>
          <button onClick={() => setMode('yes')} style={{ ...s.btn(mode === 'yes' ? c.orange : c.bgCard, mode === 'yes' ? '#fff' : c.textDark), border: `1px solid ${c.border}` }}>Yes</button>
        </div>
      </div>

      {mode === 'no' && (
        <div style={{ textAlign: 'center', padding: 30, color: c.textMuted, background: c.bgLight, borderRadius: 12 }}>
          <User size={40} style={{ margin: '0 auto 8px', display: 'block' }} />
          <div style={{ fontWeight: 600, color: c.textDark, marginBottom: 4 }}>No Co-owners</div>
          <div style={{ fontSize: 12 }}>Click "Next Step" to continue to Banking Details.</div>
        </div>
      )}

      {mode === 'yes' && list.map((co, i) => (
        <div key={i} style={{ marginBottom: 16, paddingBottom: 14, borderBottom: `1px solid ${c.border}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <h4 style={{ margin: 0, color: c.orange }}>Co-owner {i + 1}</h4>
            {list.length > 1 && <button onClick={() => remove(i)} style={{ background: 'none', border: 'none', color: c.error, cursor: 'pointer' }}><Trash2 size={16} /></button>}
          </div>
          <div style={s.row}>
            <div>
              <label style={s.label}>First Name<span style={s.required}>*</span></label>
              <input style={s.input} value={co.first_name} onChange={e => update(i, 'first_name', e.target.value)} placeholder="Enter first name" />
            </div>
            <div>
              <label style={s.label}>Surname<span style={s.required}>*</span></label>
              <input style={s.input} value={co.surname} onChange={e => update(i, 'surname', e.target.value)} placeholder="Enter surname" />
            </div>
          </div>
          <label style={s.label}>Physical Address</label>
          <input style={s.input} value={co.physical_address} onChange={e => update(i, 'physical_address', e.target.value)} placeholder="Address (optional)" />
          <div style={{ ...s.row, marginTop: 10 }}>
            <div>
              <label style={s.label}>Cell</label>
              <input style={s.input} value={co.cellphone_no} onChange={e => update(i, 'cellphone_no', e.target.value)} placeholder="Cellphone (optional)" />
            </div>
            <div>
              <label style={s.label}>Land Line</label>
              <input style={s.input} value={co.land_line} onChange={e => update(i, 'land_line', e.target.value)} placeholder="Land line (optional)" />
            </div>
          </div>
          <label style={s.label}>Type of Identification</label>
          <select style={s.input} value={co.type_of_identification} onChange={e => update(i, 'type_of_identification', e.target.value)}>
            {ID_TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
      ))}

      {mode === 'yes' && (
        <button onClick={add} style={{ ...s.btn('#fff7ed', c.orange), border: `1px dashed ${c.orange}`, width: '100%' }}><Plus size={14} /> Add Another Co-owner</button>
      )}

      <div style={s.navRow}>
        <button onClick={onPrev} style={s.btnGhost}><ArrowLeft size={14} /> Previous</button>
        <button disabled={!canNext} onClick={onNext} style={{ ...s.btn(canNext ? c.orange : '#cbd5e1'), flex: 1 }}>Next Step <ArrowRight size={14} /></button>
      </div>
    </div>
  )
}

// -------- Step 5: Banking --------
function BankingStep({ mode, setMode, bank, setBank, onPrev, onNext, canNext }) {
  const u = (k, v) => setBank({ ...bank, [k]: v })
  return (
    <div style={s.card}>
      <div style={{ ...s.heroIcon, background: c.blue }}><CreditCard size={28} /></div>
      <div style={s.heroTitle}>Banking Details</div>
      <div style={s.heroSub}>Do you want to provide banking information for this household?</div>

      <div onClick={() => setMode('skip')} style={{ ...s.modeCard, ...(mode === 'skip' ? s.modeCardActive : {}) }}>
        <div style={{ ...s.modeIcon, background: '#f3f4f6' }}>—</div>
        <div>
          <div style={{ fontWeight: 700, color: c.textDark }}>No Banking Details</div>
          <div style={{ fontSize: 12, color: c.textMuted }}>Skip banking information for this household</div>
        </div>
      </div>
      <div onClick={() => setMode('yes')} style={{ ...s.modeCard, ...(mode === 'yes' ? { ...s.modeCardActive, borderColor: c.blue, background: '#eff6ff' } : {}) }}>
        <div style={{ ...s.modeIcon, background: '#dbeafe' }}><CreditCard size={18} color={c.blue} /></div>
        <div>
          <div style={{ fontWeight: 700, color: c.textDark }}>Add Banking Details</div>
          <div style={{ fontSize: 12, color: c.textMuted }}>Provide banking information for payments</div>
        </div>
      </div>

      {mode === 'yes' && (
        <div style={{ marginTop: 14 }}>
          <h4 style={{ color: c.blue, margin: '6px 0 10px' }}>Bank Information</h4>
          <label style={s.label}>Bank Name<span style={s.required}>*</span></label>
          <select style={s.input} value={bank.bank_name} onChange={e => u('bank_name', e.target.value)}>
            <option value="">Select bank</option>
            {BANKS.map(b => <option key={b}>{b}</option>)}
          </select>
          <h4 style={{ color: c.blue, margin: '14px 0 10px' }}>Account Information</h4>
          <div style={s.row}>
            <div>
              <label style={s.label}>Account Number<span style={s.required}>*</span></label>
              <input style={s.input} value={bank.account_number} onChange={e => u('account_number', e.target.value)} placeholder="Enter account number" />
            </div>
            <div>
              <label style={s.label}>Branch Code<span style={s.required}>*</span></label>
              <input style={s.input} value={bank.branch_code} onChange={e => u('branch_code', e.target.value)} placeholder="Enter branch code" />
            </div>
          </div>
          <label style={s.label}>Account Holder Name<span style={s.required}>*</span></label>
          <input style={s.input} value={bank.account_holder_name} onChange={e => u('account_holder_name', e.target.value)} placeholder="Enter account holder full name" />
          <label style={{ ...s.label, marginTop: 10 }}>Account Type<span style={s.required}>*</span></label>
          <select style={s.input} value={bank.account_type} onChange={e => u('account_type', e.target.value)}>
            <option value="">Select account type</option>
            {ACCOUNT_TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
      )}

      <div style={s.navRow}>
        <button onClick={onPrev} style={s.btnGhost}><ArrowLeft size={14} /> Previous</button>
        <button disabled={!canNext} onClick={onNext} style={{ ...s.btn(canNext ? c.blue : '#cbd5e1'), flex: 1 }}>Continue to Review <ArrowRight size={14} /></button>
      </div>
    </div>
  )
}

// -------- Step 6: Review & Submit --------
function ReviewStep({ routeSel, hh, assets, benMode, beneficiaries, coMode, coowners, bankMode, bank, submitting, submitError, onPrev, onSubmit, onEditStep }) {
  const Section = ({ title, stepIndex, children }) => (
    <div style={{ background: '#fff', border: `1px solid ${c.border}`, borderRadius: 12, padding: 16, marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <h4 style={{ margin: 0, color: c.textDark }}>{title}</h4>
        <button onClick={() => onEditStep(stepIndex)} style={{ background: 'none', border: 'none', color: c.purple, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}><Edit2 size={13} /> Edit</button>
      </div>
      {children}
    </div>
  )
  const Field = ({ label, value }) => (
    <div style={{ marginBottom: 8 }}>
      <div style={{ fontSize: 11, color: c.textMuted, fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 14, color: c.textDark }}>{value || <span style={{ color: c.textMuted }}>Not provided</span>}</div>
    </div>
  )
  return (
    <div style={s.card}>
      <div style={{ ...s.heroIcon, background: c.success }}><CheckCircle2 size={28} /></div>
      <div style={s.heroTitle}>Review &amp; Submit</div>
      <div style={s.heroSub}>Review all information below. Click edit to change a section.</div>

      <Section title="Route" stepIndex={0}>
        <Field label="Route" value={routeSel} />
      </Section>

      <Section title="Household Information" stepIndex={1}>
        <div style={s.row}>
          <Field label="First Name" value={hh.household_head_first_name} />
          <Field label="Surname" value={hh.household_head_surname} />
          <Field label="Gender" value={hh.gender} />
          <Field label="ID Type" value={hh.type_of_identification} />
          <Field label="ID Number" value={hh.id_number} />
          <Field label="Original Village" value={hh.hh_original_village_name} />
          <Field label="Residential Village" value={hh.hh_residential_village} />
          <Field label="Occupation" value={hh.occupation_of_pap} />
          <Field label="Cellphone" value={hh.cellphone_no} />
        </div>
        {hh.photograph_of_pap_url && <img src={hh.photograph_of_pap_url} alt="PAP" style={{ maxWidth: 100, borderRadius: 8, marginTop: 8 }} />}
      </Section>

      <Section title={`Assets (${assets.length})`} stepIndex={2}>
        {assets.map((a, i) => (
          <div key={i} style={{ fontSize: 13, marginBottom: 6 }}>
            <strong>{i + 1}. {a.asset_type}</strong> — Village: {a.village}{a.gps_coordinates ? ` • GPS: ${a.gps_coordinates}` : ''}
          </div>
        ))}
      </Section>

      <Section title="Beneficiaries" stepIndex={3}>
        {benMode === 'head_only' && <div style={{ fontSize: 13 }}>Household head <strong>{hh.household_head_first_name} {hh.household_head_surname}</strong> is the sole beneficiary</div>}
        {benMode === 'multiple' && beneficiaries.map((b, i) => (
          <div key={i} style={{ fontSize: 13, marginBottom: 4 }}>{i + 1}. <strong>{b.first_name} {b.surname}</strong> — {b.village_name} {b.is_minor === 'Yes' ? '(minor)' : ''}</div>
        ))}
      </Section>

      <Section title="Co-owners" stepIndex={4}>
        {coMode === 'no' ? <div style={{ fontSize: 13, color: c.textMuted }}>None</div> : coowners.filter(co => co.first_name).map((co, i) => (
          <div key={i} style={{ fontSize: 13, marginBottom: 4 }}>{i + 1}. <strong>{co.first_name} {co.surname}</strong></div>
        ))}
      </Section>

      <Section title="Banking" stepIndex={5}>
        {bankMode === 'skip' ? <div style={{ fontSize: 13, color: c.textMuted }}>Not provided</div> : (
          <div style={s.row}>
            <Field label="Bank" value={bank.bank_name} />
            <Field label="Account Number" value={bank.account_number} />
            <Field label="Branch Code" value={bank.branch_code} />
            <Field label="Account Type" value={bank.account_type} />
            <Field label="Account Holder" value={bank.account_holder_name} />
          </div>
        )}
      </Section>

      {submitError && (
        <div style={{ padding: 12, background: '#fef2f2', color: c.error, borderRadius: 10, marginBottom: 12, fontSize: 13 }}>
          Submission failed: {submitError}
        </div>
      )}

      <div style={s.navRow}>
        <button onClick={onPrev} disabled={submitting} style={s.btnGhost}><ArrowLeft size={14} /> Previous Step</button>
        <button onClick={onSubmit} disabled={submitting} style={{ ...s.btn(c.success), flex: 1, padding: 14 }}>
          {submitting ? 'Submitting…' : <>Submit Registration <Check size={16} /></>}
        </button>
      </div>
    </div>
  )
}
