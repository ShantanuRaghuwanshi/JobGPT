import React from 'react';
import { UpcomingInterview } from '../../services/api';

interface UpcomingInterviewsProps {
    interviews: UpcomingInterview[];
}

const UpcomingInterviews: React.FC<UpcomingInterviewsProps> = ({ interviews }) => {
    const formatInterviewDate = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffInDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        const timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        if (diffInDays === 0) {
            return `Today at ${timeString}`;
        } else if (diffInDays === 1) {
            return `Tomorrow at ${timeString}`;
        } else if (diffInDays <= 7) {
            return `${date.toLocaleDateString([], { weekday: 'long' })} at ${timeString}`;
        } else {
            return `${date.toLocaleDateString()} at ${timeString}`;
        }
    };

    const getUrgencyColor = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffInHours = (date.getTime() - now.getTime()) / (1000 * 60 * 60);

        if (diffInHours <= 24) {
            return 'border-red-200 bg-red-50';
        } else if (diffInHours <= 72) {
            return 'border-yellow-200 bg-yellow-50';
        } else {
            return 'border-green-200 bg-green-50';
        }
    };

    const getUrgencyIndicator = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffInHours = (date.getTime() - now.getTime()) / (1000 * 60 * 60);

        if (diffInHours <= 24) {
            return { color: 'text-red-600', icon: '🔴', label: 'Soon' };
        } else if (diffInHours <= 72) {
            return { color: 'text-yellow-600', icon: '🟡', label: 'This week' };
        } else {
            return { color: 'text-green-600', icon: '🟢', label: 'Upcoming' };
        }
    };

    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-semibold text-gray-900">Upcoming Interviews</h2>
                    <span className="text-sm text-gray-500">
                        {interviews.length} scheduled
                    </span>
                </div>

                {interviews.length === 0 ? (
                    <div className="text-center py-8">
                        <div className="text-gray-400 text-4xl mb-4">📅</div>
                        <p className="text-gray-500">No upcoming interviews</p>
                        <p className="text-sm text-gray-400 mt-1">
                            Keep applying to schedule more interviews
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {interviews.map((interview, index) => {
                            const urgency = getUrgencyIndicator(interview.interviewDate);

                            return (
                                <div
                                    key={index}
                                    className={`p-4 rounded-lg border-2 ${getUrgencyColor(interview.interviewDate)}`}
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center space-x-2 mb-2">
                                                <h3 className="font-medium text-gray-900">
                                                    {interview.jobTitle}
                                                </h3>
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${urgency.color} bg-white`}>
                                                    {urgency.icon} {urgency.label}
                                                </span>
                                            </div>
                                            <p className="text-sm text-gray-600 mb-2">
                                                {interview.company}
                                            </p>
                                            <p className="text-sm font-medium text-gray-900">
                                                {formatInterviewDate(interview.interviewDate)}
                                            </p>
                                        </div>
                                        <div className="flex-shrink-0 ml-4">
                                            <button
                                                onClick={() => {
                                                    // Navigate to application details
                                                    window.location.href = `/applications/${interview.applicationId}`;
                                                }}
                                                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                                            >
                                                View Details
                                            </button>
                                        </div>
                                    </div>

                                    {/* Quick Actions */}
                                    <div className="mt-3 flex space-x-2">
                                        <button
                                            onClick={() => {
                                                // Add to calendar functionality
                                                const event = {
                                                    title: `Interview: ${interview.jobTitle} at ${interview.company}`,
                                                    start: new Date(interview.interviewDate),
                                                    duration: 60 // 1 hour default
                                                };

                                                // Create calendar URL (Google Calendar example)
                                                const startTime = new Date(interview.interviewDate);
                                                const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);
                                                const calendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.title)}&dates=${startTime.toISOString().replace(/[-:]/g, '').split('.')[0]}Z/${endTime.toISOString().replace(/[-:]/g, '').split('.')[0]}Z`;

                                                window.open(calendarUrl, '_blank');
                                            }}
                                            className="inline-flex items-center px-2.5 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
                                        >
                                            📅 Add to Calendar
                                        </button>
                                        <button
                                            onClick={() => {
                                                // Prepare for interview functionality
                                                window.location.href = `/applications/${interview.applicationId}?tab=preparation`;
                                            }}
                                            className="inline-flex items-center px-2.5 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
                                        >
                                            📚 Prepare
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {interviews.length > 0 && (
                    <div className="mt-6 text-center">
                        <a
                            href="/applications?status=interview"
                            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                        >
                            View all interviews →
                        </a>
                    </div>
                )}
            </div>
        </div>
    );
};

export default UpcomingInterviews;