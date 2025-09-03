import { BaseRepository } from './base';
import { User, UserRow, UserRegistration } from '../../types/database';

export class UserRepository extends BaseRepository<User, UserRow> {
    constructor() {
        super('users');
    }

    protected mapRowToEntity(row: UserRow): User {
        return {
            id: row.id,
            email: row.email,
            passwordHash: row.password_hash,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        };
    }

    protected mapEntityToRow(entity: Partial<User>): Partial<UserRow> {
        const row: Partial<UserRow> = {};

        if (entity.email !== undefined) row.email = entity.email;
        if (entity.passwordHash !== undefined) row.password_hash = entity.passwordHash;

        return row;
    }

    public async findByEmail(email: string): Promise<User | null> {
        const result = await this.query<UserRow>(
            'SELECT * FROM users WHERE email = $1',
            [email]
        );

        if (result.rows.length === 0) {
            return null;
        }

        return this.mapRowToEntity(result.rows[0]);
    }

    public async createUser(userData: UserRegistration & { passwordHash: string }): Promise<User> {
        const result = await this.query<UserRow>(
            'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING *',
            [userData.email, userData.passwordHash]
        );

        return this.mapRowToEntity(result.rows[0]);
    }

    public async updatePassword(id: string, passwordHash: string): Promise<boolean> {
        const result = await this.query(
            'UPDATE users SET password_hash = $1 WHERE id = $2',
            [passwordHash, id]
        );

        return result.rowCount !== null && result.rowCount > 0;
    }

    public async emailExists(email: string): Promise<boolean> {
        const result = await this.query(
            'SELECT 1 FROM users WHERE email = $1',
            [email]
        );

        return result.rows.length > 0;
    }
}