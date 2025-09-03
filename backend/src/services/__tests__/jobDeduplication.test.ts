import { JobDeduplicationService } from '../jobDeduplication';
import { Job } from '../../types';

describe('JobDeduplicationService', () => {
    let service: JobDeduplicationService;

    beforeEach(() => {
        service = new JobDeduplicationService();
    });

    describe('removeDuplicates', () => {
        it('should remove exact duplicates', () => {
            const jobs: Partial<Job>[] = [
                {
                    title: 'Software Engineer',
                    company: 'TechCorp',
                    location: 'San Francisco, CA',
                    description: 'Great job opportunity'
                },
                {
                    title: 'Software Engineer',
                    company: 'TechCorp',
                    location: 'San Francisco, CA',
                    description: 'Different description but same job'
                },
                {
                    title: 'Senior Software Engineer',
                    company: 'TechCorp',
                    location: 'San Francisco, CA',
                    description: 'Different title'
                }
            ];

            const result = service.removeDuplicates(jobs as Job[]);

            expect(result).toHaveLength(2);
            expect(result[0].title).toBe('Software Engineer');
            expect(result[1].title).toBe('Senior Software Engineer');
        });

        it('should handle case-insensitive matching', () => {
            const jobs: Partial<Job>[] = [
                {
                    title: 'Software Engineer',
                    company: 'TechCorp',
                    location: 'San Francisco, CA'
                },
                {
                    title: 'software engineer',
                    company: 'techcorp',
                    location: 'san francisco, ca'
                }
            ];

            const result = service.removeDuplicates(jobs as Job[]);

            expect(result).toHaveLength(1);
        });

        it('should normalize location variations', () => {
            const jobs: Partial<Job>[] = [
                {
                    title: 'Software Engineer',
                    company: 'TechCorp',
                    location: 'San Francisco, CA'
                },
                {
                    title: 'Software Engineer',
                    company: 'TechCorp',
                    location: 'San Francisco, California'
                },
                {
                    title: 'Software Engineer',
                    company: 'TechCorp',
                    location: 'SF, CA'
                }
            ];

            const result = service.removeDuplicates(jobs as Job[]);

            expect(result).toHaveLength(1);
        });

        it('should handle remote work variations', () => {
            const jobs: Partial<Job>[] = [
                {
                    title: 'Software Engineer',
                    company: 'TechCorp',
                    location: 'Remote'
                },
                {
                    title: 'Software Engineer',
                    company: 'TechCorp',
                    location: 'Remote Work'
                },
                {
                    title: 'Software Engineer',
                    company: 'TechCorp',
                    location: 'Work from Home'
                }
            ];

            const result = service.removeDuplicates(jobs as Job[]);

            expect(result).toHaveLength(1);
        });

        it('should preserve the first occurrence of duplicates', () => {
            const jobs: Partial<Job>[] = [
                {
                    id: 'job-1',
                    title: 'Software Engineer',
                    company: 'TechCorp',
                    location: 'San Francisco, CA',
                    description: 'First job description'
                },
                {
                    id: 'job-2',
                    title: 'Software Engineer',
                    company: 'TechCorp',
                    location: 'San Francisco, CA',
                    description: 'Second job description'
                }
            ];

            const result = service.removeDuplicates(jobs as Job[]);

            expect(result).toHaveLength(1);
            expect(result[0].id).toBe('job-1');
            expect(result[0].description).toBe('First job description');
        });

        it('should handle empty array', () => {
            const result = service.removeDuplicates([]);
            expect(result).toEqual([]);
        });

        it('should handle single job', () => {
            const jobs: Partial<Job>[] = [
                {
                    title: 'Software Engineer',
                    company: 'TechCorp',
                    location: 'San Francisco, CA'
                }
            ];

            const result = service.removeDuplicates(jobs as Job[]);

            expect(result).toHaveLength(1);
            expect(result[0]).toEqual(jobs[0]);
        });

        it('should handle jobs with missing fields', () => {
            const jobs: Partial<Job>[] = [
                {
                    title: 'Software Engineer',
                    company: 'TechCorp',
                    location: undefined
                },
                {
                    title: 'Software Engineer',
                    company: 'TechCorp',
                    location: ''
                },
                {
                    title: 'Software Engineer',
                    company: 'TechCorp',
                    location: 'San Francisco, CA'
                }
            ];

            const result = service.removeDuplicates(jobs as Job[]);

            // First two should be considered duplicates (both have no meaningful location)
            // Third one is different due to location
            expect(result).toHaveLength(2);
        });

        it('should handle special characters in job titles', () => {
            const jobs: Partial<Job>[] = [
                {
                    title: 'Software Engineer - Frontend',
                    company: 'TechCorp',
                    location: 'San Francisco, CA'
                },
                {
                    title: 'Software Engineer (Frontend)',
                    company: 'TechCorp',
                    location: 'San Francisco, CA'
                },
                {
                    title: 'Software Engineer | Frontend',
                    company: 'TechCorp',
                    location: 'San Francisco, CA'
                }
            ];

            const result = service.removeDuplicates(jobs as Job[]);

            // These should be considered different jobs due to different formatting
            expect(result).toHaveLength(3);
        });
    });
});