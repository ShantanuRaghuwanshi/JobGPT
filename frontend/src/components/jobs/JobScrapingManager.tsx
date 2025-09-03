import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { jobApi, CrawlJobRequest, QueueStats } from '../../services/api';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { ErrorMessage } from '../ui/ErrorMessage';
import {
    Play,
    RefreshCw,
    Clock,
    CheckCircle,
    XCircle,
    Activity,
    Settings,
    AlertTriangle
} from 'lucide-react';

export function JobScrapingManager() {
    const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
    const [crawlOptions, setCrawlOptions] = useState<CrawlJobRequest>({
        validateExisting: false,
        companies: []
    });

    const queryClient = useQueryClient();

    // Fetch queue statistics
    const {
        data: queueStats,
        isLoading: statsLoading,
        error: statsError,
        refetch: refetchStats
    } = useQuery<QueueStats>({
        queryKey: ['queue-stats'],
        queryFn: () => jobApi.getQueueStats().then(res => res.data.data),
        refetchInterval: 5000, // Refresh every 5 seconds
    });

    // Trigger crawl mutation
    const crawlMutation = useMutation({
        mutationFn: (request: CrawlJobRequest) => jobApi.triggerCrawl(request),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['queue-stats'] });
            queryClient.invalidateQueries({ queryKey: ['jobs'] });
            queryClient.invalidateQueries({ queryKey: ['job-matches'] });
        },
    });

    const handleTriggerCrawl = async () => {
        try {
            await crawlMutation.mutateAsync(crawlOptions);
        } catch (error) {
            console.error('Failed to trigger job crawl:', error);
        }
    };

    const handleQuickCrawl = async () => {
        try {
            await crawlMutation.mutateAsync({ validateExisting: false });
        } catch (error) {
            console.error('Failed to trigger quick crawl:', error);
        }
    };

    const handleFullCrawl = async () => {
        try {
            await crawlMutation.mutateAsync({ validateExisting: true });
        } catch (error) {
            console.error('Failed to trigger full crawl:', error);
        }
    };

    const getStatusColor = (count: number) => {
        if (count === 0) return 'text-dark-400';
        if (count < 5) return 'text-accent-green';
        if (count < 10) return 'text-accent-orange';
        return 'text-accent-red';
    };

    const getStatusIcon = (type: 'waiting' | 'active' | 'completed' | 'failed', count: number) => {
        const iconClass = `h-4 w-4 ${getStatusColor(count)}`;

        switch (type) {
            case 'waiting':
                return <Clock className={iconClass} />;
            case 'active':
                return <Activity className={iconClass} />;
            case 'completed':
                return <CheckCircle className={iconClass} />;
            case 'failed':
                return <XCircle className={iconClass} />;
            default:
                return null;
        }
    };

    if (statsError) {
        return (
            <ErrorMessage
                message="Failed to load job scraping statistics"
                onRetry={() => refetchStats()}
            />
        );
    }

    return (
        <div className="bg-dark-800 rounded-lg border border-dark-700 p-6">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-xl font-semibold text-white mb-1">Job Scraping Manager</h2>
                    <p className="text-dark-300 text-sm">
                        Manage automated job collection and queue monitoring
                    </p>
                </div>
                <button
                    onClick={() => refetchStats()}
                    disabled={statsLoading}
                    className="p-2 text-dark-400 hover:text-white transition-colors"
                    title="Refresh statistics"
                >
                    <RefreshCw className={`h-4 w-4 ${statsLoading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <button
                    onClick={handleQuickCrawl}
                    disabled={crawlMutation.isPending}
                    className="flex items-center justify-center gap-2 bg-accent-blue hover:bg-accent-blue/80 disabled:bg-accent-blue/50 text-white px-4 py-3 rounded-lg transition-colors"
                >
                    {crawlMutation.isPending ? (
                        <LoadingSpinner size="sm" />
                    ) : (
                        <Play className="h-4 w-4" />
                    )}
                    Quick Crawl
                </button>

                <button
                    onClick={handleFullCrawl}
                    disabled={crawlMutation.isPending}
                    className="flex items-center justify-center gap-2 bg-accent-green hover:bg-accent-green/80 disabled:bg-accent-green/50 text-white px-4 py-3 rounded-lg transition-colors"
                >
                    {crawlMutation.isPending ? (
                        <LoadingSpinner size="sm" />
                    ) : (
                        <RefreshCw className="h-4 w-4" />
                    )}
                    Full Crawl + Validation
                </button>
            </div>

            {/* Advanced Options */}
            <div className="mb-6">
                <button
                    onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
                    className="flex items-center gap-2 text-dark-300 hover:text-white transition-colors text-sm"
                >
                    <Settings className="h-4 w-4" />
                    Advanced Options
                </button>

                {isAdvancedOpen && (
                    <div className="mt-4 p-4 bg-dark-900 rounded-lg border border-dark-600">
                        <div className="space-y-4">
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="validateExisting"
                                    checked={crawlOptions.validateExisting}
                                    onChange={(e) => setCrawlOptions(prev => ({
                                        ...prev,
                                        validateExisting: e.target.checked
                                    }))}
                                    className="rounded border-dark-600 bg-dark-700 text-accent-blue focus:ring-accent-blue focus:ring-offset-0"
                                />
                                <label htmlFor="validateExisting" className="text-sm text-dark-300">
                                    Validate existing jobs (check if still available)
                                </label>
                            </div>

                            <div>
                                <label className="block text-sm text-dark-300 mb-2">
                                    Target Companies (optional)
                                </label>
                                <input
                                    type="text"
                                    placeholder="Enter company names, separated by commas"
                                    value={crawlOptions.companies?.join(', ') || ''}
                                    onChange={(e) => setCrawlOptions(prev => ({
                                        ...prev,
                                        companies: e.target.value.split(',').map(c => c.trim()).filter(Boolean)
                                    }))}
                                    className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white placeholder-dark-400 focus:outline-none focus:ring-2 focus:ring-accent-blue focus:border-transparent"
                                />
                            </div>

                            <button
                                onClick={handleTriggerCrawl}
                                disabled={crawlMutation.isPending}
                                className="flex items-center gap-2 bg-accent-purple hover:bg-accent-purple/80 disabled:bg-accent-purple/50 text-white px-4 py-2 rounded-lg transition-colors"
                            >
                                {crawlMutation.isPending ? (
                                    <LoadingSpinner size="sm" />
                                ) : (
                                    <Play className="h-4 w-4" />
                                )}
                                Custom Crawl
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Queue Statistics */}
            {queueStats && (
                <div className="space-y-4">
                    <h3 className="text-lg font-medium text-white">Queue Status</h3>

                    {/* Crawling Queue */}
                    <div className="bg-dark-900 rounded-lg p-4 border border-dark-600">
                        <h4 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                            <Activity className="h-4 w-4 text-accent-blue" />
                            Job Crawling Queue
                        </h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="text-center">
                                <div className="flex items-center justify-center gap-1 mb-1">
                                    {getStatusIcon('waiting', queueStats.crawling.waiting)}
                                    <span className={`text-lg font-semibold ${getStatusColor(queueStats.crawling.waiting)}`}>
                                        {queueStats.crawling.waiting}
                                    </span>
                                </div>
                                <p className="text-xs text-dark-400">Waiting</p>
                            </div>
                            <div className="text-center">
                                <div className="flex items-center justify-center gap-1 mb-1">
                                    {getStatusIcon('active', queueStats.crawling.active)}
                                    <span className={`text-lg font-semibold ${getStatusColor(queueStats.crawling.active)}`}>
                                        {queueStats.crawling.active}
                                    </span>
                                </div>
                                <p className="text-xs text-dark-400">Active</p>
                            </div>
                            <div className="text-center">
                                <div className="flex items-center justify-center gap-1 mb-1">
                                    {getStatusIcon('completed', queueStats.crawling.completed)}
                                    <span className={`text-lg font-semibold ${getStatusColor(queueStats.crawling.completed)}`}>
                                        {queueStats.crawling.completed}
                                    </span>
                                </div>
                                <p className="text-xs text-dark-400">Completed</p>
                            </div>
                            <div className="text-center">
                                <div className="flex items-center justify-center gap-1 mb-1">
                                    {getStatusIcon('failed', queueStats.crawling.failed)}
                                    <span className={`text-lg font-semibold ${getStatusColor(queueStats.crawling.failed)}`}>
                                        {queueStats.crawling.failed}
                                    </span>
                                </div>
                                <p className="text-xs text-dark-400">Failed</p>
                            </div>
                        </div>
                    </div>

                    {/* Validation Queue */}
                    <div className="bg-dark-900 rounded-lg p-4 border border-dark-600">
                        <h4 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-accent-green" />
                            Job Validation Queue
                        </h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="text-center">
                                <div className="flex items-center justify-center gap-1 mb-1">
                                    {getStatusIcon('waiting', queueStats.validation.waiting)}
                                    <span className={`text-lg font-semibold ${getStatusColor(queueStats.validation.waiting)}`}>
                                        {queueStats.validation.waiting}
                                    </span>
                                </div>
                                <p className="text-xs text-dark-400">Waiting</p>
                            </div>
                            <div className="text-center">
                                <div className="flex items-center justify-center gap-1 mb-1">
                                    {getStatusIcon('active', queueStats.validation.active)}
                                    <span className={`text-lg font-semibold ${getStatusColor(queueStats.validation.active)}`}>
                                        {queueStats.validation.active}
                                    </span>
                                </div>
                                <p className="text-xs text-dark-400">Active</p>
                            </div>
                            <div className="text-center">
                                <div className="flex items-center justify-center gap-1 mb-1">
                                    {getStatusIcon('completed', queueStats.validation.completed)}
                                    <span className={`text-lg font-semibold ${getStatusColor(queueStats.validation.completed)}`}>
                                        {queueStats.validation.completed}
                                    </span>
                                </div>
                                <p className="text-xs text-dark-400">Completed</p>
                            </div>
                            <div className="text-center">
                                <div className="flex items-center justify-center gap-1 mb-1">
                                    {getStatusIcon('failed', queueStats.validation.failed)}
                                    <span className={`text-lg font-semibold ${getStatusColor(queueStats.validation.failed)}`}>
                                        {queueStats.validation.failed}
                                    </span>
                                </div>
                                <p className="text-xs text-dark-400">Failed</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Status Messages */}
            {crawlMutation.isSuccess && (
                <div className="mt-4 p-3 bg-accent-green/10 border border-accent-green/30 rounded-lg">
                    <div className="flex items-center gap-2 text-accent-green">
                        <CheckCircle className="h-4 w-4" />
                        <span className="text-sm">Job crawling has been scheduled successfully!</span>
                    </div>
                </div>
            )}

            {crawlMutation.isError && (
                <div className="mt-4 p-3 bg-accent-red/10 border border-accent-red/30 rounded-lg">
                    <div className="flex items-center gap-2 text-accent-red">
                        <AlertTriangle className="h-4 w-4" />
                        <span className="text-sm">
                            Failed to schedule job crawling. Please try again.
                        </span>
                    </div>
                </div>
            )}

            {/* Info */}
            <div className="mt-6 p-3 bg-dark-900 border border-dark-600 rounded-lg">
                <p className="text-xs text-dark-400">
                    <strong>Note:</strong> Jobs are automatically crawled every 6 hours.
                    Use manual crawling to get the latest jobs immediately or when testing new configurations.
                </p>
            </div>
        </div>
    );
}