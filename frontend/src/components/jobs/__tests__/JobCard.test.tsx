import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { JobCard } from '../JobCard';
import { Job, JobMatch } from '../../../services/api';

const mockJob: Job = {
    id: 'job-1',
    title: 'Senior Frontend Developer',
    company: 'TechCorp',
    location: 'San Francisco, CA',
    description: 'We are looking for a senior frontend developer with React experience',
    requirements: ['JavaScript', 'React', 'TypeScript', 'CSS'],
    experienceLevel: 'senior',
    applicationUrl: 'https://techcorp.com/jobs/1',
    isAvailable: true,
    crawledAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
};

const mockJobMatch: JobMatch = {
    job: mockJob,
    score: 85,
    matchReasons: ['Experience level match', '3 skill matches'],
    skillMatches: ['JavaScript', 'React', 'TypeScript'],
    locationMatch: true,
    experienceMatch: true
};

describe('JobCard', () => {
    const mockOnViewDetails = vi.fn();
    const mockOnApply = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders job information correctly', () => {
        render(
            <JobCard
                job={mockJob}
                onViewDetails={mockOnViewDetails}
                onApply={mockOnApply}
            />
        );

        expect(screen.getByText('Senior Frontend Developer')).toBeInTheDocument();
        expect(screen.getByText('TechCorp')).toBeInTheDocument();
        expect(screen.getByText('San Francisco, CA')).toBeInTheDocument();
        expect(screen.getByText('Senior Level')).toBeInTheDocument();
    });

    it('displays match score when showMatchScore is true', () => {
        render(
            <JobCard
                job={mockJob}
                match={mockJobMatch}
                onViewDetails={mockOnViewDetails}
                onApply={mockOnApply}
                showMatchScore={true}
            />
        );

        expect(screen.getByText('85%')).toBeInTheDocument();
    });

    it('highlights matching skills', () => {
        render(
            <JobCard
                job={mockJob}
                match={mockJobMatch}
                onViewDetails={mockOnViewDetails}
                onApply={mockOnApply}
                showMatchScore={true}
            />
        );

        // Check that matching skills have different styling
        const jsSkill = screen.getByText('JavaScript');
        expect(jsSkill).toHaveClass('bg-green-100');
    });

    it('calls onViewDetails when card is clicked', () => {
        render(
            <JobCard
                job={mockJob}
                onViewDetails={mockOnViewDetails}
                onApply={mockOnApply}
            />
        );

        fireEvent.click(screen.getByText('Senior Frontend Developer'));
        expect(mockOnViewDetails).toHaveBeenCalledWith(mockJob);
    });

    it('calls onApply when apply button is clicked', () => {
        render(
            <JobCard
                job={mockJob}
                onViewDetails={mockOnViewDetails}
                onApply={mockOnApply}
            />
        );

        fireEvent.click(screen.getByText('Apply'));
        expect(mockOnApply).toHaveBeenCalledWith(mockJob);
    });

    it('shows "Applied" when job is already applied to', () => {
        render(
            <JobCard
                job={mockJob}
                onViewDetails={mockOnViewDetails}
                onApply={mockOnApply}
                isApplied={true}
            />
        );

        expect(screen.getByText('Applied')).toBeInTheDocument();
        expect(screen.getByText('Applied')).toBeDisabled();
    });

    it('displays match reasons when available', () => {
        render(
            <JobCard
                job={mockJob}
                match={mockJobMatch}
                onViewDetails={mockOnViewDetails}
                onApply={mockOnApply}
                showMatchScore={true}
            />
        );

        expect(screen.getByText('Experience level match')).toBeInTheDocument();
        expect(screen.getByText('3 skill matches')).toBeInTheDocument();
    });

    it('opens external link when external link button is clicked', () => {
        // Mock window.open
        const mockOpen = vi.fn();
        Object.defineProperty(window, 'open', {
            value: mockOpen,
            writable: true
        });

        render(
            <JobCard
                job={mockJob}
                onViewDetails={mockOnViewDetails}
                onApply={mockOnApply}
            />
        );

        const externalLink = screen.getByTitle('View on company website');
        expect(externalLink).toHaveAttribute('href', 'https://techcorp.com/jobs/1');
        expect(externalLink).toHaveAttribute('target', '_blank');
    });

    it('prevents event propagation when apply button is clicked', () => {
        render(
            <JobCard
                job={mockJob}
                onViewDetails={mockOnViewDetails}
                onApply={mockOnApply}
            />
        );

        fireEvent.click(screen.getByText('Apply'));

        // onViewDetails should not be called when apply button is clicked
        expect(mockOnViewDetails).not.toHaveBeenCalled();
        expect(mockOnApply).toHaveBeenCalledWith(mockJob);
    });
});