import request from 'supertest';
import { app } from '../../server';
import { testDb } from '../helpers/testDatabase';
import { createMockUser, createMockJob, mockLLMResponses } from '../helpers/testData';
import jwt from 'jsonwebtoken';
import path from 'path';
import fs from 'fs';

describe('End-to-End User Workflow', () => {
    let authToken: string;
    let userId: string;

    beforeEach(async () => {
        // Clean up test data
        await testDb.cleanup();
    });

    describe('Complete Job Application Workflow', () => {
        it('should complete full user journey from registration to job application', async () => {
            // Step 1: User Registration
            const registrationData = {
                email: 'jobseeker@example.com',
                password: 'SecurePassword123!',
                name: 'John Doe',
                location: 'San Francisco, CA'
            };

            const registerResponse = await request(app)
                .post('/api/auth/register')
                .send(registrationData)
                .expect(201);

            expect(registerResponse.body.success).toBe(true);
            expect(registerResponse.body.data.token).toBeDefined();
            expect(registerResponse.body.data.user.email).toBe('jobseeker@example.com');

            authToken = registerResponse.body.data.token;
            userId = registerResponse.body.data.user.id;

            // Step 2: Upload Resume and Parse with AI
            const mockPdfPath = path.join(__dirname, '../../fixtures/test-resume.pdf');
            const fixturesDir = path.dirname(mockPdfPath);
            if (!fs.existsSync(fixturesDir)) {
                fs.mkdirSync(fixturesDir, { recursive: true });
            }
            fs.writeFileSync(mockPdfPath, Buffer.from('Mock PDF resume content'));

            const resumeResponse = await request(app)
                .post('/api/profile/resume')
                .set('Authorization', `Bearer ${authToken}`)
                .attach('resume', mockPdfPath)
                .expect(200);

            expect(resumeResponse.body.success).toBe(true);
            expect(resumeResponse.body.data.parsedData).toBeDefined();

            // Step 3: Update Profile with Preferences
            const profileUpdate = {
                preferences: {
                    locations: ['San Francisco, CA', 'Remote'],
                    experienceLevels: ['mid', 'senior'],
                    keywords: ['frontend', 'react', 'javascript'],
                    remoteWork: true
                }
            };

            await request(app)
                .put('/api/profile')
                .set('Authorization', `Bearer ${authToken}`)
                .send(profileUpdate)
                .expect(200);

            // Step 4: Create Mock Jobs in Database
            const pool = testDb.getPool();
            const mockJobs = [
                {
                    id: 'job-frontend',
                    title: 'Frontend Developer',
                    company: 'TechCorp',
                    location: 'San Francisco, CA',
                    description: 'Looking for a skilled frontend developer',
                    requirements: ['JavaScript', 'React', '2+ years experience'],
                    experience_level: 'mid',
                    application_url: 'https://techcorp.com/jobs/frontend',
                    is_available: true
                },
                {
                    id: 'job-fullstack',
                    title: 'Full Stack Engineer',
                    company: 'StartupXYZ',
                    location: 'Remote',
                    description: 'Full stack engineer for growing startup',
                    requirements: ['JavaScript', 'Node.js', 'React', '3+ years experience'],
                    experience_level: 'mid',
                    application_url: 'https://startupxyz.com/jobs/fullstack',
                    is_available: true
                },
                {
                    id: 'job-senior',
                    title: 'Senior Software Engineer',
                    company: 'BigTech',
                    location: 'Seattle, WA',
                    description: 'Senior role at established tech company',
                    requirements: ['JavaScript', 'TypeScript', '5+ years experience'],
                    experience_level: 'senior',
                    application_url: 'https://bigtech.com/jobs/senior',
                    is_available: true
                }
            ];

            for (const jobData of mockJobs) {
                await pool.query(
                    'INSERT INTO jobs (id, title, company, location, description, requirements, experience_level, application_url, is_available) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
                    [
                        jobData.id,
                        jobData.title,
                        jobData.company,
                        jobData.location,
                        jobData.description,
                        jobData.requirements,
                        jobData.experience_level,
                        jobData.application_url,
                        jobData.is_available
                    ]
                );
            }

            // Step 5: Get Job Recommendations
            const jobsResponse = await request(app)
                .get('/api/jobs/matching')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(jobsResponse.body.success).toBe(true);
            expect(jobsResponse.body.data.length).toBeGreaterThan(0);

            // Step 6: Apply to a Job
            const targetJobId = 'job-frontend';
            const applicationResponse = await request(app)
                .post(`/api/jobs/${targetJobId}/apply`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    coverLetter: 'I am very interested in this position...',
                    notes: 'Applied through automated system'
                })
                .expect(201);

            expect(applicationResponse.body.success).toBe(true);
            expect(applicationResponse.body.data.status).toBe('applied');

            const applicationId = applicationResponse.body.data.id;

            // Step 7: Check Application Status
            const applicationsResponse = await request(app)
                .get('/api/applications')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(applicationsResponse.body.success).toBe(true);
            expect(applicationsResponse.body.data).toHaveLength(1);
            expect(applicationsResponse.body.data[0].status).toBe('applied');

            // Step 8: Update Application Status (simulate interview invitation)
            await request(app)
                .put(`/api/applications/${applicationId}/status`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    status: 'interview',
                    notes: 'Phone interview scheduled for next week',
                    interviewDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
                })
                .expect(200);

            // Step 9: View Pipeline (drag-and-drop interface data)
            const pipelineResponse = await request(app)
                .get('/api/pipeline')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(pipelineResponse.body.success).toBe(true);
            expect(pipelineResponse.body.data.interview).toHaveLength(1);

            // Step 10: Get Dashboard Summary
            const dashboardResponse = await request(app)
                .get('/api/dashboard/stats')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(dashboardResponse.body.success).toBe(true);
            expect(dashboardResponse.body.data.totalApplications).toBe(1);
            expect(dashboardResponse.body.data.interviewsScheduled).toBe(1);

            // Cleanup
            if (fs.existsSync(mockPdfPath)) {
                fs.unlinkSync(mockPdfPath);
            }
        });

        it('should handle job application workflow with errors gracefully', async () => {
            // Register user
            const registrationData = {
                email: 'errortest@example.com',
                password: 'SecurePassword123!',
                name: 'Error Test User',
                location: 'Test City'
            };

            const registerResponse = await request(app)
                .post('/api/auth/register')
                .send(registrationData)
                .expect(201);

            const token = registerResponse.body.data.token;

            // Try to apply to non-existent job
            await request(app)
                .post('/api/jobs/non-existent-job-id/apply')
                .set('Authorization', `Bearer ${token}`)
                .send({ coverLetter: 'Test cover letter' })
                .expect(404);

            // Try to update non-existent application
            await request(app)
                .put('/api/applications/non-existent-app-id/status')
                .set('Authorization', `Bearer ${token}`)
                .send({ status: 'interview' })
                .expect(404);

            // Try to access resources without authentication
            await request(app)
                .get('/api/applications')
                .expect(401);

            // Create a test job and application for status transition test
            const pool = testDb.getPool();
            const jobId = 'test-job-error';
            await pool.query(
                'INSERT INTO jobs (id, title, company, location, description, requirements, experience_level, application_url, is_available) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
                [
                    jobId,
                    'Test Job',
                    'Test Company',
                    'Test Location',
                    'Test description',
                    ['Test skill'],
                    'mid',
                    'https://test.com',
                    true
                ]
            );

            const applicationResponse = await request(app)
                .post(`/api/jobs/${jobId}/apply`)
                .set('Authorization', `Bearer ${token}`)
                .send({ coverLetter: 'Test' })
                .expect(201);

            // Try invalid status transition (applied -> offered, skipping interview)
            await request(app)
                .put(`/api/applications/${applicationResponse.body.data.id}/status`)
                .set('Authorization', `Bearer ${token}`)
                .send({ status: 'offered' })
                .expect(400);
        });
    });

    describe('Resume Upload and AI Processing Workflow', () => {
        it('should handle resume upload and parsing workflow', async () => {
            // Register user
            const registrationData = {
                email: 'resume@example.com',
                password: 'SecurePassword123!',
                name: 'Resume Test User',
                location: 'Test City'
            };

            const registerResponse = await request(app)
                .post('/api/auth/register')
                .send(registrationData)
                .expect(201);

            const token = registerResponse.body.data.token;

            // Create a mock PDF file
            const mockPdfPath = path.join(__dirname, '../../fixtures/test-resume-2.pdf');
            const fixturesDir = path.dirname(mockPdfPath);
            if (!fs.existsSync(fixturesDir)) {
                fs.mkdirSync(fixturesDir, { recursive: true });
            }
            fs.writeFileSync(mockPdfPath, Buffer.from('%PDF-1.4 Mock PDF content'));

            // Upload resume
            const uploadResponse = await request(app)
                .post('/api/profile/resume')
                .set('Authorization', `Bearer ${token}`)
                .attach('resume', mockPdfPath)
                .expect(200);

            expect(uploadResponse.body.success).toBe(true);
            expect(uploadResponse.body.data.resumeId).toBeDefined();
            expect(uploadResponse.body.data.parsedData).toBeDefined();

            // Verify profile was updated with parsed data
            const profileResponse = await request(app)
                .get('/api/profile')
                .set('Authorization', `Bearer ${token}`)
                .expect(200);

            expect(profileResponse.body.success).toBe(true);
            expect(profileResponse.body.data.resumeId).toBeTruthy();

            // Cleanup
            if (fs.existsSync(mockPdfPath)) {
                fs.unlinkSync(mockPdfPath);
            }
        });
    });
});