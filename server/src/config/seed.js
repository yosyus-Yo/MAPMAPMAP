// Seed initial data - MapMapMap MVP
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { initDatabase, query, run, saveDatabase } = require('./database');

async function seed() {
  await initDatabase();

  console.log('Seeding database...');

  // Create admin user
  const adminId = uuidv4();
  const adminPassword = await bcrypt.hash('admin123', 10);

  try {
    run(
      'INSERT INTO users (id, email, password_hash, nickname, spicy_level, is_admin) VALUES (?, ?, ?, ?, ?, ?)',
      [adminId, 'admin@mapmap.kr', adminPassword, '관리자', 3, 1]
    );
    console.log('Admin user created: admin@mapmap.kr / admin123');
  } catch (e) {
    console.log('Admin user already exists');
  }

  // Create test user
  const testUserId = uuidv4();
  const testPassword = await bcrypt.hash('test1234', 10);

  try {
    run(
      'INSERT INTO users (id, email, password_hash, nickname, spicy_level) VALUES (?, ?, ?, ?, ?)',
      [testUserId, 'test@test.com', testPassword, '맵부심', 3]
    );
    console.log('Test user created: test@test.com / test1234');
  } catch (e) {
    console.log('Test user already exists');
  }

  // Create sample restaurants
  const restaurants = [
    { name: '불닭발전문점', address: '서울시 강남구 역삼동 123-4', lat: 37.5012, lng: 127.0396, category: '닭발' },
    { name: '엽기떡볶이 강남점', address: '서울시 강남구 논현동 456-7', lat: 37.5087, lng: 127.0325, category: '떡볶이' },
    { name: '신당동 떡볶이타운', address: '서울시 중구 신당동 789-1', lat: 37.5612, lng: 127.0145, category: '떡볶이' },
    { name: '매운족발 본점', address: '서울시 마포구 홍대입구 111-2', lat: 37.5563, lng: 126.9236, category: '족발' },
    { name: '화끈 마라탕', address: '서울시 서초구 서초동 222-3', lat: 37.4923, lng: 127.0292, category: '마라탕' }
  ];

  for (const r of restaurants) {
    const id = uuidv4();
    try {
      run(
        'INSERT INTO restaurants (id, name, address, lat, lng, category, avg_level, review_count) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [id, r.name, r.address, r.lat, r.lng, r.category, Math.floor(Math.random() * 3) + 2, Math.floor(Math.random() * 10) + 1]
      );
    } catch (e) {
      // Already exists
    }
  }
  console.log('Sample restaurants created');

  saveDatabase();
  console.log('Database seeded successfully!');
}

seed().catch(console.error);
