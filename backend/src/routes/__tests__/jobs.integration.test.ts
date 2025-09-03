import request from 'supertest';
import { app } from '../../server';
import { testDb } from '../../test/helpers/testDatabase';
import { createMockUser, createMockProfile, createMockJob } from '../../test/helpers/testData';
import jwt from 'jsonwebtoken';

describe('Jobs API Integration Tests', () => {
    let authToken: string;
    let userId: string;
    let testJobs: any[];

    beforeEach(async () => {
        // Create test user and get auth token
        const testUser = createMockUser();
        const testProfile = createMockProfile();

        const pool = testDb.getPool();

        // Insert test user
        const userResult = await pool.query(
            'INSERT INTO users (id, email, password_hash) VALUES ($1, $2, $3) RETURNING *',
            [testUser.id, testUser.email, testUser.passwordHash]
        );
        userId = userResult.rows[0].id;

        // Insert test profile
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

        // Generate auth token
        authToken = jwt.sign(
            { userId, email: testUser.email },
            process.env.JWT_SECRET || 'test-secret',
            { expiresIn: '1h' }
        );

        // Insert test jobs
        testJobs = [
            createMockJob({ id: 'job-1', title: 'Frontend Developer', experienceLevel: 'mid' }),
            createMockJob({ id: 'job-2', title: 'Backend Engineer', experienceLevel: 'senior' }),
            createMockJob({ id: 'job-3', title: 'Full Stack Developer', experienceLevel: 'entry', isAvailable: false }),
        ];

        for (const job of testJobs) {
            await pool.query(
                'INSERT INTO jobs (id, title, company, location, description, requirements, experience_level, application_url, is_available) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
                [
                    job.id,
                    job.title,
                    job.company,
                    job.location,
                    job.description,
                    job.requirements,
                    job.experienceLevel,
                    job.applicationUrl,
                    job.isAvailable,
                ]
            );
        }
    });

    describe('GET /api/jobs', () => {
        it('should return paginated job listings', async () => {
            const response = await request(app)
                .get('/api/jobs')
                .set('Authorization', `Bearer ${authToken}`)
                .query({ page: 1, limit: 10 })
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.jobs).toHaveLength(2); // Only available jobs
            expect(response.body.data.pagination).toEqual({
                page: 1,
                limit: 10,
                total: 2,
                totalPages: 1,
            });
        });

        it('should filter jobs by experience level', async () => {
            const response = await request(app)
                .get('/api/jobs')
                .set('Authorization', `Bearer ${authToken}`)
                .query({ experienceLevel: 'mid' })
                .expect(200);

            expect(response.body.data.jobs).toHaveLength(1);
            expect(response.body.data.jobs[0].title).toBe('Frontend Developer');
        });

        it('should filter jobs by location', async () => {
            const response = await request(app)
                .get('/api/jobs')
                .set('Authorization', `Bearer ${authToken}`)
                .query({ location: 'San Francisco' })
                .expect(200);

            expect(response.body.data.jobs.length).toBeGreaterThan(0);
            response.body.data.jobs.forEach((job: any) => {
                expect(job.location).toContain('San Francisco');
            });
        });

        it('should search jobs by keywords', async () => {
            const response = await request(app)
                .get('/api/jobs')
                .set('Authorization', `Bearer ${authToken}`)
                .query({ search: 'Frontend' })
                .expect(200);

            expect(response.body.data.jobs).toHaveLength(1);
            expect(response.body.data.jobs[0].title).toContain('Frontend');
        });

        it('should require authentication', async () => {
            await request(app)
                .get('/api/jobs')
                .expect(401);
        });
    });

    describe('GET /api/jobs/:id', () => {
        it('should return job details', async () => {
            const jobId = testJobs[0].id;

            const response = await request(app)
                .get(`/api/jobs/${jobId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.id).toBe(jobId);
            expect(response.body.data.title).toBe('Frontend Developer');
        });

        it('should return 404 for non-existent job', async () => {
            await request(app)
                .get('/api/jobs/non-existent-id')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(404);
        });
    });

    describe('POST /api/jobs/:id/apply', () => {
        it('should create job application', async () => {
            const jobId = testJobs[0].id;

            const response = await request(app)
                .post(`/api/jobs/${jobId}/apply`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    coverLetter: 'I am very interested in this position...',
                    notes: 'Applied through automation platform',
                })
                .expect(201);

            expect(response.body.success).toBe(true);
            expect(response.body.data.status).toBe('applied');
            expect(response.body.data.userId).toBe(userId);
            expect(response.body.data.jobId).toBe(jobId);

            // Verify application was created in database
            const pool = testDb.getPool();
            const result = await pool.query(
                'SELECT * FROM applications WHERE user_id = $1 AND job_id = $2',
                [userId, jobId]
            );
            expect(result.rows).toHaveLength(1);
        });

        it('should prevent duplicate applications', async () => {
            const jobId = testJobs[0].id;

            // Create first application
            await request(app)
                .post(`/api/jobs/${jobId}/apply`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({ coverLetter: 'First application' })
                .expect(201);

            // Try to apply again
            await request(app)
                .post(`/api/jobs/${jobId}/apply`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({ coverLetter: 'Second application' })
                .expect(409);
        });

        it('should return 404 for non-existent job', async () => {
            await request(app)
                .post('/api/jobs/non-existent-id/apply')
                .set('Authorization', `Bearer ${authToken}`)
                .send({ coverLetter: 'Test application' })
                .expect(404);
        });
    });

    describe('GET /api/jobs/matching', () => {
        it('should return jobs matching user profile', async () => {
            const response = await request(app)
                .get('/api/jobs/matching')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(Array.isArray(response.body.data)).toBe(true);

            // Should return jobs with matching experience level or skills
            response.body.data.forEach((job: any) => {
                expect(job.matchScore).toBeGreaterThan(0);
                expect(job.matchReasons).toBeDefined();
            });
        });

        it('should return empty array when no matches found', async () => {
            // Update user profile to have no matching criteria
            const pool = testDb.getPool();
            await pool.query(
                'UPDATE user_profiles SET skills = $1, experience_level = $2 WHERE user_id = $3',
                [['COBOL', 'Fortran'], 'lead', userId]
            );

            const response = await request(app)
                .get('/api/jobs/matching')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body.data).toHaveLength(0);
        });
    });

    describe('Database Transaction Handling', () => {
        it('should rollback transaction on application creation failure', async () => {
            const jobId = testJobs[0].id;

            // Mock database error by using invalid data
            const pool = testDb.getPool();

            // Temporarily break the applications table constraint
            await pool.query('ALTER TABLE applications DROP CONSTRAINT IF EXISTS applications_user_id_fkey');

            try {
                await request(app)
                    .post(`/api/jobs/${jobId}/apply`)
                    .set('Authorization', `Bearer ${authToken}`)
                    .send({ coverLetter: 'Test application' })
                    .expect(500);

                // Verify no partial data was inserted
                const result = await pool.query(
                    'SELECT * FROM applications WHERE user_id = $1 AND job_id = $2',
                    [userId, jobId]
                );
                expect(result.rows).toHaveLength(0);
            } finally {
                // Restore constraint
                await pool.query(
                    'ALTER TABLE applications ADD CONSTRAINT applications_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE'
                );
            }
        });
    });
});