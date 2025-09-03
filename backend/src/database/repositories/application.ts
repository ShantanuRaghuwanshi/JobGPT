import { BaseRepository } from './base';
import { Application, ApplicationRow, ApplicationStatus, StatusChange, StatusChangeRow } from '../../types/database';

export class ApplicationRepository extends BaseRepository<Application, ApplicationRow> {
    constructor() {
        super('applications');
    }

    protected mapRowToEntity(row: ApplicationRow): Application {
        return {
            id: row.id,
            userId: row.user_id,
            jobId: row.job_id,
            status: row.status,
            appliedAt: row.applied_at,
            coverLetter: row.cover_letter,
            notes: row.notes,
            interviewDate: row.interview_date,
        };
    }

    protected mapEntityToRow(entity: Partial<Application>): Partial<ApplicationRow> {
        const row: Partial<ApplicationRow> = {};

        if (entity.userId !== undefined) row.user_id = entity.userId;
        if (entity.jobId !== undefined) row.job_id = entity.jobId;
        if (entity.status !== undefined) row.status = entity.status;
        if (entity.appliedAt !== undefined) row.applied_at = entity.appliedAt;
        if (entity.coverLetter !== undefined) row.cover_letter = entity.coverLetter;
        if (entity.notes !== undefined) row.notes = entity.notes;
        if (entity.interviewDate !== undefined) row.interview_date = entity.interviewDate;

        return row;
    }

    public async findByUserId(userId: string): Promise<Application[]> {
        const result = await this.query<ApplicationRow>(
            'SELECT * FROM applications WHERE user_id = $1 ORDER BY applied_at DESC',
            [userId]
        );

        return result.rows.map(row => this.mapRowToEntity(row));
    }

    public async findByUserIdAndStatus(userId: string, status: ApplicationStatus): Promise<Application[]> {
        const result = await this.query<ApplicationRow>(
            'SELECT * FROM applications WHERE user_id = $1 AND status = $2 ORDER BY applied_at DESC',
            [userId, status]
        );

        return result.rows.map(row => this.mapRowToEntity(row));
    }

    public async findByUserIdAndJobId(userId: string, jobId: string): Promise<Application | null> {
        const result = await this.query<ApplicationRow>(
            'SELECT * FROM applications WHERE user_id = $1 AND job_id = $2',
            [userId, jobId]
        );

        if (result.rows.length === 0) {
            return null;
        }

        return this.mapRowToEntity(result.rows[0]);
    }

    public async createApplication(applicationData: Omit<Application, 'id' | 'appliedAt'>): Promise<Application> {
        const row = this.mapEntityToRow(applicationData);
        const result = await this.query<ApplicationRow>(
            `INSERT INTO applications (user_id, job_id, status, cover_letter, notes, interview_date) 
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [
                row.user_id,
                row.job_id,
                row.status,
                row.cover_letter,
                row.notes,
                row.interview_date
            ]
        );

        return this.mapRowToEntity(result.rows[0]);
    }

    public async updateStatus(id: string, newStatus: ApplicationStatus, notes?: string): Promise<Application | null> {
        return await this.transaction(async (client) => {
            // Get current application
            const currentResult = await client.query<ApplicationRow>(
                'SELECT * FROM applications WHERE id = $1',
                [id]
            );

            if (currentResult.rows.length === 0) {
                return null;
            }

            const currentApp = this.mapRowToEntity(currentResult.rows[0]);

            // Update application status
            const updateResult = await client.query<ApplicationRow>(
                'UPDATE applications SET status = $1 WHERE id = $2 RETURNING *',
                [newStatus, id]
            );

            // Record status change
            await client.query(
                'INSERT INTO status_changes (application_id, from_status, to_status, notes) VALUES ($1, $2, $3, $4)',
                [id, currentApp.status, newStatus, notes]
            );

            return this.mapRowToEntity(updateResult.rows[0]);
        });
    }

    public async updateInterviewDate(id: string, interviewDate: Date): Promise<Application | null> {
        const result = await this.query<ApplicationRow>(
            'UPDATE applications SET interview_date = $1 WHERE id = $2 RETURNING *',
            [interviewDate, id]
        );

        if (result.rows.length === 0) {
            return null;
        }

        return this.mapRowToEntity(result.rows[0]);
    }

    public async addNotes(id: string, notes: string): Promise<Application | null> {
        const result = await this.query<ApplicationRow>(
            'UPDATE applications SET notes = $1 WHERE id = $2 RETURNING *',
            [notes, id]
        );

        if (result.rows.length === 0) {
            return null;
        }

        return this.mapRowToEntity(result.rows[0]);
    }

    public async getApplicationStats(userId: string): Promise<{
        total: number;
        applied: number;
        interview: number;
        offered: number;
        rejected: number;
    }> {
        const result = await this.query<{
            total: string;
            applied: string;
            interview: string;
            offered: string;
            rejected: string;
        }>(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'applied') as applied,
        COUNT(*) FILTER (WHERE status = 'interview') as interview,
        COUNT(*) FILTER (WHERE status = 'offered') as offered,
        COUNT(*) FILTER (WHERE status = 'rejected') as rejected
      FROM applications 
      WHERE user_id = $1
    `, [userId]);

        const row = result.rows[0];
        return {
            total: parseInt(row.total),
            applied: parseInt(row.applied),
            interview: parseInt(row.interview),
            offered: parseInt(row.offered),
            rejected: parseInt(row.rejected),
        };
    }

    public async getStatusHistory(applicationId: string): Promise<StatusChange[]> {
        const result = await this.query<StatusChangeRow>(
            'SELECT * FROM status_changes WHERE application_id = $1 ORDER BY changed_at ASC',
            [applicationId]
        );

        return result.rows.map(row => ({
            id: row.id,
            applicationId: row.application_id,
            fromStatus: row.from_status,
            toStatus: row.to_status,
            changedAt: row.changed_at,
            notes: row.notes,
        }));
    }

    public async applicationExists(userId: string, jobId: string): Promise<boolean> {
        const result = await this.query(
            'SELECT 1 FROM applications WHERE user_id = $1 AND job_id = $2',
            [userId, jobId]
        );

        return result.rows.length > 0;
    }
}