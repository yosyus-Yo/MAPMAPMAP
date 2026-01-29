// Favorites Routes - Supabase Version
const express = require('express');
const router = express.Router();
const { supabase } = require('../config/database');

// Auth middleware
function requireAuth(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ success: false, error: '로그인이 필요합니다' });
  }
  next();
}

// GET /api/favorites
router.get('/', requireAuth, async (req, res) => {
  try {
    const { data: favorites, error } = await supabase
      .from('favorites')
      .select(`
        id, created_at,
        restaurants (id, name, address, lat, lng, category, avg_level, review_count)
      `)
      .eq('user_id', req.session.userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const transformedFavorites = favorites.map(f => ({
      id: f.id,
      created_at: f.created_at,
      restaurant_id: f.restaurants?.id,
      name: f.restaurants?.name,
      address: f.restaurants?.address,
      lat: f.restaurants?.lat,
      lng: f.restaurants?.lng,
      category: f.restaurants?.category,
      avg_level: f.restaurants?.avg_level,
      review_count: f.restaurants?.review_count
    }));

    res.json({ success: true, favorites: transformedFavorites });
  } catch (error) {
    console.error('Get favorites error:', error);
    res.status(500).json({ success: false, error: '찜 목록을 불러올 수 없습니다' });
  }
});

// GET /api/favorites/check/:restaurantId
router.get('/check/:restaurantId', requireAuth, async (req, res) => {
  try {
    const { data: favorite } = await supabase
      .from('favorites')
      .select('id')
      .eq('user_id', req.session.userId)
      .eq('restaurant_id', req.params.restaurantId)
      .single();

    res.json({ success: true, isFavorite: !!favorite });
  } catch (error) {
    res.json({ success: true, isFavorite: false });
  }
});

// POST /api/favorites/:restaurantId
router.post('/:restaurantId', requireAuth, async (req, res) => {
  try {
    const { restaurantId } = req.params;

    // 이미 찜했는지 확인
    const { data: existing } = await supabase
      .from('favorites')
      .select('id')
      .eq('user_id', req.session.userId)
      .eq('restaurant_id', restaurantId)
      .single();

    if (existing) {
      return res.status(400).json({ success: false, error: '이미 찜한 맛집입니다' });
    }

    // 맛집 존재 확인
    const { data: restaurant } = await supabase
      .from('restaurants')
      .select('id')
      .eq('id', restaurantId)
      .single();

    if (!restaurant) {
      return res.status(404).json({ success: false, error: '맛집을 찾을 수 없습니다' });
    }

    // 찜하기 추가
    const { error } = await supabase
      .from('favorites')
      .insert({
        user_id: req.session.userId,
        restaurant_id: restaurantId
      });

    if (error) throw error;

    res.json({ success: true, message: '찜 목록에 추가되었습니다' });
  } catch (error) {
    console.error('Add favorite error:', error);
    res.status(500).json({ success: false, error: '찜하기에 실패했습니다' });
  }
});

// DELETE /api/favorites/:restaurantId
router.delete('/:restaurantId', requireAuth, async (req, res) => {
  try {
    const { restaurantId } = req.params;

    const { error } = await supabase
      .from('favorites')
      .delete()
      .eq('user_id', req.session.userId)
      .eq('restaurant_id', restaurantId);

    if (error) throw error;

    res.json({ success: true, message: '찜 목록에서 제거되었습니다' });
  } catch (error) {
    console.error('Remove favorite error:', error);
    res.status(500).json({ success: false, error: '찜 해제에 실패했습니다' });
  }
});

module.exports = router;
