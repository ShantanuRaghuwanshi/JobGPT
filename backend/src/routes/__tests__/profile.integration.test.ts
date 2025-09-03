import request from 'supertest';
import { app } from '../../server';
import { testDb } from '../../test/helpers/testDatabase';
import { createMockUser, createMockProfile } from '../../test/helpers/testData';
import jwt from 'jsonwebtoken';
import path from 'path';
import fs from 'fs';

describe('Profile API Integration Tests', () => {
    let authToken: string;
    let userId: string;
    let testProfileId: string;

    beforeEach(async () => {
        // Create test user and get auth token
        const testUser = createMockUser();

        const pool = testDb.getPool();

        // Insert test user
        const userResult = await pool.query(
            'INSERT INTO users (id, email, password_hash) VALUES ($1, $2, $3) RETURNING *',
            [testUser.id, testUser.email, testUser.passwordHash]
        );
        userId = userResult.rows[0].id;

        // Generate auth token
        authToken = jwt.sign(
            { userId, email: testUser.email },
            process.env.JWT_SECRET || 'test-secret',
            { expiresIn: '1h' }
        );
    });

    describe('POST /api/profile', () => {
        it('should create user profile', async () => {
            const profileData = {
                name: 'John Doe',
                age: 28,
                location: 'San Francisco, CA',
                skills: ['JavaScript', 'React', 'Node.js'],
                experienceLevel: 'mid',
                preferences: {
                    locations: ['San Francisco, CA', 'Remote'],
                    experienceLevels: ['mid', 'senior'],
                    keywords: ['frontend', 'fullstack'],
                    remoteWork: true,
                },
            };

            const response = await request(app)
                .post('/api/profile')
                .set('Authorization', `Bearer ${authToken}`)
                .send(profileData)
                .expect(201);

            expect(response.body.success).toBe(true);
            expect(response.body.data.name).toBe(profileData.name);
            expect(response.body.data.userId).toBe(userId);
            expect(response.body.data.skills).toEqual(profileData.skills);

            // Verify profile was created in database
            const pool = testDb.getPool();
            const result = await pool.query(
                'SELECT * FROM user_profiles WHERE user_id = $1',
                [userId]
            );
            expect(result.rows).toHaveLength(1);
            expect(result.rows[0].name).toBe(profileData.name);
        });

        it('should validate required fields', async () => {
            const response = await request(app)
                .post('/api/profile')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    age: 28,
                    // Missing required name and location
                })
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.error.message).toContain('validation');
        });

        it('should prevent duplicate profiles', async () => {
            const profileData = {
                name: 'John Doe',
                location: 'San Francisco, CA',
                skills: ['JavaScript'],
                experienceLevel: 'mid',
            };

            // Create first profile
            await request(app)
                .post('/api/profile')
                .set('Authorization', `Bearer ${authToken}`)
                .send(profileData)
                .expect(201);

            // Try to create second profile
            await request(app)
                .post('/api/profile')
                .set('Authorization', `Bearer ${authToken}`)
                .send(profileData)
                .expect(409);
        });
    });

    describe('GET /api/profile', () => {
        beforeEach(async () => {
            // Create test profile
            const testProfile = createMockProfile({ userId });
            const pool = testDb.getPool();

            const result = await pool.query(
                'INSERT INTO user_profiles (id, user_id, name, location, skills, experience_level, preferences) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
                [
                    testProfile.id,
                    userId,
                    testProfile.name,
                    testProfile.location,
                    testProfile.skills,
                    testProfile.experienceLevel,
                    JSON.stringify(testProfile.preferences),
                ]
            );
            testProfileId = result.rows[0].id;
        });

        it('should return user profile', async () => {
            const response = await request(app)
                .get('/api/profile')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.id).toBe(testProfileId);
            expect(response.body.data.userId).toBe(userId);
            expect(response.body.data.name).toBe('John Doe');
        });

        it('should return 404 when profile does not exist', async () => {
            // Delete the profile
            const pool = testDb.getPool();
            await pool.query('DELETE FROM user_profiles WHERE user_id = $1', [userId]);

            await request(app)
                .get('/api/profile')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(404);
        });
    });

    describe('PUT /api/profile', () => {
        beforeEach(async () => {
            // Create test profile
            const testProfile = createMockProfile({ userId });
            const pool = testDb.getPool();

            const result = await pool.query(
                'INSERT INTO user_profiles (id, user_id, name, location, skills, experience_level, preferences) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
                [
                    testProfile.id,
                    userId,
                    testProfile.name,
                    testProfile.location,
                    testProfile.skills,
                    testProfile.experienceLevel,
                    JSON.stringify(testProfile.preferences),
                ]
            );
            testProfileId = result.rows[0].id;
        });

        it('should update user profile', async () => {
            const updateData = {
                name: 'Jane Smith',
                age: 30,
                location: 'New York, NY',
                skills: ['Python', 'Django', 'PostgreSQL'],
                experienceLevel: 'senior',
            };

            const response = await request(app)
                .put('/api/profile')
                .set('Authorization', `Bearer ${authToken}`)
                .send(updateData)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.name).toBe(updateData.name);
            expect(response.body.data.age).toBe(updateData.age);
            expect(response.body.data.skills).toEqual(updateData.skills);

            // Verify update in database
            const pool = testDb.getPool();
            const result = await pool.query(
                'SELECT * FROM user_profiles WHERE user_id = $1',
                [userId]
            );
            expect(result.rows[0].name).toBe(updateData.name);
            expect(result.rows[0].age).toBe(updateData.age);
        });

        it('should return 404 when profile does not exist', async () => {
            // Delete the profile
            const pool = testDb.getPool();
            await pool.query('DELETE FROM user_profiles WHERE user_id = $1', [userId]);

            await request(app)
                .put('/api/profile')
                .set('Authorization', `Bearer ${authToken}`)
                .send({ name: 'Updated Name' })
                .expect(404);
        });
    });

    describe('POST /api/profile/resume', () => {
        beforeEach(async () => {
            // Create test profile
            const testProfile = createMockProfile({ userId });
            const pool = testDb.getPool();

            await pool.query(
                'INSERT INTO user_profiles (id, user_id, name, location, skills, experience_level, preferences) VALUES ($1, $2, $3, $4, $5, $6, $7)',
                [
                    testProfile.id,
                    userId,
                    testProfile.name,
                    testProfile.location,
                    testProfile.skills,
                    testProfile.experienceLevel,
                    JSON.stringify(testProfile.preferences),
                ]
            );
        });

        it('should upload and parse resume', async () => {
            // Create a mock PDF file
            const mockPdfPath = path.join(__dirname, '../../../test/fixtures/mock-resume.pdf');
            const mockPdfContent = Buffer.from('Mock PDF content');

            // Ensure test fixtures directory exists
            const fixturesDir = path.dirname(mockPdfPath);
            if (!fs.existsSync(fixturesDir)) {
                fs.mkdirSync(fixturesDir, { recursive: true });
            }
            fs.writeFileSync(mockPdfPath, mockPdfContent);

            const response = await request(app)
                .post('/api/profile/resume')
                .set('Authorization', `Bearer ${authToken}`)
                .attach('resume', mockPdfPath)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.resumeId).toBeDefined();
            expect(response.body.data.parsedData).toBeDefined();

            // Cleanup
            if (fs.existsSync(mockPdfPath)) {
                fs.unlinkSync(mockPdfPath);
            }
        });

        it('should validate file type', async () => {
            // Create a mock text file
            const mockTextPath = path.join(__dirname, '../../../test/fixtures/mock-resume.txt');
            fs.writeFileSync(mockTextPath, 'This is not a PDF');

            await request(app)
                .post('/api/profile/resume')
                .set('Authorization', `Bearer ${authToken}`)
                .attach('resume', mockTextPath)
                .expect(400);

            // Cleanup
            if (fs.existsSync(mockTextPath)) {
                fs.unlinkSync(mockTextPath);
            }
        });

        it('should require file upload', async () => {
            await request(app)
                .post('/api/profile/resume')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(400);
        });
    });

    describe('Database Constraints and Relationships', () => {
        it('should cascade delete profile when user is deleted', async () => {
            // Create test profile
            const testProfile = createMockProfile({ userId });
            const pool = testDb.getPool();

            await pool.query(
                'INSERT INTO user_profiles (id, user_id, name, location, skills, experience_level, preferences) VALUES ($1, $2, $3, $4, $5, $6, $7)',
                [
                    testProfile.id,
                    userId,
                    testProfile.name,
                    testProfile.location,
                    testProfile.skills,
                    testProfile.experienceLevel,
                    JSON.stringify(testProfile.preferences),
                ]
            );

            // Verify profile exists
            let result = await pool.query('SELECT * FROM user_profiles WHERE user_id = $1', [userId]);
            expect(result.rows).toHaveLength(1);

            // Delete user
            await pool.query('DELETE FROM users WHERE id = $1', [userId]);

            // Verify profile was cascade deleted
            result = await pool.query('SELECT * FROM user_profiles WHERE user_id = $1', [userId]);
            expect(result.rows).toHaveLength(0);
        });

        it('should enforce unique constraint on user_id', async () => {
            const testProfile = createMockProfile({ userId });
            const pool = testDb.getPool();

            // Insert first profile
            await pool.query(
                'INSERT INTO user_profiles (id, user_id, name, location, skills, experience_level, preferences) VALUES ($1, $2, $3, $4, $5, $6, $7)',
                [
                    testProfile.id,
                    userId,
                    testProfile.name,
                    testProfile.location,
                    testProfile.skills,
                    testProfile.experienceLevel,
                    JSON.stringify(testProfile.preferences),
                ]
            );

            // Try to insert second profile for same user
            await expect(
                pool.query(
                    'INSERT INTO user_profiles (id, user_id, name, location, skills, experience_level, preferences) VALUES ($1, $2, $3, $4, $5, $6, $7)',
                    [
                        'profile-2',
                        userId,
                        'Another Name',
                        'Another Location',
                        ['Skill'],
                        'entry',
                        JSON.stringify({}),
                    ]
                )
            ).rejects.toThrow();
        });
    });
});