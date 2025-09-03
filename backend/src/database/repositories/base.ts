import { PoolClient, QueryResult, QueryResultRow } from 'pg';
import db from '../connection';

export abstract class BaseRepository<T, TRow = T> {
    protected tableName: string;

    constructor(tableName: string) {
        this.tableName = tableName;
    }

    protected async query<R extends QueryResultRow = any>(text: string, params?: any[]): Promise<QueryResult<R>> {
        return await db.query<R>(text, params);
    }

    protected async transaction<R>(callback: (client: PoolClient) => Promise<R>): Promise<R> {
        return await db.transaction(callback);
    }

    protected abstract mapRowToEntity(row: TRow): T;
    protected abstract mapEntityToRow(entity: Partial<T>): Partial<TRow>;

    public async findById(id: string): Promise<T | null> {
        const result = await this.query<any>(
            `SELECT * FROM ${this.tableName} WHERE id = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return null;
        }

        return this.mapRowToEntity(result.rows[0]);
    }

    public async findAll(limit?: number, offset?: number): Promise<T[]> {
        let query = `SELECT * FROM ${this.tableName}`;
        const params: any[] = [];

        if (limit) {
            query += ` LIMIT $${params.length + 1}`;
            params.push(limit);
        }

        if (offset) {
            query += ` OFFSET $${params.length + 1}`;
            params.push(offset);
        }

        const result = await this.query<any>(query, params);
        return result.rows.map(row => this.mapRowToEntity(row));
    }

    public async create(entity: any): Promise<T> {
        const row = this.mapEntityToRow(entity);
        const columns = Object.keys(row).join(', ');
        const placeholders = Object.keys(row).map((_, index) => `$${index + 1}`).join(', ');
        const values = Object.values(row);

        const result = await this.query<any>(
            `INSERT INTO ${this.tableName} (${columns}) VALUES (${placeholders}) RETURNING *`,
            values
        );

        return this.mapRowToEntity(result.rows[0]);
    }

    public async update(id: string, updates: Partial<T>): Promise<T | null> {
        const row = this.mapEntityToRow(updates);
        const columns = Object.keys(row);

        if (columns.length === 0) {
            return this.findById(id);
        }

        const setClause = columns.map((col, index) => `${col} = $${index + 2}`).join(', ');
        const values = [id, ...Object.values(row)];

        const result = await this.query<any>(
            `UPDATE ${this.tableName} SET ${setClause} WHERE id = $1 RETURNING *`,
            values
        );

        if (result.rows.length === 0) {
            return null;
        }

        return this.mapRowToEntity(result.rows[0]);
    }

    public async delete(id: string): Promise<boolean> {
        const result = await this.query(
            `DELETE FROM ${this.tableName} WHERE id = $1`,
            [id]
        );

        return result.rowCount !== null && result.rowCount > 0;
    }

    public async exists(id: string): Promise<boolean> {
        const result = await this.query(
            `SELECT 1 FROM ${this.tableName} WHERE id = $1`,
            [id]
        );

        return result.rows.length > 0;
    }

    public async count(): Promise<number> {
        const result = await this.query<{ count: string }>(
            `SELECT COUNT(*) as count FROM ${this.tableName}`
        );

        return parseInt(result.rows[0].count);
    }
}