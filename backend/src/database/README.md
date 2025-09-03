# Database Setup and Usage

This directory contains all database-related code for the Job Application Automation Platform.

## Structure

```
database/
├── connection.ts           # Database connection utilities
├── migrations/
│   ├── runner.ts          # Migration runner
│   └── sql/               # SQL migration files
│       └── 001_initial_schema.sql
├── repositories/          # Repository pattern implementations
│   ├── base.ts           # Base repository class
│   ├── user.ts           # User repository
│   ├── userProfile.ts    # User profile repository
│   ├── job.ts            # Job repository
│   ├── application.ts    # Application repository
│   └── __tests__/        # Repository tests
└── index.ts              # Main database exports
```

## Setup

### 1. Database Configuration

Make sure your `.env` file contains the following database configuration:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=job_automation
DB_USER=your_username
DB_PASSWORD=your_password
```

### 2. Create Database

Create a PostgreSQL database named `job_automation` (or whatever you specified in `DB_NAME`):

```sql
CREATE DATABASE job_automation;
```

### 3. Run Migrations

Run the database migrations to create all tables:

```bash
npm run migrate
```

### 4. Test Connection

Test your database connection:

```bash
npm run db:test
```

### 5. Seed Data (Optional)

Add some test data to your database:

```bash
npm run seed
```

## Available Scripts

- `npm run migrate` - Run pending migrations
- `npm run migrate:down` - Rollback last migration
- `npm run db:test` - Test database connection
- `npm run seed` - Seed database with test data

## Database Schema

### Users Table
- `id` (UUID, Primary Key)
- `email` (VARCHAR, Unique)
- `password_hash` (VARCHAR)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

### User Profiles Table
- `id` (UUID, Primary Key)
- `user_id` (UUID, Foreign Key → users.id)
- `name` (VARCHAR)
- `age` (INTEGER, Optional)
- `location` (VARCHAR)
- `resume_id` (VARCHAR, Optional)
- `skills` (TEXT[])
- `experience_level` (VARCHAR: 'entry', 'mid', 'senior', 'lead')
- `preferences` (JSONB)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

### Jobs Table
- `id` (UUID, Primary Key)
- `title` (VARCHAR)
- `company` (VARCHAR)
- `location` (VARCHAR)
- `description` (TEXT)
- `requirements` (TEXT[])
- `experience_level` (VARCHAR: 'entry', 'mid', 'senior', 'lead')
- `application_url` (TEXT)
- `is_available` (BOOLEAN)
- `crawled_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

### Applications Table
- `id` (UUID, Primary Key)
- `user_id` (UUID, Foreign Key → users.id)
- `job_id` (UUID, Foreign Key → jobs.id)
- `status` (VARCHAR: 'applied', 'interview', 'offered', 'rejected')
- `applied_at` (TIMESTAMP)
- `cover_letter` (TEXT, Optional)
- `notes` (TEXT, Optional)
- `interview_date` (TIMESTAMP, Optional)

### Status Changes Table
- `id` (UUID, Primary Key)
- `application_id` (UUID, Foreign Key → applications.id)
- `from_status` (VARCHAR, Optional)
- `to_status` (VARCHAR)
- `changed_at` (TIMESTAMP)
- `notes` (TEXT, Optional)

## Repository Usage

### Basic CRUD Operations

```typescript
import { userRepository, jobRepository } from '../database';

// Create a user
const user = await userRepository.create({
  email: 'user@example.com',
  passwordHash: 'hashed_password'
});

// Find user by ID
const foundUser = await userRepository.findById(user.id);

// Find user by email
const userByEmail = await userRepository.findByEmail('user@example.com');

// Update user
const updatedUser = await userRepository.update(user.id, {
  email: 'newemail@example.com'
});

// Delete user
await userRepository.delete(user.id);
```

### Advanced Queries

```typescript
// Find jobs with filters
const jobs = await jobRepository.findWithFilters({
  keywords: 'React',
  location: 'San Francisco',
  experienceLevel: 'mid',
  isAvailable: true,
  limit: 10,
  offset: 0
});

// Get application statistics
const stats = await applicationRepository.getApplicationStats(userId);

// Update application status with history tracking
const updatedApp = await applicationRepository.updateStatus(
  applicationId, 
  'interview', 
  'Scheduled for next week'
);
```

## Testing

Run repository tests:

```bash
npm test -- --testPathPattern="database/repositories"
```

## Migration Management

### Creating New Migrations

1. Create a new SQL file in `src/database/migrations/sql/` with format: `XXX_description.sql`
2. Write your SQL DDL statements
3. Run `npm run migrate` to apply

### Rollback Migrations

```bash
npm run migrate:down
```

Note: The current rollback implementation is basic. For production, consider implementing proper rollback scripts.

## Connection Management

The database connection uses a singleton pattern with connection pooling. The connection is automatically managed and will be reused across requests.

### Connection Configuration

- **Pool Size**: Configurable via `DB_POOL_MAX` (default: 20)
- **Idle Timeout**: Configurable via `DB_IDLE_TIMEOUT` (default: 30000ms)
- **Connection Timeout**: Configurable via `DB_CONNECTION_TIMEOUT` (default: 2000ms)

### Transaction Support

```typescript
import db from '../database/connection';

const result = await db.transaction(async (client) => {
  // All queries within this callback will be part of the same transaction
  await client.query('INSERT INTO users ...');
  await client.query('INSERT INTO user_profiles ...');
  return someResult;
});
```

## Error Handling

All repository methods include proper error handling and will throw meaningful errors. Make sure to wrap repository calls in try-catch blocks in your application code.

## Performance Considerations

- All tables have appropriate indexes for common query patterns
- Use the filtering methods in repositories rather than fetching all data and filtering in application code
- Consider using pagination (limit/offset) for large result sets
- The connection pool is configured for optimal performance under load