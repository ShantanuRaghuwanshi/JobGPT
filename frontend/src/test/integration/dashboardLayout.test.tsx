import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Layout from '../../components/layout/Layout';
import Sidebar from '../../components/layout/Sidebar';
import Navigation from '../../components/layout/Navigation';
import MobileBottomNav from '../../components/layout/MobileBottomNav';

// Mock the auth context
vi.mock('../../contexts/AuthContext', () => ({
    useAuth: () => ({
        user: { email: 'test@example.com' },
        logout: vi.fn(),
        login: vi.fn(),
        loading: false
    })
}));

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
    <BrowserRouter>
        {children}
    </BrowserRouter>
);

describe('Dashboard Layout Integration', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Layout Component', () => {
        it('renders with title and subtitle', () => {
            render(
                <TestWrapper>
                    <Layout title="Test Title" subtitle="Test Subtitle">
                        <div>Test Content</div>
                    </Layout>
                </TestWrapper>
            );

            expect(screen.getByText('Test Title')).toBeInTheDocument();
            expect(screen.getByText('Test Subtitle')).toBeInTheDocument();
            expect(screen.getByText('Test Content')).toBeInTheDocument();
        });

        it('renders without title and subtitle', () => {
            render(
                <TestWrapper>
                    <Layout>
                        <div>Test Content</div>
                    </Layout>
                </TestWrapper>
            );

            expect(screen.getByText('Test Content')).toBeInTheDocument();
        });

        it('can hide navigation and sidebar', () => {
            render(
                <TestWrapper>
                    <Layout showNavigation={false} showSidebar={false}>
                        <div>Test Content</div>
                    </Layout>
                </TestWrapper>
            );

            expect(screen.getByText('Test Content')).toBeInTheDocument();
            // Navigation and sidebar should not be rendered
            expect(screen.queryByText('JobGPT')).not.toBeInTheDocument();
        });
    });

    describe('Navigation Component', () => {
        it('renders navigation with user info', () => {
            render(
                <TestWrapper>
                    <Navigation />
                </TestWrapper>
            );

            expect(screen.getByText('JobGPT')).toBeInTheDocument();
            expect(screen.getByText('test')).toBeInTheDocument(); // Email prefix
        });

        it('shows search input on desktop', () => {
            render(
                <TestWrapper>
                    <Navigation />
                </TestWrapper>
            );

            expect(screen.getByPlaceholderText('Search jobs, companies...')).toBeInTheDocument();
        });
    });

    describe('Sidebar Component', () => {
        it('renders sidebar with navigation items', () => {
            render(
                <TestWrapper>
                    <Sidebar isOpen={true} onToggle={vi.fn()} />
                </TestWrapper>
            );

            expect(screen.getByText('JobGPT')).toBeInTheDocument();
            expect(screen.getByText('Dashboard')).toBeInTheDocument();
            expect(screen.getByText('Job Discovery')).toBeInTheDocument();
            expect(screen.getByText('Pipeline')).toBeInTheDocument();
            expect(screen.getByText('Profile')).toBeInTheDocument();
        });

        it('shows user information', () => {
            render(
                <TestWrapper>
                    <Sidebar isOpen={true} onToggle={vi.fn()} />
                </TestWrapper>
            );

            expect(screen.getByText('test@example.com')).toBeInTheDocument();
            expect(screen.getByText('Job Seeker')).toBeInTheDocument();
        });

        it('has sign out button', () => {
            render(
                <TestWrapper>
                    <Sidebar isOpen={true} onToggle={vi.fn()} />
                </TestWrapper>
            );

            expect(screen.getByText('Sign out')).toBeInTheDocument();
        });
    });

    describe('Mobile Bottom Navigation', () => {
        it('renders mobile navigation items', () => {
            render(
                <TestWrapper>
                    <MobileBottomNav />
                </TestWrapper>
            );

            expect(screen.getByText('Dashboard')).toBeInTheDocument();
            expect(screen.getByText('Jobs')).toBeInTheDocument();
            expect(screen.getByText('Pipeline')).toBeInTheDocument();
            expect(screen.getByText('Profile')).toBeInTheDocument();
        });
    });

    describe('Responsive Design', () => {
        it('applies correct classes for mobile layout', () => {
            const { container } = render(
                <TestWrapper>
                    <Layout title="Test">
                        <div>Content</div>
                    </Layout>
                </TestWrapper>
            );

            // Check for mobile-specific classes
            const main = container.querySelector('main');
            expect(main).toHaveClass('pb-16', 'lg:pb-0'); // Mobile bottom padding
        });

        it('applies responsive text sizing', () => {
            render(
                <TestWrapper>
                    <Layout title="Test Title" subtitle="Test Subtitle">
                        <div>Content</div>
                    </Layout>
                </TestWrapper>
            );

            const title = screen.getByText('Test Title');
            expect(title).toHaveClass('text-2xl', 'lg:text-3xl');

            const subtitle = screen.getByText('Test Subtitle');
            expect(subtitle).toHaveClass('text-sm', 'lg:text-base');
        });
    });

    describe('Integration', () => {
        it('renders complete layout with all components', () => {
            render(
                <TestWrapper>
                    <Layout title="Dashboard" subtitle="Welcome back">
                        <div className="p-4">
                            <h2>Dashboard Content</h2>
                            <p>This is the main content area</p>
                        </div>
                    </Layout>
                </TestWrapper>
            );

            // Check layout structure
            expect(screen.getAllByText('Dashboard')).toHaveLength(3); // Title, sidebar, mobile nav
            expect(screen.getByText('Welcome back')).toBeInTheDocument();
            expect(screen.getByText('Dashboard Content')).toBeInTheDocument();
            expect(screen.getByText('This is the main content area')).toBeInTheDocument();

            // Check navigation elements
            expect(screen.getAllByText('JobGPT')).toHaveLength(2); // Navigation and sidebar
            expect(screen.getByText('Job Discovery')).toBeInTheDocument();
        });
    });
});