import { BaseRepository } from './base';
import { UserProfile, UserProfileRow, UserUpdate } from '../../types/database';

export class UserProfileRepository extends BaseRepository<UserProfile, UserProfileRow> {
    constructor() {
        super('user_profiles');
    }

    protected mapRowToEntity(row: UserProfileRow): UserProfile {
        return {
            id: row.id,
            userId: row.user_id,
            name: row.name,
            age: row.age,
            location: row.location,
            resumeId: row.resume_id,
            skills: row.skills,
            experienceLevel: row.experience_level,
            preferences: row.preferences,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        };
    }

    protected mapEntityToRow(entity: Partial<UserProfile>): Partial<UserProfileRow> {
        const row: Partial<UserProfileRow> = {};

        if (entity.userId !== undefined) row.user_id = entity.userId;
        if (entity.name !== undefined) row.name = entity.name;
        if (entity.age !== undefined) row.age = entity.age;
        if (entity.location !== undefined) row.location = entity.location;
        if (entity.resumeId !== undefined) row.resume_id = entity.resumeId;
        if (entity.skills !== undefined) row.skills = entity.skills;
        if (entity.experienceLevel !== undefined) row.experience_level = entity.experienceLevel;
        if (entity.preferences !== undefined) row.preferences = entity.preferences;

        return row;
    }

    public async findByUserId(userId: string): Promise<UserProfile | null> {
        const result = await this.query<UserProfileRow>(
            'SELECT * FROM user_profiles WHERE user_id = $1',
            [userId]
        );

        if (result.rows.length === 0) {
            return null;
        }

        return this.mapRowToEntity(result.rows[0]);
    }

    public async createProfile(profileData: Omit<UserProfile, 'id' | 'createdAt' | 'updatedAt'>): Promise<UserProfile> {
        const row = this.mapEntityToRow(profileData);
        const result = await this.query<UserProfileRow>(
            `INSERT INTO user_profiles (user_id, name, age, location, resume_id, skills, experience_level, preferences) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
            [
                row.user_id,
                row.name,
                row.age,
                row.location,
                row.resume_id,
                row.skills,
                row.experience_level,
                row.preferences
            ]
        );

        return this.mapRowToEntity(result.rows[0]);
    }

    public async updateProfile(userId: string, updates: UserUpdate): Promise<UserProfile | null> {
        const row = this.mapEntityToRow(updates);
        const columns = Object.keys(row);

        if (columns.length === 0) {
            return this.findByUserId(userId);
        }

        const setClause = columns.map((col, index) => `${col} = $${index + 2}`).join(', ');
        const values = [userId, ...Object.values(row)];

        const result = await this.query<UserProfileRow>(
            `UPDATE user_profiles SET ${setClause} WHERE user_id = $1 RETURNING *`,
            values
        );

        if (result.rows.length === 0) {
            return null;
        }

        return this.mapRowToEntity(result.rows[0]);
    }

    public async deleteByUserId(userId: string): Promise<boolean> {
        const result = await this.query(
            'DELETE FROM user_profiles WHERE user_id = $1',
            [userId]
        );

        return result.rowCount !== null && result.rowCount > 0;
    }

    public async profileExists(userId: string): Promise<boolean> {
        const result = await this.query(
            'SELECT 1 FROM user_profiles WHERE user_id = $1',
            [userId]
        );

        return result.rows.length > 0;
    }
}