import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { jobApi, QueueStats } from '../../services/api';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { Activity, Clock, CheckCircle, XCircle, RefreshCw } from 'lucide-react';

export function JobScrapingWidget() {
    const {
        data: queueStats,
        isLoading,
        error,
        refetch
    } = useQuery<QueueStats>({
        queryKey: ['queue-stats-widget'],
        queryFn: () => jobApi.getQueueStats().then(res => res.data.data),
        refetchInterval: 30000, // Refresh every 30 seconds
    });

    if (isLoading) {
        return (
            <div className="bg-dark-800 rounded-lg border border-dark-700 p-6">
                <div className="flex items-center justify-center h-32">
                    <LoadingSpinner size="sm" />
                </div>
            </div>
        );
    }

    if (error || !queueStats) {
        return (
            <div className="bg-dark-800 rounded-lg border border-dark-700 p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-white">Job Scraping</h3>
                    <button
                        onClick={() => refetch()}
                        className="p-1 text-dark-400 hover:text-white transition-colors"
                    >
                        <RefreshCw className="h-4 w-4" />
                    </button>
                </div>
                <p className="text-dark-400 text-sm">Unable to load scraping status</p>
            </div>
        );
    }

    const totalActive = queueStats.crawling.active + queueStats.validation.active;
    const totalWaiting = queueStats.crawling.waiting + queueStats.validation.waiting;
    const totalFailed = queueStats.crawling.failed + queueStats.validation.failed;

    const getStatusColor = (count: number) => {
        if (count === 0) return 'text-dark-400';
        if (count < 5) return 'text-accent-green';
        if (count < 10) return 'text-accent-orange';
        return 'text-accent-red';
    };

    return (
        <div className="bg-dark-800 rounded-lg border border-dark-700 p-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-white">Job Scraping</h3>
                <button
                    onClick={() => refetch()}
                    className="p-1 text-dark-400 hover:text-white transition-colors"
                >
                    <RefreshCw className="h-4 w-4" />
                </button>
            </div>

            <div className="space-y-4">
                {/* Overall Status */}
                <div className="flex items-center gap-2">
                    {totalActive > 0 ? (
                        <>
                            <Activity className="h-4 w-4 text-accent-blue animate-pulse" />
                            <span className="text-sm text-accent-blue">Scraping in progress</span>
                        </>
                    ) : totalWaiting > 0 ? (
                        <>
                            <Clock className="h-4 w-4 text-accent-orange" />
                            <span className="text-sm text-accent-orange">Jobs queued</span>
                        </>
                    ) : (
                        <>
                            <CheckCircle className="h-4 w-4 text-accent-green" />
                            <span className="text-sm text-accent-green">All queues idle</span>
                        </>
                    )}
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                        <div className={`text-lg font-semibold ${getStatusColor(totalActive)}`}>
                            {totalActive}
                        </div>
                        <p className="text-xs text-dark-400">Active</p>
                    </div>
                    <div className="text-center">
                        <div className={`text-lg font-semibold ${getStatusColor(totalWaiting)}`}>
                            {totalWaiting}
                        </div>
                        <p className="text-xs text-dark-400">Waiting</p>
                    </div>
                    <div className="text-center">
                        <div className={`text-lg font-semibold ${getStatusColor(totalFailed)}`}>
                            {totalFailed}
                        </div>
                        <p className="text-xs text-dark-400">Failed</p>
                    </div>
                </div>

                {/* Recent Activity */}
                <div className="pt-2 border-t border-dark-700">
                    <div className="flex justify-between items-center text-xs">
                        <span className="text-dark-400">
                            Crawling: {queueStats.crawling.completed} completed
                        </span>
                        <span className="text-dark-400">
                            Validation: {queueStats.validation.completed} completed
                        </span>
                    </div>
                </div>

                {/* Action Link */}
                <div className="pt-2">
                    <a
                        href="/jobs?tab=scraping"
                        className="text-xs text-accent-blue hover:text-accent-blue/80 transition-colors"
                    >
                        Manage scraping →
                    </a>
                </div>
            </div>
        </div>
    );
}