// Admin Routes - MapMapMap MVP
const express = require('express');
const { body, validationResult } = require('express-validator');
const { query, queryOne, run } = require('../config/database');

const router = express.Router();

// Admin auth middleware
const requireAdmin = (req, res, next) => {
  if (!req.session.userId) {
    return res.status(401).json({
      success: false,
      error: '로그인이 필요합니다'
    });
  }

  if (!req.session.isAdmin) {
    return res.status(403).json({
      success: false,
      error: '관리자 권한이 필요합니다'
    });
  }

  next();
};

// GET /api/admin/reviews - Get all reviews for admin
router.get('/reviews', requireAdmin, (req, res) => {
  try {
    const { status } = req.query;

    let sql = `
      SELECT r.*, u.nickname as user_nickname, u.email as user_email, rest.name as restaurant_name, rest.address as restaurant_address
      FROM reviews r
      JOIN users u ON r.user_id = u.id
      JOIN restaurants rest ON r.restaurant_id = rest.id
    `;

    const params = [];

    if (status && ['pending', 'approved', 'rejected'].includes(status)) {
      sql += ' WHERE r.status = ?';
      params.push(status);
    }

    sql += ' ORDER BY r.created_at DESC';

    const reviews = query(sql, params);

    // Get stats
    const stats = {
      pending: queryOne('SELECT COUNT(*) as count FROM reviews WHERE status = "pending"')?.count || 0,
      approved: queryOne('SELECT COUNT(*) as count FROM reviews WHERE status = "approved"')?.count || 0,
      rejected: queryOne('SELECT COUNT(*) as count FROM reviews WHERE status = "rejected"')?.count || 0
    };

    res.json({
      success: true,
      reviews,
      stats
    });
  } catch (error) {
    console.error('Get admin reviews error:', error);
    res.status(500).json({
      success: false,
      error: '리뷰 목록을 불러오는 중 오류가 발생했습니다'
    });
  }
});

// GET /api/admin/stats - Get dashboard stats
router.get('/stats', requireAdmin, (req, res) => {
  try {
    const stats = {
      users: queryOne('SELECT COUNT(*) as count FROM users')?.count || 0,
      restaurants: queryOne('SELECT COUNT(*) as count FROM restaurants')?.count || 0,
      reviews: {
        pending: queryOne('SELECT COUNT(*) as count FROM reviews WHERE status = "pending"')?.count || 0,
        approved: queryOne('SELECT COUNT(*) as count FROM reviews WHERE status = "approved"')?.count || 0,
        rejected: queryOne('SELECT COUNT(*) as count FROM reviews WHERE status = "rejected"')?.count || 0
      }
    };

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Get admin stats error:', error);
    res.status(500).json({
      success: false,
      error: '통계를 불러오는 중 오류가 발생했습니다'
    });
  }
});

// PUT /api/admin/reviews/:id/approve - Approve review
router.put('/reviews/:id/approve', requireAdmin, (req, res) => {
  try {
    const review = queryOne('SELECT * FROM reviews WHERE id = ?', [req.params.id]);

    if (!review) {
      return res.status(404).json({
        success: false,
        error: '리뷰를 찾을 수 없습니다'
      });
    }

    if (review.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: '이미 처리된 리뷰입니다'
      });
    }

    const POINTS = 500;

    // Update review status and give points
    run(
      'UPDATE reviews SET status = "approved", points_given = ? WHERE id = ?',
      [POINTS, req.params.id]
    );

    // Add points to user
    run(
      'UPDATE users SET points = points + ? WHERE id = ?',
      [POINTS, review.user_id]
    );

    // Recalculate restaurant average level
    const avgResult = queryOne(`
      SELECT AVG(spicy_level) as avg_level, COUNT(*) as count
      FROM reviews
      WHERE restaurant_id = ? AND status = 'approved'
    `, [review.restaurant_id]);

    run(
      'UPDATE restaurants SET avg_level = ?, review_count = ? WHERE id = ?',
      [avgResult?.avg_level || 0, avgResult?.count || 0, review.restaurant_id]
    );

    const updatedReview = queryOne('SELECT * FROM reviews WHERE id = ?', [req.params.id]);

    res.json({
      success: true,
      review: updatedReview,
      message: `승인 완료. 사용자에게 ${POINTS}P 적립`
    });
  } catch (error) {
    console.error('Approve review error:', error);
    res.status(500).json({
      success: false,
      error: '리뷰 승인 중 오류가 발생했습니다'
    });
  }
});

// PUT /api/admin/reviews/:id/reject - Reject review
router.put('/reviews/:id/reject',
  requireAdmin,
  body('reason').notEmpty().withMessage('반려 사유를 입력하세요'),
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: errors.array()[0].msg
      });
    }

    try {
      const review = queryOne('SELECT * FROM reviews WHERE id = ?', [req.params.id]);

      if (!review) {
        return res.status(404).json({
          success: false,
          error: '리뷰를 찾을 수 없습니다'
        });
      }

      if (review.status !== 'pending') {
        return res.status(400).json({
          success: false,
          error: '이미 처리된 리뷰입니다'
        });
      }

      const { reason } = req.body;

      run(
        'UPDATE reviews SET status = "rejected", reject_reason = ? WHERE id = ?',
        [reason, req.params.id]
      );

      const updatedReview = queryOne('SELECT * FROM reviews WHERE id = ?', [req.params.id]);

      res.json({
        success: true,
        review: updatedReview,
        message: '반려 완료'
      });
    } catch (error) {
      console.error('Reject review error:', error);
      res.status(500).json({
        success: false,
        error: '리뷰 반려 중 오류가 발생했습니다'
      });
    }
  }
);

module.exports = router;
