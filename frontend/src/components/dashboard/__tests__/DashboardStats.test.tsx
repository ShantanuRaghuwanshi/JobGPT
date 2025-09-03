import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import DashboardStats from '../DashboardStats';
import { DashboardStats as DashboardStatsType } from '../../../services/api';

const mockStats: DashboardStatsType = {
    user: {
        profileComplete: true,
        totalApplications: 10,
        activeApplications: 8,
        interviewsScheduled: 3,
        offersReceived: 1
    },
    jobs: {
        totalAvailable: 800,
        newJobsToday: 50,
        matchingJobs: 25,
        averageMatchScore: 65.5
    },
    applications: {
        applied: 5,
        interview: 3,
        offered: 1,
        rejected: 1,
        successRate: 10
    },
    recommendations: {
        topMatches: [],
        skillsInDemand: ['JavaScript', 'React', 'Node.js'],
        suggestedLocations: ['San Francisco', 'Remote']
    }
};

describe('DashboardStats', () => {
    it('renders dashboard stats correctly', () => {
        render(<DashboardStats stats={mockStats} />);

        expect(screen.getByText('Overview')).toBeInTheDocument();
        expect(screen.getByText('Total Applications')).toBeInTheDocument();
        expect(screen.getByText('10')).toBeInTheDocument();
        expect(screen.getByText('Interviews Scheduled')).toBeInTheDocument();
        expect(screen.getAllByText('3')).toHaveLength(2);
        expect(screen.getByText('Offers Received')).toBeInTheDocument();
        expect(screen.getAllByText('1')).toHaveLength(3); // Offers received, offered status, and rejected status
    });

    it('displays job market stats', () => {
        render(<DashboardStats stats={mockStats} />);

        expect(screen.getByText('Job Market')).toBeInTheDocument();
        expect(screen.getByText('Available Jobs')).toBeInTheDocument();
        expect(screen.getByText('800')).toBeInTheDocument();
        expect(screen.getByText('Matching Jobs')).toBeInTheDocument();
        expect(screen.getByText('25')).toBeInTheDocument();
    });

    it('displays application status breakdown', () => {
        render(<DashboardStats stats={mockStats} />);

        expect(screen.getByText('Application Status')).toBeInTheDocument();
        expect(screen.getByText('Applied')).toBeInTheDocument();
        expect(screen.getByText('Interview')).toBeInTheDocument();
        expect(screen.getByText('Offered')).toBeInTheDocument();
        expect(screen.getByText('Rejected')).toBeInTheDocument();
    });

    it('displays skills in demand when available', () => {
        render(<DashboardStats stats={mockStats} />);

        expect(screen.getByText('Skills in Demand')).toBeInTheDocument();
        expect(screen.getByText('JavaScript')).toBeInTheDocument();
        expect(screen.getByText('React')).toBeInTheDocument();
        expect(screen.getByText('Node.js')).toBeInTheDocument();
    });

    it('does not display skills section when no skills available', () => {
        const statsWithoutSkills = {
            ...mockStats,
            recommendations: {
                ...mockStats.recommendations,
                skillsInDemand: []
            }
        };

        render(<DashboardStats stats={statsWithoutSkills} />);

        expect(screen.queryByText('Skills in Demand')).not.toBeInTheDocument();
    });
});