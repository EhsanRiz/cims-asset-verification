import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://zicpfqqdszxolvzqfqjs.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InppY3BmcXFkc3p4b2x2enFmcWpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA3MDI3NzAsImV4cCI6MjA2NjI3ODc3MH0.oObNdgfonPkNLkMMQRtODkTe0gk3TsJb6aPPcZVK8Sw'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})

// ──────────────────────────────────────────────────────────────────────────────
// Role taxonomy (kept in sync with the system_users.role CHECK constraint)
// ──────────────────────────────────────────────────────────────────────────────
//   admin                         — full access, user management
//   user                          — legacy field-surveyor role, preserved for Mamokuena
//   client                        — legacy client tier, preserved (LLWDSP III view)
//   clo, arco, rco, essm          — editor: can view + add/edit PAPs
//   assistant_clo, pm, ict_dmo    — view-only: can view, no edits
// ──────────────────────────────────────────────────────────────────────────────
export const EDITOR_ROLES    = new Set(['admin', 'user', 'clo', 'arco', 'rco', 'essm'])
export const VIEW_ONLY_ROLES = new Set(['assistant_clo', 'pm', 'ict_dmo', 'client'])

export function canEdit(role) {
  return EDITOR_ROLES.has((role || '').toLowerCase())
}

export function isAdmin(role) {
  return (role || '').toLowerCase() === 'admin'
}

export const ROLE_LABELS = {
  admin:         'Administrator',
  user:          'Field Surveyor',
  client:        'Client (read-only)',
  assistant_clo: 'Assistant CLO',
  clo:           'CLO',
  arco:          'ARCO',
  rco:           'RCO',
  essm:          'ESS Manager',
  pm:            'Project Manager',
  ict_dmo:       'ICT & DMO',
}

// ──────────────────────────────────────────────────────────────────────────────
// Auth — Supabase Auth (email + password) with a legacy fallback for username/password.
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Check whether an email is on the pre-authorised allow-list. Used by the register page
 * to give a clear "not authorised" error before asking the user to create a password.
 * Returns { authorized, role?, full_name?, job_title?, already_registered? }
 */
export async function checkEmailAuthorized(email) {
  const { data, error } = await supabase.rpc('check_email_authorized', { p_email: email })
  if (error) throw error
  return data
}

/**
 * Register a new CIMS account via Supabase Auth. Email must already be in authorized_emails.
 * The on_auth_user_created trigger wires up the system_users row automatically.
 */
export async function registerWithEmail(email, password) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${window.location.origin}/#/login`,
    },
  })
  if (error) throw error
  return data
}

/**
 * Sign in via Supabase Auth (email + password).
 * After successful auth, loads the associated system_users row and returns the merged profile.
 */
export async function signInWithEmail(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error

  const profile = await loadCurrentUserProfile()
  if (!profile) {
    await supabase.auth.signOut()
    throw new Error('Your account is not yet authorised for CIMS. Please contact the administrator.')
  }
  if (!profile.is_active) {
    await supabase.auth.signOut()
    throw new Error('Your account has been deactivated. Please contact the administrator.')
  }
  return profile
}

/** Request a password reset email — Supabase Auth's built-in flow. */
export async function requestPasswordReset(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/#/reset-password`,
  })
  if (error) throw error
}

/** Set a new password — called from the reset-password page after the user clicks the email link. */
export async function updatePassword(newPassword) {
  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) throw error
}

export async function signOut() {
  await supabase.auth.signOut()
}

/**
 * Load the current user's merged profile: Supabase Auth user + linked system_users row.
 * Returns null if either piece is missing.
 */
export async function loadCurrentUserProfile() {
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) return null

  const { data: row, error } = await supabase
    .from('system_users')
    .select('id, username, email, full_name, role, is_active, created_at')
    .eq('auth_user_id', authUser.id)
    .maybeSingle()

  if (error) throw error
  if (!row) return null

  return { ...row, auth_user_id: authUser.id, auth_email: authUser.email }
}

// ──────────────────────────────────────────────────────────────────────────────
// Legacy username/password sign-in. DEPRECATED — kept for rollback during the
// Supabase Auth migration. Will be removed once Admin and Mamokuena have completed
// registration via /register.
// ──────────────────────────────────────────────────────────────────────────────
export async function signIn(username, password) {
  const { data, error } = await supabase
    .from('system_users')
    .select('*')
    .eq('username', username)
    .eq('password', password)
    .eq('is_active', true)
    .single()

  if (error || !data) {
    throw new Error('Invalid username or password')
  }
  return data
}

// ──────────────────────────────────────────────────────────────────────────────
// Data access — unchanged from previous version.
// ──────────────────────────────────────────────────────────────────────────────

export async function getHouseholds(filters = {}) {
  let query = supabase
    .from('households')
    .select(`
      *,
      beneficiaries (*),
      co_owners (*),
      household_assets (*),
      banking_details (*)
    `)
    .order('household_head_surname', { ascending: true })

  if (filters.search) {
    query = query.or(`household_head_first_name.ilike.%${filters.search}%,household_head_surname.ilike.%${filters.search}%,id_number.ilike.%${filters.search}%`)
  }
  if (filters.village) query = query.eq('hh_original_village_name', filters.village)
  if (filters.route_code) query = query.eq('route_code', filters.route_code)
  if (filters.approval_status) query = query.eq('approval_status', filters.approval_status)

  const { data, error } = await query
  if (error) throw error
  return data || []
}

export async function getHouseholdById(id) {
  const { data, error } = await supabase
    .from('households')
    .select(`*, beneficiaries (*), co_owners (*), household_assets (*), banking_details (*)`)
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export async function getVillages() {
  const { data, error } = await supabase
    .from('households')
    .select('hh_original_village_name')
    .not('hh_original_village_name', 'is', null)
    .order('hh_original_village_name')
  if (error) throw error
  return [...new Set(data.map(d => d.hh_original_village_name).filter(Boolean))]
}

export async function getRoutes() {
  const { data, error } = await supabase
    .from('households')
    .select('route_code, route_name')
    .not('route_code', 'is', null)
    .order('route_code')
  if (error) throw error
  const uniqueRoutes = []
  const seen = new Set()
  data.forEach(d => {
    if (d.route_code && !seen.has(d.route_code)) {
      seen.add(d.route_code)
      uniqueRoutes.push(d)
    }
  })
  return uniqueRoutes
}

export async function updateHousehold(id, updates) {
  const { data, error } = await supabase.from('households').update(updates).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function updateBeneficiary(id, updates) {
  const { data, error } = await supabase.from('beneficiaries').update(updates).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function updateAsset(id, updates) {
  const { data, error } = await supabase.from('household_assets').update(updates).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function uploadPhoto(file, householdId, fieldName) {
  const fileExt = file.name.split('.').pop()
  const fileName = `${householdId}_${fieldName}_${Date.now()}.${fileExt}`
  const filePath = `photos/${fileName}`

  const { error: uploadError } = await supabase.storage
    .from('cims-documents')
    .upload(filePath, file, { cacheControl: '3600', upsert: true })
  if (uploadError) throw uploadError

  const { data: { publicUrl } } = supabase.storage
    .from('cims-documents')
    .getPublicUrl(filePath)
  return publicUrl
}
