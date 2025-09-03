import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth';

// Extend Express Request interface to include user
declare global {
    namespace Express {
        interface Request {
            user?: {
                userId: string;
                email: string;
            };
        }
    }
}

export class AuthMiddleware {
    private authService: AuthService;

    constructor() {
        this.authService = new AuthService();
    }

    public authenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const authHeader = req.headers.authorization;

            if (!authHeader) {
                res.status(401).json({
                    error: {
                        code: 'MISSING_TOKEN',
                        message: 'Authorization header is required',
                        timestamp: new Date().toISOString(),
                    },
                });
                return;
            }

            const token = authHeader.startsWith('Bearer ')
                ? authHeader.slice(7)
                : authHeader;

            if (!token) {
                res.status(401).json({
                    error: {
                        code: 'INVALID_TOKEN_FORMAT',
                        message: 'Token must be provided in Authorization header',
                        timestamp: new Date().toISOString(),
                    },
                });
                return;
            }

            // Verify token
            const payload = this.authService.verifyToken(token);

            // Verify user still exists
            const user = await this.authService.getUserById(payload.userId);
            if (!user) {
                res.status(401).json({
                    error: {
                        code: 'USER_NOT_FOUND',
                        message: 'User associated with token no longer exists',
                        timestamp: new Date().toISOString(),
                    },
                });
                return;
            }

            // Add user info to request
            req.user = {
                userId: payload.userId,
                email: payload.email,
            };

            next();
        } catch (error) {
            res.status(401).json({
                error: {
                    code: 'INVALID_TOKEN',
                    message: 'Invalid or expired token',
                    timestamp: new Date().toISOString(),
                },
            });
        }
    };

    public optionalAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const authHeader = req.headers.authorization;

            if (!authHeader) {
                next();
                return;
            }

            const token = authHeader.startsWith('Bearer ')
                ? authHeader.slice(7)
                : authHeader;

            if (token) {
                const payload = this.authService.verifyToken(token);
                const user = await this.authService.getUserById(payload.userId);

                if (user) {
                    req.user = {
                        userId: payload.userId,
                        email: payload.email,
                    };
                }
            }

            next();
        } catch (error) {
            // For optional auth, we don't fail on invalid tokens
            next();
        }
    };
}

// Create and export middleware instances
const authMiddleware = new AuthMiddleware();
export const authenticateToken = authMiddleware.authenticate;
export const optionalAuth = authMiddleware.optionalAuth;