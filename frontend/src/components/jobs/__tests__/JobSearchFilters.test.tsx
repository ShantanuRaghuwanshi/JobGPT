import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { JobSearchFilters } from '../JobSearchFilters';
import { JobFilters } from '../../../services/api';

describe('JobSearchFilters', () => {
    const mockOnFiltersChange = vi.fn();
    const mockOnSearch = vi.fn();

    const defaultFilters: JobFilters = {
        limit: 20,
        offset: 0,
        isAvailable: true,
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders search input and filter button', () => {
        render(
            <JobSearchFilters
                filters={defaultFilters}
                onFiltersChange={mockOnFiltersChange}
                onSearch={mockOnSearch}
            />
        );

        expect(screen.getByPlaceholderText(/search jobs/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /search/i })).toBeInTheDocument();
    });

    it('calls onSearch when form is submitted', async () => {
        render(
            <JobSearchFilters
                filters={defaultFilters}
                onFiltersChange={mockOnFiltersChange}
                onSearch={mockOnSearch}
            />
        );

        const searchInput = screen.getByPlaceholderText(/search jobs/i);
        const searchButton = screen.getByRole('button', { name: /search/i });

        fireEvent.change(searchInput, { target: { value: 'React Developer' } });
        fireEvent.click(searchButton);

        await waitFor(() => {
            expect(mockOnSearch).toHaveBeenCalledWith('React Developer');
        });
    });

    it('shows filters panel when filter button is clicked', () => {
        render(
            <JobSearchFilters
                filters={defaultFilters}
                onFiltersChange={mockOnFiltersChange}
                onSearch={mockOnSearch}
            />
        );

        // Find the filter button by looking for the one with the Filter icon
        const buttons = screen.getAllByRole('button');
        const filterButton = buttons.find(button => button.querySelector('svg polygon')); // Filter icon has polygon
        expect(filterButton).toBeTruthy();
        fireEvent.click(filterButton!);

        expect(screen.getByText('Filters')).toBeInTheDocument();
        expect(screen.getByLabelText(/location/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/experience level/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/company/i)).toBeInTheDocument();
    });

    it('updates filters when filter inputs change', async () => {
        render(
            <JobSearchFilters
                filters={defaultFilters}
                onFiltersChange={mockOnFiltersChange}
                onSearch={mockOnSearch}
            />
        );

        // Open filters panel
        const buttons = screen.getAllByRole('button');
        const filterButton = buttons.find(button => button.querySelector('svg polygon'));
        expect(filterButton).toBeTruthy();
        fireEvent.click(filterButton!);

        // Change location filter
        const locationInput = screen.getByLabelText(/location/i);
        fireEvent.change(locationInput, { target: { value: 'San Francisco' } });

        await waitFor(() => {
            expect(mockOnFiltersChange).toHaveBeenCalledWith({
                ...defaultFilters,
                location: 'San Francisco'
            });
        });
    });

    it('updates experience level filter', async () => {
        render(
            <JobSearchFilters
                filters={defaultFilters}
                onFiltersChange={mockOnFiltersChange}
                onSearch={mockOnSearch}
            />
        );

        // Open filters panel
        const buttons = screen.getAllByRole('button');
        const filterButton = buttons.find(button => button.querySelector('svg polygon'));
        expect(filterButton).toBeTruthy();
        fireEvent.click(filterButton!);

        // Change experience level filter
        const experienceSelect = screen.getByLabelText(/experience level/i);
        fireEvent.change(experienceSelect, { target: { value: 'senior' } });

        await waitFor(() => {
            expect(mockOnFiltersChange).toHaveBeenCalledWith({
                ...defaultFilters,
                experienceLevel: 'senior'
            });
        });
    });

    it('shows active filters as tags', () => {
        const filtersWithValues: JobFilters = {
            ...defaultFilters,
            location: 'San Francisco',
            experienceLevel: 'senior',
            company: 'Google'
        };

        render(
            <JobSearchFilters
                filters={filtersWithValues}
                onFiltersChange={mockOnFiltersChange}
                onSearch={mockOnSearch}
            />
        );

        // Open filters panel to see active filters
        const buttons = screen.getAllByRole('button');
        const filterButton = buttons.find(button => button.querySelector('svg polygon'));
        expect(filterButton).toBeTruthy();
        fireEvent.click(filterButton!);

        expect(screen.getByText('Location: San Francisco')).toBeInTheDocument();
        expect(screen.getByText('Level: Senior Level')).toBeInTheDocument();
        expect(screen.getByText('Company: Google')).toBeInTheDocument();
    });

    it('clears individual filters when X button is clicked', async () => {
        const filtersWithValues: JobFilters = {
            ...defaultFilters,
            location: 'San Francisco'
        };

        render(
            <JobSearchFilters
                filters={filtersWithValues}
                onFiltersChange={mockOnFiltersChange}
                onSearch={mockOnSearch}
            />
        );

        // Open filters panel
        const buttons = screen.getAllByRole('button');
        const filterButton = buttons.find(button => button.querySelector('svg polygon'));
        expect(filterButton).toBeTruthy();
        fireEvent.click(filterButton!);

        // Click X button on location filter
        const locationTag = screen.getByText('Location: San Francisco');
        const removeLocationButton = locationTag.querySelector('button');
        expect(removeLocationButton).toBeTruthy();
        fireEvent.click(removeLocationButton!);

        await waitFor(() => {
            expect(mockOnFiltersChange).toHaveBeenCalledWith({
                ...defaultFilters,
                location: undefined
            });
        });
    });

    it('clears all filters when Clear All button is clicked', async () => {
        const filtersWithValues: JobFilters = {
            ...defaultFilters,
            location: 'San Francisco',
            experienceLevel: 'senior',
            company: 'Google'
        };

        render(
            <JobSearchFilters
                filters={filtersWithValues}
                onFiltersChange={mockOnFiltersChange}
                onSearch={mockOnSearch}
            />
        );

        // Open filters panel
        const buttons = screen.getAllByRole('button');
        const filterButton = buttons.find(button => button.querySelector('svg polygon'));
        expect(filterButton).toBeTruthy();
        fireEvent.click(filterButton!);

        // Click Clear All button
        const clearAllButton = screen.getByText('Clear All');
        fireEvent.click(clearAllButton);

        await waitFor(() => {
            expect(mockOnFiltersChange).toHaveBeenCalledWith({
                limit: defaultFilters.limit,
                offset: 0
            });
        });
    });

    it('disables inputs when loading', () => {
        render(
            <JobSearchFilters
                filters={defaultFilters}
                onFiltersChange={mockOnFiltersChange}
                onSearch={mockOnSearch}
                isLoading={true}
            />
        );

        const searchInput = screen.getByPlaceholderText(/search jobs/i);
        const searchButton = screen.getByRole('button', { name: /searching/i });

        expect(searchInput).toBeDisabled();
        expect(searchButton).toBeDisabled();
        expect(searchButton).toHaveTextContent('Searching...');
    });
});