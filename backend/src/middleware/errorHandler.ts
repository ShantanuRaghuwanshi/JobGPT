import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger';

export interface AppError extends Error {
    statusCode?: number;
    code?: string;
    isOperational?: boolean;
}

export class ValidationError extends Error {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
    isOperational = true;

    constructor(message: string, public field?: string) {
        super(message);
        this.name = 'ValidationError';
    }
}

export class AuthenticationError extends Error {
    statusCode = 401;
    code = 'AUTHENTICATION_ERROR';
    isOperational = true;

    constructor(message: string = 'Authentication failed') {
        super(message);
        this.name = 'AuthenticationError';
    }
}

export class AuthorizationError extends Error {
    statusCode = 403;
    code = 'AUTHORIZATION_ERROR';
    isOperational = true;

    constructor(message: string = 'Access denied') {
        super(message);
        this.name = 'AuthorizationError';
    }
}

export class NotFoundError extends Error {
    statusCode = 404;
    code = 'NOT_FOUND';
    isOperational = true;

    constructor(message: string = 'Resource not found') {
        super(message);
        this.name = 'NotFoundError';
    }
}

export class ExternalServiceError extends Error {
    statusCode = 502;
    code = 'EXTERNAL_SERVICE_ERROR';
    isOperational = true;

    constructor(message: string, public service?: string) {
        super(message);
        this.name = 'ExternalServiceError';
    }
}

export class DatabaseError extends Error {
    statusCode = 500;
    code = 'DATABASE_ERROR';
    isOperational = true;

    constructor(message: string) {
        super(message);
        this.name = 'DatabaseError';
    }
}

export const errorHandler = (
    error: AppError,
    req: Request,
    res: Response,
    next: NextFunction
): void => {
    const statusCode = error.statusCode || 500;
    const code = error.code || 'INTERNAL_SERVER_ERROR';

    // Log error details
    logger.error('Error occurred:', {
        error: error.message,
        stack: error.stack,
        statusCode,
        code,
        url: req.url,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        userId: (req as any).user?.id
    });

    // Don't expose internal errors in production
    const isProduction = process.env.NODE_ENV === 'production';
    const message = error.isOperational || !isProduction
        ? error.message
        : 'Internal server error';

    const errorResponse = {
        error: {
            code,
            message,
            timestamp: new Date().toISOString(),
            ...((!isProduction || error.isOperational) && {
                details: error.stack
            })
        }
    };

    res.status(statusCode).json(errorResponse);
};

export const asyncHandler = (fn: Function) => {
    return (req: Request, res: Response, next: NextFunction) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};

export const notFoundHandler = (req: Request, res: Response, next: NextFunction) => {
    const error = new NotFoundError(`Route ${req.originalUrl} not found`);
    next(error);
};