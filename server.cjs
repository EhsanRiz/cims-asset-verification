const express = require('express')
const multer = require('multer')
const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3')
const { createClient } = require('@supabase/supabase-js')
const path = require('path')

const app = express()
const PORT = process.env.PORT || 3000

// ─── Supabase (JWT verification for /api/* endpoints) ──────────────────────────
const SUPABASE_URL      = process.env.SUPABASE_URL      || 'https://zicpfqqdszxolvzqfqjs.supabase.co'
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InppY3BmcXFkc3p4b2x2enFmcWpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA3MDI3NzAsImV4cCI6MjA2NjI3ODc3MH0.oObNdgfonPkNLkMMQRtODkTe0gk3TsJb6aPPcZVK8Sw'

// Roles allowed to upload/delete documents. Mirrors EDITOR_ROLES in
// src/lib/supabase.js — keep in sync.
const EDITOR_ROLES = new Set(['admin', 'user', 'clo', 'arco', 'rco', 'essm'])

async function requireAuth(req, res, next) {
  try {
    const auth = req.headers.authorization || ''
    if (!auth.toLowerCase().startsWith('bearer ')) {
      return res.status(401).json({ error: 'Missing bearer token' })
    }
    const token = auth.slice(7).trim()
    if (!token) return res.status(401).json({ error: 'Empty bearer token' })

    // Per-request client carries the user's JWT for both auth.getUser and the
    // RLS-aware system_users lookup. Cheaper than per-request signature
    // verification by hand.
    const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth:   { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    })

    const { data: { user }, error: authErr } = await client.auth.getUser(token)
    if (authErr || !user) return res.status(401).json({ error: 'Invalid or expired token' })

    const { data: profile, error: pErr } = await client
      .from('system_users')
      .select('id, role, is_active, full_name')
      .eq('auth_user_id', user.id)
      .maybeSingle()

    if (pErr)                   return res.status(500).json({ error: 'Profile lookup failed' })
    if (!profile)               return res.status(403).json({ error: 'No CIMS profile linked to this account' })
    if (profile.is_active === false) return res.status(403).json({ error: 'Account deactivated' })

    req.cimsUser = {
      id:        user.id,
      email:     user.email,
      role:      profile.role,
      full_name: profile.full_name,
      profile_id: profile.id,
    }
    next()
  } catch (err) {
    console.error('requireAuth crashed:', err)
    res.status(500).json({ error: 'Auth check failed' })
  }
}

function requireEditor(req, res, next) {
  if (!req.cimsUser?.role || !EDITOR_ROLES.has(req.cimsUser.role)) {
    return res.status(403).json({ error: 'Editor role required for this action' })
  }
  next()
}

// ─── R2 setup ──────────────────────────────────────────────────────────────────
const R2 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
})

const BUCKET     = process.env.R2_BUCKET     || 'cims-documents'
const PUBLIC_URL = process.env.R2_PUBLIC_URL || 'https://files.4dcs.co.za'

// Multer: accept up to 20MB per file, store in memory
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
})

// ─── CORS for API routes (now allows Authorization header) ─────────────────────
app.use('/api', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Methods', 'POST, DELETE, OPTIONS')
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') return res.sendStatus(200)
  next()
})

app.use(express.json())

// ─── Routes ────────────────────────────────────────────────────────────────────
// Health check (unauthenticated — used by Render's health probe)
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', storage: 'cloudflare-r2' })
})

// Upload file to R2 — editor roles only
app.post('/api/upload', requireAuth, requireEditor, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file provided' })

    const { routeName, papName, category } = req.body
    // Build organized path: {category}/{route}/{pap}/{timestamp}_{filename}
    const sanitize = (s) => (s || 'unknown').replace(/[^a-zA-Z0-9_\-. ]/g, '_').trim()
    const timestamp = Date.now()
    const ext = path.extname(req.file.originalname) || ''
    const baseName = path.basename(req.file.originalname, ext)
    const key = [
      sanitize(category || 'documents'),
      sanitize(routeName),
      sanitize(papName),
      `${timestamp}_${sanitize(baseName)}${ext}`
    ].join('/')

    await R2.send(new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: req.file.buffer,
      ContentType: req.file.mimetype,
    }))

    const publicUrl = `${PUBLIC_URL}/${key}`

    res.json({
      success:   true,
      url:       publicUrl,
      key,
      fileName:  req.file.originalname,
      size:      req.file.size,
      uploaded_by: req.cimsUser.profile_id,
    })
  } catch (err) {
    console.error('Upload error:', err)
    res.status(500).json({ error: err.message })
  }
})

// Delete file from R2 — editor roles only
app.delete('/api/delete', requireAuth, requireEditor, async (req, res) => {
  try {
    const { key } = req.body
    if (!key) return res.status(400).json({ error: 'No key provided' })

    await R2.send(new DeleteObjectCommand({
      Bucket: BUCKET,
      Key: key,
    }))

    res.json({ success: true })
  } catch (err) {
    console.error('Delete error:', err)
    res.status(500).json({ error: err.message })
  }
})

// Serve static frontend (Vite build output)
app.use(express.static(path.join(__dirname, 'dist')))

// SPA fallback — serve index.html for all non-API routes
app.get('/{*path}', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'))
  }
})

app.listen(PORT, () => {
  console.log(`CIMS server running on port ${PORT}`)
  console.log(`R2 bucket: ${BUCKET}`)
  console.log(`Public URL: ${PUBLIC_URL}`)
})
