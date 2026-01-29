// Restaurant Routes - Supabase Version
const express = require('express');
const { body, validationResult } = require('express-validator');
const { supabase } = require('../config/database');

const router = express.Router();

// Smart Filtering logic
function getMarkerStatus(restaurantLevel, userLevel) {
  if (restaurantLevel <= userLevel) {
    return 'safe';
  } else if (restaurantLevel <= userLevel + 1) {
    return 'warning';
  } else {
    return 'danger';
  }
}

// GET /api/restaurants
router.get('/', async (req, res) => {
  try {
    let userLevel = 0;

    if (req.session.userId) {
      const { data: user } = await supabase
        .from('users')
        .select('spicy_level')
        .eq('id', req.session.userId)
        .single();
      userLevel = user?.spicy_level || 0;
    }

    const { data: restaurants, error } = await supabase
      .from('restaurants')
      .select('*')
      .order('review_count', { ascending: false });

    if (error) throw error;

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

// GET /api/restaurants/:id
router.get('/:id', async (req, res) => {
  try {
    const { data: restaurant, error: restaurantError } = await supabase
      .from('restaurants')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (restaurantError || !restaurant) {
      return res.status(404).json({
        success: false,
        error: '가게를 찾을 수 없습니다'
      });
    }

    // Get approved reviews with user info
    const { data: reviews, error: reviewsError } = await supabase
      .from('reviews')
      .select(`
        *,
        users (nickname, spicy_level)
      `)
      .eq('restaurant_id', req.params.id)
      .eq('status', 'approved')
      .order('created_at', { ascending: false });

    if (reviewsError) throw reviewsError;

    // Transform reviews
    const transformedReviews = reviews.map(r => ({
      ...r,
      user_nickname: r.users?.nickname,
      user_level: r.users?.spicy_level,
      users: undefined
    }));

    // Calculate level statistics
    const levelStats = {};
    transformedReviews.forEach(r => {
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
      reviews: transformedReviews,
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

// POST /api/restaurants
router.post('/',
  body('name').notEmpty().withMessage('가게명을 입력하세요'),
  body('address').notEmpty().withMessage('주소를 입력하세요'),
  body('lat').isFloat().withMessage('위도가 필요합니다'),
  body('lng').isFloat().withMessage('경도가 필요합니다'),
  async (req, res) => {
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

      // Check if restaurant already exists
      const { data: existing } = await supabase
        .from('restaurants')
        .select('*')
        .eq('name', name)
        .eq('lat', lat)
        .eq('lng', lng)
        .single();

      if (existing) {
        return res.json({
          success: true,
          restaurant: existing,
          existed: true
        });
      }

      const { data: restaurant, error } = await supabase
        .from('restaurants')
        .insert({
          name,
          address,
          lat,
          lng,
          phone: phone || null,
          category: category || null
        })
        .select()
        .single();

      if (error) throw error;

      res.status(201).json({
        success: true,
        restaurant,
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
