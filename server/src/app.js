// MapMapMap MVP - Express Application
const express = require('express');
const cors = require('cors');
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

// Session configuration
if (isServerless) {
  // Vercel: cookie-session 사용 (세션 데이터를 쿠키에 저장)
  const cookieSession = require('cookie-session');
  app.use(cookieSession({
    name: 'session',
    keys: [process.env.SESSION_SECRET || 'mapmap-secret-key-2025'],
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    secure: true,
    httpOnly: true,
    sameSite: 'none'
  }));
} else {
  // 로컬: express-session + FileStore 사용
  const session = require('express-session');
  const FileStore = require('session-file-store')(session);
  const fs = require('fs');
  const sessionsPath = path.join(__dirname, '../sessions');
  if (!fs.existsSync(sessionsPath)) {
    fs.mkdirSync(sessionsPath, { recursive: true });
  }
  app.use(session({
    store: new FileStore({
      path: sessionsPath,
      ttl: 86400
    }),
    secret: process.env.SESSION_SECRET || 'mapmap-secret-key-2025',
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 24 * 60 * 60 * 1000,
      httpOnly: true,
      secure: false,
      sameSite: 'lax'
    }
  }));
}

// Request logging (development)
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
    next();
  });
}

// API Routes
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

// 프론트엔드 설정 (카카오맵 API 키 등)
app.get('/api/config', (req, res) => {
  res.json({
    kakaoMapKey: process.env.KAKAO_MAP_KEY || ''
  });
});

// 404 handler for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'API endpoint not found'
  });
});

// SPA fallback (로컬 개발용)
if (!isServerless) {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../../public/index.html'));
  });
}

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);

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
