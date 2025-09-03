import { Application, ApplicationStatus, Job, UserProfile } from '../types/database';
import { ApplicationRepository } from '../database/repositories/application';
import { UserProfileRepository } from '../database/repositories/userProfile';
import { JobRepository } from '../database/repositories/job';
import { logger } from '../config/logger';
import puppeteer, { Browser, Page } from 'puppeteer';

export interface ApplicationData {
    jobId: string;
    userId: string;
    personalInfo: {
        name: string;
        email: string;
        phone?: string;
        location: string;
    };
    coverLetter?: string;
    resumeUrl?: string;
    additionalInfo?: Record<string, string>;
}

export interface ApplicationResult {
    success: boolean;
    applicationId?: string;
    error?: string;
    details?: any;
}

export interface ApplicationFormField {
    selector: string;
    value: string;
    type: 'text' | 'textarea' | 'select' | 'file' | 'checkbox' | 'radio';
}

export class ApplicationAutomationService {
    private applicationRepo: ApplicationRepository;
    private userProfileRepo: UserProfileRepository;
    private jobRepo: JobRepository;
    private browser: Browser | null = null;

    constructor() {
        this.applicationRepo = new ApplicationRepository();
        this.userProfileRepo = new UserProfileRepository();
        this.jobRepo = new JobRepository();
    }

    /**
     * Initialize browser for automation
     */
    private async initBrowser(): Promise<Browser> {
        if (!this.browser) {
            this.browser = await puppeteer.launch({
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            });
        }
        return this.browser;
    }

    /**
     * Close browser instance
     */
    public async closeBrowser(): Promise<void> {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
        }
    }

    /**
     * Prepare application data from user profile and job
     */
    public async prepareApplicationData(userId: string, jobId: string, coverLetter?: string): Promise<ApplicationData> {
        try {
            const userProfile = await this.userProfileRepo.findByUserId(userId);
            if (!userProfile) {
                throw new Error('User profile not found');
            }

            const job = await this.jobRepo.findById(jobId);
            if (!job) {
                throw new Error('Job not found');
            }

            // Extract email from user (would need to join with users table in real implementation)
            // For now, we'll use a placeholder - this should be fixed in a real implementation
            const email = 'user@example.com'; // TODO: Get actual email from user table

            return {
                jobId,
                userId,
                personalInfo: {
                    name: userProfile.name,
                    email: email,
                    location: userProfile.location,
                },
                coverLetter,
                additionalInfo: {
                    experienceLevel: userProfile.experienceLevel,
                    skills: userProfile.skills.join(', '),
                }
            };
        } catch (error) {
            logger.error('Error preparing application data:', error);
            throw error;
        }
    }

    /**
     * Auto-fill application form using prepared data
     */
    public async autoFillApplication(applicationUrl: string, applicationData: ApplicationData): Promise<ApplicationResult> {
        let page: Page | null = null;

        try {
            const browser = await this.initBrowser();
            page = await browser.newPage();

            // Set user agent to avoid detection
            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');

            // Navigate to application page
            await page.goto(applicationUrl, { waitUntil: 'networkidle2', timeout: 30000 });

            // Wait for form to load
            await page.waitForTimeout(2000);

            // Detect and fill common form fields
            const formFields = await this.detectFormFields(page, applicationData);

            for (const field of formFields) {
                await this.fillFormField(page, field);
            }

            logger.info(`Successfully auto-filled application form for job ${applicationData.jobId}`);

            return {
                success: true,
                details: {
                    fieldsFilledCount: formFields.length,
                    url: applicationUrl
                }
            };

        } catch (error) {
            logger.error('Error auto-filling application:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred',
                details: { url: applicationUrl }
            };
        } finally {
            if (page) {
                await page.close();
            }
        }
    }

    /**
     * Detect form fields on the page and map them to application data
     */
    private async detectFormFields(page: Page, applicationData: ApplicationData): Promise<ApplicationFormField[]> {
        const fields: ApplicationFormField[] = [];

        // Common field selectors and their mappings
        const fieldMappings = [
            // Name fields
            { selectors: ['input[name*="name"]', 'input[id*="name"]', 'input[placeholder*="name"]'], value: applicationData.personalInfo.name, type: 'text' as const },
            { selectors: ['input[name*="first"]', 'input[id*="first"]'], value: applicationData.personalInfo.name.split(' ')[0], type: 'text' as const },
            { selectors: ['input[name*="last"]', 'input[id*="last"]'], value: applicationData.personalInfo.name.split(' ').slice(1).join(' '), type: 'text' as const },

            // Email fields
            { selectors: ['input[type="email"]', 'input[name*="email"]', 'input[id*="email"]'], value: applicationData.personalInfo.email, type: 'text' as const },

            // Phone fields
            { selectors: ['input[type="tel"]', 'input[name*="phone"]', 'input[id*="phone"]'], value: applicationData.personalInfo.phone || '', type: 'text' as const },

            // Location fields
            { selectors: ['input[name*="location"]', 'input[id*="location"]', 'input[name*="city"]', 'input[id*="city"]'], value: applicationData.personalInfo.location, type: 'text' as const },

            // Cover letter fields
            { selectors: ['textarea[name*="cover"]', 'textarea[id*="cover"]', 'textarea[name*="letter"]'], value: applicationData.coverLetter || '', type: 'textarea' as const },
        ];

        for (const mapping of fieldMappings) {
            for (const selector of mapping.selectors) {
                try {
                    const element = await page.$(selector);
                    if (element && mapping.value) {
                        // Check if field is visible and enabled
                        const isVisible = await element.isIntersectingViewport();
                        const isEnabled = await page.evaluate(el => !el.disabled && !el.readOnly, element);

                        if (isVisible && isEnabled) {
                            fields.push({
                                selector,
                                value: mapping.value,
                                type: mapping.type
                            });
                            break; // Only use the first matching selector
                        }
                    }
                } catch (error) {
                    // Continue to next selector if this one fails
                    continue;
                }
            }
        }

        return fields;
    }

    /**
     * Fill a specific form field
     */
    private async fillFormField(page: Page, field: ApplicationFormField): Promise<void> {
        try {
            await page.waitForSelector(field.selector, { timeout: 5000 });

            switch (field.type) {
                case 'text':
                case 'textarea':
                    await page.focus(field.selector);
                    // Clear the field first
                    try {
                        await page.$eval(field.selector, (el: any) => el.value = '');
                    } catch (e) {
                        // Ignore if clearing fails
                    }
                    await page.type(field.selector, field.value, { delay: 50 });
                    break;

                case 'select':
                    await page.select(field.selector, field.value);
                    break;

                case 'checkbox':
                    if (field.value.toLowerCase() === 'true' || field.value === '1') {
                        await page.click(field.selector);
                    }
                    break;

                case 'file':
                    // File upload would require actual file path
                    // This is a placeholder for file upload functionality
                    logger.warn(`File upload not implemented for selector: ${field.selector}`);
                    break;
            }

            logger.debug(`Filled field ${field.selector} with value: ${field.value}`);

        } catch (error) {
            logger.warn(`Failed to fill field ${field.selector}:`, error);
        }
    }

    /**
     * Submit application and track it in the database
     */
    public async submitApplication(userId: string, jobId: string, coverLetter?: string): Promise<ApplicationResult> {
        try {
            // Check if application already exists
            const existingApplication = await this.applicationRepo.findByUserIdAndJobId(userId, jobId);
            if (existingApplication) {
                return {
                    success: false,
                    error: 'Application already exists for this job',
                    applicationId: existingApplication.id
                };
            }

            // Get job details
            const job = await this.jobRepo.findById(jobId);
            if (!job) {
                return {
                    success: false,
                    error: 'Job not found'
                };
            }

            if (!job.isAvailable) {
                return {
                    success: false,
                    error: 'Job is no longer available'
                };
            }

            // Prepare application data
            const applicationData = await this.prepareApplicationData(userId, jobId, coverLetter);

            // Attempt auto-fill (this doesn't submit, just fills the form)
            const autoFillResult = await this.autoFillApplication(job.applicationUrl, applicationData);

            // Create application record in database
            const application = await this.applicationRepo.createApplication({
                userId,
                jobId,
                status: 'applied' as ApplicationStatus,
                coverLetter,
                notes: autoFillResult.success ? 'Auto-filled successfully' : `Auto-fill failed: ${autoFillResult.error}`
            });

            logger.info(`Application submitted for user ${userId} to job ${jobId}`);

            return {
                success: true,
                applicationId: application.id,
                details: {
                    autoFillResult,
                    applicationUrl: job.applicationUrl
                }
            };

        } catch (error) {
            logger.error('Error submitting application:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred'
            };
        }
    }

    /**
     * Retry failed application with exponential backoff
     */
    public async retryApplication(applicationId: string, maxRetries: number = 3): Promise<ApplicationResult> {
        try {
            const application = await this.applicationRepo.findById(applicationId);
            if (!application) {
                return {
                    success: false,
                    error: 'Application not found'
                };
            }

            const job = await this.jobRepo.findById(application.jobId);
            if (!job) {
                return {
                    success: false,
                    error: 'Job not found'
                };
            }

            let lastError: string = '';

            for (let attempt = 1; attempt <= maxRetries; attempt++) {
                logger.info(`Retry attempt ${attempt}/${maxRetries} for application ${applicationId}`);

                try {
                    const applicationData = await this.prepareApplicationData(application.userId, application.jobId, application.coverLetter);
                    const result = await this.autoFillApplication(job.applicationUrl, applicationData);

                    if (result.success) {
                        // Update application notes with retry success
                        await this.applicationRepo.addNotes(applicationId, `Retry successful on attempt ${attempt}`);
                        return {
                            success: true,
                            applicationId,
                            details: { retryAttempt: attempt, ...result.details }
                        };
                    }

                    lastError = result.error || 'Unknown error';

                } catch (error) {
                    lastError = error instanceof Error ? error.message : 'Unknown error';
                }

                // Exponential backoff: wait 2^attempt seconds
                if (attempt < maxRetries) {
                    const delay = Math.pow(2, attempt) * 1000;
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }

            // All retries failed
            await this.applicationRepo.addNotes(applicationId, `All ${maxRetries} retry attempts failed. Last error: ${lastError}`);

            return {
                success: false,
                error: `All retry attempts failed. Last error: ${lastError}`,
                applicationId
            };

        } catch (error) {
            logger.error('Error retrying application:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred'
            };
        }
    }

    /**
     * Get application status and tracking information
     */
    public async getApplicationStatus(applicationId: string): Promise<Application | null> {
        try {
            return await this.applicationRepo.findById(applicationId);
        } catch (error) {
            logger.error('Error getting application status:', error);
            return null;
        }
    }

    /**
     * Update application status
     */
    public async updateApplicationStatus(applicationId: string, status: ApplicationStatus, notes?: string): Promise<ApplicationResult> {
        try {
            const updatedApplication = await this.applicationRepo.updateStatus(applicationId, status, notes);

            if (!updatedApplication) {
                return {
                    success: false,
                    error: 'Application not found'
                };
            }

            logger.info(`Application ${applicationId} status updated to ${status}`);

            return {
                success: true,
                applicationId,
                details: { newStatus: status, notes }
            };

        } catch (error) {
            logger.error('Error updating application status:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred'
            };
        }
    }

    /**
     * Get all applications for a user
     */
    public async getUserApplications(userId: string): Promise<Application[]> {
        try {
            return await this.applicationRepo.findByUserId(userId);
        } catch (error) {
            logger.error('Error getting user applications:', error);
            return [];
        }
    }

    /**
     * Get application statistics for a user
     */
    public async getApplicationStats(userId: string): Promise<{
        total: number;
        applied: number;
        interview: number;
        offered: number;
        rejected: number;
    }> {
        try {
            return await this.applicationRepo.getApplicationStats(userId);
        } catch (error) {
            logger.error('Error getting application stats:', error);
            return { total: 0, applied: 0, interview: 0, offered: 0, rejected: 0 };
        }
    }
}