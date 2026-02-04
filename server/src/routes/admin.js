// Admin Routes - Supabase Version (with Beta Tester Rewards)
const express = require('express');
const { body, validationResult } = require('express-validator');
const { supabase } = require('../config/database');

const router = express.Router();

// 포인트 설정 (현재 0원 - 추후 변경 가능)
const POINTS_REWARD = 0;

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

// GET /api/admin/reviews
router.get('/reviews', requireAdmin, async (req, res) => {
  try {
    const { status } = req.query;

    let query = supabase
      .from('reviews')
      .select(`
        *,
        users (nickname, email, is_beta_tester),
        restaurants (name, address)
      `)
      .order('created_at', { ascending: false });

    if (status && ['pending', 'approved', 'rejected'].includes(status)) {
      query = query.eq('status', status);
    }

    const { data: reviews, error } = await query;
    if (error) throw error;

    const transformedReviews = reviews.map(r => ({
      ...r,
      user_nickname: r.users?.nickname,
      user_email: r.users?.email,
      is_beta_tester: r.users?.is_beta_tester,
      restaurant_name: r.restaurants?.name,
      restaurant_address: r.restaurants?.address,
      users: undefined,
      restaurants: undefined
    }));

    // Get stats
    const { count: pendingCount } = await supabase
      .from('reviews').select('*', { count: 'exact', head: true }).eq('status', 'pending');
    const { count: approvedCount } = await supabase
      .from('reviews').select('*', { count: 'exact', head: true }).eq('status', 'approved');
    const { count: rejectedCount } = await supabase
      .from('reviews').select('*', { count: 'exact', head: true }).eq('status', 'rejected');

    res.json({
      success: true,
      reviews: transformedReviews,
      stats: {
        pending: pendingCount || 0,
        approved: approvedCount || 0,
        rejected: rejectedCount || 0
      }
    });
  } catch (error) {
    console.error('Get admin reviews error:', error);
    res.status(500).json({
      success: false,
      error: '리뷰 목록을 불러오는 중 오류가 발생했습니다'
    });
  }
});

// GET /api/admin/stats
router.get('/stats', requireAdmin, async (req, res) => {
  try {
    const { count: usersCount } = await supabase
      .from('users').select('*', { count: 'exact', head: true });
    const { count: restaurantsCount } = await supabase
      .from('restaurants').select('*', { count: 'exact', head: true });
    const { count: betaTestersCount } = await supabase
      .from('users').select('*', { count: 'exact', head: true }).eq('is_beta_tester', true);

    const { count: pendingCount } = await supabase
      .from('reviews').select('*', { count: 'exact', head: true }).eq('status', 'pending');
    const { count: approvedCount } = await supabase
      .from('reviews').select('*', { count: 'exact', head: true }).eq('status', 'approved');
    const { count: rejectedCount } = await supabase
      .from('reviews').select('*', { count: 'exact', head: true }).eq('status', 'rejected');

    res.json({
      success: true,
      stats: {
        users: usersCount || 0,
        betaTesters: betaTestersCount || 0,
        restaurants: restaurantsCount || 0,
        reviews: {
          pending: pendingCount || 0,
          approved: approvedCount || 0,
          rejected: rejectedCount || 0
        }
      }
    });
  } catch (error) {
    console.error('Get admin stats error:', error);
    res.status(500).json({
      success: false,
      error: '통계를 불러오는 중 오류가 발생했습니다'
    });
  }
});

// PUT /api/admin/reviews/:id/approve
router.put('/reviews/:id/approve', requireAdmin, async (req, res) => {
  try {
    const { data: review, error: fetchError } = await supabase
      .from('reviews')
      .select('*, users(is_beta_tester)')
      .eq('id', req.params.id)
      .single();

    if (fetchError || !review) {
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

    // 리뷰 승인 + 포인트 지급
    await supabase
      .from('reviews')
      .update({ status: 'approved', points_given: POINTS_REWARD })
      .eq('id', req.params.id);

    // 사용자 정보 조회
    const { data: user } = await supabase
      .from('users')
      .select('is_beta_tester, points')
      .eq('id', review.user_id)
      .single();

    // 포인트 지급 (현재 0원 - POINTS_REWARD 값 변경으로 활성화)
    if (POINTS_REWARD > 0 && user) {
      await supabase
        .from('users')
        .update({ points: (user.points || 0) + POINTS_REWARD })
        .eq('id', review.user_id);
    }

    // Recalculate restaurant average
    const { data: reviewStats } = await supabase
      .from('reviews')
      .select('spicy_level')
      .eq('restaurant_id', review.restaurant_id)
      .eq('status', 'approved');

    if (reviewStats && reviewStats.length > 0) {
      const avgLevel = reviewStats.reduce((sum, r) => sum + r.spicy_level, 0) / reviewStats.length;
      await supabase
        .from('restaurants')
        .update({ avg_level: avgLevel, review_count: reviewStats.length })
        .eq('id', review.restaurant_id);
    }

    // 베타테스터 리워드 체크 및 생성
    let rewardCreated = false;
    if (user?.is_beta_tester) {
      const { count: approvedCount } = await supabase
        .from('reviews')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', review.user_id)
        .eq('status', 'approved');

      // 3의 배수일 때 리워드 생성
      if (approvedCount && approvedCount % 3 === 0) {
        await supabase
          .from('rewards')
          .insert({
            user_id: review.user_id,
            reward_type: 'review_milestone',
            milestone_count: approvedCount,
            status: 'pending'
          });
        rewardCreated = true;
      }
    }

    const { data: updatedReview } = await supabase
      .from('reviews')
      .select('*')
      .eq('id', req.params.id)
      .single();

    res.json({
      success: true,
      review: updatedReview,
      message: POINTS_REWARD > 0
        ? `승인 완료 (${POINTS_REWARD}P 지급)${rewardCreated ? ' + 리워드 달성!' : ''}`
        : `승인 완료${rewardCreated ? ' + 리워드 달성!' : ''}`
    });
  } catch (error) {
    console.error('Approve review error:', error);
    res.status(500).json({
      success: false,
      error: '리뷰 승인 중 오류가 발생했습니다'
    });
  }
});

// PUT /api/admin/reviews/:id/reject
router.put('/reviews/:id/reject',
  requireAdmin,
  body('reason').notEmpty().withMessage('반려 사유를 입력하세요'),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: errors.array()[0].msg
      });
    }

    try {
      const { data: review, error: fetchError } = await supabase
        .from('reviews')
        .select('*')
        .eq('id', req.params.id)
        .single();

      if (fetchError || !review) {
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

      await supabase
        .from('reviews')
        .update({ status: 'rejected', reject_reason: reason })
        .eq('id', req.params.id);

      const { data: updatedReview } = await supabase
        .from('reviews')
        .select('*')
        .eq('id', req.params.id)
        .single();

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

// PUT /api/admin/users/:id/beta-tester - 베타테스터 지정/해제
router.put('/users/:id/beta-tester', requireAdmin, async (req, res) => {
  try {
    const { is_beta_tester } = req.body;

    const { error } = await supabase
      .from('users')
      .update({ is_beta_tester: !!is_beta_tester })
      .eq('id', req.params.id);

    if (error) throw error;

    res.json({
      success: true,
      message: is_beta_tester ? '베타테스터로 지정되었습니다' : '베타테스터 해제되었습니다'
    });
  } catch (error) {
    console.error('Update beta tester error:', error);
    res.status(500).json({
      success: false,
      error: '베타테스터 설정 중 오류가 발생했습니다'
    });
  }
});

// GET /api/admin/beta-testers - 베타테스터 목록
router.get('/beta-testers', requireAdmin, async (req, res) => {
  try {
    const { data: testers, error } = await supabase
      .from('users')
      .select('id, email, nickname, created_at, is_beta_tester')
      .eq('is_beta_tester', true);

    if (error) throw error;

    // 각 테스터의 리뷰 통계
    const testersWithStats = await Promise.all(testers.map(async (tester) => {
      const { count: approvedCount } = await supabase
        .from('reviews')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', tester.id)
        .eq('status', 'approved');

      const { count: pendingCount } = await supabase
        .from('reviews')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', tester.id)
        .eq('status', 'pending');

      return {
        ...tester,
        approvedReviews: approvedCount || 0,
        pendingReviews: pendingCount || 0,
        totalRewards: Math.floor((approvedCount || 0) / 3)
      };
    }));

    res.json({
      success: true,
      testers: testersWithStats
    });
  } catch (error) {
    console.error('Get beta testers error:', error);
    res.status(500).json({
      success: false,
      error: '베타테스터 목록을 불러오는 중 오류가 발생했습니다'
    });
  }
});

// DELETE /api/admin/reviews/:id - 관리자 리뷰 삭제
router.delete('/reviews/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // 리뷰 조회
    const { data: review, error: fetchError } = await supabase
      .from('reviews')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !review) {
      return res.status(404).json({
        success: false,
        error: '리뷰를 찾을 수 없습니다'
      });
    }

    // 리뷰 삭제
    const { error: deleteError } = await supabase
      .from('reviews')
      .delete()
      .eq('id', id);

    if (deleteError) throw deleteError;

    // 맛집 통계 재계산 (승인된 리뷰였다면)
    if (review.status === 'approved') {
      const { data: reviewStats } = await supabase
        .from('reviews')
        .select('spicy_level')
        .eq('restaurant_id', review.restaurant_id)
        .eq('status', 'approved');

      if (reviewStats && reviewStats.length > 0) {
        const avgLevel = reviewStats.reduce((sum, r) => sum + r.spicy_level, 0) / reviewStats.length;
        await supabase
          .from('restaurants')
          .update({ avg_level: avgLevel, review_count: reviewStats.length })
          .eq('id', review.restaurant_id);
      } else {
        await supabase
          .from('restaurants')
          .update({ avg_level: 0, review_count: 0 })
          .eq('id', review.restaurant_id);
      }
    }

    res.json({
      success: true,
      message: '리뷰가 삭제되었습니다'
    });
  } catch (error) {
    console.error('Admin delete review error:', error);
    res.status(500).json({
      success: false,
      error: '리뷰 삭제 중 오류가 발생했습니다'
    });
  }
});

module.exports = router;
