// Supabase Database Configuration
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials. Check .env file.');
  console.error('   SUPABASE_URL:', supabaseUrl ? '✓' : '✗');
  console.error('   SUPABASE_ANON_KEY:', supabaseKey ? '✓' : '✗');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

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
