#!/usr/bin/env node

/**
 * DATABASE DIAGNOSTIC TOOL
 * Run this to check Supabase connection and configuration
 */

require('dotenv').config();
const supabase = require('./config/supabase');

async function diagnose() {
  console.log('\n' + '='.repeat(60));
  console.log('  SCHEDX - SUPABASE POSTGRESQL DIAGNOSTIC');
  console.log('='.repeat(60) + '\n');

  // Check environment variables
  console.log('📋 ENVIRONMENT VARIABLES:');
  console.log(`   SUPABASE_URL: ${process.env.SUPABASE_URL ? '✓ Configured' : '❌ Missing'}`);
  console.log(`   SUPABASE_SECRET_KEY: ${process.env.SUPABASE_SECRET_KEY ? '✓ Configured' : '❌ Missing'}`);
  console.log(`   PORT: ${process.env.PORT || 3000}\n`);

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SECRET_KEY) {
    console.log('❌ MISSING CONFIGURATION:');
    console.log('   Please set SUPABASE_URL and SUPABASE_SECRET_KEY in your .env file.');
    console.log('   Refer to docs/SUPABASE_SETUP.md for setup instructions.\n');
    process.exit(1);
  }

  console.log('🔌 TESTING SUPABASE CONNECTION...');
  try {
    const { data, error } = await supabase.from('rooms').select('room_id').limit(1);

    if (error) {
      if (error.code === 'PGRST205' || error.message.includes('relation') || error.message.includes('does not exist')) {
        console.log('   ⚠️  Connected to Supabase, but schema tables are not found.');
        console.log('   Action required: Run database/supabase_schema.sql in the Supabase SQL Editor.\n');
      } else {
        console.log(`   ❌ Supabase returned an error: ${error.message}\n`);
      }
    } else {
      console.log('   ✅ Successfully connected to Supabase PostgreSQL cloud database!\n');
    }
  } catch (err) {
    console.log(`   ❌ Connection test failed: ${err.message}\n`);
  }

  console.log('='.repeat(60) + '\n');
}

diagnose();
