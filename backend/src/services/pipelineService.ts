import { ApplicationRepository } from '../database/repositories/application';
import { JobRepository } from '../database/repositories/job';
import { Application, ApplicationStatus, Job } from '../types/database';
import { ApplicationStatusService } from './applicationStatus';
import { logger } from '../config/logger';

export interface PipelineColumn {
    id: string;
    title: string;
    status: ApplicationStatus | 'available';
    jobs: (Job | Application)[];
}

export interface PipelineData {
    columns: PipelineColumn[];
    totalJobs: number;
}

export interface DragDropRequest {
    jobId: string;
    fromColumn: string;
    toColumn: string;
    position?: number;
}

export interface PipelineJobWithApplication extends Job {
    applicationId?: string;
    applicationStatus?: ApplicationStatus;
    appliedAt?: Date;
    notes?: string;
    interviewDate?: Date;
}

export class PipelineService {
    private applicationRepository: ApplicationRepository;
    private jobRepository: JobRepository;
    private applicationStatusService: ApplicationStatusService;

    // Define pipeline columns configuration
    private readonly pipelineColumns = [
        { id: 'available', title: 'Available Jobs', status: 'available' as const },
        { id: 'applied', title: 'Applied', status: 'applied' as const },
        { id: 'interview', title: 'Interview', status: 'interview' as const },
        { id: 'offered', title: 'Offer', status: 'offered' as const }
    ];

    constructor(
        applicationRepository: ApplicationRepository,
        jobRepository: JobRepository,
        applicationStatusService: ApplicationStatusService
    ) {
        this.applicationRepository = applicationRepository;
        this.jobRepository = jobRepository;
        this.applicationStatusService = applicationStatusService;
    }

    /**
     * Get pipeline data for user with jobs organized by status
     */
    public async getPipelineData(userId: string, limit: number = 50): Promise<PipelineData> {
        try {
            // Get user's applications
            const applications = await this.applicationRepository.findByUserId(userId);

            // Get available jobs (not applied to by user)
            const appliedJobIds = applications.map(app => app.jobId);
            const availableJobs = await this.jobRepository.getAvailableJobsNotAppliedTo(userId, appliedJobIds, limit);

            // Get job details for applications
            const applicationJobIds = applications.map(app => app.jobId);
            const applicationJobs = await this.jobRepository.findByIds(applicationJobIds);

            // Create job lookup map
            const jobMap = new Map<string, Job>();
            [...availableJobs, ...applicationJobs].forEach(job => {
                jobMap.set(job.id, job);
            });

            // Organize data by columns
            const columns: PipelineColumn[] = this.pipelineColumns.map(columnConfig => {
                let jobs: PipelineJobWithApplication[] = [];

                if (columnConfig.status === 'available') {
                    // Available jobs (not applied to)
                    jobs = availableJobs.map((job: Job) => ({
                        ...job,
                        applicationStatus: undefined
                    }));
                } else {
                    // Jobs with applications in this status
                    const statusApplications = applications.filter(app => app.status === columnConfig.status);
                    jobs = statusApplications.map(app => {
                        const job = jobMap.get(app.jobId);
                        if (!job) {
                            logger.warn(`Job ${app.jobId} not found for application ${app.id}`);
                            return null;
                        }
                        return {
                            ...job,
                            applicationId: app.id,
                            applicationStatus: app.status,
                            appliedAt: app.appliedAt,
                            notes: app.notes,
                            interviewDate: app.interviewDate
                        };
                    }).filter(Boolean) as PipelineJobWithApplication[];
                }

                return {
                    id: columnConfig.id,
                    title: columnConfig.title,
                    status: columnConfig.status,
                    jobs
                };
            });

            const totalJobs = columns.reduce((sum, column) => sum + column.jobs.length, 0);

            logger.info(`Retrieved pipeline data for user ${userId}: ${totalJobs} total jobs`);

            return {
                columns,
                totalJobs
            };

        } catch (error) {
            logger.error('Error getting pipeline data:', error);
            throw error;
        }
    }

    /**
     * Handle drag and drop operation
     */
    public async handleDragDrop(userId: string, request: DragDropRequest): Promise<{
        success: boolean;
        updatedApplication?: Application;
        message: string;
    }> {
        try {
            const { jobId, fromColumn, toColumn } = request;

            // Validate columns
            if (!this.isValidColumn(fromColumn) || !this.isValidColumn(toColumn)) {
                throw new Error('Invalid column specified');
            }

            // If moving within the same column, no status change needed
            if (fromColumn === toColumn) {
                return {
                    success: true,
                    message: 'Job position updated within column'
                };
            }

            // Handle different drag scenarios
            if (fromColumn === 'available') {
                // Moving from available to applied/interview/offered
                return await this.handleAvailableToStatus(userId, jobId, toColumn as ApplicationStatus);
            } else if (toColumn === 'available') {
                // Moving from status back to available (withdraw application)
                return await this.handleStatusToAvailable(userId, jobId, fromColumn as ApplicationStatus);
            } else {
                // Moving between status columns
                return await this.handleStatusToStatus(userId, jobId, fromColumn as ApplicationStatus, toColumn as ApplicationStatus);
            }

        } catch (error) {
            logger.error('Error handling drag drop:', error);
            throw error;
        }
    }

    /**
     * Get valid drop targets for a job
     */
    public async getValidDropTargets(userId: string, jobId: string, currentColumn: string): Promise<string[]> {
        try {
            if (currentColumn === 'available') {
                // From available, can only move to applied
                return ['applied'];
            }

            // For status columns, get valid transitions
            const currentStatus = currentColumn as ApplicationStatus;
            const validNextStatuses = this.applicationStatusService.getValidNextStatuses(currentStatus);

            // Add available as option (withdraw application)
            const validColumns = ['available', ...validNextStatuses];

            // Remove current column
            return validColumns.filter(col => col !== currentColumn);

        } catch (error) {
            logger.error('Error getting valid drop targets:', error);
            throw error;
        }
    }

    /**
     * Handle moving job from available to a status column
     */
    private async handleAvailableToStatus(userId: string, jobId: string, toStatus: ApplicationStatus): Promise<{
        success: boolean;
        updatedApplication?: Application;
        message: string;
    }> {
        // Only allow moving to 'applied' status from available
        if (toStatus !== 'applied') {
            throw new Error('Can only apply to jobs from available column');
        }

        // Check if application already exists
        const existingApplication = await this.applicationRepository.findByUserIdAndJobId(userId, jobId);
        if (existingApplication) {
            throw new Error('Application already exists for this job');
        }

        // Create new application
        const newApplication = await this.applicationRepository.createApplication({
            userId,
            jobId,
            status: 'applied',
            coverLetter: undefined,
            notes: undefined,
            interviewDate: undefined
        });

        logger.info(`Created application ${newApplication.id} for job ${jobId} via drag-drop`);

        return {
            success: true,
            updatedApplication: newApplication,
            message: 'Application created successfully'
        };
    }

    /**
     * Handle moving job from status column back to available (withdraw application)
     */
    private async handleStatusToAvailable(userId: string, jobId: string, fromStatus: ApplicationStatus): Promise<{
        success: boolean;
        updatedApplication?: Application;
        message: string;
    }> {
        // Find the application
        const application = await this.applicationRepository.findByUserIdAndJobId(userId, jobId);
        if (!application) {
            throw new Error('Application not found');
        }

        // Delete the application (withdraw)
        await this.applicationRepository.delete(application.id);

        logger.info(`Deleted application ${application.id} for job ${jobId} via drag-drop (withdraw)`);

        return {
            success: true,
            message: 'Application withdrawn successfully'
        };
    }

    /**
     * Handle moving job between status columns
     */
    private async handleStatusToStatus(userId: string, jobId: string, fromStatus: ApplicationStatus, toStatus: ApplicationStatus): Promise<{
        success: boolean;
        updatedApplication?: Application;
        message: string;
    }> {
        // Find the application
        const application = await this.applicationRepository.findByUserIdAndJobId(userId, jobId);
        if (!application) {
            throw new Error('Application not found');
        }

        // Update application status using existing service
        const updatedApplication = await this.applicationStatusService.updateApplicationStatus(
            application.id,
            userId,
            { status: toStatus }
        );

        logger.info(`Updated application ${application.id} status from ${fromStatus} to ${toStatus} via drag-drop`);

        return {
            success: true,
            updatedApplication,
            message: `Application status updated to ${toStatus}`
        };
    }

    /**
     * Validate if column ID is valid
     */
    private isValidColumn(columnId: string): boolean {
        return this.pipelineColumns.some(col => col.id === columnId);
    }

    /**
     * Get pipeline statistics
     */
    public async getPipelineStats(userId: string): Promise<{
        available: number;
        applied: number;
        interview: number;
        offered: number;
        rejected: number;
    }> {
        try {
            const applications = await this.applicationRepository.findByUserId(userId);
            const appliedJobIds = applications.map(app => app.jobId);
            const availableJobs = await this.jobRepository.getAvailableJobsNotAppliedTo(userId, appliedJobIds, 1000);

            const stats = {
                available: availableJobs.length,
                applied: applications.filter(app => app.status === 'applied').length,
                interview: applications.filter(app => app.status === 'interview').length,
                offered: applications.filter(app => app.status === 'offered').length,
                rejected: applications.filter(app => app.status === 'rejected').length
            };

            logger.info(`Retrieved pipeline stats for user ${userId}`);
            return stats;

        } catch (error) {
            logger.error('Error getting pipeline stats:', error);
            throw error;
        }
    }
}