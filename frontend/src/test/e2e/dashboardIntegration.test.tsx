import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../../contexts/AuthContext';
import DashboardPage from '../../pages/DashboardPage';
import { ProfilePage } from '../../pages/ProfilePage';
import { JobsPage } from '../../pages/JobsPage';
import { PipelinePage } from '../../pages/PipelinePage';
import * as api from '../../services/api';

// Mock the API
import { vi } from 'vitest';
vi.mock('../../services/api');
const mockApi = api as any;

// Mock data
const mockDashboardData = {
    stats: {
        applications: { total: 15, applied: 8, interview: 4, offered: 2, rejected: 1 },
        jobs: { available: 120, crawled: 150 },
        recommendations: { total: 25, topMatches: [] },
        user: { profileComplete: true }
    },
    recentActivity: [],
    upcomingInterviews: []
};

const mockUserMetrics = {
    applicationRate: 2.5,
    responseRate: 0.3,
    interviewRate: 0.5,
    successRate: 0.25,
    averageResponseTime: 5
};

const mockUser = {
    id: '1',
    email: 'test@example.com',
    token: 'mock-token'
};

const mockProfile = {
    id: '1',
    name: 'John Doe',
    age: 30,
    location: 'San Francisco, CA',
    experienceLevel: 'mid' as const,
    skills: ['React', 'TypeScript', 'Node.js'],
    preferences: {
        locations: ['San Francisco', 'Remote'],
        experienceLevels: ['mid', 'senior'],
        keywords: ['frontend', 'fullstack'],
        remoteWork: true,
        salaryRange: { min: 100000, max: 150000 }
    },
    resumeId: 'resume-123'
};

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: { retry: false },
            mutations: { retry: false }
        }
    });

    return (
        <QueryClientProvider client={queryClient}>
            <BrowserRouter>
                <AuthProvider>
                    {children}
                </AuthProvider>
            </BrowserRouter>
        </QueryClientProvider>
    );
};

describe('Dashboard Integration Tests', () => {
    beforeEach(() => {
        // Mock successful API responses
        mockApi.dashboardApi.getDashboardData.mockResolvedValue({ data: mockDashboardData });
        mockApi.dashboardApi.getUserMetrics.mockResolvedValue({ data: mockUserMetrics });
        mockApi.profileApi.getProfile.mockResolvedValue({ data: mockProfile });

        // Mock auth context
        vi.spyOn(require('../../contexts/AuthContext'), 'useAuth').mockReturnValue({
            user: mockUser,
            login: vi.fn(),
            logout: vi.fn(),
            loading: false
        });
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('Dashboard Page', () => {
        it('renders dashboard with all components', async () => {
            render(
                <TestWrapper>
                    <DashboardPage />
                </TestWrapper>
            );

            // Wait for loading to complete
            await waitFor(() => {
                expect(screen.getByText('Dashboard')).toBeInTheDocument();
            });

            // Check for main dashboard sections
            expect(screen.getByText('Welcome back! Here\'s an overview of your job search progress.')).toBeInTheDocument();

            // Check for stats cards
            expect(screen.getByText('Applications')).toBeInTheDocument();
            expect(screen.getByText('15')).toBeInTheDocument(); // Total applications
            expect(screen.getByText('Interviews')).toBeInTheDocument();
            expect(screen.getByText('4')).toBeInTheDocument(); // Interview count

            // Check for dashboard components
            expect(screen.getByText('Recent Activity')).toBeInTheDocument();
            expect(screen.getByText('Quick Actions')).toBeInTheDocument();
        });

        it('handles profile incomplete warning', async () => {
            // Mock incomplete profile
            const incompleteData = {
                ...mockDashboardData,
                stats: {
                    ...mockDashboardData.stats,
                    user: { profileComplete: false }
                }
            };
            mockApi.dashboardApi.getDashboardData.mockResolvedValue({ data: incompleteData });

            render(
                <TestWrapper>
                    <DashboardPage />
                </TestWrapper>
            );

            await waitFor(() => {
                expect(screen.getByText('Complete Your Profile')).toBeInTheDocument();
            });

            expect(screen.getByText('Your profile is incomplete. Complete it to get better job matches and personalized recommendations.')).toBeInTheDocument();
        });

        it('handles loading state', () => {
            mockApi.dashboardApi.getDashboardData.mockImplementation(() => new Promise(() => { }));

            render(
                <TestWrapper>
                    <DashboardPage />
                </TestWrapper>
            );

            expect(screen.getByText('Loading dashboard data...')).toBeInTheDocument();
        });

        it('handles error state', async () => {
            mockApi.dashboardApi.getDashboardData.mockRejectedValue(new Error('API Error'));

            render(
                <TestWrapper>
                    <DashboardPage />
                </TestWrapper>
            );

            await waitFor(() => {
                expect(screen.getByText('Failed to load dashboard data. Please try again.')).toBeInTheDocument();
            });
        });
    });

    describe('Navigation Integration', () => {
        it('renders sidebar navigation', async () => {
            render(
                <TestWrapper>
                    <DashboardPage />
                </TestWrapper>
            );

            await waitFor(() => {
                expect(screen.getByText('JobGPT')).toBeInTheDocument();
            });

            // Check navigation items
            expect(screen.getByText('Dashboard')).toBeInTheDocument();
            expect(screen.getByText('Job Discovery')).toBeInTheDocument();
            expect(screen.getByText('Pipeline')).toBeInTheDocument();
            expect(screen.getByText('Profile')).toBeInTheDocument();
        });

        it('shows user information in sidebar', async () => {
            render(
                <TestWrapper>
                    <DashboardPage />
                </TestWrapper>
            );

            await waitFor(() => {
                expect(screen.getByText('test@example.com')).toBeInTheDocument();
            });

            expect(screen.getByText('Job Seeker')).toBeInTheDocument();
        });
    });

    describe('Profile Page Integration', () => {
        it('renders profile page with tabs', async () => {
            render(
                <TestWrapper>
                    <ProfilePage />
                </TestWrapper>
            );

            await waitFor(() => {
                expect(screen.getByText('Profile Management')).toBeInTheDocument();
            });

            // Check tabs
            expect(screen.getByText('Profile')).toBeInTheDocument();
            expect(screen.getByText('Resume')).toBeInTheDocument();
            expect(screen.getByText('AI Settings')).toBeInTheDocument();

            // Check profile data
            expect(screen.getByText('John Doe')).toBeInTheDocument();
            expect(screen.getByText('San Francisco, CA')).toBeInTheDocument();
        });

        it('allows editing profile', async () => {
            render(
                <TestWrapper>
                    <ProfilePage />
                </TestWrapper>
            );

            await waitFor(() => {
                expect(screen.getByText('Edit Profile')).toBeInTheDocument();
            });

            fireEvent.click(screen.getByText('Edit Profile'));

            // Should show profile form
            await waitFor(() => {
                expect(screen.getByDisplayValue('John Doe')).toBeInTheDocument();
            });
        });
    });

    describe('Jobs Page Integration', () => {
        it('renders jobs page with discovery component', async () => {
            render(
                <TestWrapper>
                    <JobsPage />
                </TestWrapper>
            );

            await waitFor(() => {
                expect(screen.getByText('Job Discovery')).toBeInTheDocument();
            });

            expect(screen.getByText('Find and explore new job opportunities')).toBeInTheDocument();
        });
    });

    describe('Pipeline Page Integration', () => {
        it('renders pipeline page with drag-drop interface', async () => {
            render(
                <TestWrapper>
                    <PipelinePage />
                </TestWrapper>
            );

            await waitFor(() => {
                expect(screen.getByText('Job Pipeline')).toBeInTheDocument();
            });

            expect(screen.getByText('Manage your job applications with drag and drop')).toBeInTheDocument();
        });
    });

    describe('Responsive Design', () => {
        it('adapts to mobile viewport', async () => {
            // Mock mobile viewport
            Object.defineProperty(window, 'innerWidth', {
                writable: true,
                configurable: true,
                value: 375,
            });

            render(
                <TestWrapper>
                    <DashboardPage />
                </TestWrapper>
            );

            await waitFor(() => {
                expect(screen.getByText('Dashboard')).toBeInTheDocument();
            });

            // Check that mobile-specific elements are present
            // The sidebar should be hidden on mobile and toggled with a button
            const mobileMenuButton = document.querySelector('[aria-label="Open main menu"]');
            expect(mobileMenuButton || screen.queryByRole('button', { name: /menu/i })).toBeTruthy();
        });

        it('shows desktop layout on large screens', async () => {
            // Mock desktop viewport
            Object.defineProperty(window, 'innerWidth', {
                writable: true,
                configurable: true,
                value: 1024,
            });

            render(
                <TestWrapper>
                    <DashboardPage />
                </TestWrapper>
            );

            await waitFor(() => {
                expect(screen.getByText('Dashboard')).toBeInTheDocument();
            });

            // Desktop layout should show sidebar by default
            expect(screen.getByText('JobGPT')).toBeInTheDocument();
        });
    });

    describe('Error Handling', () => {
        it('shows error boundary on component crash', () => {
            // Mock console.error to avoid noise in test output
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

            // Component that throws an error
            const ThrowError = () => {
                throw new Error('Test error');
            };

            render(
                <TestWrapper>
                    <ThrowError />
                </TestWrapper>
            );

            expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument();

            consoleSpy.mockRestore();
        });
    });

    describe('User Experience Flow', () => {
        it('completes full user workflow', async () => {
            const { rerender } = render(
                <TestWrapper>
                    <DashboardPage />
                </TestWrapper>
            );

            // Start at dashboard
            await waitFor(() => {
                expect(screen.getByText('Dashboard')).toBeInTheDocument();
            });

            // Navigate to profile
            rerender(
                <TestWrapper>
                    <ProfilePage />
                </TestWrapper>
            );

            await waitFor(() => {
                expect(screen.getByText('Profile Management')).toBeInTheDocument();
            });

            // Navigate to jobs
            rerender(
                <TestWrapper>
                    <JobsPage />
                </TestWrapper>
            );

            await waitFor(() => {
                expect(screen.getByText('Job Discovery')).toBeInTheDocument();
            });

            // Navigate to pipeline
            rerender(
                <TestWrapper>
                    <PipelinePage />
                </TestWrapper>
            );

            await waitFor(() => {
                expect(screen.getByText('Job Pipeline')).toBeInTheDocument();
            });
        });
    });
});