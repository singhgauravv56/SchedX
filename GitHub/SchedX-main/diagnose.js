#!/usr/bin/env node

/**
 * DATABASE DIAGNOSTIC TOOL
 * Run this to check MySQL connection and configuration
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

async function diagnose() {
  console.log('\n' + '='.repeat(60));
  console.log('  SMART TIMETABLE GENERATOR - DATABASE DIAGNOSTIC');
  console.log('='.repeat(60) + '\n');

  // Check environment variables
  console.log('📋 ENVIRONMENT VARIABLES:');
  console.log(`   DB_HOST: ${process.env.DB_HOST || 'localhost'}`);
  console.log(`   DB_USER: ${process.env.DB_USER || 'root'}`);
  console.log(`   DB_PASSWORD: ${process.env.DB_PASSWORD ? '***' : '(empty)'}`);
  console.log(`   DB_NAME: ${process.env.DB_NAME || 'smartschedule'}`);
  console.log(`   PORT: ${process.env.PORT || 3000}\n`);

  // Test MySQL connection
  console.log('🔌 TESTING MYSQL CONNECTION...');
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      connectTimeout: 5000
    });
    console.log('   ✅ Successfully connected to MySQL server!\n');
    await connection.end();
  } catch (error) {
    console.log('   ❌ Failed to connect to MySQL server!');
    console.log(`   Error: ${error.message}\n`);
    console.log('🔧 SOLUTIONS:');
    console.log('   1. Start MySQL service:');
    console.log('      Windows: Services → Find "MySQL" → Right-click → Start');
    console.log('      Or: net start MySQL80 (adjust version if needed)');
    console.log('      Or: Open MySQL Command Line Client\n');
    console.log('   2. Verify credentials in .env file');
    console.log('      - Check DB_USER is correct (default: root)');
    console.log('      - Check DB_PASSWORD (default: empty)');
    console.log('      - Check DB_HOST (default: localhost)\n');
    console.log('   3. If you don\'t have MySQL:');
    console.log('      Download: https://www.mysql.com/downloads/mysql/');
    console.log('      Or use: https://www.apachefriends.org/ (includes MySQL)\n');
    process.exit(1);
  }

  // Test database creation
  console.log('🗄️  TESTING DATABASE CREATION...');
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || ''
    });
    
    const dbName = process.env.DB_NAME || 'smartschedule';
    await connection.query(
      `CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
    console.log('   ✅ Database created/verified successfully!\n');
    await connection.end();
  } catch (error) {
    console.log('   ❌ Failed to create database!');
    console.log(`   Error: ${error.message}\n`);
    process.exit(1);
  }

  // Test table creation
  console.log('📊 TESTING TABLE CREATION...');
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'smartschedule'
    });
    
    // Create a simple test table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS test_table (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100)
      )
    `);
    
    // Try to insert data
    await connection.query('INSERT INTO test_table(name) VALUES(?)', ['Test Entry']);
    
    // Retrieve data
    const [rows] = await connection.query('SELECT COUNT(*) as count FROM test_table');
    console.log(`   ✅ Tables working correctly! (${rows[0].count} test entries)\n`);
    
    // Clean up
    await connection.query('DROP TABLE test_table');
    await connection.end();
  } catch (error) {
    console.log('   ❌ Failed to work with tables!');
    console.log(`   Error: ${error.message}\n`);
    process.exit(1);
  }

  // All tests passed
  console.log('=' .repeat(60));
  console.log('✅ ALL TESTS PASSED! Your database is ready.\n');
  console.log('🚀 You can now run: npm start\n');
  console.log('=' .repeat(60) + '\n');
}

diagnose().catch(error => {
  console.error('Diagnostic failed:', error);
  process.exit(1);
});
