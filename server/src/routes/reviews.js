// Review Routes - MapMapMap MVP
const express = require('express');
const { body, validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const path = require('path');
const { query, queryOne, run } = require('../config/database');

const router = express.Router();

// Multer configuration for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../uploads'));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${file.fieldname}_${uuidv4()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp/;
    const extname = allowed.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowed.test(file.mimetype);

    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('이미지 파일만 업로드 가능합니다 (jpg, png, gif, webp)'));
  }
});

// Auth middleware
const requireAuth = (req, res, next) => {
  if (!req.session.userId) {
    return res.status(401).json({
      success: false,
      error: '로그인이 필요합니다'
    });
  }
  next();
};

// POST /api/reviews - Create new review (제보하기)
router.post('/',
  requireAuth,
  upload.fields([
    { name: 'food_image', maxCount: 1 },
    { name: 'receipt_image', maxCount: 1 }
  ]),
  body('restaurant_id').optional(),
  body('restaurant_name').optional(),
  body('menu_name').notEmpty().withMessage('메뉴명을 입력하세요'),
  body('spicy_level').isInt({ min: 0, max: 5 }).withMessage('맵레벨은 0-5 사이여야 합니다'),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: errors.array()[0].msg
      });
    }

    // Check for receipt image (required)
    if (!req.files || !req.files.receipt_image) {
      return res.status(400).json({
        success: false,
        error: '영수증 사진은 필수입니다'
      });
    }

    if (!req.files.food_image) {
      return res.status(400).json({
        success: false,
        error: '음식 사진은 필수입니다'
      });
    }

    try {
      const { restaurant_id, restaurant_name, restaurant_address, restaurant_lat, restaurant_lng, menu_name, spicy_level, comment } = req.body;

      let finalRestaurantId = restaurant_id;

      // If no restaurant_id, create new restaurant
      if (!restaurant_id && restaurant_name) {
        const existingRestaurant = queryOne(
          'SELECT id FROM restaurants WHERE name = ? AND lat = ? AND lng = ?',
          [restaurant_name, parseFloat(restaurant_lat), parseFloat(restaurant_lng)]
        );

        if (existingRestaurant) {
          finalRestaurantId = existingRestaurant.id;
        } else {
          finalRestaurantId = uuidv4();
          run(
            'INSERT INTO restaurants (id, name, address, lat, lng) VALUES (?, ?, ?, ?, ?)',
            [finalRestaurantId, restaurant_name, restaurant_address, parseFloat(restaurant_lat), parseFloat(restaurant_lng)]
          );
        }
      }

      if (!finalRestaurantId) {
        return res.status(400).json({
          success: false,
          error: '가게 정보가 필요합니다'
        });
      }

      const reviewId = uuidv4();
      const foodImageUrl = `/uploads/${req.files.food_image[0].filename}`;
      const receiptImageUrl = `/uploads/${req.files.receipt_image[0].filename}`;

      run(
        `INSERT INTO reviews (id, user_id, restaurant_id, menu_name, spicy_level, food_image_url, receipt_image_url, comment, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
        [reviewId, req.session.userId, finalRestaurantId, menu_name, parseInt(spicy_level), foodImageUrl, receiptImageUrl, comment || null]
      );

      res.status(201).json({
        success: true,
        review: {
          id: reviewId,
          status: 'pending'
        },
        message: '제보가 접수되었습니다. 검수 후 포인트가 적립됩니다.'
      });
    } catch (error) {
      console.error('Create review error:', error);
      res.status(500).json({
        success: false,
        error: '리뷰 등록 중 오류가 발생했습니다'
      });
    }
  }
);

// GET /api/reviews/my - Get my reviews
router.get('/my', requireAuth, (req, res) => {
  try {
    const reviews = query(`
      SELECT r.*, rest.name as restaurant_name
      FROM reviews r
      JOIN restaurants rest ON r.restaurant_id = rest.id
      WHERE r.user_id = ?
      ORDER BY r.created_at DESC
    `, [req.session.userId]);

    res.json({
      success: true,
      reviews
    });
  } catch (error) {
    console.error('Get my reviews error:', error);
    res.status(500).json({
      success: false,
      error: '리뷰 목록을 불러오는 중 오류가 발생했습니다'
    });
  }
});

module.exports = router;
