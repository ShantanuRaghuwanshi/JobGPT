// Test setup file for backend
import dotenv from 'dotenv';
import { testDb } from './helpers/testDatabase';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Set test environment
process.env.NODE_ENV = 'test';

// Mock console methods in tests to reduce noise
global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
};

// Global test setup
beforeAll(async () => {
    await testDb.setup();
});

afterEach(async () => {
    await testDb.cleanup();
});

afterAll(async () => {
    await testDb.teardown();
});

// Mock external services
jest.mock('puppeteer', () => ({
    launch: jest.fn().mockResolvedValue({
        newPage: jest.fn().mockResolvedValue({
            goto: jest.fn(),
            evaluate: jest.fn(),
            close: jest.fn(),
        }),
        close: jest.fn(),
    }),
}));

jest.mock('openai', () => ({
    OpenAI: jest.fn().mockImplementation(() => ({
        chat: {
            completions: {
                create: jest.fn(),
            },
        },
    })),
}));

jest.mock('@anthropic-ai/sdk', () => ({
    Anthropic: jest.fn().mockImplementation(() => ({
        messages: {
            create: jest.fn(),
        },
    })),
}));

jest.mock('@google/generative-ai', () => ({
    GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
        getGenerativeModel: jest.fn().mockReturnValue({
            generateContent: jest.fn(),
        }),
    })),
}));