import { JobRepository } from '../database/repositories/job';
import { UserProfileRepository } from '../database/repositories/userProfile';
import { ApplicationRepository } from '../database/repositories/application';
import { Job, UserProfile, ExperienceLevel } from '../types/database';
import { logger } from '../config/logger';

export interface JobMatch {
    job: Job;
    score: number;
    matchReasons: string[];
    skillMatches: string[];
    locationMatch: boolean;
    experienceMatch: boolean;
}

export interface JobMatchFilters {
    minScore?: number;
    maxResults?: number;
    excludeApplied?: boolean;
    experienceLevels?: ExperienceLevel[];
    locations?: string[];
    keywords?: string[];
}

export interface JobMatchResult {
    matches: JobMatch[];
    total: number;
    userProfile: UserProfile;
    appliedJobIds: string[];
}

export class JobMatchingService {
    constructor(
        private jobRepository: JobRepository,
        private userProfileRepository: UserProfileRepository,
        private applicationRepository: ApplicationRepository
    ) { }

    /**
     * Get job matches for a user based on their profile and preferences
     */
    async getJobMatches(userId: string, filters: JobMatchFilters = {}): Promise<JobMatchResult> {
        try {
            // Get user profile
            const userProfile = await this.userProfileRepository.findByUserId(userId);
            if (!userProfile) {
                logger.error('User profile not found', { userId });
                throw new Error('User profile not found. Please create your profile first to get job matches.');
            }

            // Get user's applied jobs to exclude them if requested
            const appliedJobs = await this.applicationRepository.findByUserId(userId);
            const appliedJobIds = appliedJobs.map(app => app.jobId);

            // Get available jobs
            const availableJobs = await this.jobRepository.findByFilters(
                { isAvailable: true },
                { limit: 1000 } // Get a large set to score and filter
            );

            // Filter out applied jobs if requested
            let jobsToScore = availableJobs;
            if (filters.excludeApplied !== false) {
                jobsToScore = availableJobs.filter(job => !appliedJobIds.includes(job.id));
            }

            // Apply additional filters
            jobsToScore = this.applyFilters(jobsToScore, userProfile, filters);

            // Score and rank jobs
            const jobMatches = jobsToScore
                .map(job => this.scoreJob(job, userProfile))
                .filter(match => match.score >= (filters.minScore || 0))
                .sort((a, b) => b.score - a.score);

            // Limit results
            const maxResults = filters.maxResults || 50;
            const limitedMatches = jobMatches.slice(0, maxResults);

            logger.info('Job matching completed', {
                userId,
                totalJobs: availableJobs.length,
                filteredJobs: jobsToScore.length,
                matches: limitedMatches.length,
                averageScore: limitedMatches.length > 0
                    ? limitedMatches.reduce((sum, match) => sum + match.score, 0) / limitedMatches.length
                    : 0
            });

            return {
                matches: limitedMatches,
                total: jobMatches.length,
                userProfile,
                appliedJobIds
            };
        } catch (error) {
            logger.error('Error getting job matches:', error);
            if (error instanceof Error && error.message === 'User profile not found') {
                throw error;
            }
            throw new Error('Failed to get job matches');
        }
    }

    /**
     * Score a job against a user profile
     */
    private scoreJob(job: Job, userProfile: UserProfile): JobMatch {
        let score = 0;
        const matchReasons: string[] = [];
        const skillMatches: string[] = [];
        let locationMatch = false;
        let experienceMatch = false;

        // Experience level matching (30% weight)
        const experienceScore = this.calculateExperienceScore(job.experienceLevel, userProfile.experienceLevel);
        score += experienceScore * 0.3;
        if (experienceScore >= 0.7) {
            experienceMatch = true;
            matchReasons.push(`Experience level match (${job.experienceLevel})`);
        }

        // Skills matching (40% weight)
        const skillsScore = this.calculateSkillsScore(job, userProfile);
        score += skillsScore.score * 0.4;
        skillMatches.push(...skillsScore.matches);
        if (skillsScore.matches.length > 0) {
            matchReasons.push(`${skillsScore.matches.length} skill matches`);
        }

        // Location matching (20% weight)
        const locationScore = this.calculateLocationScore(job, userProfile);
        score += locationScore * 0.2;
        if (locationScore > 0.5) {
            locationMatch = true;
            matchReasons.push('Location preference match');
        }

        // Keywords matching (10% weight)
        const keywordScore = this.calculateKeywordScore(job, userProfile);
        score += keywordScore * 0.1;
        if (keywordScore > 0.5) {
            matchReasons.push('Keyword preferences match');
        }

        // Normalize score to 0-100
        score = Math.min(100, Math.max(0, score * 100));

        return {
            job,
            score: Math.round(score * 100) / 100, // Round to 2 decimal places
            matchReasons,
            skillMatches,
            locationMatch,
            experienceMatch
        };
    }

    /**
     * Calculate experience level compatibility score
     */
    private calculateExperienceScore(jobLevel: ExperienceLevel, userLevel: ExperienceLevel): number {
        const levelHierarchy: Record<ExperienceLevel, number> = {
            'entry': 1,
            'mid': 2,
            'senior': 3,
            'lead': 4
        };

        const jobLevelNum = levelHierarchy[jobLevel];
        const userLevelNum = levelHierarchy[userLevel];

        // Perfect match
        if (jobLevel === userLevel) {
            return 1.0;
        }

        // User can apply to lower level positions with reduced score
        if (userLevelNum > jobLevelNum) {
            const diff = userLevelNum - jobLevelNum;
            return Math.max(0, 1 - (diff * 0.2)); // Reduce by 20% per level difference
        }

        // User can apply to one level higher with reduced score
        if (userLevelNum === jobLevelNum - 1) {
            return 0.6;
        }

        // Two levels higher is still possible but with low score
        if (userLevelNum === jobLevelNum - 2) {
            return 0.3;
        }

        // More than 2 levels higher is not recommended
        return 0.1;
    }

    /**
     * Calculate skills matching score
     */
    private calculateSkillsScore(job: Job, userProfile: UserProfile): { score: number; matches: string[] } {
        if (!userProfile.skills || userProfile.skills.length === 0) {
            return { score: 0, matches: [] };
        }

        if (!job.requirements || job.requirements.length === 0) {
            return { score: 0.5, matches: [] }; // Neutral score if no requirements specified
        }

        const userSkillsLower = userProfile.skills.map(skill => skill.toLowerCase().trim());
        const jobRequirementsLower = job.requirements.map(req => req.toLowerCase().trim());

        const matches: string[] = [];
        let exactMatches = 0;
        let partialMatches = 0;

        // Check for exact and partial matches
        for (const userSkill of userSkillsLower) {
            for (const requirement of jobRequirementsLower) {
                if (requirement.includes(userSkill) || userSkill.includes(requirement)) {
                    const originalSkill = userProfile.skills[userSkillsLower.indexOf(userSkill)];
                    if (!matches.includes(originalSkill)) {
                        matches.push(originalSkill);
                        if (requirement === userSkill) {
                            exactMatches++;
                        } else {
                            partialMatches++;
                        }
                    }
                }
            }
        }

        // Calculate score based on match quality and coverage
        const totalRequirements = job.requirements.length;
        const matchCoverage = matches.length / totalRequirements;
        const matchQuality = (exactMatches * 1.0 + partialMatches * 0.7) / matches.length || 0;

        const score = (matchCoverage * 0.7 + matchQuality * 0.3);

        return { score: Math.min(1, score), matches };
    }

    /**
     * Calculate location matching score
     */
    private calculateLocationScore(job: Job, userProfile: UserProfile): number {
        if (!userProfile.preferences?.locations || userProfile.preferences.locations.length === 0) {
            return 0.5; // Neutral score if no location preferences
        }

        const jobLocation = job.location.toLowerCase().trim();
        const userLocations = userProfile.preferences.locations.map(loc => loc.toLowerCase().trim());

        // Check for exact matches
        for (const userLocation of userLocations) {
            if (jobLocation.includes(userLocation) || userLocation.includes(jobLocation)) {
                return 1.0;
            }
        }

        // Check for remote work preference
        if (userProfile.preferences.remoteWork &&
            (jobLocation.includes('remote') || jobLocation.includes('anywhere'))) {
            return 1.0;
        }

        // Check for same country/state (basic heuristic)
        for (const userLocation of userLocations) {
            const userParts = userLocation.split(',').map(part => part.trim());
            const jobParts = jobLocation.split(',').map(part => part.trim());

            // Check if they share any location components
            for (const userPart of userParts) {
                for (const jobPart of jobParts) {
                    if (userPart === jobPart && userPart.length > 2) {
                        return 0.7; // Partial match for same region
                    }
                }
            }
        }

        return 0.1; // Low score for location mismatch
    }

    /**
     * Calculate keyword matching score
     */
    private calculateKeywordScore(job: Job, userProfile: UserProfile): number {
        if (!userProfile.preferences?.keywords || userProfile.preferences.keywords.length === 0) {
            return 0.5; // Neutral score if no keyword preferences
        }

        const jobText = `${job.title} ${job.description} ${job.company}`.toLowerCase();
        const keywords = userProfile.preferences.keywords.map(kw => kw.toLowerCase().trim());

        let matches = 0;
        for (const keyword of keywords) {
            if (jobText.includes(keyword)) {
                matches++;
            }
        }

        return matches / keywords.length;
    }

    /**
     * Apply additional filters to jobs
     */
    private applyFilters(jobs: Job[], userProfile: UserProfile, filters: JobMatchFilters): Job[] {
        let filteredJobs = jobs;

        // Filter by experience levels
        if (filters.experienceLevels && filters.experienceLevels.length > 0) {
            filteredJobs = filteredJobs.filter(job =>
                filters.experienceLevels!.includes(job.experienceLevel)
            );
        }

        // Filter by locations
        if (filters.locations && filters.locations.length > 0) {
            filteredJobs = filteredJobs.filter(job => {
                const jobLocation = job.location.toLowerCase();
                return filters.locations!.some(location =>
                    jobLocation.includes(location.toLowerCase()) ||
                    location.toLowerCase().includes(jobLocation)
                );
            });
        }

        // Filter by keywords
        if (filters.keywords && filters.keywords.length > 0) {
            filteredJobs = filteredJobs.filter(job => {
                const jobText = `${job.title} ${job.description} ${job.company}`.toLowerCase();
                return filters.keywords!.some(keyword =>
                    jobText.includes(keyword.toLowerCase())
                );
            });
        }

        return filteredJobs;
    }

    /**
     * Get job recommendations for dashboard
     */
    async getJobRecommendations(userId: string, limit: number = 10): Promise<JobMatch[]> {
        const result = await this.getJobMatches(userId, {
            maxResults: limit,
            minScore: 30, // Only show jobs with at least 30% match
            excludeApplied: true
        });

        return result.matches;
    }

    /**
     * Get similar jobs to a given job
     */
    async getSimilarJobs(jobId: string, userId: string, limit: number = 5): Promise<JobMatch[]> {
        try {
            const targetJob = await this.jobRepository.findById(jobId);
            if (!targetJob) {
                logger.error('Job not found', { jobId });
                throw new Error('Job not found');
            }

            const userProfile = await this.userProfileRepository.findByUserId(userId);
            if (!userProfile) {
                throw new Error('User profile not found');
            }

            // Get jobs with similar characteristics
            const similarJobs = await this.jobRepository.findByFilters({
                isAvailable: true,
                experienceLevel: targetJob.experienceLevel
            }, { limit: 100 });

            // Filter out the target job itself
            const filteredJobs = similarJobs.filter(job => job.id !== jobId);

            // Score jobs based on similarity to target job and user profile
            const jobMatches = filteredJobs
                .map(job => {
                    const userMatch = this.scoreJob(job, userProfile);
                    const similarityScore = this.calculateJobSimilarity(targetJob, job);

                    // Combine user match score with similarity score
                    const combinedScore = (userMatch.score * 0.6) + (similarityScore * 0.4);

                    return {
                        ...userMatch,
                        score: combinedScore
                    };
                })
                .sort((a, b) => b.score - a.score)
                .slice(0, limit);

            logger.info('Similar jobs found', {
                targetJobId: jobId,
                similarJobsCount: jobMatches.length
            });

            return jobMatches;
        } catch (error) {
            logger.error('Error getting similar jobs:', error);
            if (error instanceof Error && error.message === 'Job not found') {
                throw error;
            }
            throw new Error('Failed to get similar jobs');
        }
    }

    /**
     * Calculate similarity between two jobs
     */
    private calculateJobSimilarity(job1: Job, job2: Job): number {
        let similarity = 0;

        // Company similarity (20% weight)
        if (job1.company === job2.company) {
            similarity += 0.2;
        }

        // Experience level similarity (30% weight)
        if (job1.experienceLevel === job2.experienceLevel) {
            similarity += 0.3;
        }

        // Location similarity (20% weight)
        const location1 = job1.location.toLowerCase();
        const location2 = job2.location.toLowerCase();
        if (location1.includes(location2) || location2.includes(location1)) {
            similarity += 0.2;
        }

        // Title similarity (30% weight)
        const title1Words = job1.title.toLowerCase().split(/\s+/);
        const title2Words = job2.title.toLowerCase().split(/\s+/);
        const commonWords = title1Words.filter(word =>
            title2Words.includes(word) && word.length > 2
        );
        const titleSimilarity = commonWords.length / Math.max(title1Words.length, title2Words.length);
        similarity += titleSimilarity * 0.3;

        return Math.min(1, similarity);
    }

    /**
     * Get match statistics for a user
     */
    async getMatchStatistics(userId: string): Promise<{
        totalMatches: number;
        highQualityMatches: number; // Score >= 70
        mediumQualityMatches: number; // Score 40-69
        lowQualityMatches: number; // Score < 40
        averageScore: number;
        topSkillMatches: string[];
        preferredLocationsAvailable: number;
    }> {
        try {
            const result = await this.getJobMatches(userId, { excludeApplied: true });
            const matches = result.matches;

            const highQuality = matches.filter(m => m.score >= 70).length;
            const mediumQuality = matches.filter(m => m.score >= 40 && m.score < 70).length;
            const lowQuality = matches.filter(m => m.score < 40).length;

            const averageScore = matches.length > 0
                ? matches.reduce((sum, match) => sum + match.score, 0) / matches.length
                : 0;

            // Get top skill matches
            const skillCounts: Record<string, number> = {};
            matches.forEach(match => {
                match.skillMatches.forEach(skill => {
                    skillCounts[skill] = (skillCounts[skill] || 0) + 1;
                });
            });

            const topSkillMatches = Object.entries(skillCounts)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 10)
                .map(([skill]) => skill);

            const preferredLocationsAvailable = matches.filter(m => m.locationMatch).length;

            return {
                totalMatches: matches.length,
                highQualityMatches: highQuality,
                mediumQualityMatches: mediumQuality,
                lowQualityMatches: lowQuality,
                averageScore: Math.round(averageScore * 100) / 100,
                topSkillMatches,
                preferredLocationsAvailable
            };
        } catch (error) {
            logger.error('Error getting match statistics:', error);
            throw new Error('Failed to get match statistics');
        }
    }
}