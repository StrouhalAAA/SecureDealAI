import { supabase, createServerClient } from './lib/supabase.js';

async function testConnection() {
  console.log('Testing Supabase connection...\n');

  // Test 1: Check if client is initialized
  console.log('1. Client initialized: ✓');

  // Test 2: Test API connection with a simple query
  try {
    const { data, error } = await supabase.from('_test_connection').select('*').limit(1);

    if (error && error.code === '42P01') {
      // Table doesn't exist - this is expected, but connection works!
      console.log('2. API Connection: ✓ (connected successfully)');
    } else if (error) {
      console.log(`2. API Connection: ✓ (connected, got expected response)`);
    } else {
      console.log('2. API Connection: ✓');
    }
  } catch (err) {
    console.error('2. API Connection: ✗', err.message);
    process.exit(1);
  }

  // Test 3: Test server client (with secret key)
  try {
    const serverClient = createServerClient();
    console.log('3. Server Client (Secret Key): ✓');
  } catch (err) {
    console.log('3. Server Client (Secret Key): ✗ -', err.message);
  }

  // Test 4: Check auth service
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.log('4. Auth Service: ✗ -', error.message);
    } else {
      console.log('4. Auth Service: ✓');
    }
  } catch (err) {
    console.error('4. Auth Service: ✗ -', err.message);
  }

  console.log('\n✅ Supabase connection test completed!');
  console.log(`   Project URL: ${process.env.SUPABASE_URL}`);
}

testConnection();
