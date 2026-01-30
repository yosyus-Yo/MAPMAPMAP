// MapMapMap API - Hono Version (Vercel Serverless)
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { handle } from 'hono/vercel';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import 'dotenv/config';

// Supabase 클라이언트 (최적화된 설정)
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : null;

const app = new Hono().basePath('/api');

// 미들웨어
app.use('*', logger());
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// 세션 미들웨어 (쿠키 기반)
app.use('*', async (c, next) => {
  const sessionData = getCookie(c, 'mapmap_session');
  if (sessionData) {
    try {
      c.set('session', JSON.parse(sessionData));
    } catch {
      c.set('session', {});
    }
  } else {
    c.set('session', {});
  }
  await next();
});

// 세션 저장 헬퍼
function saveSession(c, data) {
  setCookie(c, 'mapmap_session', JSON.stringify(data), {
    httpOnly: true,
    secure: true,
    sameSite: 'Strict',
    maxAge: 60 * 60 * 24 * 7, // 7일
    path: '/',
  });
}

function clearSession(c) {
  deleteCookie(c, 'mapmap_session', { path: '/' });
}

// 헬스 체크
app.get('/health', (c) => c.json({ success: true, status: 'healthy', framework: 'hono' }));

// 설정 API
app.get('/config', (c) => c.json({ kakaoMapKey: process.env.KAKAO_MAP_KEY || '' }));

// ==================== AUTH ROUTES ====================

app.post('/auth/signup', async (c) => {
  try {
    const { email, password, nickname, spicy_level } = await c.req.json();

    if (!email || !password || !nickname) {
      return c.json({ success: false, error: '필수 정보를 입력하세요' }, 400);
    }

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { nickname } }
    });

    if (authError) {
      if (authError.message.includes('already registered')) {
        return c.json({ success: false, error: '이미 등록된 이메일입니다' }, 400);
      }
      return c.json({ success: false, error: authError.message }, 400);
    }

    if (!authData.user) {
      return c.json({ success: false, error: '회원가입에 실패했습니다' }, 400);
    }

    const { data: user, error: dbError } = await supabase
      .from('users')
      .insert({
        id: authData.user.id,
        email,
        nickname,
        spicy_level: spicy_level ?? 0,
        points: 0,
        is_admin: false,
        is_beta_tester: false
      })
      .select()
      .single();

    if (dbError) {
      console.error('DB insert error:', dbError);
      return c.json({ success: false, error: '사용자 정보 저장에 실패했습니다' }, 500);
    }

    saveSession(c, { userId: user.id, isAdmin: false });

    return c.json({
      success: true,
      user: {
        id: user.id, email: user.email, nickname: user.nickname,
        spicy_level: user.spicy_level, points: user.points,
        is_admin: user.is_admin, is_beta_tester: user.is_beta_tester
      }
    }, 201);
  } catch (error) {
    console.error('Signup error:', error);
    return c.json({ success: false, error: '회원가입 중 오류가 발생했습니다' }, 500);
  }
});

app.post('/auth/login', async (c) => {
  try {
    const { email, password } = await c.req.json();

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email, password
    });

    if (authError) {
      return c.json({ success: false, error: '이메일 또는 비밀번호가 올바르지 않습니다' }, 401);
    }

    let { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('id', authData.user.id)
      .single();

    if (!user) {
      const { data: newUser } = await supabase
        .from('users')
        .insert({
          id: authData.user.id,
          email: authData.user.email,
          nickname: authData.user.user_metadata?.nickname || email.split('@')[0],
          spicy_level: 0, points: 0, is_admin: false, is_beta_tester: false
        })
        .select()
        .single();
      user = newUser;
    }

    saveSession(c, { userId: user.id, isAdmin: user.is_admin });

    return c.json({
      success: true,
      user: {
        id: user.id, email: user.email, nickname: user.nickname,
        spicy_level: user.spicy_level, points: user.points,
        is_admin: user.is_admin, is_beta_tester: user.is_beta_tester
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return c.json({ success: false, error: '로그인 중 오류가 발생했습니다' }, 500);
  }
});

app.post('/auth/logout', async (c) => {
  try {
    await supabase.auth.signOut();
    clearSession(c);
    return c.json({ success: true });
  } catch (error) {
    return c.json({ success: false, error: '로그아웃 중 오류가 발생했습니다' }, 500);
  }
});

app.get('/auth/me', async (c) => {
  const session = c.get('session');
  if (!session?.userId) {
    return c.json({ success: false, error: '로그인이 필요합니다' }, 401);
  }

  try {
    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('id', session.userId)
      .single();

    if (!user) {
      return c.json({ success: false, error: '사용자를 찾을 수 없습니다' }, 401);
    }

    return c.json({
      success: true,
      user: {
        id: user.id, email: user.email, nickname: user.nickname,
        spicy_level: user.spicy_level, points: user.points,
        is_admin: user.is_admin, is_beta_tester: user.is_beta_tester
      }
    });
  } catch (error) {
    return c.json({ success: false, error: '사용자 정보 조회 중 오류가 발생했습니다' }, 500);
  }
});

app.put('/auth/spicy-level', async (c) => {
  const session = c.get('session');
  if (!session?.userId) {
    return c.json({ success: false, error: '로그인이 필요합니다' }, 401);
  }

  try {
    const { spicy_level } = await c.req.json();
    await supabase.from('users').update({ spicy_level }).eq('id', session.userId);
    return c.json({ success: true, spicy_level });
  } catch (error) {
    return c.json({ success: false, error: '맵레벨 변경 중 오류가 발생했습니다' }, 500);
  }
});

// ==================== RESTAURANT ROUTES ====================

function getMarkerStatus(restaurantLevel, userLevel) {
  if (restaurantLevel <= userLevel) return 'safe';
  if (restaurantLevel <= userLevel + 1) return 'warning';
  return 'danger';
}

app.get('/restaurants', async (c) => {
  try {
    const session = c.get('session');
    let userLevel = 0;

    if (session?.userId) {
      const { data: user } = await supabase
        .from('users')
        .select('spicy_level')
        .eq('id', session.userId)
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

    return c.json({ success: true, restaurants: withStatus });
  } catch (error) {
    console.error('Get restaurants error:', error);
    return c.json({ success: false, error: '가게 목록을 불러오는 중 오류가 발생했습니다' }, 500);
  }
});

app.get('/restaurants/:id', async (c) => {
  try {
    const id = c.req.param('id');

    // 병렬로 맛집과 리뷰 조회
    const [restaurantResult, reviewsResult] = await Promise.all([
      supabase.from('restaurants').select('*').eq('id', id).single(),
      supabase.from('reviews')
        .select('*, users (nickname, spicy_level)')
        .eq('restaurant_id', id)
        .eq('status', 'approved')
        .order('created_at', { ascending: false })
    ]);

    if (restaurantResult.error || !restaurantResult.data) {
      return c.json({ success: false, error: '가게를 찾을 수 없습니다' }, 404);
    }

    const transformedReviews = (reviewsResult.data || []).map(r => ({
      ...r,
      user_nickname: r.users?.nickname,
      user_level: r.users?.spicy_level,
      users: undefined
    }));

    const levelStats = {};
    transformedReviews.forEach(r => {
      const level = r.user_level;
      if (!levelStats[level]) levelStats[level] = { count: 0, total: 0 };
      levelStats[level].count++;
      levelStats[level].total += r.spicy_level;
    });

    const levelAverages = {};
    for (const level in levelStats) {
      levelAverages[level] = (levelStats[level].total / levelStats[level].count).toFixed(1);
    }

    return c.json({
      success: true,
      restaurant: restaurantResult.data,
      reviews: transformedReviews,
      level_stats: levelAverages
    });
  } catch (error) {
    console.error('Get restaurant error:', error);
    return c.json({ success: false, error: '가게 정보를 불러오는 중 오류가 발생했습니다' }, 500);
  }
});

app.post('/restaurants', async (c) => {
  const session = c.get('session');
  if (!session?.userId) {
    return c.json({ success: false, error: '로그인이 필요합니다' }, 401);
  }

  try {
    const { name, address, lat, lng, phone, category } = await c.req.json();

    if (!name || !address || !lat || !lng) {
      return c.json({ success: false, error: '필수 정보를 입력하세요' }, 400);
    }

    const { data: existing } = await supabase
      .from('restaurants')
      .select('*')
      .eq('name', name)
      .eq('lat', lat)
      .eq('lng', lng)
      .single();

    if (existing) {
      return c.json({ success: true, restaurant: existing, existed: true });
    }

    const { data: restaurant, error } = await supabase
      .from('restaurants')
      .insert({ name, address, lat, lng, phone: phone || null, category: category || null })
      .select()
      .single();

    if (error) throw error;

    return c.json({ success: true, restaurant, existed: false }, 201);
  } catch (error) {
    console.error('Create restaurant error:', error);
    return c.json({ success: false, error: '가게 등록 중 오류가 발생했습니다' }, 500);
  }
});

// ==================== FAVORITES ROUTES ====================

app.get('/favorites', async (c) => {
  const session = c.get('session');
  if (!session?.userId) {
    return c.json({ success: false, error: '로그인이 필요합니다' }, 401);
  }

  try {
    const { data: favorites, error } = await supabase
      .from('favorites')
      .select('id, created_at, restaurants (id, name, address, lat, lng, category, avg_level, review_count)')
      .eq('user_id', session.userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const transformed = favorites.map(f => ({
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

    return c.json({ success: true, favorites: transformed });
  } catch (error) {
    return c.json({ success: false, error: '찜 목록을 불러올 수 없습니다' }, 500);
  }
});

app.get('/favorites/check/:restaurantId', async (c) => {
  const session = c.get('session');
  if (!session?.userId) {
    return c.json({ success: true, isFavorite: false });
  }

  try {
    const { data } = await supabase
      .from('favorites')
      .select('id')
      .eq('user_id', session.userId)
      .eq('restaurant_id', c.req.param('restaurantId'))
      .single();

    return c.json({ success: true, isFavorite: !!data });
  } catch {
    return c.json({ success: true, isFavorite: false });
  }
});

app.post('/favorites/:restaurantId', async (c) => {
  const session = c.get('session');
  if (!session?.userId) {
    return c.json({ success: false, error: '로그인이 필요합니다' }, 401);
  }

  try {
    const restaurantId = c.req.param('restaurantId');

    const { data: existing } = await supabase
      .from('favorites')
      .select('id')
      .eq('user_id', session.userId)
      .eq('restaurant_id', restaurantId)
      .single();

    if (existing) {
      return c.json({ success: false, error: '이미 찜한 맛집입니다' }, 400);
    }

    await supabase.from('favorites').insert({
      user_id: session.userId,
      restaurant_id: restaurantId
    });

    return c.json({ success: true, message: '찜 목록에 추가되었습니다' });
  } catch (error) {
    return c.json({ success: false, error: '찜하기에 실패했습니다' }, 500);
  }
});

app.delete('/favorites/:restaurantId', async (c) => {
  const session = c.get('session');
  if (!session?.userId) {
    return c.json({ success: false, error: '로그인이 필요합니다' }, 401);
  }

  try {
    await supabase
      .from('favorites')
      .delete()
      .eq('user_id', session.userId)
      .eq('restaurant_id', c.req.param('restaurantId'));

    return c.json({ success: true, message: '찜 목록에서 제거되었습니다' });
  } catch (error) {
    return c.json({ success: false, error: '찜 해제에 실패했습니다' }, 500);
  }
});

// ==================== REVIEWS ROUTES ====================

app.post('/reviews', async (c) => {
  const session = c.get('session');
  if (!session?.userId) {
    return c.json({ success: false, error: '로그인이 필요합니다' }, 401);
  }

  try {
    const formData = await c.req.formData();

    const restaurant_id = formData.get('restaurant_id');
    const restaurant_name = formData.get('restaurant_name');
    const restaurant_address = formData.get('restaurant_address');
    const restaurant_lat = formData.get('restaurant_lat');
    const restaurant_lng = formData.get('restaurant_lng');
    const menu_name = formData.get('menu_name');
    const spicy_level = formData.get('spicy_level');
    const comment = formData.get('comment');
    const food_images = formData.getAll('food_images');
    const receipt_image = formData.get('receipt_image');

    if (!menu_name || spicy_level === null) {
      return c.json({ success: false, error: '메뉴명과 맵기 레벨은 필수입니다' }, 400);
    }

    if (!receipt_image) {
      return c.json({ success: false, error: '영수증 사진은 필수입니다' }, 400);
    }

    if (!food_images || food_images.length === 0) {
      return c.json({ success: false, error: '음식 사진은 필수입니다 (최소 1장)' }, 400);
    }

    let finalRestaurantId = restaurant_id;

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
        const { data: newRestaurant } = await supabase
          .from('restaurants')
          .insert({
            name: restaurant_name,
            address: restaurant_address,
            lat: parseFloat(restaurant_lat),
            lng: parseFloat(restaurant_lng)
          })
          .select()
          .single();
        finalRestaurantId = newRestaurant.id;
      }
    }

    if (!finalRestaurantId) {
      return c.json({ success: false, error: '가게 정보가 필요합니다' }, 400);
    }

    // 이미지 업로드
    const foodImageUrls = [];
    for (const file of food_images) {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const filename = `${uuidv4()}.${ext}`;
      const buffer = await file.arrayBuffer();

      const { error: uploadError } = await supabase.storage
        .from('food-images')
        .upload(filename, buffer, { contentType: file.type });

      if (!uploadError) {
        const { data: urlData } = supabase.storage.from('food-images').getPublicUrl(filename);
        foodImageUrls.push(urlData.publicUrl);
      }
    }

    const receiptExt = receipt_image.name.split('.').pop()?.toLowerCase() || 'jpg';
    const receiptFilename = `${uuidv4()}.${receiptExt}`;
    const receiptBuffer = await receipt_image.arrayBuffer();

    await supabase.storage
      .from('receipt-images')
      .upload(receiptFilename, receiptBuffer, { contentType: receipt_image.type });

    const { data: receiptUrlData } = supabase.storage.from('receipt-images').getPublicUrl(receiptFilename);

    const { data: review, error: reviewError } = await supabase
      .from('reviews')
      .insert({
        user_id: session.userId,
        restaurant_id: finalRestaurantId,
        menu_name,
        spicy_level: parseInt(spicy_level),
        food_image_url: JSON.stringify(foodImageUrls),
        receipt_image_url: receiptUrlData.publicUrl,
        comment: comment || null,
        status: 'pending'
      })
      .select()
      .single();

    if (reviewError) throw reviewError;

    return c.json({
      success: true,
      review: { id: review.id, status: 'pending' },
      message: '제보가 접수되었습니다. 검수 후 포인트가 적립됩니다.'
    }, 201);
  } catch (error) {
    console.error('Create review error:', error);
    return c.json({ success: false, error: error.message || '리뷰 등록 중 오류가 발생했습니다' }, 500);
  }
});

app.get('/reviews/my', async (c) => {
  const session = c.get('session');
  if (!session?.userId) {
    return c.json({ success: false, error: '로그인이 필요합니다' }, 401);
  }

  try {
    const { data: reviews, error } = await supabase
      .from('reviews')
      .select('*, restaurants (name)')
      .eq('user_id', session.userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const transformed = reviews.map(r => ({
      ...r,
      restaurant_name: r.restaurants?.name,
      restaurants: undefined
    }));

    return c.json({ success: true, reviews: transformed });
  } catch (error) {
    return c.json({ success: false, error: '리뷰 목록을 불러오는 중 오류가 발생했습니다' }, 500);
  }
});

app.delete('/reviews/:id', async (c) => {
  const session = c.get('session');
  if (!session?.userId) {
    return c.json({ success: false, error: '로그인이 필요합니다' }, 401);
  }

  try {
    const id = c.req.param('id');

    const { data: review } = await supabase
      .from('reviews')
      .select('*')
      .eq('id', id)
      .single();

    if (!review) {
      return c.json({ success: false, error: '리뷰를 찾을 수 없습니다' }, 404);
    }

    if (review.user_id !== session.userId) {
      return c.json({ success: false, error: '본인의 리뷰만 삭제할 수 있습니다' }, 403);
    }

    await supabase.from('reviews').delete().eq('id', id);

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

    return c.json({ success: true, message: '리뷰가 삭제되었습니다' });
  } catch (error) {
    return c.json({ success: false, error: '리뷰 삭제 중 오류가 발생했습니다' }, 500);
  }
});

// ==================== ADMIN ROUTES ====================

const requireAdmin = async (c, next) => {
  const session = c.get('session');
  if (!session?.userId) {
    return c.json({ success: false, error: '로그인이 필요합니다' }, 401);
  }
  if (!session?.isAdmin) {
    return c.json({ success: false, error: '관리자 권한이 필요합니다' }, 403);
  }
  await next();
};

app.get('/admin/reviews', requireAdmin, async (c) => {
  try {
    const status = c.req.query('status');

    let query = supabase
      .from('reviews')
      .select('*, users (nickname, email, is_beta_tester), restaurants (name, address)')
      .order('created_at', { ascending: false });

    if (status && ['pending', 'approved', 'rejected'].includes(status)) {
      query = query.eq('status', status);
    }

    const { data: reviews, error } = await query;
    if (error) throw error;

    const transformed = reviews.map(r => ({
      ...r,
      user_nickname: r.users?.nickname,
      user_email: r.users?.email,
      is_beta_tester: r.users?.is_beta_tester,
      restaurant_name: r.restaurants?.name,
      restaurant_address: r.restaurants?.address,
      users: undefined,
      restaurants: undefined
    }));

    // 병렬로 통계 조회
    const [pending, approved, rejected] = await Promise.all([
      supabase.from('reviews').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('reviews').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
      supabase.from('reviews').select('*', { count: 'exact', head: true }).eq('status', 'rejected')
    ]);

    return c.json({
      success: true,
      reviews: transformed,
      stats: {
        pending: pending.count || 0,
        approved: approved.count || 0,
        rejected: rejected.count || 0
      }
    });
  } catch (error) {
    console.error('Get admin reviews error:', error);
    return c.json({ success: false, error: '리뷰 목록을 불러오는 중 오류가 발생했습니다' }, 500);
  }
});

app.get('/admin/stats', requireAdmin, async (c) => {
  try {
    // 모든 통계를 병렬로 조회
    const [users, betaTesters, restaurants, pending, approved, rejected] = await Promise.all([
      supabase.from('users').select('*', { count: 'exact', head: true }),
      supabase.from('users').select('*', { count: 'exact', head: true }).eq('is_beta_tester', true),
      supabase.from('restaurants').select('*', { count: 'exact', head: true }),
      supabase.from('reviews').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('reviews').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
      supabase.from('reviews').select('*', { count: 'exact', head: true }).eq('status', 'rejected')
    ]);

    return c.json({
      success: true,
      stats: {
        users: users.count || 0,
        betaTesters: betaTesters.count || 0,
        restaurants: restaurants.count || 0,
        reviews: {
          pending: pending.count || 0,
          approved: approved.count || 0,
          rejected: rejected.count || 0
        }
      }
    });
  } catch (error) {
    return c.json({ success: false, error: '통계를 불러오는 중 오류가 발생했습니다' }, 500);
  }
});

app.put('/admin/reviews/:id/approve', requireAdmin, async (c) => {
  try {
    const id = c.req.param('id');

    const { data: review } = await supabase
      .from('reviews')
      .select('*, users(is_beta_tester)')
      .eq('id', id)
      .single();

    if (!review) {
      return c.json({ success: false, error: '리뷰를 찾을 수 없습니다' }, 404);
    }

    if (review.status !== 'pending') {
      return c.json({ success: false, error: '이미 처리된 리뷰입니다' }, 400);
    }

    const POINTS = 500;

    await supabase
      .from('reviews')
      .update({ status: 'approved', points_given: POINTS })
      .eq('id', id);

    const { data: user } = await supabase
      .from('users')
      .select('points, is_beta_tester')
      .eq('id', review.user_id)
      .single();

    await supabase
      .from('users')
      .update({ points: (user?.points || 0) + POINTS })
      .eq('id', review.user_id);

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

    return c.json({
      success: true,
      message: `승인 완료. 사용자에게 ${POINTS}P 적립`
    });
  } catch (error) {
    return c.json({ success: false, error: '리뷰 승인 중 오류가 발생했습니다' }, 500);
  }
});

app.put('/admin/reviews/:id/reject', requireAdmin, async (c) => {
  try {
    const id = c.req.param('id');
    const { reason } = await c.req.json();

    if (!reason) {
      return c.json({ success: false, error: '반려 사유를 입력하세요' }, 400);
    }

    const { data: review } = await supabase
      .from('reviews')
      .select('*')
      .eq('id', id)
      .single();

    if (!review) {
      return c.json({ success: false, error: '리뷰를 찾을 수 없습니다' }, 404);
    }

    if (review.status !== 'pending') {
      return c.json({ success: false, error: '이미 처리된 리뷰입니다' }, 400);
    }

    await supabase
      .from('reviews')
      .update({ status: 'rejected', reject_reason: reason })
      .eq('id', id);

    return c.json({ success: true, message: '반려 완료' });
  } catch (error) {
    return c.json({ success: false, error: '리뷰 반려 중 오류가 발생했습니다' }, 500);
  }
});

app.delete('/admin/reviews/:id', requireAdmin, async (c) => {
  try {
    const id = c.req.param('id');

    const { data: review } = await supabase
      .from('reviews')
      .select('*')
      .eq('id', id)
      .single();

    if (!review) {
      return c.json({ success: false, error: '리뷰를 찾을 수 없습니다' }, 404);
    }

    await supabase.from('reviews').delete().eq('id', id);

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

    return c.json({ success: true, message: '리뷰가 삭제되었습니다' });
  } catch (error) {
    return c.json({ success: false, error: '리뷰 삭제 중 오류가 발생했습니다' }, 500);
  }
});

// 404 핸들러
app.notFound((c) => c.json({ success: false, error: 'API endpoint not found' }, 404));

// 에러 핸들러
app.onError((err, c) => {
  console.error('Error:', err);
  return c.json({ success: false, error: err.message || 'Internal server error' }, 500);
});

// Vercel Serverless 핸들러
export default handle(app);
