// Favorites (찜하기) Routes
const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { query, run } = require('../config/database');

// Auth middleware
function requireAuth(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ success: false, error: '로그인이 필요합니다' });
  }
  next();
}

// GET /api/favorites - 내 찜 목록
router.get('/', requireAuth, (req, res) => {
  try {
    const favorites = query(`
      SELECT f.id, f.created_at,
             r.id as restaurant_id, r.name, r.address, r.lat, r.lng,
             r.category, r.avg_level, r.review_count
      FROM favorites f
      JOIN restaurants r ON f.restaurant_id = r.id
      WHERE f.user_id = ?
      ORDER BY f.created_at DESC
    `, [req.session.userId]);

    res.json({ success: true, favorites });
  } catch (error) {
    console.error('Get favorites error:', error);
    res.status(500).json({ success: false, error: '찜 목록을 불러올 수 없습니다' });
  }
});

// GET /api/favorites/check/:restaurantId - 특정 맛집 찜 여부 확인
router.get('/check/:restaurantId', requireAuth, (req, res) => {
  try {
    const favorite = query(`
      SELECT id FROM favorites WHERE user_id = ? AND restaurant_id = ?
    `, [req.session.userId, req.params.restaurantId]);

    res.json({ success: true, isFavorite: favorite.length > 0 });
  } catch (error) {
    console.error('Check favorite error:', error);
    res.status(500).json({ success: false, error: '찜 상태를 확인할 수 없습니다' });
  }
});

// POST /api/favorites/:restaurantId - 찜하기 추가
router.post('/:restaurantId', requireAuth, (req, res) => {
  try {
    const { restaurantId } = req.params;

    // 이미 찜했는지 확인
    const existing = query(`
      SELECT id FROM favorites WHERE user_id = ? AND restaurant_id = ?
    `, [req.session.userId, restaurantId]);

    if (existing.length > 0) {
      return res.status(400).json({ success: false, error: '이미 찜한 맛집입니다' });
    }

    // 맛집 존재 확인
    const restaurant = query(`SELECT id FROM restaurants WHERE id = ?`, [restaurantId]);
    if (restaurant.length === 0) {
      return res.status(404).json({ success: false, error: '맛집을 찾을 수 없습니다' });
    }

    // 찜하기 추가
    const id = uuidv4();
    run(`
      INSERT INTO favorites (id, user_id, restaurant_id)
      VALUES (?, ?, ?)
    `, [id, req.session.userId, restaurantId]);

    res.json({ success: true, message: '찜 목록에 추가되었습니다' });
  } catch (error) {
    console.error('Add favorite error:', error);
    res.status(500).json({ success: false, error: '찜하기에 실패했습니다' });
  }
});

// DELETE /api/favorites/:restaurantId - 찜하기 제거
router.delete('/:restaurantId', requireAuth, (req, res) => {
  try {
    const { restaurantId } = req.params;

    run(`
      DELETE FROM favorites WHERE user_id = ? AND restaurant_id = ?
    `, [req.session.userId, restaurantId]);

    res.json({ success: true, message: '찜 목록에서 제거되었습니다' });
  } catch (error) {
    console.error('Remove favorite error:', error);
    res.status(500).json({ success: false, error: '찜 해제에 실패했습니다' });
  }
});

module.exports = router;
