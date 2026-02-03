// MapMapMap - Supabase Direct Client (No Backend Required)
// Supabase SDK는 index.html에서 로드됨

// Supabase 클라이언트 초기화 (환경변수 대신 직접 설정)
// 주의: ANON KEY는 공개되어도 안전 (RLS로 보호됨)
const SUPABASE_URL = 'https://xwnqpsnagdcleseqifqv.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_plHB6vw9K1bbWpr6xtkFXA_heBnWR4U';

// supabaseClient로 이름 변경 (SDK 전역변수와 충돌 방지)
let supabaseClient = null;

// Supabase 초기화 (SDK 로드 후 호출)
function initSupabase() {
  if (window.supabase && !supabaseClient) {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log('✅ Supabase initialized');
  }
  return supabaseClient;
}

// API 객체 - Supabase 직접 연동
const API = {
  // Auth APIs
  auth: {
    async signup(email, password, nickname, spicy_level = 0, phone = null) {
      const sb = initSupabase();

      // 1. Supabase Auth 회원가입
      const { data: authData, error: authError } = await sb.auth.signUp({
        email,
        password,
        options: { data: { nickname, phone } }
      });

      if (authError) {
        if (authError.message.includes('already registered')) {
          throw new Error('이미 등록된 이메일입니다');
        }
        throw new Error(authError.message);
      }

      if (!authData.user) {
        throw new Error('회원가입에 실패했습니다');
      }

      // 2. users 테이블에 추가 정보 저장
      const { data: user, error: dbError } = await sb
        .from('users')
        .insert({
          id: authData.user.id,
          email,
          nickname,
          phone: phone || null,
          spicy_level: spicy_level ?? 0,
          points: 0,
          is_admin: false,
          is_beta_tester: false
        })
        .select()
        .single();

      if (dbError) {
        console.error('DB insert error:', dbError);
        throw new Error('사용자 정보 저장에 실패했습니다');
      }

      // 회원가입 이벤트 로깅
      logAccess('signup', { email: user.email, nickname: user.nickname });

      return {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          nickname: user.nickname,
          spicy_level: user.spicy_level,
          points: user.points,
          is_admin: user.is_admin,
          is_beta_tester: user.is_beta_tester
        }
      };
    },

    async login(email, password) {
      const sb = initSupabase();

      const { data: authData, error: authError } = await sb.auth.signInWithPassword({
        email,
        password
      });

      if (authError) {
        throw new Error('이메일 또는 비밀번호가 올바르지 않습니다');
      }

      // users 테이블에서 추가 정보 조회
      let { data: user } = await sb
        .from('users')
        .select('*')
        .eq('id', authData.user.id)
        .single();

      // users 테이블에 없으면 자동 생성
      if (!user) {
        const { data: newUser } = await sb
          .from('users')
          .insert({
            id: authData.user.id,
            email: authData.user.email,
            nickname: authData.user.user_metadata?.nickname || email.split('@')[0],
            spicy_level: 0,
            points: 0,
            is_admin: false,
            is_beta_tester: false
          })
          .select()
          .single();
        user = newUser;
      }

      // 로그인 이벤트 로깅
      logAccess('login', { email: user.email, nickname: user.nickname });

      return {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          nickname: user.nickname,
          spicy_level: user.spicy_level,
          points: user.points,
          is_admin: user.is_admin,
          is_beta_tester: user.is_beta_tester
        }
      };
    },

    async logout() {
      const sb = initSupabase();
      // 로그아웃 이벤트 로깅 (로그아웃 전에 기록)
      await logAccess('logout');
      await sb.auth.signOut();
      return { success: true };
    },

    async me() {
      const sb = initSupabase();

      const { data: { user: authUser } } = await sb.auth.getUser();

      if (!authUser) {
        throw new Error('로그인이 필요합니다');
      }

      const { data: user, error } = await sb
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (error || !user) {
        throw new Error('사용자를 찾을 수 없습니다');
      }

      return {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          nickname: user.nickname,
          spicy_level: user.spicy_level,
          points: user.points,
          is_admin: user.is_admin,
          is_beta_tester: user.is_beta_tester
        }
      };
    },

    async setSpicyLevel(spicy_level) {
      const sb = initSupabase();
      const { data: { user: authUser } } = await sb.auth.getUser();

      if (!authUser) {
        throw new Error('로그인이 필요합니다');
      }

      await sb.from('users').update({ spicy_level }).eq('id', authUser.id);
      return { success: true, spicy_level };
    }
  },

  // Restaurant APIs
  restaurants: {
    async list() {
      const sb = initSupabase();

      let userLevel = 0;
      const { data: { user: authUser } } = await sb.auth.getUser();

      if (authUser) {
        const { data: userData } = await sb
          .from('users')
          .select('spicy_level')
          .eq('id', authUser.id)
          .single();
        userLevel = userData?.spicy_level || 0;
      }

      // 승인된 리뷰가 1개 이상 있는 맛집만 조회
      const { data: restaurants, error } = await sb
        .from('restaurants')
        .select('*')
        .gt('review_count', 0)
        .order('review_count', { ascending: false });

      if (error) throw error;

      const getMarkerStatus = (restaurantLevel, userLevel) => {
        if (restaurantLevel <= userLevel) return 'safe';
        if (restaurantLevel <= userLevel + 1) return 'warning';
        return 'danger';
      };

      const withStatus = restaurants.map(r => ({
        ...r,
        marker_status: getMarkerStatus(r.avg_level, userLevel)
      }));

      return { success: true, restaurants: withStatus };
    },

    async get(id) {
      const sb = initSupabase();

      // 병렬로 맛집과 리뷰 조회
      const [restaurantResult, reviewsResult] = await Promise.all([
        sb.from('restaurants').select('*').eq('id', id).single(),
        sb.from('reviews')
          .select('*, users (nickname, spicy_level)')
          .eq('restaurant_id', id)
          .eq('status', 'approved')
          .order('created_at', { ascending: false })
      ]);

      if (restaurantResult.error || !restaurantResult.data) {
        throw new Error('가게를 찾을 수 없습니다');
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

      // 맛집 상세 조회 로깅
      logAccess('view_restaurant', {
        restaurant_id: id,
        restaurant_name: restaurantResult.data.name
      });

      return {
        success: true,
        restaurant: restaurantResult.data,
        reviews: transformedReviews,
        level_stats: levelAverages
      };
    },

    async create(data) {
      const sb = initSupabase();
      const { data: { user: authUser } } = await sb.auth.getUser();

      if (!authUser) {
        throw new Error('로그인이 필요합니다');
      }

      const { name, address, lat, lng, phone, category } = data;

      // 이미 존재하는지 확인
      const { data: existing } = await sb
        .from('restaurants')
        .select('*')
        .eq('name', name)
        .eq('lat', lat)
        .eq('lng', lng)
        .single();

      if (existing) {
        return { success: true, restaurant: existing, existed: true };
      }

      const { data: restaurant, error } = await sb
        .from('restaurants')
        .insert({ name, address, lat, lng, phone: phone || null, category: category || null })
        .select()
        .single();

      if (error) throw error;

      return { success: true, restaurant, existed: false };
    }
  },

  // Review APIs
  reviews: {
    async create(formData) {
      const sb = initSupabase();
      const { data: { user: authUser } } = await sb.auth.getUser();

      if (!authUser) {
        throw new Error('로그인이 필요합니다');
      }

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
        throw new Error('메뉴명과 맵기 레벨은 필수입니다');
      }

      if (!receipt_image || !receipt_image.size) {
        throw new Error('영수증 사진은 필수입니다');
      }

      if (!food_images || food_images.length === 0 || !food_images[0].size) {
        throw new Error('음식 사진은 필수입니다 (최소 1장)');
      }

      // ========== 1단계: 이미지 업로드 먼저 (실패 시 DB 저장 안 함) ==========

      // 음식 이미지 업로드
      const foodImageUrls = [];
      for (const file of food_images) {
        if (!file.size) continue;
        const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
        const filename = `${crypto.randomUUID()}.${ext}`;

        const { error: uploadError } = await sb.storage
          .from('food-images')
          .upload(filename, file);

        if (uploadError) {
          throw new Error(`음식 사진 업로드 실패: ${uploadError.message}`);
        }

        const { data: urlData } = sb.storage.from('food-images').getPublicUrl(filename);
        foodImageUrls.push(urlData.publicUrl);
      }

      if (foodImageUrls.length === 0) {
        throw new Error('음식 사진 업로드에 실패했습니다');
      }

      // 영수증 이미지 업로드
      const receiptExt = receipt_image.name.split('.').pop()?.toLowerCase() || 'jpg';
      const receiptFilename = `${crypto.randomUUID()}.${receiptExt}`;

      const { error: receiptUploadError } = await sb.storage
        .from('receipt-images')
        .upload(receiptFilename, receipt_image);

      if (receiptUploadError) {
        throw new Error(`영수증 사진 업로드 실패: ${receiptUploadError.message}`);
      }

      const { data: receiptUrlData } = sb.storage.from('receipt-images').getPublicUrl(receiptFilename);

      // ========== 2단계: 이미지 업로드 성공 후 맛집 저장 ==========

      let finalRestaurantId = restaurant_id;

      // 새 맛집이면 생성
      if (!restaurant_id && restaurant_name) {
        const { data: existing } = await sb
          .from('restaurants')
          .select('id')
          .eq('name', restaurant_name)
          .eq('lat', parseFloat(restaurant_lat))
          .eq('lng', parseFloat(restaurant_lng))
          .single();

        if (existing) {
          finalRestaurantId = existing.id;
        } else {
          const { data: newRestaurant, error: restaurantError } = await sb
            .from('restaurants')
            .insert({
              name: restaurant_name,
              address: restaurant_address,
              lat: parseFloat(restaurant_lat),
              lng: parseFloat(restaurant_lng)
            })
            .select()
            .single();

          if (restaurantError) {
            throw new Error(`맛집 등록 실패: ${restaurantError.message}`);
          }
          finalRestaurantId = newRestaurant.id;
        }
      }

      if (!finalRestaurantId) {
        throw new Error('가게 정보가 필요합니다');
      }

      // 리뷰 저장
      const { data: review, error: reviewError } = await sb
        .from('reviews')
        .insert({
          user_id: authUser.id,
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

      // 리뷰 제출 로깅
      logAccess('submit_review', {
        restaurant_id: finalRestaurantId,
        restaurant_name: restaurant_name,
        menu_name: menu_name
      });

      return {
        success: true,
        review: { id: review.id, status: 'pending' },
        message: '제보가 접수되었습니다. 검수 후 포인트가 적립됩니다.'
      };
    },

    async myList() {
      const sb = initSupabase();
      const { data: { user: authUser } } = await sb.auth.getUser();

      if (!authUser) {
        throw new Error('로그인이 필요합니다');
      }

      const { data: reviews, error } = await sb
        .from('reviews')
        .select('*, restaurants (name)')
        .eq('user_id', authUser.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const transformed = reviews.map(r => ({
        ...r,
        restaurant_name: r.restaurants?.name,
        restaurants: undefined
      }));

      return { success: true, reviews: transformed };
    },

    async delete(id) {
      const sb = initSupabase();
      const { data: { user: authUser } } = await sb.auth.getUser();

      if (!authUser) {
        throw new Error('로그인이 필요합니다');
      }

      const { data: review } = await sb
        .from('reviews')
        .select('*')
        .eq('id', id)
        .single();

      if (!review) {
        throw new Error('리뷰를 찾을 수 없습니다');
      }

      if (review.user_id !== authUser.id) {
        throw new Error('본인의 리뷰만 삭제할 수 있습니다');
      }

      await sb.from('reviews').delete().eq('id', id);

      // 맛집 통계 재계산
      if (review.status === 'approved') {
        const { data: reviewStats } = await sb
          .from('reviews')
          .select('spicy_level')
          .eq('restaurant_id', review.restaurant_id)
          .eq('status', 'approved');

        if (reviewStats && reviewStats.length > 0) {
          const avgLevel = reviewStats.reduce((sum, r) => sum + r.spicy_level, 0) / reviewStats.length;
          await sb
            .from('restaurants')
            .update({ avg_level: avgLevel, review_count: reviewStats.length })
            .eq('id', review.restaurant_id);
        } else {
          await sb
            .from('restaurants')
            .update({ avg_level: 0, review_count: 0 })
            .eq('id', review.restaurant_id);
        }
      }

      return { success: true, message: '리뷰가 삭제되었습니다' };
    }
  },

  // Admin APIs
  admin: {
    async getReviews(status = '') {
      const sb = initSupabase();
      const { data: { user: authUser } } = await sb.auth.getUser();

      if (!authUser) {
        throw new Error('로그인이 필요합니다');
      }

      // 관리자 권한 확인
      const { data: userData } = await sb
        .from('users')
        .select('is_admin')
        .eq('id', authUser.id)
        .single();

      if (!userData?.is_admin) {
        throw new Error('관리자 권한이 필요합니다');
      }

      let query = sb
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
        sb.from('reviews').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        sb.from('reviews').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
        sb.from('reviews').select('*', { count: 'exact', head: true }).eq('status', 'rejected')
      ]);

      return {
        success: true,
        reviews: transformed,
        stats: {
          pending: pending.count || 0,
          approved: approved.count || 0,
          rejected: rejected.count || 0
        }
      };
    },

    async getStats() {
      const sb = initSupabase();

      const [users, betaTesters, restaurants, pending, approved, rejected] = await Promise.all([
        sb.from('users').select('*', { count: 'exact', head: true }),
        sb.from('users').select('*', { count: 'exact', head: true }).eq('is_beta_tester', true),
        sb.from('restaurants').select('*', { count: 'exact', head: true }),
        sb.from('reviews').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        sb.from('reviews').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
        sb.from('reviews').select('*', { count: 'exact', head: true }).eq('status', 'rejected')
      ]);

      return {
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
      };
    },

    async approve(id) {
      const sb = initSupabase();

      const { data: review } = await sb
        .from('reviews')
        .select('*')
        .eq('id', id)
        .single();

      if (!review) {
        throw new Error('리뷰를 찾을 수 없습니다');
      }

      if (review.status !== 'pending') {
        throw new Error('이미 처리된 리뷰입니다');
      }

      const POINTS = 500;

      // 리뷰 승인
      await sb
        .from('reviews')
        .update({ status: 'approved', points_given: POINTS })
        .eq('id', id);

      // 포인트 지급
      const { data: user } = await sb
        .from('users')
        .select('points')
        .eq('id', review.user_id)
        .single();

      await sb
        .from('users')
        .update({ points: (user?.points || 0) + POINTS })
        .eq('id', review.user_id);

      // 맛집 평균 재계산
      const { data: reviewStats } = await sb
        .from('reviews')
        .select('spicy_level')
        .eq('restaurant_id', review.restaurant_id)
        .eq('status', 'approved');

      if (reviewStats && reviewStats.length > 0) {
        const avgLevel = reviewStats.reduce((sum, r) => sum + r.spicy_level, 0) / reviewStats.length;
        await sb
          .from('restaurants')
          .update({ avg_level: avgLevel, review_count: reviewStats.length })
          .eq('id', review.restaurant_id);
      }

      return { success: true, message: `승인 완료. 사용자에게 ${POINTS}P 적립` };
    },

    async reject(id, reason) {
      const sb = initSupabase();

      if (!reason) {
        throw new Error('반려 사유를 입력하세요');
      }

      const { data: review } = await sb
        .from('reviews')
        .select('*')
        .eq('id', id)
        .single();

      if (!review) {
        throw new Error('리뷰를 찾을 수 없습니다');
      }

      if (review.status !== 'pending') {
        throw new Error('이미 처리된 리뷰입니다');
      }

      await sb
        .from('reviews')
        .update({ status: 'rejected', reject_reason: reason })
        .eq('id', id);

      return { success: true, message: '반려 완료' };
    },

    async deleteReview(id) {
      const sb = initSupabase();

      const { data: review } = await sb
        .from('reviews')
        .select('*')
        .eq('id', id)
        .single();

      if (!review) {
        throw new Error('리뷰를 찾을 수 없습니다');
      }

      await sb.from('reviews').delete().eq('id', id);

      // 맛집 통계 재계산
      if (review.status === 'approved') {
        const { data: reviewStats } = await sb
          .from('reviews')
          .select('spicy_level')
          .eq('restaurant_id', review.restaurant_id)
          .eq('status', 'approved');

        if (reviewStats && reviewStats.length > 0) {
          const avgLevel = reviewStats.reduce((sum, r) => sum + r.spicy_level, 0) / reviewStats.length;
          await sb
            .from('restaurants')
            .update({ avg_level: avgLevel, review_count: reviewStats.length })
            .eq('id', review.restaurant_id);
        } else {
          await sb
            .from('restaurants')
            .update({ avg_level: 0, review_count: 0 })
            .eq('id', review.restaurant_id);
        }
      }

      return { success: true, message: '리뷰가 삭제되었습니다' };
    }
  },

  // Favorites APIs
  favorites: {
    async list() {
      const sb = initSupabase();
      const { data: { user: authUser } } = await sb.auth.getUser();

      if (!authUser) {
        throw new Error('로그인이 필요합니다');
      }

      const { data: favorites, error } = await sb
        .from('favorites')
        .select('id, created_at, restaurants (id, name, address, lat, lng, category, avg_level, review_count)')
        .eq('user_id', authUser.id)
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

      return { success: true, favorites: transformed };
    },

    async check(restaurantId) {
      const sb = initSupabase();
      const { data: { user: authUser } } = await sb.auth.getUser();

      if (!authUser) {
        return { success: true, isFavorite: false };
      }

      const { data } = await sb
        .from('favorites')
        .select('id')
        .eq('user_id', authUser.id)
        .eq('restaurant_id', restaurantId)
        .single();

      return { success: true, isFavorite: !!data };
    },

    async add(restaurantId) {
      const sb = initSupabase();
      const { data: { user: authUser } } = await sb.auth.getUser();

      if (!authUser) {
        throw new Error('로그인이 필요합니다');
      }

      const { data: existing } = await sb
        .from('favorites')
        .select('id')
        .eq('user_id', authUser.id)
        .eq('restaurant_id', restaurantId)
        .single();

      if (existing) {
        throw new Error('이미 찜한 맛집입니다');
      }

      await sb.from('favorites').insert({
        user_id: authUser.id,
        restaurant_id: restaurantId
      });

      // 즐겨찾기 추가 로깅
      logAccess('add_favorite', { restaurant_id: restaurantId });

      return { success: true, message: '찜 목록에 추가되었습니다' };
    },

    async remove(restaurantId) {
      const sb = initSupabase();
      const { data: { user: authUser } } = await sb.auth.getUser();

      if (!authUser) {
        throw new Error('로그인이 필요합니다');
      }

      await sb
        .from('favorites')
        .delete()
        .eq('user_id', authUser.id)
        .eq('restaurant_id', restaurantId);

      // 즐겨찾기 제거 로깅
      logAccess('remove_favorite', { restaurant_id: restaurantId });

      return { success: true, message: '찜 목록에서 제거되었습니다' };
    }
  }
};

// Global state
const AppState = {
  user: null,
  restaurants: [],
  isLoading: false,
  STORAGE_KEY: 'mapmap_user',

  // Helper function to get level name and emoji
  getLevelInfo(level) {
    const levelInfo = {
      0: { name: '맵찔이', emoji: '🐥' },
      1: { name: '맵초보', emoji: '👼' },
      2: { name: '맵보통', emoji: '🌶️' },
      3: { name: '맵니아', emoji: '🔥' },
      4: { name: '맵고수', emoji: '💣' },
      5: { name: '맵친자', emoji: '💀' }
    };
    return levelInfo[level] || { name: '맵?', emoji: '❓' };
  },

  setUser(user) {
    this.user = user;
    if (user) {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(this.STORAGE_KEY);
    }
    this.updateUI();
  },

  loadUser() {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        this.user = JSON.parse(stored);
        return this.user;
      }
    } catch (e) {
      localStorage.removeItem(this.STORAGE_KEY);
    }
    return null;
  },

  async syncWithServer() {
    const storedUser = this.loadUser();
    if (!storedUser) return null;

    try {
      const response = await API.auth.me();
      if (response.success && response.user) {
        this.setUser(response.user);
        return response.user;
      }
    } catch (error) {
      this.setUser(null);
    }
    return null;
  },

  updateUI() {
    const headerUserInfo = document.getElementById('header-user-info');
    const headerNickname = document.getElementById('header-nickname');
    const headerLevel = document.getElementById('header-level');
    const authButtons = document.getElementById('auth-buttons');
    const adminBtn = document.getElementById('admin-btn');

    // 모바일 메뉴 요소들
    const mobileNickname = document.getElementById('mobile-nickname');
    const mobileDropdownNickname = document.getElementById('mobile-dropdown-nickname');
    const mobileDropdownLevel = document.getElementById('mobile-dropdown-level');
    const mobileAdminBtn = document.getElementById('mobile-admin-btn');

    if (this.user) {
      const levelInfo = this.getLevelInfo(this.user.spicy_level);
      const levelText = `Lv.${this.user.spicy_level} ${levelInfo.name} ${levelInfo.emoji}`;

      if (headerUserInfo) {
        headerUserInfo.style.display = 'flex';
        headerNickname.textContent = this.user.nickname;
        headerLevel.textContent = levelText;
        headerLevel.className = `user-level-badge level-${this.user.spicy_level}`;
      }

      // 모바일 메뉴 업데이트
      if (mobileNickname) mobileNickname.textContent = this.user.nickname;
      if (mobileDropdownNickname) mobileDropdownNickname.textContent = this.user.nickname;
      if (mobileDropdownLevel) {
        mobileDropdownLevel.textContent = levelText;
        mobileDropdownLevel.className = `user-level-badge level-${this.user.spicy_level}`;
      }
      if (mobileAdminBtn) {
        mobileAdminBtn.style.display = this.user.is_admin ? 'flex' : 'none';
      }

      if (authButtons) authButtons.style.display = 'none';
      if (adminBtn) {
        adminBtn.style.display = this.user.is_admin ? 'inline-block' : 'none';
      }
    } else {
      if (headerUserInfo) headerUserInfo.style.display = 'none';
      if (authButtons) authButtons.style.display = 'flex';
      if (adminBtn) adminBtn.style.display = 'none';
      if (mobileAdminBtn) mobileAdminBtn.style.display = 'none';
    }
  }
};

// Toast notification
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    padding: 12px 24px;
    border-radius: 8px;
    color: white;
    font-weight: 500;
    z-index: 10001;
    animation: fadeIn 0.3s ease;
    background: ${type === 'error' ? '#f44336' : type === 'success' ? '#4CAF50' : '#333'};
  `;

  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'fadeOut 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ============================================
// 사용자 접속 기록 로깅 시스템
// ============================================

// 세션 ID 생성 (브라우저 탭 단위로 고유)
function getSessionId() {
  let sessionId = sessionStorage.getItem('mapmap_session_id');
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    sessionStorage.setItem('mapmap_session_id', sessionId);
  }
  return sessionId;
}

// 접속 기록 저장 함수
async function logAccess(action, metadata = {}) {
  try {
    const sb = initSupabase();
    if (!sb) return;

    // 현재 로그인한 사용자 확인 (자동 로그인 포함)
    const { data: { user: authUser } } = await sb.auth.getUser();

    const logData = {
      user_id: authUser?.id || null,
      session_id: getSessionId(),
      action: action,
      page: window.location.pathname,
      metadata: {
        ...metadata,
        url: window.location.href,
        timestamp: new Date().toISOString()
      },
      user_agent: navigator.userAgent,
      referrer: document.referrer || null
    };

    await sb.from('access_logs').insert(logData);
    console.log(`📊 Access logged: ${action}`, authUser ? `(user: ${authUser.id})` : '(anonymous)');
  } catch (error) {
    // 로깅 실패는 사용자 경험에 영향을 주지 않도록 조용히 처리
    console.warn('Access logging failed:', error.message);
  }
}

// 페이지 방문 로깅 (자동 로그인 포함)
async function logPageVisit() {
  const sb = initSupabase();
  if (!sb) return;

  // Supabase 세션 확인 (자동 로그인된 세션도 감지)
  const { data: { session } } = await sb.auth.getSession();

  if (session) {
    // 자동 로그인 또는 기존 세션으로 접속
    await logAccess('visit_authenticated', {
      login_type: 'session_restored',  // 자동 로그인/세션 복원
      email: session.user?.email
    });
  } else {
    // 비로그인 상태 방문
    await logAccess('visit_anonymous');
  }
}

// 특정 액션 로깅 헬퍼 함수들
const AccessLog = {
  // 로그인 이벤트
  async login(email) {
    await logAccess('login', { email });
  },

  // 로그아웃 이벤트
  async logout() {
    await logAccess('logout');
  },

  // 맛집 상세 조회
  async viewRestaurant(restaurantId, restaurantName) {
    await logAccess('view_restaurant', {
      restaurant_id: restaurantId,
      restaurant_name: restaurantName
    });
  },

  // 리뷰 제출
  async submitReview(restaurantId, restaurantName) {
    await logAccess('submit_review', {
      restaurant_id: restaurantId,
      restaurant_name: restaurantName
    });
  },

  // 검색
  async search(query) {
    await logAccess('search', { query });
  },

  // 즐겨찾기 추가/제거
  async favorite(restaurantId, action) {
    await logAccess(action === 'add' ? 'add_favorite' : 'remove_favorite', {
      restaurant_id: restaurantId
    });
  }
};

// Supabase SDK 로드 대기 및 초기 접속 로깅
document.addEventListener('DOMContentLoaded', () => {
  initSupabase();

  // 페이지 방문 로깅 (자동 로그인 세션 포함)
  setTimeout(() => {
    logPageVisit();
  }, 500);  // Supabase 초기화 완료 대기
});
