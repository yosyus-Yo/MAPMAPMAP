// Restaurant Routes - MapMapMap MVP
const express = require('express');
const { body, validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const { query, queryOne, run } = require('../config/database');

const router = express.Router();

// Smart Filtering logic
function getMarkerStatus(restaurantLevel, userLevel) {
  if (restaurantLevel <= userLevel) {
    return 'safe';     // Can enjoy!
  } else if (restaurantLevel <= userLevel + 1) {
    return 'warning';  // Might be spicy
  } else {
    return 'danger';   // Challenge required
  }
}

// GET /api/restaurants - Get all restaurants
router.get('/', (req, res) => {
  try {
    const userLevel = req.session.userId
      ? (queryOne('SELECT spicy_level FROM users WHERE id = ?', [req.session.userId])?.spicy_level || 0)
      : 0;

    const restaurants = query('SELECT * FROM restaurants ORDER BY review_count DESC');

    const withStatus = restaurants.map(r => ({
      ...r,
      marker_status: getMarkerStatus(r.avg_level, userLevel)
    }));

    res.json({
      success: true,
      restaurants: withStatus
    });
  } catch (error) {
    console.error('Get restaurants error:', error);
    res.status(500).json({
      success: false,
      error: '가게 목록을 불러오는 중 오류가 발생했습니다'
    });
  }
});

// GET /api/restaurants/:id - Get restaurant with reviews
router.get('/:id', (req, res) => {
  try {
    const restaurant = queryOne('SELECT * FROM restaurants WHERE id = ?', [req.params.id]);

    if (!restaurant) {
      return res.status(404).json({
        success: false,
        error: '가게를 찾을 수 없습니다'
      });
    }

    // Get approved reviews with user info
    const reviews = query(`
      SELECT r.*, u.nickname as user_nickname, u.spicy_level as user_level
      FROM reviews r
      JOIN users u ON r.user_id = u.id
      WHERE r.restaurant_id = ? AND r.status = 'approved'
      ORDER BY r.created_at DESC
    `, [req.params.id]);

    // Calculate level statistics
    const levelStats = {};
    reviews.forEach(r => {
      const level = r.user_level;
      if (!levelStats[level]) {
        levelStats[level] = { count: 0, total: 0 };
      }
      levelStats[level].count++;
      levelStats[level].total += r.spicy_level;
    });

    const levelAverages = {};
    for (const level in levelStats) {
      levelAverages[level] = (levelStats[level].total / levelStats[level].count).toFixed(1);
    }

    res.json({
      success: true,
      restaurant,
      reviews,
      level_stats: levelAverages
    });
  } catch (error) {
    console.error('Get restaurant error:', error);
    res.status(500).json({
      success: false,
      error: '가게 정보를 불러오는 중 오류가 발생했습니다'
    });
  }
});

// POST /api/restaurants - Create new restaurant
router.post('/',
  body('name').notEmpty().withMessage('가게명을 입력하세요'),
  body('address').notEmpty().withMessage('주소를 입력하세요'),
  body('lat').isFloat().withMessage('위도가 필요합니다'),
  body('lng').isFloat().withMessage('경도가 필요합니다'),
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: errors.array()[0].msg
      });
    }

    if (!req.session.userId) {
      return res.status(401).json({
        success: false,
        error: '로그인이 필요합니다'
      });
    }

    try {
      const { name, address, lat, lng, phone, category } = req.body;

      // Check if restaurant already exists at this location
      const existing = queryOne(
        'SELECT id FROM restaurants WHERE name = ? AND lat = ? AND lng = ?',
        [name, lat, lng]
      );

      if (existing) {
        return res.json({
          success: true,
          restaurant: queryOne('SELECT * FROM restaurants WHERE id = ?', [existing.id]),
          existed: true
        });
      }

      const id = uuidv4();
      run(
        'INSERT INTO restaurants (id, name, address, lat, lng, phone, category) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [id, name, address, lat, lng, phone || null, category || null]
      );

      res.status(201).json({
        success: true,
        restaurant: queryOne('SELECT * FROM restaurants WHERE id = ?', [id]),
        existed: false
      });
    } catch (error) {
      console.error('Create restaurant error:', error);
      res.status(500).json({
        success: false,
        error: '가게 등록 중 오류가 발생했습니다'
      });
    }
  }
);

module.exports = router;
