import { JobService } from './jobService';
import { ApplicationStatusService } from './applicationStatus';
import { JobMatchingService } from './jobMatching';
import { UserProfileRepository } from '../database/repositories/userProfile';
import { ApplicationRepository } from '../database/repositories/application';
import { JobRepository } from '../database/repositories/job';
import { logger } from '../config/logger';

export interface DashboardStats {
    user: {
        profileComplete: boolean;
        totalApplications: number;
        activeApplications: number;
        interviewsScheduled: number;
        offersReceived: number;
    };
    jobs: {
        totalAvailable: number;
        newJobsToday: number;
        matchingJobs: number;
        averageMatchScore: number;
    };
    applications: {
        applied: number;
        interview: number;
        offered: number;
        rejected: number;
        successRate: number;
    };
    recommendations: {
        topMatches: Array<{
            jobId: string;
            title: string;
            company: string;
            score: number;
            matchReasons: string[];
        }>;
        skillsInDemand: string[];
        suggestedLocations: string[];
    };
}

export interface DashboardData {
    stats: DashboardStats;
    recentActivity: Array<{
        type: 'application' | 'job_match' | 'status_update';
        timestamp: Date;
        description: string;
        jobTitle?: string;
        company?: string;
        status?: string;
    }>;
    upcomingInterviews: Array<{
        applicationId: string;
        jobTitle: string;
        company: string;
        interviewDate: Date;
        status: string;
    }>;
}

export class DashboardService {
    constructor(
        private jobService: JobService,
        private applicationStatusService: ApplicationStatusService,
        private jobMatchingService: JobMatchingService,
        private userProfileRepository: UserProfileRepository,
        private applicationRepository: ApplicationRepository,
        private jobRepository: JobRepository
    ) { }

    /**
     * Get comprehensive dashboard data for a user
     */
    async getDashboardData(userId: string): Promise<DashboardData> {
        try {
            logger.info(`Generating dashboard data for user ${userId}`);

            const [stats, recentActivity, upcomingInterviews] = await Promise.all([
                this.getDashboardStats(userId),
                this.getRecentActivity(userId),
                this.getUpcomingInterviews(userId)
            ]);

            logger.info(`Dashboard data generated successfully for user ${userId}`);

            return {
                stats,
                recentActivity,
                upcomingInterviews
            };
        } catch (error) {
            logger.error('Error generating dashboard data:', error);
            throw new Error('Failed to generate dashboard data');
        }
    }

    /**
     * Get dashboard statistics
     */
    async getDashboardStats(userId: string): Promise<DashboardStats> {
        try {
            // Get user profile
            const userProfile = await this.userProfileRepository.findByUserId(userId);
            const profileComplete = this.isProfileComplete(userProfile);

            // Get application statistics with fallback
            let applicationStats;
            try {
                applicationStats = await this.applicationRepository.getApplicationStats(userId);
            } catch (error) {
                logger.warn('Failed to get application stats, using defaults:', error);
                applicationStats = {
                    total: 0,
                    applied: 0,
                    interview: 0,
                    offered: 0,
                    rejected: 0
                };
            }

            const activeApplications = applicationStats.applied + applicationStats.interview;
            const successRate = applicationStats.total > 0
                ? ((applicationStats.offered / applicationStats.total) * 100)
                : 0;

            // Get job statistics with fallback
            let jobStats;
            try {
                jobStats = await this.jobService.getJobStats();
            } catch (error) {
                logger.warn('Failed to get job stats, using defaults:', error);
                jobStats = {
                    available: 0,
                    recentlyAdded: 0
                };
            }

            // Get job matching statistics with fallback
            let matchStats: any;
            let topMatches: any[] = [];
            let skillsInDemand: string[] = [];

            try {
                // Only try to get match stats if user has a complete profile
                if (userProfile && profileComplete) {
                    matchStats = await this.jobMatchingService.getMatchStatistics(userId);
                    topMatches = await this.jobMatchingService.getJobRecommendations(userId, 5);
                    skillsInDemand = matchStats.topSkillMatches.slice(0, 10);
                } else {
                    throw new Error('Profile incomplete or missing');
                }
            } catch (error) {
                logger.warn('Failed to get match stats (profile may be incomplete), using defaults:', error);
                matchStats = {
                    totalMatches: 0,
                    averageScore: 0,
                    topSkillMatches: []
                };
            }

            const recommendations = topMatches.map(match => ({
                jobId: match.job.id,
                title: match.job.title,
                company: match.job.company,
                score: match.score,
                matchReasons: match.matchReasons
            }));

            // Get suggested locations with fallback
            let suggestedLocations: string[] = [];
            try {
                if (userProfile && profileComplete) {
                    suggestedLocations = await this.getSuggestedLocations(userId);
                }
            } catch (error) {
                logger.warn('Failed to get suggested locations, using defaults:', error);
            }

            return {
                user: {
                    profileComplete,
                    totalApplications: applicationStats.total,
                    activeApplications,
                    interviewsScheduled: applicationStats.interview,
                    offersReceived: applicationStats.offered
                },
                jobs: {
                    totalAvailable: jobStats.available,
                    newJobsToday: jobStats.recentlyAdded,
                    matchingJobs: matchStats.totalMatches,
                    averageMatchScore: matchStats.averageScore
                },
                applications: {
                    applied: applicationStats.applied,
                    interview: applicationStats.interview,
                    offered: applicationStats.offered,
                    rejected: applicationStats.rejected,
                    successRate: Math.round(successRate * 100) / 100
                },
                recommendations: {
                    topMatches: recommendations,
                    skillsInDemand,
                    suggestedLocations
                }
            };
        } catch (error) {
            logger.error('Error generating dashboard stats:', error);
            throw new Error('Failed to generate dashboard statistics');
        }
    }

    /**
     * Get recent activity for the user
     */
    async getRecentActivity(userId: string, limit: number = 10): Promise<DashboardData['recentActivity']> {
        try {
            const activities: DashboardData['recentActivity'] = [];

            // Get recent applications
            const recentApplications = await this.applicationRepository.findByUserId(userId);
            const sortedApplications = recentApplications
                .sort((a, b) => new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime())
                .slice(0, 5);

            for (const application of sortedApplications) {
                const job = await this.jobRepository.findById(application.jobId);
                if (job) {
                    activities.push({
                        type: 'application',
                        timestamp: application.appliedAt,
                        description: `Applied to ${job.title} at ${job.company}`,
                        jobTitle: job.title,
                        company: job.company,
                        status: application.status
                    });
                }
            }

            // Get recent status updates (from status changes)
            for (const application of recentApplications) {
                const statusHistory = await this.applicationRepository.getStatusHistory(application.id);
                const recentStatusChanges = statusHistory
                    .filter(change => change.changedAt > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)) // Last 7 days
                    .slice(0, 3);

                for (const statusChange of recentStatusChanges) {
                    const job = await this.jobRepository.findById(application.jobId);
                    if (job) {
                        activities.push({
                            type: 'status_update',
                            timestamp: statusChange.changedAt,
                            description: `Status updated to ${statusChange.toStatus} for ${job.title} at ${job.company}`,
                            jobTitle: job.title,
                            company: job.company,
                            status: statusChange.toStatus
                        });
                    }
                }
            }

            // Sort all activities by timestamp and limit
            return activities
                .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                .slice(0, limit);
        } catch (error) {
            logger.error('Error getting recent activity:', error);
            throw new Error('Failed to get recent activity');
        }
    }

    /**
     * Get upcoming interviews
     */
    async getUpcomingInterviews(userId: string): Promise<DashboardData['upcomingInterviews']> {
        try {
            const interviewApplications = await this.applicationRepository.findByUserIdAndStatus(userId, 'interview');
            const upcomingInterviews: DashboardData['upcomingInterviews'] = [];

            for (const application of interviewApplications) {
                if (application.interviewDate && application.interviewDate > new Date()) {
                    const job = await this.jobRepository.findById(application.jobId);
                    if (job) {
                        upcomingInterviews.push({
                            applicationId: application.id,
                            jobTitle: job.title,
                            company: job.company,
                            interviewDate: application.interviewDate,
                            status: application.status
                        });
                    }
                }
            }

            // Sort by interview date
            return upcomingInterviews.sort((a, b) =>
                new Date(a.interviewDate).getTime() - new Date(b.interviewDate).getTime()
            );
        } catch (error) {
            logger.error('Error getting upcoming interviews:', error);
            throw new Error('Failed to get upcoming interviews');
        }
    }

    /**
     * Refresh job recommendations for a user
     */
    async refreshJobRecommendations(userId: string): Promise<void> {
        try {
            logger.info(`Refreshing job recommendations for user ${userId}`);

            // This could trigger background job matching updates
            await this.jobMatchingService.getJobMatches(userId, {
                maxResults: 50,
                excludeApplied: true
            });

            logger.info(`Job recommendations refreshed for user ${userId}`);
        } catch (error) {
            logger.error('Error refreshing job recommendations:', error);
            throw new Error('Failed to refresh job recommendations');
        }
    }

    /**
     * Get user metrics for analytics
     */
    async getUserMetrics(userId: string): Promise<{
        profileCompleteness: number;
        applicationVelocity: number; // Applications per week
        responseRate: number; // Interviews / Applications
        averageTimeToInterview: number; // Days
        topMatchingSkills: string[];
    }> {
        try {
            const userProfile = await this.userProfileRepository.findByUserId(userId);
            const applications = await this.applicationRepository.findByUserId(userId);

            // Calculate profile completeness
            const profileCompleteness = this.calculateProfileCompleteness(userProfile);

            // Calculate application velocity (last 4 weeks)
            const fourWeeksAgo = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000);
            const recentApplications = applications.filter(app => app.appliedAt > fourWeeksAgo);
            const applicationVelocity = recentApplications.length / 4; // Per week

            // Calculate response rate
            const interviewCount = applications.filter(app =>
                app.status === 'interview' || app.status === 'offered'
            ).length;
            const responseRate = applications.length > 0 ? (interviewCount / applications.length) * 100 : 0;

            // Calculate average time to interview
            const interviewApplications = applications.filter(app =>
                app.status === 'interview' && app.interviewDate
            );
            let averageTimeToInterview = 0;
            if (interviewApplications.length > 0) {
                const totalDays = interviewApplications.reduce((sum, app) => {
                    const daysDiff = Math.floor(
                        (app.interviewDate!.getTime() - app.appliedAt.getTime()) / (1000 * 60 * 60 * 24)
                    );
                    return sum + daysDiff;
                }, 0);
                averageTimeToInterview = totalDays / interviewApplications.length;
            }

            // Get top matching skills
            const matchStats = await this.jobMatchingService.getMatchStatistics(userId);
            const topMatchingSkills = matchStats.topSkillMatches.slice(0, 5);

            return {
                profileCompleteness,
                applicationVelocity: Math.round(applicationVelocity * 100) / 100,
                responseRate: Math.round(responseRate * 100) / 100,
                averageTimeToInterview: Math.round(averageTimeToInterview * 100) / 100,
                topMatchingSkills
            };
        } catch (error) {
            logger.error('Error getting user metrics:', error);
            throw new Error('Failed to get user metrics');
        }
    }

    /**
     * Check if user profile is complete
     */
    private isProfileComplete(userProfile: any): boolean {
        if (!userProfile) return false;

        return !!(
            userProfile.name &&
            userProfile.location &&
            userProfile.skills && userProfile.skills.length > 0 &&
            userProfile.experienceLevel &&
            userProfile.resumeId
        );
    }

    /**
     * Calculate profile completeness percentage
     */
    private calculateProfileCompleteness(userProfile: any): number {
        if (!userProfile) return 0;

        const fields = [
            userProfile.name,
            userProfile.location,
            userProfile.skills && userProfile.skills.length > 0,
            userProfile.experienceLevel,
            userProfile.resumeId,
            userProfile.preferences && userProfile.preferences.locations,
            userProfile.age
        ];

        const completedFields = fields.filter(field => !!field).length;
        return Math.round((completedFields / fields.length) * 100);
    }

    /**
     * Get suggested locations based on job matches and user preferences
     */
    private async getSuggestedLocations(userId: string): Promise<string[]> {
        try {
            const userProfile = await this.userProfileRepository.findByUserId(userId);
            const jobMatches = await this.jobMatchingService.getJobMatches(userId, { maxResults: 50 });

            // Get locations from top matching jobs
            const locationCounts: Record<string, number> = {};

            jobMatches.matches.forEach(match => {
                if (match.score > 50) { // Only consider good matches
                    const location = match.job.location;
                    locationCounts[location] = (locationCounts[location] || 0) + 1;
                }
            });

            // Sort by frequency and return top 5
            return Object.entries(locationCounts)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 5)
                .map(([location]) => location);
        } catch (error) {
            logger.error('Error getting suggested locations:', error);
            return [];
        }
    }
}