import { BaseRepository } from './base';
import { Job, JobRow, JobFilters, ExperienceLevel } from '../../types/database';

export class JobRepository extends BaseRepository<Job, JobRow> {
    constructor() {
        super('jobs');
    }

    protected mapRowToEntity(row: JobRow): Job {
        return {
            id: row.id,
            title: row.title,
            company: row.company,
            location: row.location,
            description: row.description,
            requirements: row.requirements,
            experienceLevel: row.experience_level,
            applicationUrl: row.application_url,
            isAvailable: row.is_available,
            crawledAt: row.crawled_at,
            updatedAt: row.updated_at,
        };
    }

    protected mapEntityToRow(entity: Partial<Job>): Partial<JobRow> {
        const row: Partial<JobRow> = {};

        if (entity.title !== undefined) row.title = entity.title;
        if (entity.company !== undefined) row.company = entity.company;
        if (entity.location !== undefined) row.location = entity.location;
        if (entity.description !== undefined) row.description = entity.description;
        if (entity.requirements !== undefined) row.requirements = entity.requirements;
        if (entity.experienceLevel !== undefined) row.experience_level = entity.experienceLevel;
        if (entity.applicationUrl !== undefined) row.application_url = entity.applicationUrl;
        if (entity.isAvailable !== undefined) row.is_available = entity.isAvailable;
        if (entity.crawledAt !== undefined) row.crawled_at = entity.crawledAt;

        return row;
    }

    public async findWithFilters(filters: JobFilters): Promise<Job[]> {
        let query = 'SELECT * FROM jobs WHERE 1=1';
        const params: any[] = [];
        let paramIndex = 1;

        if (filters.keywords) {
            query += ` AND (title ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`;
            params.push(`%${filters.keywords}%`);
            paramIndex++;
        }

        if (filters.location) {
            query += ` AND location ILIKE $${paramIndex}`;
            params.push(`%${filters.location}%`);
            paramIndex++;
        }

        if (filters.experienceLevel) {
            query += ` AND experience_level = $${paramIndex}`;
            params.push(filters.experienceLevel);
            paramIndex++;
        }

        if (filters.company) {
            query += ` AND company ILIKE $${paramIndex}`;
            params.push(`%${filters.company}%`);
            paramIndex++;
        }

        if (filters.isAvailable !== undefined) {
            query += ` AND is_available = $${paramIndex}`;
            params.push(filters.isAvailable);
            paramIndex++;
        }

        query += ' ORDER BY updated_at DESC';

        if (filters.limit) {
            query += ` LIMIT $${paramIndex}`;
            params.push(filters.limit);
            paramIndex++;
        }

        if (filters.offset !== undefined) {
            query += ` OFFSET $${paramIndex}`;
            params.push(filters.offset);
            paramIndex++;
        }

        const result = await this.query<JobRow>(query, params);
        return result.rows.map(row => this.mapRowToEntity(row));
    }

    public async findByCompany(company: string): Promise<Job[]> {
        const result = await this.query<JobRow>(
            'SELECT * FROM jobs WHERE company = $1 ORDER BY updated_at DESC',
            [company]
        );

        return result.rows.map(row => this.mapRowToEntity(row));
    }

    public async findByExperienceLevel(experienceLevel: ExperienceLevel): Promise<Job[]> {
        const result = await this.query<JobRow>(
            'SELECT * FROM jobs WHERE experience_level = $1 AND is_available = true ORDER BY updated_at DESC',
            [experienceLevel]
        );

        return result.rows.map(row => this.mapRowToEntity(row));
    }

    public async findAvailableJobs(limit?: number): Promise<Job[]> {
        let query = 'SELECT * FROM jobs WHERE is_available = true ORDER BY updated_at DESC';
        const params: any[] = [];

        if (limit) {
            query += ' LIMIT $1';
            params.push(limit);
        }

        const result = await this.query<JobRow>(query, params);
        return result.rows.map(row => this.mapRowToEntity(row));
    }

    public async markAsUnavailable(id: string): Promise<boolean> {
        const result = await this.query(
            'UPDATE jobs SET is_available = false WHERE id = $1',
            [id]
        );

        return result.rowCount !== null && result.rowCount > 0;
    }

    public async markAsAvailable(id: string): Promise<boolean> {
        const result = await this.query(
            'UPDATE jobs SET is_available = true WHERE id = $1',
            [id]
        );

        return result.rowCount !== null && result.rowCount > 0;
    }

    public async createJob(jobData: Omit<Job, 'id' | 'crawledAt' | 'updatedAt'>): Promise<Job> {
        const row = this.mapEntityToRow(jobData);
        const result = await this.query<JobRow>(
            `INSERT INTO jobs (title, company, location, description, requirements, experience_level, application_url, is_available) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
            [
                row.title,
                row.company,
                row.location,
                row.description,
                row.requirements,
                row.experience_level,
                row.application_url,
                row.is_available
            ]
        );

        return this.mapRowToEntity(result.rows[0]);
    }

    public async findDuplicateJob(title: string, company: string, applicationUrl: string): Promise<Job | null> {
        const result = await this.query<JobRow>(
            'SELECT * FROM jobs WHERE title = $1 AND company = $2 AND application_url = $3',
            [title, company, applicationUrl]
        );

        if (result.rows.length === 0) {
            return null;
        }

        return this.mapRowToEntity(result.rows[0]);
    }

    public async getJobStats(): Promise<{ total: number; available: number; companies: number }> {
        const result = await this.query<{
            total: string;
            available: string;
            companies: string;
        }>(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE is_available = true) as available,
        COUNT(DISTINCT company) as companies
      FROM jobs
    `);

        const row = result.rows[0];
        return {
            total: parseInt(row.total),
            available: parseInt(row.available),
            companies: parseInt(row.companies),
        };
    }

    public async findByFilters(
        filters: any,
        options: { limit?: number; offset?: number; orderBy?: any } = {}
    ): Promise<Job[]> {
        let query = 'SELECT * FROM jobs WHERE 1=1';
        const params: any[] = [];
        let paramIndex = 1;

        // Handle isAvailable filter
        if (filters.isAvailable !== undefined) {
            query += ` AND is_available = $${paramIndex}`;
            params.push(filters.isAvailable);
            paramIndex++;
        }

        // Handle title filter with fuzzy matching using pg_trgm similarity
        if (filters.title?.contains) {
            // Use trigram similarity for fuzzy matching
            query += ` AND (title ILIKE $${paramIndex} OR similarity(title, $${paramIndex + 1}) > 0.3)`;
            params.push(`%${filters.title.contains}%`);
            params.push(filters.title.contains);
            paramIndex += 2;
        }

        // Handle company filter with case-insensitive contains
        if (filters.company?.contains) {
            query += ` AND company ILIKE $${paramIndex}`;
            params.push(`%${filters.company.contains}%`);
            paramIndex++;
        }

        // Handle location filter with case-insensitive contains
        if (filters.location?.contains) {
            query += ` AND location ILIKE $${paramIndex}`;
            params.push(`%${filters.location.contains}%`);
            paramIndex++;
        }

        // Handle experience level filter
        if (filters.experienceLevel) {
            query += ` AND experience_level = $${paramIndex}`;
            params.push(filters.experienceLevel);
            paramIndex++;
        }

        // Handle requirements filter (contains any of the skills)
        if (filters.requirements?.containsAny && filters.requirements.containsAny.length > 0) {
            const skillConditions = filters.requirements.containsAny.map((skill: string) => {
                const condition = `$${paramIndex} = ANY(requirements)`;
                params.push(skill);
                paramIndex++;
                return condition;
            });
            query += ` AND (${skillConditions.join(' OR ')})`;
        }

        // Handle date filters
        if (filters.crawledAt?.gte) {
            query += ` AND crawled_at >= $${paramIndex}`;
            params.push(filters.crawledAt.gte);
            paramIndex++;
        }

        // Handle ordering with similarity scoring for title search
        if (filters.title?.contains) {
            query += ` ORDER BY similarity(title, $${paramIndex}) DESC, updated_at DESC`;
            params.push(filters.title.contains);
            paramIndex++;
        } else if (options.orderBy?.updatedAt) {
            query += ` ORDER BY updated_at ${options.orderBy.updatedAt.toUpperCase()}`;
        } else {
            query += ' ORDER BY updated_at DESC';
        }

        // Handle pagination
        if (options.limit) {
            query += ` LIMIT $${paramIndex}`;
            params.push(options.limit);
            paramIndex++;
        }

        if (options.offset !== undefined) {
            query += ` OFFSET $${paramIndex}`;
            params.push(options.offset);
            paramIndex++;
        }

        const result = await this.query<JobRow>(query, params);
        return result.rows.map(row => this.mapRowToEntity(row));
    }

    public async countByFilters(filters: any): Promise<number> {
        let query = 'SELECT COUNT(*) as count FROM jobs WHERE 1=1';
        const params: any[] = [];
        let paramIndex = 1;

        // Handle isAvailable filter
        if (filters.isAvailable !== undefined) {
            query += ` AND is_available = $${paramIndex}`;
            params.push(filters.isAvailable);
            paramIndex++;
        }

        // Handle title filter with fuzzy matching using pg_trgm similarity
        if (filters.title?.contains) {
            // Use trigram similarity for fuzzy matching
            query += ` AND (title ILIKE $${paramIndex} OR similarity(title, $${paramIndex + 1}) > 0.3)`;
            params.push(`%${filters.title.contains}%`);
            params.push(filters.title.contains);
            paramIndex += 2;
        }

        // Handle company filter with case-insensitive contains
        if (filters.company?.contains) {
            query += ` AND company ILIKE $${paramIndex}`;
            params.push(`%${filters.company.contains}%`);
            paramIndex++;
        }

        // Handle location filter with case-insensitive contains
        if (filters.location?.contains) {
            query += ` AND location ILIKE $${paramIndex}`;
            params.push(`%${filters.location.contains}%`);
            paramIndex++;
        }

        // Handle experience level filter
        if (filters.experienceLevel) {
            query += ` AND experience_level = $${paramIndex}`;
            params.push(filters.experienceLevel);
            paramIndex++;
        }

        // Handle requirements filter (contains any of the skills)
        if (filters.requirements?.containsAny && filters.requirements.containsAny.length > 0) {
            const skillConditions = filters.requirements.containsAny.map((skill: string) => {
                const condition = `$${paramIndex} = ANY(requirements)`;
                params.push(skill);
                paramIndex++;
                return condition;
            });
            query += ` AND (${skillConditions.join(' OR ')})`;
        }

        // Handle date filters
        if (filters.crawledAt?.gte) {
            query += ` AND crawled_at >= $${paramIndex}`;
            params.push(filters.crawledAt.gte);
            paramIndex++;
        }

        const result = await this.query<{ count: string }>(query, params);
        return parseInt(result.rows[0].count);
    }

    /**
     * Get available jobs that user hasn't applied to
     */
    public async getAvailableJobsNotAppliedTo(userId: string, appliedJobIds: string[], limit: number = 50): Promise<Job[]> {
        let query = `
            SELECT j.* FROM jobs j 
            WHERE j.is_available = true
        `;
        const params: any[] = [];
        let paramIndex = 1;

        if (appliedJobIds.length > 0) {
            query += ` AND j.id NOT IN (${appliedJobIds.map(() => `$${paramIndex++}`).join(', ')})`;
            params.push(...appliedJobIds);
        }

        query += ` ORDER BY j.updated_at DESC LIMIT $${paramIndex}`;
        params.push(limit);

        const result = await this.query<JobRow>(query, params);
        return result.rows.map(row => this.mapRowToEntity(row));
    }

    /**
     * Find jobs by array of IDs
     */
    public async findByIds(jobIds: string[]): Promise<Job[]> {
        if (jobIds.length === 0) {
            return [];
        }

        const placeholders = jobIds.map((_, index) => `$${index + 1}`).join(', ');
        const query = `SELECT * FROM jobs WHERE id IN (${placeholders})`;

        const result = await this.query<JobRow>(query, jobIds);
        return result.rows.map(row => this.mapRowToEntity(row));
    }
}