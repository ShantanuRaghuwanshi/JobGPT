#!/usr/bin/env node

// Load environment variables FIRST before any other imports
import dotenv from 'dotenv';
dotenv.config();

import MigrationRunner from '../database/migrations/runner';
import db from '../database/connection';

async function runMigrations() {
    const runner = new MigrationRunner();

    try {
        console.log('Testing database connection...');
        const isConnected = await db.testConnection();

        if (!isConnected) {
            console.error('Failed to connect to database. Please check your configuration.');
            process.exit(1);
        }

        console.log('Database connection successful.');
        await runner.runMigrations();
        console.log('Migrations completed successfully.');
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    } finally {
        await db.close();
    }
}

async function rollbackMigration() {
    const runner = new MigrationRunner();

    try {
        console.log('Rolling back last migration...');
        await runner.rollbackLastMigration();
        console.log('Rollback completed successfully.');
    } catch (error) {
        console.error('Rollback failed:', error);
        process.exit(1);
    } finally {
        await db.close();
    }
}

// Handle command line arguments
const command = process.argv[2];

switch (command) {
    case 'up':
        runMigrations();
        break;
    case 'down':
        rollbackMigration();
        break;
    default:
        console.log('Usage: npm run migrate [up|down]');
        console.log('  up   - Run pending migrations');
        console.log('  down - Rollback last migration');
        process.exit(1);
}