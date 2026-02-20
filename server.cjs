const express = require('express')
const multer = require('multer')
const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3')
const path = require('path')

const app = express()
const PORT = process.env.PORT || 3000

// R2 Configuration
const R2 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
})

const BUCKET = process.env.R2_BUCKET || 'cims-documents'
const PUBLIC_URL = process.env.R2_PUBLIC_URL || 'https://files.4dcs.co.za'

// Multer: accept up to 20MB per file, store in memory
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
})

// CORS for API routes
app.use('/api', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Methods', 'POST, DELETE, OPTIONS')
  res.header('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.sendStatus(200)
  next()
})

app.use(express.json())

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', storage: 'cloudflare-r2' })
})

// Upload file to R2
app.post('/api/upload', upload.single('file'), async (req, res) => {
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
      success: true,
      url: publicUrl,
      key: key,
      fileName: req.file.originalname,
      size: req.file.size,
    })
  } catch (err) {
    console.error('Upload error:', err)
    res.status(500).json({ error: err.message })
  }
})

// Delete file from R2
app.delete('/api/delete', async (req, res) => {
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
