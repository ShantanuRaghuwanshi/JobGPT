import { Request, Response, NextFunction } from 'express';
import { AuthMiddleware } from '../auth';
import { AuthService } from '../../services/auth';

// Mock the AuthService
jest.mock('../../services/auth');

const MockedAuthService = AuthService as jest.MockedClass<typeof AuthService>;

describe('AuthMiddleware', () => {
    let authMiddleware: AuthMiddleware;
    let mockAuthService: jest.Mocked<AuthService>;
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    let mockNext: NextFunction;

    beforeEach(() => {
        jest.clearAllMocks();

        authMiddleware = new AuthMiddleware();
        mockAuthService = MockedAuthService.prototype as jest.Mocked<AuthService>;

        mockRequest = {
            headers: {},
        };

        mockResponse = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
        };

        mockNext = jest.fn();
    });

    describe('authenticate', () => {
        it('should authenticate valid token and add user to request', async () => {
            const mockPayload = {
                userId: 'user-123',
                email: 'test@example.com',
            };

            const mockUser = {
                id: 'user-123',
                email: 'test@example.com',
                passwordHash: 'hashed-password',
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            mockRequest.headers = {
                authorization: 'Bearer valid-token',
            };

            mockAuthService.verifyToken.mockReturnValue(mockPayload);
            mockAuthService.getUserById.mockResolvedValue(mockUser);

            await authMiddleware.authenticate(
                mockRequest as Request,
                mockResponse as Response,
                mockNext
            );

            expect(mockAuthService.verifyToken).toHaveBeenCalledWith('valid-token');
            expect(mockAuthService.getUserById).toHaveBeenCalledWith('user-123');
            expect(mockRequest.user).toEqual({
                userId: 'user-123',
                email: 'test@example.com',
            });
            expect(mockNext).toHaveBeenCalled();
            expect(mockResponse.status).not.toHaveBeenCalled();
        });

        it('should return 401 if no authorization header', async () => {
            mockRequest.headers = {};

            await authMiddleware.authenticate(
                mockRequest as Request,
                mockResponse as Response,
                mockNext
            );

            expect(mockResponse.status).toHaveBeenCalledWith(401);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: {
                    code: 'MISSING_TOKEN',
                    message: 'Authorization header is required',
                    timestamp: expect.any(String),
                },
            });
            expect(mockNext).not.toHaveBeenCalled();
        });

        it('should return 401 if token format is invalid', async () => {
            mockRequest.headers = {
                authorization: 'Bearer ',
            };

            await authMiddleware.authenticate(
                mockRequest as Request,
                mockResponse as Response,
                mockNext
            );

            expect(mockResponse.status).toHaveBeenCalledWith(401);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: {
                    code: 'INVALID_TOKEN_FORMAT',
                    message: 'Token must be provided in Authorization header',
                    timestamp: expect.any(String),
                },
            });
            expect(mockNext).not.toHaveBeenCalled();
        });

        it('should return 401 if token is invalid', async () => {
            mockRequest.headers = {
                authorization: 'Bearer invalid-token',
            };

            mockAuthService.verifyToken.mockImplementation(() => {
                throw new Error('Invalid token');
            });

            await authMiddleware.authenticate(
                mockRequest as Request,
                mockResponse as Response,
                mockNext
            );

            expect(mockAuthService.verifyToken).toHaveBeenCalledWith('invalid-token');
            expect(mockResponse.status).toHaveBeenCalledWith(401);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: {
                    code: 'INVALID_TOKEN',
                    message: 'Invalid or expired token',
                    timestamp: expect.any(String),
                },
            });
            expect(mockNext).not.toHaveBeenCalled();
        });

        it('should return 401 if user no longer exists', async () => {
            const mockPayload = {
                userId: 'user-123',
                email: 'test@example.com',
            };

            mockRequest.headers = {
                authorization: 'Bearer valid-token',
            };

            mockAuthService.verifyToken.mockReturnValue(mockPayload);
            mockAuthService.getUserById.mockResolvedValue(null);

            await authMiddleware.authenticate(
                mockRequest as Request,
                mockResponse as Response,
                mockNext
            );

            expect(mockAuthService.verifyToken).toHaveBeenCalledWith('valid-token');
            expect(mockAuthService.getUserById).toHaveBeenCalledWith('user-123');
            expect(mockResponse.status).toHaveBeenCalledWith(401);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: {
                    code: 'USER_NOT_FOUND',
                    message: 'User associated with token no longer exists',
                    timestamp: expect.any(String),
                },
            });
            expect(mockNext).not.toHaveBeenCalled();
        });

        it('should handle token without Bearer prefix', async () => {
            const mockPayload = {
                userId: 'user-123',
                email: 'test@example.com',
            };

            const mockUser = {
                id: 'user-123',
                email: 'test@example.com',
                passwordHash: 'hashed-password',
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            mockRequest.headers = {
                authorization: 'valid-token',
            };

            mockAuthService.verifyToken.mockReturnValue(mockPayload);
            mockAuthService.getUserById.mockResolvedValue(mockUser);

            await authMiddleware.authenticate(
                mockRequest as Request,
                mockResponse as Response,
                mockNext
            );

            expect(mockAuthService.verifyToken).toHaveBeenCalledWith('valid-token');
            expect(mockNext).toHaveBeenCalled();
        });
    });

    describe('optionalAuth', () => {
        it('should add user to request if valid token provided', async () => {
            const mockPayload = {
                userId: 'user-123',
                email: 'test@example.com',
            };

            const mockUser = {
                id: 'user-123',
                email: 'test@example.com',
                passwordHash: 'hashed-password',
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            mockRequest.headers = {
                authorization: 'Bearer valid-token',
            };

            mockAuthService.verifyToken.mockReturnValue(mockPayload);
            mockAuthService.getUserById.mockResolvedValue(mockUser);

            await authMiddleware.optionalAuth(
                mockRequest as Request,
                mockResponse as Response,
                mockNext
            );

            expect(mockAuthService.verifyToken).toHaveBeenCalledWith('valid-token');
            expect(mockAuthService.getUserById).toHaveBeenCalledWith('user-123');
            expect(mockRequest.user).toEqual({
                userId: 'user-123',
                email: 'test@example.com',
            });
            expect(mockNext).toHaveBeenCalled();
        });

        it('should continue without user if no authorization header', async () => {
            mockRequest.headers = {};

            await authMiddleware.optionalAuth(
                mockRequest as Request,
                mockResponse as Response,
                mockNext
            );

            expect(mockAuthService.verifyToken).not.toHaveBeenCalled();
            expect(mockRequest.user).toBeUndefined();
            expect(mockNext).toHaveBeenCalled();
        });

        it('should continue without user if token is invalid', async () => {
            mockRequest.headers = {
                authorization: 'Bearer invalid-token',
            };

            mockAuthService.verifyToken.mockImplementation(() => {
                throw new Error('Invalid token');
            });

            await authMiddleware.optionalAuth(
                mockRequest as Request,
                mockResponse as Response,
                mockNext
            );

            expect(mockAuthService.verifyToken).toHaveBeenCalledWith('invalid-token');
            expect(mockRequest.user).toBeUndefined();
            expect(mockNext).toHaveBeenCalled();
        });

        it('should continue without user if user no longer exists', async () => {
            const mockPayload = {
                userId: 'user-123',
                email: 'test@example.com',
            };

            mockRequest.headers = {
                authorization: 'Bearer valid-token',
            };

            mockAuthService.verifyToken.mockReturnValue(mockPayload);
            mockAuthService.getUserById.mockResolvedValue(null);

            await authMiddleware.optionalAuth(
                mockRequest as Request,
                mockResponse as Response,
                mockNext
            );

            expect(mockAuthService.verifyToken).toHaveBeenCalledWith('valid-token');
            expect(mockAuthService.getUserById).toHaveBeenCalledWith('user-123');
            expect(mockRequest.user).toBeUndefined();
            expect(mockNext).toHaveBeenCalled();
        });
    });
});