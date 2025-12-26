// Auth Routes - MapMapMap MVP
const express = require('express');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { query, queryOne, run } = require('../config/database');

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

// POST /api/auth/signup - Register new user
router.post('/signup',
  body('email').isEmail().withMessage('올바른 이메일을 입력하세요'),
  body('password').isLength({ min: 8 }).withMessage('비밀번호는 8자 이상이어야 합니다'),
  body('nickname').isLength({ min: 2, max: 20 }).withMessage('닉네임은 2-20자여야 합니다'),
  validate,
  async (req, res) => {
    try {
      const { email, password, nickname } = req.body;

      // Check if email already exists
      const existing = queryOne('SELECT id FROM users WHERE email = ?', [email]);
      if (existing) {
        return res.status(400).json({
          success: false,
          error: '이미 등록된 이메일입니다'
        });
      }

      // Hash password
      const password_hash = await bcrypt.hash(password, 10);

      // Create user
      const id = uuidv4();
      run(
        'INSERT INTO users (id, email, password_hash, nickname) VALUES (?, ?, ?, ?)',
        [id, email, password_hash, nickname]
      );

      // Set session
      req.session.userId = id;
      req.session.isAdmin = false;

      res.status(201).json({
        success: true,
        user: {
          id,
          email,
          nickname,
          spicy_level: 0,
          points: 0
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

// POST /api/auth/login - Login user
router.post('/login',
  body('email').isEmail().withMessage('올바른 이메일을 입력하세요'),
  body('password').notEmpty().withMessage('비밀번호를 입력하세요'),
  validate,
  async (req, res) => {
    try {
      const { email, password } = req.body;

      // Find user
      const user = queryOne('SELECT * FROM users WHERE email = ?', [email]);
      if (!user) {
        return res.status(401).json({
          success: false,
          error: '이메일 또는 비밀번호가 올바르지 않습니다'
        });
      }

      // Verify password
      const valid = await bcrypt.compare(password, user.password_hash);
      if (!valid) {
        return res.status(401).json({
          success: false,
          error: '이메일 또는 비밀번호가 올바르지 않습니다'
        });
      }

      // Set session
      req.session.userId = user.id;
      req.session.isAdmin = !!user.is_admin;

      res.json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          nickname: user.nickname,
          spicy_level: user.spicy_level,
          points: user.points,
          is_admin: !!user.is_admin
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

// POST /api/auth/logout - Logout user
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

// GET /api/auth/me - Get current user
router.get('/me', (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({
      success: false,
      error: '로그인이 필요합니다'
    });
  }

  const user = queryOne('SELECT * FROM users WHERE id = ?', [req.session.userId]);
  if (!user) {
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
      is_admin: !!user.is_admin
    }
  });
});

// PUT /api/auth/spicy-level - Update spicy level
router.put('/spicy-level',
  body('spicy_level').isInt({ min: 0, max: 5 }).withMessage('맵레벨은 0-5 사이여야 합니다'),
  validate,
  (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({
        success: false,
        error: '로그인이 필요합니다'
      });
    }

    const { spicy_level } = req.body;

    run('UPDATE users SET spicy_level = ? WHERE id = ?', [spicy_level, req.session.userId]);

    res.json({
      success: true,
      spicy_level
    });
  }
);

module.exports = router;
