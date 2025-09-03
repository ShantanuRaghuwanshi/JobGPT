import { JobQueueService } from '../jobQueue';
import Queue from 'bull';

// Mock Bull queue
jest.mock('bull');

describe('JobQueueService', () => {
    let service: JobQueueService;
    let mockCrawlQueue: jest.Mocked<Queue.Queue>;
    let mockValidateQueue: jest.Mocked<Queue.Queue>;

    beforeEach(() => {
        // Create mock queues
        mockCrawlQueue = {
            add: jest.fn(),
            process: jest.fn(),
            on: jest.fn(),
            close: jest.fn(),
        } as any;

        mockValidateQueue = {
            add: jest.fn(),
            process: jest.fn(),
            on: jest.fn(),
            close: jest.fn(),
        } as any;

        // Mock Queue constructor
        (Queue as jest.MockedClass<typeof Queue>).mockImplementation((name: string) => {
            if (name === 'job-crawl') return mockCrawlQueue;
            if (name === 'job-validate') return mockValidateQueue;
            throw new Error(`Unexpected queue name: ${name}`);
        });

        service = new JobQueueService();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('constructor', () => {
        it('should create crawl and validate queues', () => {
            expect(Queue).toHaveBeenCalledWith('job-crawl', expect.any(String));
            expect(Queue).toHaveBeenCalledWith('job-validate', expect.any(String));
        });

        it('should set up queue processors', () => {
            expect(mockCrawlQueue.process).toHaveBeenCalledWith(expect.any(Function));
            expect(mockValidateQueue.process).toHaveBeenCalledWith(expect.any(Function));
        });

        it('should set up error handlers', () => {
            expect(mockCrawlQueue.on).toHaveBeenCalledWith('error', expect.any(Function));
            expect(mockValidateQueue.on).toHaveBeenCalledWith('error', expect.any(Function));
        });
    });

    describe('addCrawlJob', () => {
        it('should add crawl job to queue', async () => {
            const jobData = { company: 'TechCorp', url: 'https://techcorp.com/careers' };
            mockCrawlQueue.add.mockResolvedValue({} as any);

            await service.addCrawlJob(jobData);

            expect(mockCrawlQueue.add).toHaveBeenCalledWith(jobData, {
                attempts: 3,
                backoff: 'exponential',
                delay: 5000,
            });
        });

        it('should handle queue add errors', async () => {
            const jobData = { company: 'TechCorp', url: 'https://techcorp.com/careers' };
            const error = new Error('Queue error');
            mockCrawlQueue.add.mockRejectedValue(error);

            await expect(service.addCrawlJob(jobData)).rejects.toThrow('Queue error');
        });
    });

    describe('addValidationJob', () => {
        it('should add validation job to queue', async () => {
            const jobData = { jobId: 'job-123' };
            mockValidateQueue.add.mockResolvedValue({} as any);

            await service.addValidationJob(jobData);

            expect(mockValidateQueue.add).toHaveBeenCalledWith(jobData, {
                attempts: 2,
                backoff: 'fixed',
                delay: 10000,
            });
        });

        it('should handle validation queue errors', async () => {
            const jobData = { jobId: 'job-123' };
            const error = new Error('Validation queue error');
            mockValidateQueue.add.mockRejectedValue(error);

            await expect(service.addValidationJob(jobData)).rejects.toThrow('Validation queue error');
        });
    });

    describe('scheduleRecurringCrawl', () => {
        it('should schedule recurring crawl jobs', async () => {
            mockCrawlQueue.add.mockResolvedValue({} as any);

            await service.scheduleRecurringCrawl();

            // Should add jobs for each company
            expect(mockCrawlQueue.add).toHaveBeenCalledTimes(4); // Based on company configs
            expect(mockCrawlQueue.add).toHaveBeenCalledWith(
                { company: 'Google', url: 'https://careers.google.com' },
                expect.objectContaining({
                    repeat: { cron: '0 */6 * * *' }, // Every 6 hours
                })
            );
        });
    });

    describe('close', () => {
        it('should close both queues', async () => {
            mockCrawlQueue.close.mockResolvedValue();
            mockValidateQueue.close.mockResolvedValue();

            await service.close();

            expect(mockCrawlQueue.close).toHaveBeenCalled();
            expect(mockValidateQueue.close).toHaveBeenCalled();
        });

        it('should handle close errors gracefully', async () => {
            const error = new Error('Close error');
            mockCrawlQueue.close.mockRejectedValue(error);
            mockValidateQueue.close.mockResolvedValue();

            // Should not throw, just log the error
            await expect(service.close()).resolves.toBeUndefined();
        });
    });
});