// Review Routes - Supabase Storage Version
const express = require('express');
const { body, validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const path = require('path');
const { supabase } = require('../config/database');

const router = express.Router();

// Multer - 메모리 스토리지 (Supabase로 업로드하기 위해)
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    // HEIC/HEIF는 클라이언트에서 JPEG로 변환되어 오지만, 혹시 모를 경우를 대비해 허용
    const allowed = /jpeg|jpg|png|gif|webp|heic|heif/;
    const extname = allowed.test(path.extname(file.originalname).toLowerCase());
    const mimetype = /jpeg|jpg|png|gif|webp|heic|heif/.test(file.mimetype);
    if (extname || mimetype) {
      return cb(null, true);
    }
    cb(new Error('이미지 파일만 업로드 가능합니다 (JPG, PNG, GIF, WEBP, HEIC)'));
  }
});

// Supabase Storage에 이미지 업로드
async function uploadToSupabase(file, bucketName, isPublic = true) {
  const ext = path.extname(file.originalname).toLowerCase();
  const filename = `${uuidv4()}${ext}`;

  console.log(`Uploading to ${bucketName}: ${filename}`);

  const { data, error } = await supabase.storage
    .from(bucketName)
    .upload(filename, file.buffer, {
      contentType: file.mimetype,
      upsert: false
    });

  if (error) {
    console.error('Supabase Storage upload error:', error);
    throw new Error(`이미지 업로드 실패: ${error.message}`);
  }

  console.log('Upload success, path:', data.path);

  // 업로드된 실제 경로 사용
  const filePath = data.path;

  if (isPublic) {
    // Public URL 생성 (food-images)
    const { data: urlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath);
    console.log('Public URL:', urlData.publicUrl);
    return urlData.publicUrl;
  } else {
    // Signed URL 생성 (receipt-images, 1년 유효)
    const { data: urlData, error: signError } = await supabase.storage
      .from(bucketName)
      .createSignedUrl(filePath, 60 * 60 * 24 * 365);

    if (signError) {
      console.error('Signed URL error:', signError);
      throw new Error(`URL 생성 실패: ${signError.message}`);
    }
    console.log('Signed URL created');
    return urlData.signedUrl;
  }
}

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

// POST /api/reviews
router.post('/',
  requireAuth,
  upload.fields([
    { name: 'food_images', maxCount: 5 },  // 다중 이미지 지원 (최대 5장)
    { name: 'receipt_image', maxCount: 1 }
  ]),
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

    if (!req.files || !req.files.receipt_image) {
      return res.status(400).json({
        success: false,
        error: '영수증 사진은 필수입니다'
      });
    }

    if (!req.files.food_images || req.files.food_images.length === 0) {
      return res.status(400).json({
        success: false,
        error: '음식 사진은 필수입니다 (최소 1장)'
      });
    }

    try {
      const { restaurant_id, restaurant_name, restaurant_address, restaurant_lat, restaurant_lng, menu_name, spicy_level, comment } = req.body;

      let finalRestaurantId = restaurant_id;

      // If no restaurant_id, create new restaurant
      if (!restaurant_id && restaurant_name) {
        const { data: existing } = await supabase
          .from('restaurants')
          .select('id')
          .eq('name', restaurant_name)
          .eq('lat', parseFloat(restaurant_lat))
          .eq('lng', parseFloat(restaurant_lng))
          .single();

        if (existing) {
          finalRestaurantId = existing.id;
        } else {
          const { data: newRestaurant, error } = await supabase
            .from('restaurants')
            .insert({
              name: restaurant_name,
              address: restaurant_address,
              lat: parseFloat(restaurant_lat),
              lng: parseFloat(restaurant_lng)
            })
            .select()
            .single();

          if (error) throw error;
          finalRestaurantId = newRestaurant.id;
        }
      }

      if (!finalRestaurantId) {
        return res.status(400).json({
          success: false,
          error: '가게 정보가 필요합니다'
        });
      }

      // Supabase Storage에 이미지 업로드
      // 다중 음식 이미지 업로드 (최대 5장)
      const foodImageUrls = [];
      for (const file of req.files.food_images) {
        const url = await uploadToSupabase(file, 'food-images', true);
        foodImageUrls.push(url);
      }

      // 영수증 이미지 업로드
      const receiptImageUrl = await uploadToSupabase(req.files.receipt_image[0], 'receipt-images', true);

      const { data: review, error: reviewError } = await supabase
        .from('reviews')
        .insert({
          user_id: req.session.userId,
          restaurant_id: finalRestaurantId,
          menu_name,
          spicy_level: parseInt(spicy_level),
          food_image_url: JSON.stringify(foodImageUrls),  // JSON 배열로 저장
          receipt_image_url: receiptImageUrl,
          comment: comment || null,
          status: 'pending'
        })
        .select()
        .single();

      if (reviewError) throw reviewError;

      // 베타테스터 리워드 정보 조회
      const { data: user } = await supabase
        .from('users')
        .select('is_beta_tester')
        .eq('id', req.session.userId)
        .single();

      let betaRewardInfo = null;

      if (user?.is_beta_tester) {
        // 승인된 리뷰 개수 조회
        const { count: approvedCount } = await supabase
          .from('reviews')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', req.session.userId)
          .eq('status', 'approved');

        // 대기 중인 리뷰 개수 (방금 작성한 것 포함)
        const { count: pendingCount } = await supabase
          .from('reviews')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', req.session.userId)
          .eq('status', 'pending');

        const totalApproved = approvedCount || 0;
        const totalPending = pendingCount || 0;
        const reviewsUntilReward = 3 - (totalApproved % 3);
        const nextMilestone = Math.ceil((totalApproved + 1) / 3) * 3;

        betaRewardInfo = {
          approvedReviews: totalApproved,
          pendingReviews: totalPending,
          reviewsUntilReward: reviewsUntilReward === 3 ? 3 : reviewsUntilReward,
          nextMilestone,
          totalRewards: Math.floor(totalApproved / 3)
        };
      }

      res.status(201).json({
        success: true,
        review: {
          id: review.id,
          status: 'pending'
        },
        message: '제보가 접수되었습니다. 검수 후 포인트가 적립됩니다.',
        betaRewardInfo
      });
    } catch (error) {
      console.error('Create review error:', error);
      res.status(500).json({
        success: false,
        error: error.message || '리뷰 등록 중 오류가 발생했습니다'
      });
    }
  }
);

// GET /api/reviews/my
router.get('/my', requireAuth, async (req, res) => {
  try {
    const { data: reviews, error } = await supabase
      .from('reviews')
      .select(`
        *,
        restaurants (name)
      `)
      .eq('user_id', req.session.userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const transformedReviews = reviews.map(r => ({
      ...r,
      restaurant_name: r.restaurants?.name,
      restaurants: undefined
    }));

    res.json({
      success: true,
      reviews: transformedReviews
    });
  } catch (error) {
    console.error('Get my reviews error:', error);
    res.status(500).json({
      success: false,
      error: '리뷰 목록을 불러오는 중 오류가 발생했습니다'
    });
  }
});

// GET /api/reviews/my/stats - 베타테스터 리워드 통계
router.get('/my/stats', requireAuth, async (req, res) => {
  try {
    const { data: user } = await supabase
      .from('users')
      .select('is_beta_tester')
      .eq('id', req.session.userId)
      .single();

    if (!user?.is_beta_tester) {
      return res.json({
        success: true,
        isBetaTester: false
      });
    }

    const { count: approvedCount } = await supabase
      .from('reviews')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', req.session.userId)
      .eq('status', 'approved');

    const { count: pendingCount } = await supabase
      .from('reviews')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', req.session.userId)
      .eq('status', 'pending');

    const totalApproved = approvedCount || 0;
    const reviewsUntilReward = 3 - (totalApproved % 3);

    // 리워드 목록 조회
    const { data: rewards } = await supabase
      .from('rewards')
      .select('*')
      .eq('user_id', req.session.userId)
      .order('created_at', { ascending: false });

    res.json({
      success: true,
      isBetaTester: true,
      stats: {
        approvedReviews: totalApproved,
        pendingReviews: pendingCount || 0,
        reviewsUntilReward: reviewsUntilReward === 3 && totalApproved === 0 ? 3 : reviewsUntilReward,
        totalRewards: Math.floor(totalApproved / 3),
        rewards: rewards || []
      }
    });
  } catch (error) {
    console.error('Get review stats error:', error);
    res.status(500).json({
      success: false,
      error: '통계 조회 중 오류가 발생했습니다'
    });
  }
});

// DELETE /api/reviews/:id - 본인 리뷰 삭제
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    // 리뷰 조회 및 소유권 확인
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

    // 본인 리뷰인지 확인
    if (review.user_id !== req.session.userId) {
      return res.status(403).json({
        success: false,
        error: '본인의 리뷰만 삭제할 수 있습니다'
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
        // 리뷰가 없으면 초기화
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
    console.error('Delete review error:', error);
    res.status(500).json({
      success: false,
      error: '리뷰 삭제 중 오류가 발생했습니다'
    });
  }
});

module.exports = router;
