import { Request, Response, NextFunction } from 'express';
import {
    errorHandler,
    notFoundHandler,
    ValidationError,
    AuthenticationError,
    NotFoundError,
    ExternalServiceError,
    DatabaseError
} from '../errorHandler';

// Mock logger
jest.mock('../../config/logger', () => ({
    logger: {
        error: jest.fn()
    }
}));

describe('Error Handler Middleware', () => {
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    let mockNext: NextFunction;

    beforeEach(() => {
        mockRequest = {
            url: '/test',
            method: 'GET',
            ip: '127.0.0.1',
            get: jest.fn().mockReturnValue('test-user-agent'),
            user: { id: 'test-user-id' }
        } as any;

        mockResponse = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };

        mockNext = jest.fn();
    });

    describe('errorHandler', () => {
        it('should handle ValidationError correctly', () => {
            const error = new ValidationError('Invalid input', 'email');

            errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Invalid input',
                    timestamp: expect.any(String),
                    details: expect.any(String)
                }
            });
        });

        it('should handle AuthenticationError correctly', () => {
            const error = new AuthenticationError('Invalid credentials');

            errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockResponse.status).toHaveBeenCalledWith(401);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: {
                    code: 'AUTHENTICATION_ERROR',
                    message: 'Invalid credentials',
                    timestamp: expect.any(String),
                    details: expect.any(String)
                }
            });
        });

        it('should handle NotFoundError correctly', () => {
            const error = new NotFoundError('Resource not found');

            errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockResponse.status).toHaveBeenCalledWith(404);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: {
                    code: 'NOT_FOUND',
                    message: 'Resource not found',
                    timestamp: expect.any(String),
                    details: expect.any(String)
                }
            });
        });

        it('should handle ExternalServiceError correctly', () => {
            const error = new ExternalServiceError('Service unavailable', 'OpenAI');

            errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockResponse.status).toHaveBeenCalledWith(502);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: {
                    code: 'EXTERNAL_SERVICE_ERROR',
                    message: 'Service unavailable',
                    timestamp: expect.any(String),
                    details: expect.any(String)
                }
            });
        });

        it('should handle DatabaseError correctly', () => {
            const error = new DatabaseError('Connection failed');

            errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockResponse.status).toHaveBeenCalledWith(500);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: {
                    code: 'DATABASE_ERROR',
                    message: 'Connection failed',
                    timestamp: expect.any(String),
                    details: expect.any(String)
                }
            });
        });

        it('should handle generic errors in production', () => {
            const originalEnv = process.env.NODE_ENV;
            process.env.NODE_ENV = 'production';

            const error = new Error('Internal error') as any;

            errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockResponse.status).toHaveBeenCalledWith(500);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: {
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Internal server error',
                    timestamp: expect.any(String)
                }
            });

            process.env.NODE_ENV = originalEnv;
        });

        it('should include error details in development', () => {
            const originalEnv = process.env.NODE_ENV;
            process.env.NODE_ENV = 'development';

            const error = new Error('Test error') as any;
            error.stack = 'Error stack trace';

            errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockResponse.json).toHaveBeenCalledWith({
                error: {
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Test error',
                    timestamp: expect.any(String),
                    details: 'Error stack trace'
                }
            });

            process.env.NODE_ENV = originalEnv;
        });
    });

    describe('notFoundHandler', () => {
        it('should create NotFoundError for unknown routes', () => {
            mockRequest.originalUrl = '/unknown-route';

            notFoundHandler(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalledWith(
                expect.objectContaining({
                    statusCode: 404,
                    code: 'NOT_FOUND',
                    message: 'Route /unknown-route not found'
                })
            );
        });
    });
});