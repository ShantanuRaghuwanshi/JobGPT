import fs from 'fs';
import path from 'path';
import db from '../connection';

interface Migration {
    id: string;
    filename: string;
    sql: string;
}

class MigrationRunner {
    private migrationsPath: string;

    constructor() {
        this.migrationsPath = path.join(__dirname, 'sql');
    }

    private async createMigrationsTable(): Promise<void> {
        const createTableSQL = `
      CREATE TABLE IF NOT EXISTS migrations (
        id VARCHAR(255) PRIMARY KEY,
        filename VARCHAR(255) NOT NULL,
        executed_at TIMESTAMP DEFAULT NOW()
      );
    `;
        await db.query(createTableSQL);
    }

    private async getExecutedMigrations(): Promise<string[]> {
        const result = await db.query<{ id: string }>('SELECT id FROM migrations ORDER BY executed_at');
        return result.rows.map(row => row.id);
    }

    private loadMigrations(): Migration[] {
        const files = fs.readdirSync(this.migrationsPath)
            .filter(file => file.endsWith('.sql'))
            .sort();

        return files.map(filename => {
            const id = filename.replace('.sql', '');
            const sql = fs.readFileSync(path.join(this.migrationsPath, filename), 'utf8');
            return { id, filename, sql };
        });
    }

    public async runMigrations(): Promise<void> {
        console.log('Starting database migrations...');

        await this.createMigrationsTable();

        const executedMigrations = await this.getExecutedMigrations();
        const allMigrations = this.loadMigrations();

        const pendingMigrations = allMigrations.filter(
            migration => !executedMigrations.includes(migration.id)
        );

        if (pendingMigrations.length === 0) {
            console.log('No pending migrations.');
            return;
        }

        for (const migration of pendingMigrations) {
            console.log(`Running migration: ${migration.filename}`);

            await db.transaction(async (client) => {
                await client.query(migration.sql);
                await client.query(
                    'INSERT INTO migrations (id, filename) VALUES ($1, $2)',
                    [migration.id, migration.filename]
                );
            });

            console.log(`Completed migration: ${migration.filename}`);
        }

        console.log(`Successfully ran ${pendingMigrations.length} migrations.`);
    }

    public async rollbackLastMigration(): Promise<void> {
        const result = await db.query<{ id: string, filename: string }>(
            'SELECT id, filename FROM migrations ORDER BY executed_at DESC LIMIT 1'
        );

        if (result.rows.length === 0) {
            console.log('No migrations to rollback.');
            return;
        }

        const lastMigration = result.rows[0];
        console.log(`Rolling back migration: ${lastMigration.filename}`);

        // Note: This is a basic rollback - in production you'd want rollback scripts
        await db.query('DELETE FROM migrations WHERE id = $1', [lastMigration.id]);
        console.log(`Rolled back migration: ${lastMigration.filename}`);
    }
}

export default MigrationRunner;