import { ApplicationRepository } from '../database/repositories/application';
import { Application, ApplicationStatus, StatusChange } from '../types/database';
import { logger } from '../config/logger';

export interface StatusUpdateRequest {
    status: ApplicationStatus;
    notes?: string;
    interviewDate?: Date;
}

export interface StatusTransitionRule {
    from: ApplicationStatus;
    to: ApplicationStatus[];
}

export class ApplicationStatusService {
    private applicationRepository: ApplicationRepository;

    // Define valid status transitions
    private readonly statusTransitions: StatusTransitionRule[] = [
        { from: 'applied', to: ['interview', 'rejected'] },
        { from: 'interview', to: ['offered', 'rejected'] },
        { from: 'offered', to: ['rejected'] }, // Can decline an offer
        { from: 'rejected', to: [] } // Terminal state
    ];

    constructor(applicationRepository: ApplicationRepository) {
        this.applicationRepository = applicationRepository;
    }

    /**
     * Update application status with validation
     */
    public async updateApplicationStatus(
        applicationId: string,
        userId: string,
        updateRequest: StatusUpdateRequest
    ): Promise<Application> {
        try {
            // Get current application
            const currentApplication = await this.applicationRepository.findById(applicationId);

            if (!currentApplication) {
                throw new Error('Application not found');
            }

            // Verify ownership
            if (currentApplication.userId !== userId) {
                throw new Error('Unauthorized: Application does not belong to user');
            }

            // Validate status transition
            if (!this.isValidStatusTransition(currentApplication.status, updateRequest.status)) {
                throw new Error(
                    `Invalid status transition from '${currentApplication.status}' to '${updateRequest.status}'`
                );
            }

            // Update status
            const updatedApplication = await this.applicationRepository.updateStatus(
                applicationId,
                updateRequest.status,
                updateRequest.notes
            );

            if (!updatedApplication) {
                throw new Error('Failed to update application status');
            }

            // Update interview date if provided and status is interview
            if (updateRequest.interviewDate && updateRequest.status === 'interview') {
                const finalApplication = await this.applicationRepository.updateInterviewDate(
                    applicationId,
                    updateRequest.interviewDate
                );

                if (!finalApplication) {
                    throw new Error('Failed to update interview date');
                }

                logger.info(`Application ${applicationId} status updated to ${updateRequest.status} with interview date`);
                return finalApplication;
            }

            logger.info(`Application ${applicationId} status updated from ${currentApplication.status} to ${updateRequest.status}`);
            return updatedApplication;

        } catch (error) {
            logger.error('Error updating application status:', error);
            throw error;
        }
    }

    /**
     * Get application status history
     */
    public async getApplicationStatusHistory(applicationId: string, userId: string): Promise<StatusChange[]> {
        try {
            // Verify application exists and belongs to user
            const application = await this.applicationRepository.findById(applicationId);

            if (!application) {
                throw new Error('Application not found');
            }

            if (application.userId !== userId) {
                throw new Error('Unauthorized: Application does not belong to user');
            }

            const statusHistory = await this.applicationRepository.getStatusHistory(applicationId);

            logger.info(`Retrieved status history for application ${applicationId}`);
            return statusHistory;

        } catch (error) {
            logger.error('Error getting application status history:', error);
            throw error;
        }
    }

    /**
     * Add notes to application
     */
    public async addApplicationNotes(applicationId: string, userId: string, notes: string): Promise<Application> {
        try {
            // Verify application exists and belongs to user
            const application = await this.applicationRepository.findById(applicationId);

            if (!application) {
                throw new Error('Application not found');
            }

            if (application.userId !== userId) {
                throw new Error('Unauthorized: Application does not belong to user');
            }

            const updatedApplication = await this.applicationRepository.addNotes(applicationId, notes);

            if (!updatedApplication) {
                throw new Error('Failed to add notes to application');
            }

            logger.info(`Notes added to application ${applicationId}`);
            return updatedApplication;

        } catch (error) {
            logger.error('Error adding application notes:', error);
            throw error;
        }
    }

    /**
     * Update interview date
     */
    public async updateInterviewDate(
        applicationId: string,
        userId: string,
        interviewDate: Date
    ): Promise<Application> {
        try {
            // Verify application exists and belongs to user
            const application = await this.applicationRepository.findById(applicationId);

            if (!application) {
                throw new Error('Application not found');
            }

            if (application.userId !== userId) {
                throw new Error('Unauthorized: Application does not belong to user');
            }

            // Verify application is in interview status
            if (application.status !== 'interview') {
                throw new Error('Can only set interview date for applications in interview status');
            }

            const updatedApplication = await this.applicationRepository.updateInterviewDate(
                applicationId,
                interviewDate
            );

            if (!updatedApplication) {
                throw new Error('Failed to update interview date');
            }

            logger.info(`Interview date updated for application ${applicationId}`);
            return updatedApplication;

        } catch (error) {
            logger.error('Error updating interview date:', error);
            throw error;
        }
    }

    /**
     * Get user's applications by status
     */
    public async getApplicationsByStatus(userId: string, status?: ApplicationStatus): Promise<Application[]> {
        try {
            let applications: Application[];

            if (status) {
                applications = await this.applicationRepository.findByUserIdAndStatus(userId, status);
            } else {
                applications = await this.applicationRepository.findByUserId(userId);
            }

            logger.info(`Retrieved ${applications.length} applications for user ${userId}${status ? ` with status ${status}` : ''}`);
            return applications;

        } catch (error) {
            logger.error('Error getting applications by status:', error);
            throw error;
        }
    }

    /**
     * Get application statistics for user
     */
    public async getApplicationStatistics(userId: string): Promise<{
        total: number;
        applied: number;
        interview: number;
        offered: number;
        rejected: number;
    }> {
        try {
            const stats = await this.applicationRepository.getApplicationStats(userId);

            logger.info(`Retrieved application statistics for user ${userId}`);
            return stats;

        } catch (error) {
            logger.error('Error getting application statistics:', error);
            throw error;
        }
    }

    /**
     * Get valid next statuses for current status
     */
    public getValidNextStatuses(currentStatus: ApplicationStatus): ApplicationStatus[] {
        const rule = this.statusTransitions.find(rule => rule.from === currentStatus);
        return rule ? rule.to : [];
    }

    /**
     * Validate if status transition is allowed
     */
    private isValidStatusTransition(fromStatus: ApplicationStatus, toStatus: ApplicationStatus): boolean {
        // Allow staying in the same status (for updates like notes or interview date)
        if (fromStatus === toStatus) {
            return true;
        }

        const validNextStatuses = this.getValidNextStatuses(fromStatus);
        return validNextStatuses.includes(toStatus);
    }
}