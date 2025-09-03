import request from 'supertest';
import { Express } from 'express';
import { createTestApp } from '../../test/helpers/testApp';
import { UserRepository } from '../../database/repositories/user';
import { UserProfileRepository } from '../../database/repositories/userProfile';
import bcrypt from 'bcrypt';

describe('Auth Routes Integration', () => {
    let app: Express;
    let userRepository: UserRepository;
    let userProfileRepository: UserProfileRepository;

    beforeAll(async () => {
        app = await createTestApp();
        userRepository = new UserRepository();
        userProfileRepository = new UserProfileRepository();
    });

    beforeEach(async () => {
        // Clean up test data
        await userRepository.deleteAll();
        await userProfileRepository.deleteAll();
    });

    describe('POST /api/auth/register', () => {
        it('should register a new user successfully', async () => {
            const userData = {
                email: 'test@example.com',
                password: 'password123',
                name: 'Test User'
            };

            const response = await request(app)
                .post('/api/auth/register')
                .send(userData)
                .expect(201);

            expect(response.body).toMatchObject({
                token: expect.any(String),
                user: {
                    id: expect.any(String),
                    email: 'test@example.com'
                }
            });

            // Verify user was created in database
            const user = await userRepository.findByEmail('test@example.com');
            expect(user).toBeTruthy();
            expect(user?.email).toBe('test@example.com');

            // Verify profile was created
            const profile = await userProfileRepository.findByUserId(user!.id);
            expect(profile).toBeTruthy();
            expect(profile?.name).toBe('Test User');
        });

        it('should return 400 for invalid email', async () => {
            const userData = {
                email: 'invalid-email',
                password: 'password123',
                name: 'Test User'
            };

            const response = await request(app)
                .post('/api/auth/register')
                .send(userData)
                .expect(400);

            expect(response.body.error.code).toBe('VALIDATION_ERROR');
        });

        it('should return 400 for weak password', async () => {
            const userData = {
                email: 'test@example.com',
                password: '123',
                name: 'Test User'
            };

            const response = await request(app)
                .post('/api/auth/register')
                .send(userData)
                .expect(400);

            expect(response.body.error.code).toBe('VALIDATION_ERROR');
        });

        it('should return 409 for duplicate email', async () => {
            const userData = {
                email: 'test@example.com',
                password: 'password123',
                name: 'Test User'
            };

            // Register first user
            await request(app)
                .post('/api/auth/register')
                .send(userData)
                .expect(201);

            // Try to register with same email
            const response = await request(app)
                .post('/api/auth/register')
                .send(userData)
                .expect(409);

            expect(response.body.error.code).toBe('DUPLICATE_EMAIL');
        });
    });

    describe('POST /api/auth/login', () => {
        beforeEach(async () => {
            // Create test user
            const hashedPassword = await bcrypt.hash('password123', 10);
            const user = await userRepository.create({
                email: 'test@example.com',
                passwordHash: hashedPassword
            });

            await userProfileRepository.create({
                userId: user.id,
                name: 'Test User',
                location: 'San Francisco, CA',
                skills: ['JavaScript', 'TypeScript'],
                experienceLevel: 'mid',
                preferences: {}
            });
        });

        it('should login successfully with valid credentials', async () => {
            const loginData = {
                email: 'test@example.com',
                password: 'password123'
            };

            const response = await request(app)
                .post('/api/auth/login')
                .send(loginData)
                .expect(200);

            expect(response.body).toMatchObject({
                token: expect.any(String),
                user: {
                    id: expect.any(String),
                    email: 'test@example.com',
                    profile: {
                        name: 'Test User',
                        location: 'San Francisco, CA'
                    }
                }
            });
        });

        it('should return 401 for invalid email', async () => {
            const loginData = {
                email: 'nonexistent@example.com',
                password: 'password123'
            };

            const response = await request(app)
                .post('/api/auth/login')
                .send(loginData)
                .expect(401);

            expect(response.body.error.code).toBe('AUTHENTICATION_ERROR');
        });

        it('should return 401 for invalid password', async () => {
            const loginData = {
                email: 'test@example.com',
                password: 'wrongpassword'
            };

            const response = await request(app)
                .post('/api/auth/login')
                .send(loginData)
                .expect(401);

            expect(response.body.error.code).toBe('AUTHENTICATION_ERROR');
        });

        it('should return 400 for missing fields', async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .send({ email: 'test@example.com' })
                .expect(400);

            expect(response.body.error.code).toBe('VALIDATION_ERROR');
        });
    });

    describe('GET /api/auth/me', () => {
        let authToken: string;
        let userId: string;

        beforeEach(async () => {
            // Create and login user to get token
            const hashedPassword = await bcrypt.hash('password123', 10);
            const user = await userRepository.create({
                email: 'test@example.com',
                passwordHash: hashedPassword
            });
            userId = user.id;

            await userProfileRepository.create({
                userId: user.id,
                name: 'Test User',
                location: 'San Francisco, CA',
                skills: ['JavaScript', 'TypeScript'],
                experienceLevel: 'mid',
                preferences: {}
            });

            const loginResponse = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'test@example.com',
                    password: 'password123'
                });

            authToken = loginResponse.body.token;
        });

        it('should return user profile with valid token', async () => {
            const response = await request(app)
                .get('/api/auth/me')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body).toMatchObject({
                id: userId,
                email: 'test@example.com',
                profile: {
                    name: 'Test User',
                    location: 'San Francisco, CA',
                    skills: ['JavaScript', 'TypeScript']
                }
            });
        });

        it('should return 401 without token', async () => {
            const response = await request(app)
                .get('/api/auth/me')
                .expect(401);

            expect(response.body.error.code).toBe('AUTHENTICATION_ERROR');
        });

        it('should return 401 with invalid token', async () => {
            const response = await request(app)
                .get('/api/auth/me')
                .set('Authorization', 'Bearer invalid-token')
                .expect(401);

            expect(response.body.error.code).toBe('AUTHENTICATION_ERROR');
        });
    });
});