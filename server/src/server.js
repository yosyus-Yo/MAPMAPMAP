// MapMapMap MVP - Server Entry Point
const app = require('./app');
const { initDatabase } = require('./config/database');

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    // Initialize database
    await initDatabase();
    console.log('Database initialized');

    // Start server
    app.listen(PORT, () => {
      console.log(`
========================================
  MapMapMap MVP Server
========================================
  Status: Running
  Port: ${PORT}
  URL: http://localhost:${PORT}

  API Endpoints:
  - POST /api/auth/signup
  - POST /api/auth/login
  - POST /api/auth/logout
  - GET  /api/auth/me
  - PUT  /api/auth/spicy-level
  - GET  /api/restaurants
  - GET  /api/restaurants/:id
  - POST /api/restaurants
  - POST /api/reviews
  - GET  /api/reviews/my
  - GET  /api/admin/reviews
  - PUT  /api/admin/reviews/:id/approve
  - PUT  /api/admin/reviews/:id/reject
  - GET  /api/health
========================================
      `);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
