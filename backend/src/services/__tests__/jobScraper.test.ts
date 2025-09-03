import { JobScraperService } from '../jobScraper';
import { JobRepository } from '../../database/repositories/job';
import { mockJobScrapingData, createMockJob } from '../../test/helpers/testData';
import puppeteer from 'puppeteer';

jest.mock('../../database/repositories/job');
jest.mock('puppeteer');

const MockedJobRepository = JobRepository as jest.MockedClass<typeof JobRepository>;
const mockedPuppeteer = puppeteer as jest.Mocked<typeof puppeteer>;

describe('JobScraperService', () => {
    let jobScraperService: JobScraperService;
    let mockJobRepository: jest.Mocked<JobRepository>;
    let mockBrowser: any;
    let mockPage: any;

    beforeEach(() => {
        jest.clearAllMocks();

        mockPage = {
            goto: jest.fn(),
            evaluate: jest.fn(),
            close: jest.fn(),
            waitForSelector: jest.fn(),
            $: jest.fn(),
            $$: jest.fn(),
        };

        mockBrowser = {
            newPage: jest.fn().mockResolvedValue(mockPage),
            close: jest.fn(),
        };

        mockedPuppeteer.launch.mockResolvedValue(mockBrowser);

        jobScraperService = new JobScraperService();
        mockJobRepository = MockedJobRepository.prototype as jest.Mocked<JobRepository>;
    });

    describe('scrapeJobs', () => {
        it('should scrape jobs from configured companies', async () => {
            const mockScrapedJobs = mockJobScrapingData;

            mockPage.evaluate.mockResolvedValue(mockScrapedJobs);
            mockJobRepository.findByTitleAndCompany.mockResolvedValue(null);
            mockJobRepository.create.mockResolvedValue(createMockJob());

            const result = await jobScraperService.scrapeJobs();

            expect(mockedPuppeteer.launch).toHaveBeenCalledWith({
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox'],
            });
            expect(mockBrowser.newPage).toHaveBeenCalled();
            expect(mockPage.goto).toHaveBeenCalled();
            expect(mockJobRepository.create).toHaveBeenCalledTimes(mockScrapedJobs.length);
            expect(result).toHaveLength(mockScrapedJobs.length);
        });

        it('should handle scraping errors gracefully', async () => {
            mockPage.goto.mockRejectedValue(new Error('Network error'));

            const result = await jobScraperService.scrapeJobs();

            expect(result).toEqual([]);
            expect(mockBrowser.close).toHaveBeenCalled();
        });

        it('should skip duplicate jobs', async () => {
            const mockScrapedJobs = [mockJobScrapingData[0]];
            const existingJob = createMockJob({
                title: mockScrapedJobs[0].title,
                company: mockScrapedJobs[0].company,
            });

            mockPage.evaluate.mockResolvedValue(mockScrapedJobs);
            mockJobRepository.findByTitleAndCompany.mockResolvedValue(existingJob);
            mockJobRepository.update.mockResolvedValue(existingJob);

            const result = await jobScraperService.scrapeJobs();

            expect(mockJobRepository.create).not.toHaveBeenCalled();
            expect(mockJobRepository.update).toHaveBeenCalledWith(existingJob.id, {
                isAvailable: true,
                updatedAt: expect.any(Date),
            });
            expect(result).toHaveLength(1);
        });
    });

    describe('extractJobData', () => {
        it('should extract job data from a job page', async () => {
            const mockJobData = {
                title: 'Software Engineer',
                company: 'TechCorp',
                location: 'San Francisco, CA',
                description: 'Build amazing software',
                requirements: ['JavaScript', 'React'],
                experienceLevel: 'mid',
            };

            mockPage.evaluate.mockResolvedValue(mockJobData);

            const result = await jobScraperService.extractJobData('https://example.com/job/123');

            expect(mockPage.goto).toHaveBeenCalledWith('https://example.com/job/123', {
                waitUntil: 'networkidle2',
            });
            expect(result).toEqual(mockJobData);
        });

        it('should handle extraction errors', async () => {
            mockPage.evaluate.mockRejectedValue(new Error('Extraction failed'));

            await expect(
                jobScraperService.extractJobData('https://example.com/job/123')
            ).rejects.toThrow('Failed to extract job data');
        });
    });

    describe('validateJobAvailability', () => {
        it('should mark unavailable jobs', async () => {
            const job = createMockJob();
            mockPage.goto.mockResolvedValue(undefined);
            mockPage.$.mockResolvedValue(null); // Job not found on page

            mockJobRepository.update.mockResolvedValue({ ...job, isAvailable: false });

            await jobScraperService.validateJobAvailability(job);

            expect(mockJobRepository.update).toHaveBeenCalledWith(job.id, {
                isAvailable: false,
                updatedAt: expect.any(Date),
            });
        });

        it('should keep available jobs as available', async () => {
            const job = createMockJob();
            mockPage.goto.mockResolvedValue(undefined);
            mockPage.$.mockResolvedValue({}); // Job found on page

            await jobScraperService.validateJobAvailability(job);

            expect(mockJobRepository.update).not.toHaveBeenCalled();
        });
    });

    describe('scheduleRecrawl', () => {
        it('should schedule periodic job crawling', () => {
            const spy = jest.spyOn(global, 'setInterval');

            jobScraperService.scheduleRecrawl();

            expect(spy).toHaveBeenCalledWith(
                expect.any(Function),
                24 * 60 * 60 * 1000 // 24 hours
            );

            spy.mockRestore();
        });
    });
});