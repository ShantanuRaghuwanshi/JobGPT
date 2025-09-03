import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { UserRepository } from '../database/repositories/user';
import { UserProfileRepository } from '../database/repositories/userProfile';
import { User, UserRegistration, LoginCredentials } from '../types/database';
import { AuthenticationError, ValidationError, DatabaseError } from '../middleware/errorHandler';
import { logger } from '../config/logger';

export interface AuthTokenPayload {
    userId: string;
    email: string;
}



export interface AuthResponse {
    token: string;
    user: {
        id: string;
        email: string;
    };
}

export class AuthService {
    private userRepository: UserRepository;
    private userProfileRepository: UserProfileRepository;
    private jwtSecret: string;
    private saltRounds: number = 12;

    constructor() {
        this.userRepository = new UserRepository();
        this.userProfileRepository = new UserProfileRepository();
        this.jwtSecret = process.env.JWT_SECRET || 'fallback-secret-key';

        if (!process.env.JWT_SECRET) {
            console.warn('⚠️  JWT_SECRET not set in environment variables. Using fallback key.');
        }
    }

    public async register(userData: UserRegistration): Promise<AuthResponse> {
        try {
            // Check if user already exists
            const existingUser = await this.userRepository.findByEmail(userData.email);
            if (existingUser) {
                throw new ValidationError('User with this email already exists', 'email');
            }

            // Hash password
            const passwordHash = await bcrypt.hash(userData.password, this.saltRounds);

            // Create user
            const user = await this.userRepository.createUser({
                ...userData,
                passwordHash,
            });

            // Create user profile
            await this.userProfileRepository.create({
                userId: user.id,
                name: userData.name,
                location: userData.location,
                skills: [],
                experienceLevel: 'entry',
                preferences: {
                    locations: [userData.location],
                    experienceLevels: ['entry', 'mid'],
                    keywords: [],
                    remoteWork: false,
                },
            });

            // Generate JWT token
            const token = this.generateToken({
                userId: user.id,
                email: user.email,
            });

            logger.info('User registered successfully', { userId: user.id, email: user.email });

            return {
                token,
                user: {
                    id: user.id,
                    email: user.email,
                },
            };
        } catch (error) {
            if (error instanceof ValidationError) {
                throw error;
            }

            logger.error('Registration failed', { error: (error as Error).message, email: userData.email });
            throw new DatabaseError('Failed to create user account');
        }
    }

    public async login(credentials: LoginCredentials): Promise<AuthResponse> {
        try {
            // Find user by email
            const user = await this.userRepository.findByEmail(credentials.email);
            if (!user) {
                throw new AuthenticationError('Invalid email or password');
            }

            // Verify password
            const isPasswordValid = await bcrypt.compare(credentials.password, user.passwordHash);
            if (!isPasswordValid) {
                throw new AuthenticationError('Invalid email or password');
            }

            // Generate JWT token
            const token = this.generateToken({
                userId: user.id,
                email: user.email,
            });

            logger.info('User logged in successfully', { userId: user.id, email: user.email });

            return {
                token,
                user: {
                    id: user.id,
                    email: user.email,
                },
            };
        } catch (error) {
            if (error instanceof AuthenticationError) {
                throw error;
            }

            logger.error('Login failed', { error: (error as Error).message, email: credentials.email });
            throw new DatabaseError('Login failed due to system error');
        }
    }

    public generateToken(payload: AuthTokenPayload): string {
        return jwt.sign(payload, this.jwtSecret, {
            expiresIn: '24h',
            issuer: 'job-automation-platform',
        });
    }

    public verifyToken(token: string): AuthTokenPayload {
        try {
            const decoded = jwt.verify(token, this.jwtSecret) as AuthTokenPayload;
            return decoded;
        } catch (error) {
            if (error instanceof jwt.TokenExpiredError) {
                throw new AuthenticationError('Token has expired');
            } else if (error instanceof jwt.JsonWebTokenError) {
                throw new AuthenticationError('Invalid token');
            }
            throw new AuthenticationError('Token verification failed');
        }
    }

    public async getUserById(userId: string): Promise<User | null> {
        return await this.userRepository.findById(userId);
    }
}