import { Router, Request, Response } from 'express';
import { AuthService } from '../services/auth';
import { AuthMiddleware } from '../middleware/auth';
import { validateInput, registerSchema, loginSchema } from '../validation/auth';
import { UserRegistration, LoginCredentials } from '../types/database';
import { asyncHandler, AuthenticationError, ValidationError, NotFoundError } from '../middleware/errorHandler';

const router = Router();
const authService = new AuthService();
const authMiddleware = new AuthMiddleware();

// POST /api/auth/register
router.post('/register', validateInput(registerSchema), asyncHandler(async (req: Request, res: Response) => {
    const userData: UserRegistration = req.body;
    const result = await authService.register(userData);

    res.status(201).json({
        success: true,
        data: result,
        message: 'User registered successfully',
    });
}));

// POST /api/auth/login
router.post('/login', validateInput(loginSchema), asyncHandler(async (req: Request, res: Response) => {
    const credentials: LoginCredentials = req.body;
    const result = await authService.login(credentials);

    res.status(200).json({
        success: true,
        data: result,
        message: 'Login successful',
    });
}));

// POST /api/auth/verify
router.post('/verify', authMiddleware.authenticate, asyncHandler(async (req: Request, res: Response) => {
    // If middleware passes, token is valid
    res.status(200).json({
        success: true,
        data: {
            user: req.user,
            valid: true,
        },
        message: 'Token is valid',
    });
}));

// GET /api/auth/me
router.get('/me', authMiddleware.authenticate, asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
        throw new AuthenticationError('User not authenticated');
    }

    const user = await authService.getUserById(req.user.userId);
    if (!user) {
        throw new NotFoundError('User not found');
    }

    res.status(200).json({
        success: true,
        data: {
            id: user.id,
            email: user.email,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
        },
        message: 'User data retrieved successfully',
    });
}));

export default router;