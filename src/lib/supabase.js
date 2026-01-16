import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://zicpfqqdszxolvzqfqjs.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InppY3BmcXFkc3p4b2x2enFmcWpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA3MDI3NzAsImV4cCI6MjA2NjI3ODc3MH0.oObNdgfonPkNLkMMQRtODkTe0gk3TsJb6aPPcZVK8Sw'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Auth - Sign in using system_users table
export async function signIn(username, password) {
  const { data, error } = await supabase
    .from('system_users')
    .select('*')
    .eq('username', username)
    .eq('password', password)
    .single()

  if (error || !data) {
    throw new Error('Invalid username or password')
  }

  return data
}

// Get all households with related data
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

  if (filters.village) {
    query = query.eq('hh_original_village_name', filters.village)
  }

  if (filters.route_code) {
    query = query.eq('route_code', filters.route_code)
  }

  if (filters.approval_status) {
    query = query.eq('approval_status', filters.approval_status)
  }

  const { data, error } = await query

  if (error) throw error
  return data || []
}

// Get single household by ID
export async function getHouseholdById(id) {
  const { data, error } = await supabase
    .from('households')
    .select(`
      *,
      beneficiaries (*),
      co_owners (*),
      household_assets (*),
      banking_details (*)
    `)
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

// Get unique villages
export async function getVillages() {
  const { data, error } = await supabase
    .from('households')
    .select('hh_original_village_name')
    .not('hh_original_village_name', 'is', null)
    .order('hh_original_village_name')

  if (error) throw error
  
  const uniqueVillages = [...new Set(data.map(d => d.hh_original_village_name).filter(Boolean))]
  return uniqueVillages
}

// Get unique routes
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

// Update household
export async function updateHousehold(id, updates) {
  const { data, error } = await supabase
    .from('households')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

// Update beneficiary
export async function updateBeneficiary(id, updates) {
  const { data, error } = await supabase
    .from('beneficiaries')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

// Update asset
export async function updateAsset(id, updates) {
  const { data, error } = await supabase
    .from('household_assets')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

// Upload photo to storage
export async function uploadPhoto(file, householdId, fieldName) {
  const fileExt = file.name.split('.').pop()
  const fileName = `${householdId}_${fieldName}_${Date.now()}.${fileExt}`
  const filePath = `photos/${fileName}`

  const { error: uploadError } = await supabase.storage
    .from('cims-documents')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: true
    })

  if (uploadError) throw uploadError

  const { data: { publicUrl } } = supabase.storage
    .from('cims-documents')
    .getPublicUrl(filePath)

  return publicUrl
}
