// Auth Routes - Supabase Version
const express = require('express');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const { supabase } = require('../config/database');

const router = express.Router();

// Validation middleware
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: errors.array()[0].msg
    });
  }
  next();
};

// POST /api/auth/signup
router.post('/signup',
  body('email').isEmail().withMessage('올바른 이메일을 입력하세요'),
  body('password').isLength({ min: 6 }).withMessage('비밀번호는 6자 이상이어야 합니다'),
  body('nickname').isLength({ min: 2, max: 20 }).withMessage('닉네임은 2-20자여야 합니다'),
  validate,
  async (req, res) => {
    try {
      const { email, password, nickname } = req.body;

      // 이메일 중복 확인
      const { data: existing } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .single();

      if (existing) {
        return res.status(400).json({
          success: false,
          error: '이미 등록된 이메일입니다'
        });
      }

      // 비밀번호 해시
      const password_hash = await bcrypt.hash(password, 10);

      // 사용자 생성
      const { data: user, error } = await supabase
        .from('users')
        .insert({
          email,
          password_hash,
          nickname,
          spicy_level: 0,
          points: 0,
          is_admin: false,
          is_beta_tester: false
        })
        .select()
        .single();

      if (error) throw error;

      // 세션 설정
      req.session.userId = user.id;
      req.session.isAdmin = false;

      res.status(201).json({
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
      });
    } catch (error) {
      console.error('Signup error:', error);
      res.status(500).json({
        success: false,
        error: '회원가입 중 오류가 발생했습니다'
      });
    }
  }
);

// POST /api/auth/login
router.post('/login',
  body('email').isEmail().withMessage('올바른 이메일을 입력하세요'),
  body('password').notEmpty().withMessage('비밀번호를 입력하세요'),
  validate,
  async (req, res) => {
    try {
      const { email, password } = req.body;

      // 사용자 찾기
      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

      if (error || !user) {
        return res.status(401).json({
          success: false,
          error: '이메일 또는 비밀번호가 올바르지 않습니다'
        });
      }

      // 비밀번호 확인
      const valid = await bcrypt.compare(password, user.password_hash);
      if (!valid) {
        return res.status(401).json({
          success: false,
          error: '이메일 또는 비밀번호가 올바르지 않습니다'
        });
      }

      // 세션 설정
      req.session.userId = user.id;
      req.session.isAdmin = user.is_admin;

      res.json({
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
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        error: '로그인 중 오류가 발생했습니다'
      });
    }
  }
);

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      return res.status(500).json({
        success: false,
        error: '로그아웃 중 오류가 발생했습니다'
      });
    }
    res.json({ success: true });
  });
});

// GET /api/auth/me
router.get('/me', async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({
      success: false,
      error: '로그인이 필요합니다'
    });
  }

  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', req.session.userId)
      .single();

    if (error || !user) {
      return res.status(401).json({
        success: false,
        error: '사용자를 찾을 수 없습니다'
      });
    }

    res.json({
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
    });
  } catch (error) {
    console.error('Me error:', error);
    res.status(500).json({
      success: false,
      error: '사용자 정보 조회 중 오류가 발생했습니다'
    });
  }
});

// PUT /api/auth/spicy-level
router.put('/spicy-level',
  body('spicy_level').isInt({ min: 0, max: 5 }).withMessage('맵레벨은 0-5 사이여야 합니다'),
  validate,
  async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({
        success: false,
        error: '로그인이 필요합니다'
      });
    }

    try {
      const { spicy_level } = req.body;

      const { error } = await supabase
        .from('users')
        .update({ spicy_level })
        .eq('id', req.session.userId);

      if (error) throw error;

      res.json({
        success: true,
        spicy_level
      });
    } catch (error) {
      console.error('Spicy level error:', error);
      res.status(500).json({
        success: false,
        error: '맵레벨 변경 중 오류가 발생했습니다'
      });
    }
  }
);

module.exports = router;
