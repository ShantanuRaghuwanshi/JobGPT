import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { dashboardApi, DashboardData, UserMetrics } from '../services/api';
import Layout from '../components/layout/Layout';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import DashboardStats from '../components/dashboard/DashboardStats';
import RecentActivity from '../components/dashboard/RecentActivity';
import UpcomingInterviews from '../components/dashboard/UpcomingInterviews';
import JobRecommendations from '../components/dashboard/JobRecommendations';
import UserMetricsCard from '../components/dashboard/UserMetricsCard';
import QuickActions from '../components/dashboard/QuickActions';
import { AlertTriangle, TrendingUp, Users, Calendar, Briefcase } from 'lucide-react';

const DashboardPage: React.FC = () => {
    const navigate = useNavigate();
    const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
    const [userMetrics, setUserMetrics] = useState<UserMetrics | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);

    const loadDashboardData = async () => {
        try {
            setError(null);
            const [dashboardResponse, metricsResponse] = await Promise.all([
                dashboardApi.getDashboardData(),
                dashboardApi.getUserMetrics()
            ]);

            console.log('Dashboard response:', dashboardResponse.data);
            console.log('Metrics response:', metricsResponse.data);

            setDashboardData(dashboardResponse.data);
            setUserMetrics(metricsResponse.data);
        } catch (err: any) {
            console.error('Error loading dashboard data:', err);
            if (err.response?.data?.error?.code === 'PROFILE_NOT_FOUND') {
                setError('Please complete your profile to view dashboard data.');
            } else {
                setError('Failed to load dashboard data. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleRefreshRecommendations = async () => {
        try {
            setRefreshing(true);
            await dashboardApi.refreshRecommendations();
            // Reload dashboard data to get updated recommendations
            await loadDashboardData();
        } catch (err: any) {
            console.error('Error refreshing recommendations:', err);
            setError('Failed to refresh recommendations. Please try again.');
        } finally {
            setRefreshing(false);
        }
    };

    useEffect(() => {
        loadDashboardData();
    }, []);

    if (loading) {
        return (
            <Layout
                title="Dashboard"
                subtitle="Loading your job search overview..."
            >
                <div className="flex items-center justify-center min-h-96">
                    <div className="text-center">
                        <LoadingSpinner size="lg" />
                        <p className="mt-4 text-gray-600">Loading dashboard data...</p>
                    </div>
                </div>
            </Layout>
        );
    }

    if (error) {
        return (
            <Layout
                title="Dashboard"
                subtitle="Welcome back! Here's an overview of your job search progress."
            >
                <div className="p-6">
                    <div className="max-w-7xl mx-auto">
                        <ErrorMessage message={error} />
                    </div>
                </div>
            </Layout>
        );
    }

    if (!dashboardData || !userMetrics) {
        return (
            <Layout
                title="Dashboard"
                subtitle="Welcome back! Here's an overview of your job search progress."
            >
                <div className="flex items-center justify-center min-h-96">
                    <div className="text-center">
                        <div className="mx-auto h-12 w-12 text-gray-400 mb-4">
                            <Briefcase className="h-12 w-12" />
                        </div>
                        <h2 className="text-xl font-semibold text-gray-900 mb-2">No Data Available</h2>
                        <p className="text-gray-600 mb-4">Unable to load dashboard data.</p>
                        <button
                            onClick={loadDashboardData}
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            Retry
                        </button>
                    </div>
                </div>
            </Layout>
        );
    }

    if (!dashboardData) {
        return (
            <Layout
                title="Dashboard"
                subtitle="Welcome back! Here's an overview of your job search progress."
            >
                <div className="flex items-center justify-center min-h-96">
                    <div className="text-center">
                        <div className="mx-auto h-12 w-12 text-gray-400 mb-4">
                            <Briefcase className="h-12 w-12" />
                        </div>
                        <h2 className="text-xl font-semibold text-gray-900 mb-2">No Dashboard Data</h2>
                        <p className="text-gray-600 mb-4">Dashboard data is not available.</p>
                        <button
                            onClick={loadDashboardData}
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            Load Dashboard
                        </button>
                    </div>
                </div>
            </Layout>
        );
    }

    return (
        <Layout
            title="Dashboard"
            subtitle="Welcome back! Here's an overview of your job search progress."
        >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                {/* Profile Completion Warning */}
                {dashboardData?.stats?.user && !dashboardData.stats.user.profileComplete && (
                    <div className="mb-6 bg-gradient-to-r from-warning-500/20 to-accent-orange/20 border border-warning-500/30 rounded-xl p-4 shadow-dark backdrop-blur-sm animate-fade-in">
                        <div className="flex">
                            <div className="flex-shrink-0">
                                <AlertTriangle className="h-5 w-5 text-warning-500" />
                            </div>
                            <div className="ml-3 flex-1">
                                <h3 className="text-sm font-medium text-warning-100">
                                    Complete Your Profile
                                </h3>
                                <div className="mt-2 text-sm text-dark-300">
                                    <p>
                                        Your profile is incomplete. Complete it to get better job matches and personalized recommendations.
                                    </p>
                                </div>
                                <div className="mt-4">
                                    <button
                                        onClick={() => navigate('/profile')}
                                        className="bg-warning-500 hover:bg-warning-600 px-3 py-1.5 rounded-lg text-sm font-medium text-white transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-warning-500 hover:shadow-glow-sm"
                                    >
                                        Complete Profile
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Quick Stats Overview */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <div className="bg-gradient-card rounded-xl shadow-dark p-6 border border-dark-700/50 hover:border-accent-blue/30 transition-all duration-300 group hover:shadow-glow-sm">
                        <div className="flex items-center">
                            <div className="flex-shrink-0 p-3 bg-accent-blue/20 rounded-xl group-hover:bg-accent-blue/30 transition-colors">
                                <TrendingUp className="h-6 w-6 text-accent-blue" />
                            </div>
                            <div className="ml-4">
                                <p className="text-sm font-medium text-dark-400">Applications</p>
                                <p className="text-2xl font-bold text-white">
                                    {dashboardData?.stats?.applications ?
                                        (dashboardData.stats.applications.applied + dashboardData.stats.applications.interview + dashboardData.stats.applications.offered + dashboardData.stats.applications.rejected) :
                                        0
                                    }
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-gradient-card rounded-xl shadow-dark p-6 border border-dark-700/50 hover:border-accent-green/30 transition-all duration-300 group hover:shadow-glow-sm">
                        <div className="flex items-center">
                            <div className="flex-shrink-0 p-3 bg-accent-green/20 rounded-xl group-hover:bg-accent-green/30 transition-colors">
                                <Calendar className="h-6 w-6 text-accent-green" />
                            </div>
                            <div className="ml-4">
                                <p className="text-sm font-medium text-dark-400">Interviews</p>
                                <p className="text-2xl font-bold text-white">
                                    {dashboardData?.stats?.applications?.interview || 0}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-gradient-card rounded-xl shadow-dark p-6 border border-dark-700/50 hover:border-accent-purple/30 transition-all duration-300 group hover:shadow-glow-sm">
                        <div className="flex items-center">
                            <div className="flex-shrink-0 p-3 bg-accent-purple/20 rounded-xl group-hover:bg-accent-purple/30 transition-colors">
                                <Briefcase className="h-6 w-6 text-accent-purple" />
                            </div>
                            <div className="ml-4">
                                <p className="text-sm font-medium text-dark-400">Available Jobs</p>
                                <p className="text-2xl font-bold text-white">
                                    {dashboardData?.stats?.jobs?.totalAvailable || 0}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-gradient-card rounded-xl shadow-dark p-6 border border-dark-700/50 hover:border-accent-orange/30 transition-all duration-300 group hover:shadow-glow-sm">
                        <div className="flex items-center">
                            <div className="flex-shrink-0 p-3 bg-accent-orange/20 rounded-xl group-hover:bg-accent-orange/30 transition-colors">
                                <Users className="h-6 w-6 text-accent-orange" />
                            </div>
                            <div className="ml-4">
                                <p className="text-sm font-medium text-dark-400">Matches</p>
                                <p className="text-2xl font-bold text-white">
                                    {dashboardData?.stats?.recommendations?.topMatches?.length || 0}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Grid */}
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                    {/* Left Column - Stats and Activity */}
                    <div className="xl:col-span-2 space-y-6">
                        {/* Dashboard Stats */}
                        <DashboardStats stats={dashboardData?.stats} />

                        {/* User Metrics */}
                        {userMetrics && <UserMetricsCard metrics={userMetrics} />}

                        {/* Recent Activity */}
                        <RecentActivity
                            activities={dashboardData.recentActivity || []}
                            onRefresh={loadDashboardData}
                        />
                    </div>

                    {/* Right Column - Actions and Recommendations */}
                    <div className="space-y-6">
                        {/* Quick Actions */}
                        <QuickActions
                            onRefreshRecommendations={handleRefreshRecommendations}
                            refreshing={refreshing}
                        />

                        {/* Upcoming Interviews */}
                        <UpcomingInterviews interviews={dashboardData.upcomingInterviews || []} />

                        {/* Job Recommendations */}
                        <JobRecommendations
                            recommendations={dashboardData?.stats?.recommendations?.topMatches || []}
                            onRefresh={handleRefreshRecommendations}
                            refreshing={refreshing}
                        />
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default DashboardPage;