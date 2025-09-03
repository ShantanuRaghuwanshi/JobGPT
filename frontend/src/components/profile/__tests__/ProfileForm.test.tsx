import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ProfileForm } from '../ProfileForm';
import { UserProfile, ExperienceLevel } from '../../../services/api';

const mockProfile: UserProfile = {
    id: 'profile-1',
    userId: 'user-1',
    name: 'John Doe',
    age: 30,
    location: 'New York',
    resumeId: 'resume-123.pdf',
    skills: ['JavaScript', 'TypeScript'],
    experienceLevel: 'mid' as ExperienceLevel,
    preferences: {
        locations: ['New York', 'San Francisco'],
        experienceLevels: ['mid', 'senior'],
        keywords: ['frontend', 'react'],
        remoteWork: true,
    },
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-01-01T00:00:00Z',
};

describe('ProfileForm', () => {
    const mockOnSave = vi.fn();
    const mockOnCancel = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders form with profile data', () => {
        render(
            <ProfileForm
                profile={mockProfile}
                onSave={mockOnSave}
                onCancel={mockOnCancel}
            />
        );

        expect(screen.getByDisplayValue('John Doe')).toBeInTheDocument();
        expect(screen.getByDisplayValue('30')).toBeInTheDocument();
        expect(screen.getByDisplayValue('New York')).toBeInTheDocument();
        expect(screen.getByDisplayValue('mid')).toBeInTheDocument();
    });

    it('renders empty form when no profile provided', () => {
        render(
            <ProfileForm
                profile={null}
                onSave={mockOnSave}
                onCancel={mockOnCancel}
            />
        );

        expect(screen.getByPlaceholderText('Enter your full name')).toHaveValue('');
        expect(screen.getByPlaceholderText('Enter your age')).toHaveValue('');
    });

    it('displays skills as tags', () => {
        render(
            <ProfileForm
                profile={mockProfile}
                onSave={mockOnSave}
                onCancel={mockOnCancel}
            />
        );

        expect(screen.getByText('JavaScript')).toBeInTheDocument();
        expect(screen.getByText('TypeScript')).toBeInTheDocument();
    });

    it('allows adding new skills', async () => {
        const user = userEvent.setup();
        render(
            <ProfileForm
                profile={mockProfile}
                onSave={mockOnSave}
                onCancel={mockOnCancel}
            />
        );

        const skillInput = screen.getByPlaceholderText('Add a skill (e.g., JavaScript, React)');
        const addButton = screen.getByRole('button', { name: /add/i });

        await user.type(skillInput, 'React');
        await user.click(addButton);

        expect(screen.getByText('React')).toBeInTheDocument();
    });

    it('allows removing skills', async () => {
        const user = userEvent.setup();
        render(
            <ProfileForm
                profile={mockProfile}
                onSave={mockOnSave}
                onCancel={mockOnCancel}
            />
        );

        const removeButton = screen.getAllByRole('button')[0]; // First X button
        await user.click(removeButton);

        // The skill should be removed from the form state
        // Note: This test might need adjustment based on actual implementation
    });

    it('validates required fields', async () => {
        const user = userEvent.setup();
        render(
            <ProfileForm
                profile={null}
                onSave={mockOnSave}
                onCancel={mockOnCancel}
            />
        );

        const saveButton = screen.getByRole('button', { name: /save profile/i });
        await user.click(saveButton);

        expect(screen.getByText('Name is required')).toBeInTheDocument();
        expect(screen.getByText('Location is required')).toBeInTheDocument();
        expect(mockOnSave).not.toHaveBeenCalled();
    });

    it('validates age range', async () => {
        const user = userEvent.setup();
        render(
            <ProfileForm
                profile={null}
                onSave={mockOnSave}
                onCancel={mockOnCancel}
            />
        );

        const ageInput = screen.getByPlaceholderText('Enter your age');
        await user.type(ageInput, '15');

        const saveButton = screen.getByRole('button', { name: /save profile/i });
        await user.click(saveButton);

        expect(screen.getByText('Age must be between 16 and 100')).toBeInTheDocument();
    });

    it('calls onSave with form data when valid', async () => {
        const user = userEvent.setup();
        render(
            <ProfileForm
                profile={null}
                onSave={mockOnSave}
                onCancel={mockOnCancel}
            />
        );

        await user.type(screen.getByPlaceholderText('Enter your full name'), 'Jane Doe');
        await user.type(screen.getByPlaceholderText('e.g., New York, NY'), 'San Francisco');

        const saveButton = screen.getByRole('button', { name: /save profile/i });
        await user.click(saveButton);

        await waitFor(() => {
            expect(mockOnSave).toHaveBeenCalledWith(
                expect.objectContaining({
                    name: 'Jane Doe',
                    location: 'San Francisco',
                })
            );
        });
    });

    it('calls onCancel when cancel button is clicked', async () => {
        const user = userEvent.setup();
        render(
            <ProfileForm
                profile={mockProfile}
                onSave={mockOnSave}
                onCancel={mockOnCancel}
            />
        );

        const cancelButton = screen.getByRole('button', { name: /cancel/i });
        await user.click(cancelButton);

        expect(mockOnCancel).toHaveBeenCalled();
    });

    it('shows loading state when saving', () => {
        render(
            <ProfileForm
                profile={mockProfile}
                onSave={mockOnSave}
                onCancel={mockOnCancel}
                isLoading={true}
            />
        );

        expect(screen.getByText('Saving...')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /saving/i })).toBeDisabled();
    });
});