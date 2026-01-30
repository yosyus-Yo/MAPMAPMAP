// Supabase Database Configuration
const { createClient } = require('@supabase/supabase-js');

// Vercel 환경에서는 환경변수가 자동 주입됨
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials.');
  console.error('   SUPABASE_URL:', supabaseUrl ? '✓' : '✗');
  console.error('   SUPABASE_ANON_KEY:', supabaseKey ? '✓' : '✗');
  console.error('   Vercel 대시보드에서 환경변수를 설정하세요.');
}

// supabase 클라이언트 생성 (환경변수 없으면 에러 발생하도록)
const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : new Proxy({}, {
      get() {
        throw new Error('Supabase가 설정되지 않았습니다. 환경변수를 확인하세요.');
      }
    });

// 연결 테스트
async function initDatabase() {
  try {
    const { data, error } = await supabase.from('users').select('id').limit(1);
    if (error) throw error;
    console.log('✅ Supabase connected successfully');
    return true;
  } catch (error) {
    console.error('❌ Supabase connection failed:', error.message);
    console.error('   테이블이 생성되었는지 확인하세요.');
    return false;
  }
}

module.exports = {
  supabase,
  initDatabase
};
