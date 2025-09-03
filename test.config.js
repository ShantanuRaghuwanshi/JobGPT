// Test configuration for Job Application Automation Platform
module.exports = {
    // Test environments
    environments: {
        unit: {
            description: 'Unit tests - isolated component testing',
            timeout: 10000,
            parallel: true,
            coverage: true,
        },
        integration: {
            description: 'Integration tests - API and database testing',
            timeout: 30000,
            parallel: false,
            coverage: true,
            services: ['postgres', 'redis'],
        },
        e2e: {
            description: 'End-to-end tests - complete user workflows',
            timeout: 60000,
            parallel: false,
            coverage: false,
            services: ['postgres', 'redis', 'backend', 'frontend'],
        },
        performance: {
            description: 'Performance tests - load and stress testing',
            timeout: 120000,
            parallel: false,
            coverage: false,
            services: ['postgres', 'redis'],
        },
    },

    // Coverage thresholds
    coverage: {
        backend: {
            statements: 75,
            branches: 75,
            functions: 75,
            lines: 75,
        },
        frontend: {
            statements: 70,
            branches: 70,
            functions: 70,
            lines: 70,
        },
    },

    // Test data configuration
    testData: {
        users: {
            testUser1: {
                email: 'test1@example.com',
                password: 'TestPassword123!',
                name: 'Test User 1',
                location: 'San Francisco, CA',
            },
            testUser2: {
                email: 'test2@example.com',
                password: 'TestPassword123!',
                name: 'Test User 2',
                location: 'New York, NY',
            },
        },
        jobs: {
            frontendJob: {
                title: 'Frontend Developer',
                company: 'TechCorp',
                location: 'San Francisco, CA',
                experienceLevel: 'mid',
                requirements: ['JavaScript', 'React', 'TypeScript'],
            },
            backendJob: {
                title: 'Backend Engineer',
                company: 'DataFlow',
                location: 'Remote',
                experienceLevel: 'senior',
                requirements: ['Python', 'Django', 'PostgreSQL'],
            },
        },
    },

    // Mock configurations
    mocks: {
        llm: {
            enabled: true,
            responseDelay: 100, // ms
            failureRate: 0.05, // 5% failure rate for testing error handling
        },
        jobScraping: {
            enabled: true,
            jobsPerSite: 50,
            scrapingDelay: 200, // ms
        },
        email: {
            enabled: false, // Don't send real emails in tests
        },
    },

    // Database configuration for tests
    database: {
        test: {
            host: 'localhost',
            port: 5432,
            database: 'job_automation_test',
            username: 'postgres',
            password: 'password',
            logging: false,
            synchronize: true,
            dropSchema: true,
        },
    },

    // Redis configuration for tests
    redis: {
        test: {
            host: 'localhost',
            port: 6379,
            db: 1, // Use different DB for tests
        },
    },

    // Performance test thresholds
    performance: {
        jobCrawling: {
            maxTimePerJob: 1000, // ms
            maxMemoryUsage: 100 * 1024 * 1024, // 100MB
            concurrentJobs: 10,
        },
        aiProcessing: {
            resumeParsingTime: 5000, // ms
            coverLetterGenerationTime: 3000, // ms
            maxMemoryUsage: 50 * 1024 * 1024, // 50MB
        },
        api: {
            maxResponseTime: 2000, // ms
            maxConcurrentRequests: 100,
        },
    },

    // Reporting configuration
    reporting: {
        formats: ['json', 'html', 'lcov'],
        outputDir: './coverage',
        includeUncovered: true,
        reporters: {
            console: true,
            file: true,
            junit: true,
        },
    },

    // CI/CD specific settings
    ci: {
        maxRetries: 3,
        retryDelay: 1000, // ms
        failFast: true,
        collectArtifacts: true,
        artifactsDir: './test-artifacts',
    },
};