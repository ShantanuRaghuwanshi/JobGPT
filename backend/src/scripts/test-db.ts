#!/usr/bin/env node

import dotenv from 'dotenv';
import db from '../database/connection';

// Load environment variables
dotenv.config();

async function testDatabaseConnection() {
    try {
        console.log('Testing database connection...');

        const isConnected = await db.testConnection();

        if (isConnected) {
            console.log('✅ Database connection successful!');

            // Test a simple query
            const result = await db.query('SELECT version()');
            console.log('📊 PostgreSQL version:', result.rows[0].version);

        } else {
            console.log('❌ Database connection failed!');
            console.log('Please check your database configuration in .env file');
        }
    } catch (error) {
        console.error('❌ Database connection error:', error);
    } finally {
        await db.close();
    }
}

testDatabaseConnection();