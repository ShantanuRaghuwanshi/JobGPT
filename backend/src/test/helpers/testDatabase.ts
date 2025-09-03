import { Pool } from 'pg';
import { DatabaseConnection } from '../../database/connection';

export class TestDatabase {
    private static instance: TestDatabase;
    private pool: Pool | null = null;

    private constructor() { }

    static getInstance(): TestDatabase {
        if (!TestDatabase.instance) {
            TestDatabase.instance = new TestDatabase();
        }
        return TestDatabase.instance;
    }

    async setup(): Promise<void> {
        // Create test database connection
        this.pool = new Pool({
            host: process.env.DB_HOST || 'localhost',
            port: parseInt(process.env.DB_PORT || '5432'),
            database: process.env.DB_NAME_TEST || 'job_automation_test',
            user: process.env.DB_USER || 'postgres',
            password: process.env.DB_PASSWORD || 'password',
        });

        // Run migrations for test database
        await this.runMigrations();
    }

    async cleanup(): Promise<void> {
        if (this.pool) {
            // Clean all tables
            await this.pool.query('TRUNCATE TABLE status_changes, applications, jobs, user_profiles, users CASCADE');
        }
    }

    async teardown(): Promise<void> {
        if (this.pool) {
            await this.pool.end();
            this.pool = null;
        }
    }

    getPool(): Pool {
        if (!this.pool) {
            throw new Error('Test database not initialized. Call setup() first.');
        }
        return this.pool;
    }

    private async runMigrations(): Promise<void> {
        if (!this.pool) return;

        // Create tables for testing
        await this.pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                email VARCHAR(255) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            );

            CREATE TABLE IF NOT EXISTS user_profiles (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID REFERENCES users(id) ON DELETE CASCADE,
                name VARCHAR(255) NOT NULL,
                age INTEGER,
                location VARCHAR(255),
                resume_id VARCHAR(255),
                skills TEXT[],
                experience_level VARCHAR(50),
                preferences JSONB,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            );

            CREATE TABLE IF NOT EXISTS jobs (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                title VARCHAR(255) NOT NULL,
                company VARCHAR(255) NOT NULL,
                location VARCHAR(255),
                description TEXT,
                requirements TEXT[],
                experience_level VARCHAR(50),
                application_url TEXT,
                is_available BOOLEAN DEFAULT true,
                crawled_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            );

            CREATE TABLE IF NOT EXISTS applications (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID REFERENCES users(id) ON DELETE CASCADE,
                job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
                status VARCHAR(50) NOT NULL,
                applied_at TIMESTAMP DEFAULT NOW(),
                cover_letter TEXT,
                notes TEXT,
                interview_date TIMESTAMP,
                UNIQUE(user_id, job_id)
            );

            CREATE TABLE IF NOT EXISTS status_changes (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
                from_status VARCHAR(50),
                to_status VARCHAR(50) NOT NULL,
                changed_at TIMESTAMP DEFAULT NOW(),
                notes TEXT
            );
        `);
    }
}

// Global test database instance
export const testDb = TestDatabase.getInstance();