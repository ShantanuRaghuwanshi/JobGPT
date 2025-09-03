import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { jobApi, QueueStats } from '../../services/api';
import { CheckCircle, AlertTriangle, Activity, X } from 'lucide-react';

interface JobScrapingNotificationProps {
    onDismiss?: () => void;
}

export function JobScrapingNotification({ onDismiss }: JobScrapingNotificationProps) {
    const [lastStats, setLastStats] = useState<QueueStats | null>(null);
    const [notification, setNotification] = useState<{
        type: 'success' | 'warning' | 'info';
        message: string;
        show: boolean;
    }>({ type: 'info', message: '', show: false });

    const { data: queueStats } = useQuery<QueueStats>({
        queryKey: ['queue-stats-notification'],
        queryFn: () => jobApi.getQueueStats().then(res => res.data.data),
        refetchInterval: 10000, // Check every 10 seconds
    });

    useEffect(() => {
        if (!queueStats || !lastStats) {
            setLastStats(queueStats);
            return;
        }

        // Check for completed crawling jobs
        const crawlingCompleted = queueStats.crawling.completed - lastStats.crawling.completed;
        const validationCompleted = queueStats.validation.completed - lastStats.validation.completed;
        const crawlingFailed = queueStats.crawling.failed - lastStats.crawling.failed;
        const validationFailed = queueStats.validation.failed - lastStats.validation.failed;

        if (crawlingCompleted > 0) {
            setNotification({
                type: 'success',
                message: `Job scraping completed! ${crawlingCompleted} new job${crawlingCompleted > 1 ? 's' : ''} processed.`,
                show: true
            });
        } else if (validationCompleted > 0) {
            setNotification({
                type: 'info',
                message: `Job validation completed! ${validationCompleted} job${validationCompleted > 1 ? 's' : ''} validated.`,
                show: true
            });
        } else if (crawlingFailed > 0 || validationFailed > 0) {
            setNotification({
                type: 'warning',
                message: `Some scraping tasks failed. Check the scraping manager for details.`,
                show: true
            });
        }

        setLastStats(queueStats);
    }, [queueStats, lastStats]);

    // Auto-dismiss after 5 seconds
    useEffect(() => {
        if (notification.show) {
            const timer = setTimeout(() => {
                setNotification(prev => ({ ...prev, show: false }));
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [notification.show]);

    if (!notification.show) {
        return null;
    }

    const getIcon = () => {
        switch (notification.type) {
            case 'success':
                return <CheckCircle className="h-5 w-5 text-accent-green" />;
            case 'warning':
                return <AlertTriangle className="h-5 w-5 text-accent-orange" />;
            case 'info':
                return <Activity className="h-5 w-5 text-accent-blue" />;
            default:
                return null;
        }
    };

    const getBgColor = () => {
        switch (notification.type) {
            case 'success':
                return 'bg-accent-green/10 border-accent-green/30';
            case 'warning':
                return 'bg-accent-orange/10 border-accent-orange/30';
            case 'info':
                return 'bg-accent-blue/10 border-accent-blue/30';
            default:
                return 'bg-dark-800 border-dark-700';
        }
    };

    const getTextColor = () => {
        switch (notification.type) {
            case 'success':
                return 'text-accent-green';
            case 'warning':
                return 'text-accent-orange';
            case 'info':
                return 'text-accent-blue';
            default:
                return 'text-white';
        }
    };

    return (
        <div className={`fixed top-4 right-4 z-50 max-w-sm p-4 rounded-lg border ${getBgColor()} backdrop-blur-sm`}>
            <div className="flex items-start gap-3">
                {getIcon()}
                <div className="flex-1">
                    <p className={`text-sm ${getTextColor()}`}>
                        {notification.message}
                    </p>
                </div>
                <button
                    onClick={() => {
                        setNotification(prev => ({ ...prev, show: false }));
                        onDismiss?.();
                    }}
                    className="text-dark-400 hover:text-white transition-colors"
                >
                    <X className="h-4 w-4" />
                </button>
            </div>
        </div>
    );
}