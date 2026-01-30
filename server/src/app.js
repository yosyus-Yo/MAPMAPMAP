// MapMapMap MVP - Express Application
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const path = require('path');

const app = express();

// Vercel/서버리스 환경 감지
const isServerless = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME;

// CORS configuration
app.use(cors({
  origin: true,
  credentials: true
}));

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files - serve public folder (로컬 개발용)
if (!isServerless) {
  app.use(express.static(path.join(__dirname, '../../public')));
}

// 이미지는 Supabase Storage에서 제공 (로컬 uploads 폴더 불필요)

// Session configuration
const sessionConfig = {
  secret: process.env.SESSION_SECRET || 'mapmap-secret-key-2025',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
  }
};

// 로컬 개발 환경에서만 FileStore 사용
if (!isServerless) {
  const FileStore = require('session-file-store')(session);
  const fs = require('fs');
  const sessionsPath = path.join(__dirname, '../sessions');
  if (!fs.existsSync(sessionsPath)) {
    fs.mkdirSync(sessionsPath, { recursive: true });
  }
  sessionConfig.store = new FileStore({
    path: sessionsPath,
    ttl: 86400
  });
}

app.use(session(sessionConfig));

// Request logging (development)
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
    next();
  });
}

// API Routes (will be added in Phase 2-4)
app.use('/api/auth', require('./routes/auth'));
app.use('/api/restaurants', require('./routes/restaurants'));
app.use('/api/reviews', require('./routes/reviews'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/favorites', require('./routes/favorites'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

// 404 handler for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'API endpoint not found'
  });
});

// SPA fallback - serve index.html for all other routes (로컬 개발용)
if (!isServerless) {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../../public/index.html'));
  });
}

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);

  // Multer errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      error: '파일 크기는 5MB를 초과할 수 없습니다'
    });
  }

  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error'
  });
});

module.exports = app;
