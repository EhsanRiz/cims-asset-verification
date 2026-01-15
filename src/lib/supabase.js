import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://zicpfqqdszxolvzqfqjs.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InppY3BmcXFkc3p4b2x2enFmcWpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA3MDI3NzAsImV4cCI6MjA2NjI3ODc3MH0.oObNdgfonPkNLkMMQRtODkTe0gk3TsJb6aPPcZVK8Sw'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Auth functions
export async function signIn(username, password) {
  // Query system_users table directly
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

// Household functions
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
    .order('created_at', { ascending: false })

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
  return data
}

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

export async function updateHouseholdAsset(id, updates) {
  const { data, error } = await supabase
    .from('household_assets')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateCoOwner(id, updates) {
  const { data, error } = await supabase
    .from('co_owners')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

// Get unique villages for filter dropdown
export async function getVillages() {
  const { data, error } = await supabase
    .from('households')
    .select('hh_original_village_name')
    .order('hh_original_village_name')

  if (error) throw error
  
  // Get unique values
  const unique = [...new Set(data.map(d => d.hh_original_village_name))].filter(Boolean)
  return unique
}

// Get unique routes for filter dropdown
export async function getRoutes() {
  const { data, error } = await supabase
    .from('households')
    .select('route_code, route_name')
    .order('route_code')

  if (error) throw error
  
  // Get unique values
  const seen = new Set()
  const unique = data.filter(d => {
    if (!d.route_code || seen.has(d.route_code)) return false
    seen.add(d.route_code)
    return true
  })
  return unique
}

// Communal assets functions
export async function getCommunalAssets(filters = {}) {
  let query = supabase
    .from('communal_assets')
    .select('*')
    .order('village_name')

  if (filters.village) {
    query = query.eq('village_name', filters.village)
  }

  if (filters.search) {
    query = query.or(`village_name.ilike.%${filters.search}%,chief_name.ilike.%${filters.search}%`)
  }

  const { data, error } = await query

  if (error) throw error
  return data
}

export async function updateCommunalAsset(id, updates) {
  const { data, error } = await supabase
    .from('communal_assets')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function createCommunalAsset(assetData) {
  const { data, error } = await supabase
    .from('communal_assets')
    .insert(assetData)
    .select()
    .single()

  if (error) throw error
  return data
}

// File upload function
export async function uploadFile(file, bucket, path) {
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: true
    })

  if (error) throw error
  
  // Get public URL
  const { data: urlData } = supabase.storage
    .from(bucket)
    .getPublicUrl(path)

  return urlData.publicUrl
}
