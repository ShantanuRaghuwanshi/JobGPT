import { UserRepository } from '../user';
import { User } from '../../../types/database';

// Mock the database connection
jest.mock('../../connection', () => ({
    query: jest.fn(),
    transaction: jest.fn(),
}));

describe('UserRepository', () => {
    let userRepository: UserRepository;
    let mockQuery: jest.Mock;

    beforeEach(() => {
        userRepository = new UserRepository();
        mockQuery = require('../../connection').query;
        mockQuery.mockClear();
    });

    describe('mapRowToEntity', () => {
        it('should correctly map database row to User entity', () => {
            const row = {
                id: '123e4567-e89b-12d3-a456-426614174000',
                email: 'test@example.com',
                password_hash: 'hashed_password',
                created_at: new Date('2023-01-01'),
                updated_at: new Date('2023-01-02'),
            };

            const user = userRepository['mapRowToEntity'](row);

            expect(user).toEqual({
                id: '123e4567-e89b-12d3-a456-426614174000',
                email: 'test@example.com',
                passwordHash: 'hashed_password',
                createdAt: new Date('2023-01-01'),
                updatedAt: new Date('2023-01-02'),
            });
        });
    });

    describe('mapEntityToRow', () => {
        it('should correctly map User entity to database row', () => {
            const user: Partial<User> = {
                email: 'test@example.com',
                passwordHash: 'hashed_password',
            };

            const row = userRepository['mapEntityToRow'](user);

            expect(row).toEqual({
                email: 'test@example.com',
                password_hash: 'hashed_password',
            });
        });
    });

    describe('findByEmail', () => {
        it('should return user when found', async () => {
            const mockRow = {
                id: '123e4567-e89b-12d3-a456-426614174000',
                email: 'test@example.com',
                password_hash: 'hashed_password',
                created_at: new Date('2023-01-01'),
                updated_at: new Date('2023-01-02'),
            };

            mockQuery.mockResolvedValue({ rows: [mockRow] });

            const result = await userRepository.findByEmail('test@example.com');

            expect(mockQuery).toHaveBeenCalledWith(
                'SELECT * FROM users WHERE email = $1',
                ['test@example.com']
            );
            expect(result).toEqual({
                id: '123e4567-e89b-12d3-a456-426614174000',
                email: 'test@example.com',
                passwordHash: 'hashed_password',
                createdAt: new Date('2023-01-01'),
                updatedAt: new Date('2023-01-02'),
            });
        });

        it('should return null when user not found', async () => {
            mockQuery.mockResolvedValue({ rows: [] });

            const result = await userRepository.findByEmail('nonexistent@example.com');

            expect(result).toBeNull();
        });
    });

    describe('emailExists', () => {
        it('should return true when email exists', async () => {
            mockQuery.mockResolvedValue({ rows: [{ exists: true }] });

            const result = await userRepository.emailExists('test@example.com');

            expect(mockQuery).toHaveBeenCalledWith(
                'SELECT 1 FROM users WHERE email = $1',
                ['test@example.com']
            );
            expect(result).toBe(true);
        });

        it('should return false when email does not exist', async () => {
            mockQuery.mockResolvedValue({ rows: [] });

            const result = await userRepository.emailExists('nonexistent@example.com');

            expect(result).toBe(false);
        });
    });
});