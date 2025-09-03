import React from 'react';
import { ApplicationStatus } from '../../services/api';

interface ApplicationStatusBadgeProps {
    status: ApplicationStatus;
    className?: string;
}

const statusConfig = {
    applied: {
        label: 'Applied',
        bgColor: 'bg-blue-100',
        textColor: 'text-blue-800',
        borderColor: 'border-blue-200',
        icon: '📝'
    },
    interview: {
        label: 'Interview',
        bgColor: 'bg-yellow-100',
        textColor: 'text-yellow-800',
        borderColor: 'border-yellow-200',
        icon: '🗣️'
    },
    offered: {
        label: 'Offered',
        bgColor: 'bg-green-100',
        textColor: 'text-green-800',
        borderColor: 'border-green-200',
        icon: '🎉'
    },
    rejected: {
        label: 'Rejected',
        bgColor: 'bg-red-100',
        textColor: 'text-red-800',
        borderColor: 'border-red-200',
        icon: '❌'
    }
};

export const ApplicationStatusBadge: React.FC<ApplicationStatusBadgeProps> = ({
    status,
    className = ''
}) => {
    const config = statusConfig[status];

    return (
        <span
            className={`
                inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border
                ${config.bgColor} ${config.textColor} ${config.borderColor}
                ${className}
            `}
        >
            <span className="text-sm">{config.icon}</span>
            {config.label}
        </span>
    );
};

export default ApplicationStatusBadge;