import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/Tabs';
import { JobCard } from './JobCard';
import { JobDetailModal } from './JobDetailModal';
import { JobSearchFilters } from './JobSearchFilters';
import { JobScrapingManager } from './JobScrapingManager';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { ErrorMessage } from '../ui/ErrorMessage';
import { Pagination } from '../ui/Pagination';
import {
    jobApi,
    applicationApi,
    Job,
    JobMatch,
    JobFilters,
    JobMatchFilters,
    JobSearchResult,
    JobMatchResult,
    Application
} from '../../services/api';
import { AlertCircle, Star, Briefcase, Clock, CheckCircle, Settings } from 'lucide-react';

type JobCategory = 'matches' | 'all' | 'applied' | 'interviews' | 'offers' | 'scraping';

interface JobDiscoveryProps {
    initialCategory?: JobCategory;
}

export function JobDiscovery({ initialCategory = 'matches' }: JobDiscoveryProps) {
    const [activeCategory, setActiveCategory] = useState<JobCategory>(initialCategory);
    const [selectedJob, setSelectedJob] = useState<Job | null>(null);
    const [selectedJobMatch, setSelectedJobMatch] = useState<JobMatch | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [filters, setFilters] = useState<JobFilters>({
        limit: 20,
        offset: 0,
        isAvailable: true,
    });

    const [matchFilters, setMatchFilters] = useState<JobMatchFilters>({
        maxResults: 20,
        excludeApplied: true,
    });

    const queryClient = useQueryClient();

    // Fetch job matches
    const {
        data: matchesData,
        isLoading: matchesLoading,
        error: matchesError
    } = useQuery<JobMatchResult>({
        queryKey: ['job-matches', matchFilters],
        queryFn: () => jobApi.getJobMatches(matchFilters).then(res => res.data.data),
        enabled: activeCategory === 'matches',
    });

    // Fetch all jobs
    const {
        data: allJobsData,
        isLoading: allJobsLoading,
        error: allJobsError
    } = useQuery<JobSearchResult>({
        queryKey: ['jobs', filters, searchQuery],
        queryFn: () => {
            if (searchQuery) {
                return jobApi.searchJobs(searchQuery, filters).then(res => res.data.data);
            }
            return jobApi.getJobs(filters).then(res => res.data.data);
        },
        enabled: activeCategory === 'all',
    });

    // Fetch applications
    const {
        data: applications,
        isLoading: applicationsLoading,
        error: applicationsError
    } = useQuery<Application[]>({
        queryKey: ['applications'],
        queryFn: () => applicationApi.getApplications().then(res => res.data.data?.applications || []),
        enabled: ['applied', 'interviews', 'offers'].includes(activeCategory),
    });

    // Apply to job mutation
    const applyMutation = useMutation({
        mutationFn: (jobId: string) => jobApi.applyToJob(jobId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['applications'] });
            queryClient.invalidateQueries({ queryKey: ['job-matches'] });
        },
    });

    const handleViewDetails = (job: Job, match?: JobMatch) => {
        setSelectedJob(job);
        setSelectedJobMatch(match || null);
        setIsModalOpen(true);
    };

    const handleApply = async (job: Job) => {
        try {
            await applyMutation.mutateAsync(job.id);
        } catch (error) {
            console.error('Failed to apply to job:', error);
        }
    };

    const handleSearch = (query: string) => {
        setSearchQuery(query);
        setFilters(prev => ({ ...prev, offset: 0 }));
        // Convert search query to keywords array for match filters
        const keywords = query ? query.split(' ').filter(k => k.length > 0) : undefined;
        setMatchFilters(prev => ({ ...prev, keywords }));
    };

    const handleFiltersChange = (newFilters: JobFilters) => {
        setFilters(newFilters);
        // Sync relevant filters to match filters
        setMatchFilters(prev => ({
            ...prev,
            experienceLevels: newFilters.experienceLevel ? [newFilters.experienceLevel] : undefined,
            locations: newFilters.location ? [newFilters.location] : undefined,
        }));
    };

    const handlePageChange = (page: number) => {
        const offset = (page - 1) * (filters.limit || 20);
        setFilters(prev => ({ ...prev, offset }));
    };

    const getAppliedJobIds = (): string[] => {
        return applications?.map(app => app.jobId) || [];
    };

    const getJobsByStatus = (status: string): Job[] => {
        if (!applications) return [];

        // In a real implementation, you'd need to fetch the job details for these applications
        // For now, we'll return an empty array as this would require additional API calls
        return [];
    };

    const renderJobList = () => {
        let jobs: Job[] = [];
        let matches: JobMatch[] = [];
        let isLoading = false;
        let error: any = null;
        let total = 0;
        let appliedJobIds = getAppliedJobIds();

        switch (activeCategory) {
            case 'matches':
                jobs = matchesData?.matches?.map(m => m.job) || [];
                matches = matchesData?.matches || [];
                isLoading = matchesLoading;
                error = matchesError;
                total = matchesData?.total || 0;
                break;
            case 'all':
                jobs = allJobsData?.jobs || [];
                isLoading = allJobsLoading;
                error = allJobsError;
                total = allJobsData?.total || 0;
                break;
            case 'applied':
                jobs = getJobsByStatus('applied');
                isLoading = applicationsLoading;
                error = applicationsError;
                break;
            case 'interviews':
                jobs = getJobsByStatus('interview');
                isLoading = applicationsLoading;
                error = applicationsError;
                break;
            case 'offers':
                jobs = getJobsByStatus('offered');
                isLoading = applicationsLoading;
                error = applicationsError;
                break;
        }

        if (isLoading) {
            return (
                <div className="flex justify-center items-center py-12">
                    <LoadingSpinner size="lg" />
                </div>
            );
        }

        if (error) {
            return (
                <ErrorMessage message="Failed to load jobs. Please try again." />
            );
        }

        if (jobs.length === 0) {
            return (
                <div className="text-center py-12">
                    <AlertCircle className="h-12 w-12 text-dark-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-white mb-2">No jobs found</h3>
                    <p className="text-dark-300">
                        {activeCategory === 'matches'
                            ? 'No job matches found. Try updating your profile or preferences.'
                            : 'No jobs found matching your criteria. Try adjusting your filters.'
                        }
                    </p>
                </div>
            );
        }

        return (
            <>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    {jobs.map((job) => {
                        const match = matches.find(m => m.job.id === job.id);
                        const isApplied = appliedJobIds.includes(job.id);

                        return (
                            <JobCard
                                key={job.id}
                                job={job}
                                match={match}
                                onViewDetails={(job) => handleViewDetails(job, match)}
                                onApply={handleApply}
                                showMatchScore={activeCategory === 'matches'}
                                isApplied={isApplied}
                            />
                        );
                    })}
                </div>

                {/* Pagination */}
                {total > 20 && (
                    <Pagination
                        currentPage={Math.floor((filters.offset || 0) / (filters.limit || 20)) + 1}
                        totalPages={Math.ceil(total / (filters.limit || 20))}
                        onPageChange={handlePageChange}
                    />
                )}
            </>
        );
    };

    const getCategoryCount = (category: JobCategory): number => {
        switch (category) {
            case 'matches':
                return matchesData?.total || 0;
            case 'all':
                return allJobsData?.total || 0;
            case 'applied':
                return applications?.filter(app => app.status === 'applied').length || 0;
            case 'interviews':
                return applications?.filter(app => app.status === 'interview').length || 0;
            case 'offers':
                return applications?.filter(app => app.status === 'offered').length || 0;
            default:
                return 0;
        }
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

            {/* Search and Filters */}
            {(activeCategory === 'matches' || activeCategory === 'all') && (
                <JobSearchFilters
                    filters={filters}
                    onFiltersChange={handleFiltersChange}
                    onSearch={handleSearch}
                    isLoading={matchesLoading || allJobsLoading}
                />
            )}

            {/* Category Tabs */}
            <Tabs value={activeCategory} onValueChange={(value) => setActiveCategory(value as JobCategory)}>
                <TabsList className="mb-6">
                    <TabsTrigger value="matches" className="flex items-center gap-2">
                        <Star className="h-4 w-4" />
                        Matches
                        {getCategoryCount('matches') > 0 && (
                            <span className="bg-accent-blue/20 text-accent-blue text-xs px-2 py-1 rounded-full border border-accent-blue/30">
                                {getCategoryCount('matches')}
                            </span>
                        )}
                    </TabsTrigger>
                    <TabsTrigger value="all" className="flex items-center gap-2">
                        <Briefcase className="h-4 w-4" />
                        All Jobs
                        {getCategoryCount('all') > 0 && (
                            <span className="bg-dark-700/50 text-dark-300 text-xs px-2 py-1 rounded-full border border-dark-600">
                                {getCategoryCount('all')}
                            </span>
                        )}
                    </TabsTrigger>
                    <TabsTrigger value="applied" className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4" />
                        Applied
                        {getCategoryCount('applied') > 0 && (
                            <span className="bg-accent-green/20 text-accent-green text-xs px-2 py-1 rounded-full border border-accent-green/30">
                                {getCategoryCount('applied')}
                            </span>
                        )}
                    </TabsTrigger>
                    <TabsTrigger value="interviews" className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Interviews
                        {getCategoryCount('interviews') > 0 && (
                            <span className="bg-accent-orange/20 text-accent-orange text-xs px-2 py-1 rounded-full border border-accent-orange/30">
                                {getCategoryCount('interviews')}
                            </span>
                        )}
                    </TabsTrigger>
                    <TabsTrigger value="offers" className="flex items-center gap-2">
                        <Star className="h-4 w-4" />
                        Offers
                        {getCategoryCount('offers') > 0 && (
                            <span className="bg-accent-purple/20 text-accent-purple text-xs px-2 py-1 rounded-full border border-accent-purple/30">
                                {getCategoryCount('offers')}
                            </span>
                        )}
                    </TabsTrigger>
                    <TabsTrigger value="scraping" className="flex items-center gap-2">
                        <Settings className="h-4 w-4" />
                        Scraping
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="matches">
                    {renderJobList()}
                </TabsContent>

                <TabsContent value="all">
                    {renderJobList()}
                </TabsContent>

                <TabsContent value="applied">
                    {renderJobList()}
                </TabsContent>

                <TabsContent value="interviews">
                    {renderJobList()}
                </TabsContent>

                <TabsContent value="offers">
                    {renderJobList()}
                </TabsContent>

                <TabsContent value="scraping">
                    <JobScrapingManager />
                </TabsContent>
            </Tabs>

            {/* Job Detail Modal */}
            {selectedJob && (
                <JobDetailModal
                    job={selectedJob}
                    match={selectedJobMatch}
                    isOpen={isModalOpen}
                    onClose={() => {
                        setIsModalOpen(false);
                        setSelectedJob(null);
                        setSelectedJobMatch(null);
                    }}
                    onApply={handleApply}
                    isApplied={getAppliedJobIds().includes(selectedJob.id)}
                    showMatchScore={!!selectedJobMatch}
                />
            )}
        </div>
    );
}