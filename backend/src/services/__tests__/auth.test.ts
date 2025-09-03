import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { AuthService } from '../auth';
import { UserRepository } from '../../database/repositories/user';
import { UserProfileRepository } from '../../database/repositories/userProfile';

// Mock the repositories
jest.mock('../../database/repositories/user');
jest.mock('../../database/repositories/userProfile');
jest.mock('bcrypt');
jest.mock('jsonwebtoken');

const MockedUserRepository = UserRepository as jest.MockedClass<typeof UserRepository>;
const MockedUserProfileRepository = UserProfileRepository as jest.MockedClass<typeof UserProfileRepository>;
const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;
const mockedJwt = jwt as jest.Mocked<typeof jwt>;

describe('AuthService', () => {
    let authService: AuthService;
    let mockUserRepository: jest.Mocked<UserRepository>;
    let mockUserProfileRepository: jest.Mocked<UserProfileRepository>;

    beforeEach(() => {
        jest.clearAllMocks();

        // Set up environment variable
        process.env.JWT_SECRET = 'test-secret-key';

        authService = new AuthService();
        mockUserRepository = MockedUserRepository.prototype as jest.Mocked<UserRepository>;
        mockUserProfileRepository = MockedUserProfileRepository.prototype as jest.Mocked<UserProfileRepository>;
    });

    afterEach(() => {
        delete process.env.JWT_SECRET;
    });

    describe('register', () => {
        const mockUserData = {
            email: 'test@example.com',
            password: 'TestPassword123!',
            name: 'Test User',
            location: 'Test City',
        };

        const mockUser = {
            id: 'user-123',
            email: 'test@example.com',
            passwordHash: 'hashed-password',
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        it('should successfully register a new user', async () => {
            // Mock repository methods
            mockUserRepository.findByEmail.mockResolvedValue(null);
            mockUserRepository.createUser.mockResolvedValue(mockUser);
            mockUserProfileRepository.create.mockResolvedValue({
                id: 'profile-123',
                userId: 'user-123',
                name: 'Test User',
                location: 'Test City',
                skills: [],
                experienceLevel: 'entry',
                preferences: {
                    locations: ['Test City'],
                    experienceLevels: ['entry', 'mid'],
                    keywords: [],
                    remoteWork: false,
                },
                createdAt: new Date(),
                updatedAt: new Date(),
            });

            // Mock bcrypt and jwt
            mockedBcrypt.hash.mockResolvedValue('hashed-password' as never);
            mockedJwt.sign.mockReturnValue('mock-jwt-token' as never);

            const result = await authService.register(mockUserData);

            expect(mockUserRepository.findByEmail).toHaveBeenCalledWith('test@example.com');
            expect(mockedBcrypt.hash).toHaveBeenCalledWith('TestPassword123!', 12);
            expect(mockUserRepository.createUser).toHaveBeenCalledWith({
                ...mockUserData,
                passwordHash: 'hashed-password',
            });
            expect(mockUserProfileRepository.create).toHaveBeenCalled();
            expect(mockedJwt.sign).toHaveBeenCalled();

            expect(result).toEqual({
                token: 'mock-jwt-token',
                user: {
                    id: 'user-123',
                    email: 'test@example.com',
                },
            });
        });

        it('should throw error if user already exists', async () => {
            mockUserRepository.findByEmail.mockResolvedValue(mockUser);

            await expect(authService.register(mockUserData)).rejects.toThrow(
                'User with this email already exists'
            );

            expect(mockUserRepository.findByEmail).toHaveBeenCalledWith('test@example.com');
            expect(mockUserRepository.createUser).not.toHaveBeenCalled();
        });
    });

    describe('login', () => {
        const mockCredentials = {
            email: 'test@example.com',
            password: 'TestPassword123!',
        };

        const mockUser = {
            id: 'user-123',
            email: 'test@example.com',
            passwordHash: 'hashed-password',
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        it('should successfully login with valid credentials', async () => {
            mockUserRepository.findByEmail.mockResolvedValue(mockUser);
            mockedBcrypt.compare.mockResolvedValue(true as never);
            mockedJwt.sign.mockReturnValue('mock-jwt-token' as never);

            const result = await authService.login(mockCredentials);

            expect(mockUserRepository.findByEmail).toHaveBeenCalledWith('test@example.com');
            expect(mockedBcrypt.compare).toHaveBeenCalledWith('TestPassword123!', 'hashed-password');
            expect(mockedJwt.sign).toHaveBeenCalled();

            expect(result).toEqual({
                token: 'mock-jwt-token',
                user: {
                    id: 'user-123',
                    email: 'test@example.com',
                },
            });
        });

        it('should throw error if user not found', async () => {
            mockUserRepository.findByEmail.mockResolvedValue(null);

            await expect(authService.login(mockCredentials)).rejects.toThrow(
                'Invalid email or password'
            );

            expect(mockUserRepository.findByEmail).toHaveBeenCalledWith('test@example.com');
            expect(mockedBcrypt.compare).not.toHaveBeenCalled();
        });

        it('should throw error if password is invalid', async () => {
            mockUserRepository.findByEmail.mockResolvedValue(mockUser);
            mockedBcrypt.compare.mockResolvedValue(false as never);

            await expect(authService.login(mockCredentials)).rejects.toThrow(
                'Invalid email or password'
            );

            expect(mockUserRepository.findByEmail).toHaveBeenCalledWith('test@example.com');
            expect(mockedBcrypt.compare).toHaveBeenCalledWith('TestPassword123!', 'hashed-password');
            expect(mockedJwt.sign).not.toHaveBeenCalled();
        });
    });

    describe('generateToken', () => {
        it('should generate a JWT token with correct payload', () => {
            const payload = {
                userId: 'user-123',
                email: 'test@example.com',
            };

            mockedJwt.sign.mockReturnValue('mock-jwt-token' as never);

            const token = authService.generateToken(payload);

            expect(mockedJwt.sign).toHaveBeenCalledWith(
                payload,
                'test-secret-key',
                {
                    expiresIn: '24h',
                    issuer: 'job-automation-platform',
                }
            );
            expect(token).toBe('mock-jwt-token');
        });
    });

    describe('verifyToken', () => {
        it('should verify a valid token', () => {
            const mockPayload = {
                userId: 'user-123',
                email: 'test@example.com',
            };

            mockedJwt.verify.mockReturnValue(mockPayload as never);

            const result = authService.verifyToken('valid-token');

            expect(mockedJwt.verify).toHaveBeenCalledWith('valid-token', 'test-secret-key');
            expect(result).toEqual(mockPayload);
        });

        it('should throw error for invalid token', () => {
            mockedJwt.verify.mockImplementation(() => {
                throw new Error('Invalid token');
            });

            expect(() => authService.verifyToken('invalid-token')).toThrow(
                'Invalid or expired token'
            );

            expect(mockedJwt.verify).toHaveBeenCalledWith('invalid-token', 'test-secret-key');
        });
    });

    describe('getUserById', () => {
        it('should return user if found', async () => {
            const mockUser = {
                id: 'user-123',
                email: 'test@example.com',
                passwordHash: 'hashed-password',
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            mockUserRepository.findById.mockResolvedValue(mockUser);

            const result = await authService.getUserById('user-123');

            expect(mockUserRepository.findById).toHaveBeenCalledWith('user-123');
            expect(result).toEqual(mockUser);
        });

        it('should return null if user not found', async () => {
            mockUserRepository.findById.mockResolvedValue(null);

            const result = await authService.getUserById('non-existent-user');

            expect(mockUserRepository.findById).toHaveBeenCalledWith('non-existent-user');
            expect(result).toBeNull();
        });
    });
});