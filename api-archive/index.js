// Vercel Serverless Function Entry Point
const path = require('path');

// .env 파일 로드 (로컬 개발용, Vercel에서는 환경변수 자동 주입)
require('dotenv').config({ path: path.join(__dirname, '../server/.env') });

const app = require('../server/src/app');

module.exports = app;
