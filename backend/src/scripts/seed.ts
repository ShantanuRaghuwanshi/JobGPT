#!/usr/bin/env node

// Load environment variables FIRST before any other imports
import dotenv from 'dotenv';
dotenv.config();

import bcrypt from 'bcrypt';
import { userRepository, userProfileRepository, jobRepository } from '../database/repositories';
import db from '../database/connection';

async function seedDatabase() {
    try {
        console.log('Starting database seeding...');

        // Test database connection
        const isConnected = await db.testConnection();
        if (!isConnected) {
            console.error('Failed to connect to database');
            process.exit(1);
        }

        // Create a test user
        const hashedPassword = await bcrypt.hash('testpassword123', 10);
        const testUser = await userRepository.createUser({
            email: 'test@example.com',
            password: 'testpassword123',
            name: 'Test User',
            location: 'San Francisco, CA',
            passwordHash: hashedPassword
        });

        console.log('✅ Created test user:', testUser.email);

        // Create user profile
        const testProfile = await userProfileRepository.createProfile({
            userId: testUser.id,
            name: 'Test User',
            age: 28,
            location: 'San Francisco, CA',
            skills: ['JavaScript', 'TypeScript', 'React', 'Node.js'],
            experienceLevel: 'mid',
            preferences: {
                locations: ['San Francisco, CA', 'Remote'],
                experienceLevels: ['mid', 'senior'],
                keywords: ['JavaScript', 'React', 'Node.js'],
                remoteWork: true
            }
        });

        console.log('✅ Created user profile for:', testProfile.name);

        // Create some test jobs
        const testJobs = [
            {
                title: 'Senior Software Engineer',
                company: 'Tech Corp',
                location: 'San Francisco, CA',
                description: 'We are looking for a senior software engineer to join our team.',
                requirements: ['JavaScript', 'React', 'Node.js', '5+ years experience'],
                experienceLevel: 'senior' as const,
                applicationUrl: 'https://techcorp.com/careers/senior-engineer',
                isAvailable: true
            },
            {
                title: 'Frontend Developer',
                company: 'StartupXYZ',
                location: 'Remote',
                description: 'Join our remote team as a frontend developer.',
                requirements: ['React', 'TypeScript', 'CSS', '3+ years experience'],
                experienceLevel: 'mid' as const,
                applicationUrl: 'https://startupxyz.com/jobs/frontend-dev',
                isAvailable: true
            },
            {
                title: 'Full Stack Developer',
                company: 'Innovation Labs',
                location: 'New York, NY',
                description: 'Full stack developer position with competitive salary.',
                requirements: ['JavaScript', 'Python', 'React', 'Django'],
                experienceLevel: 'mid' as const,
                applicationUrl: 'https://innovationlabs.com/careers/fullstack',
                isAvailable: true
            }
        ];

        for (const jobData of testJobs) {
            const job = await jobRepository.createJob(jobData);
            console.log('✅ Created job:', job.title, 'at', job.company);
        }

        console.log('🎉 Database seeding completed successfully!');

    } catch (error) {
        console.error('❌ Seeding failed:', error);
        process.exit(1);
    } finally {
        await db.close();
    }
}

seedDatabase();