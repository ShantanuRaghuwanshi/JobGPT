import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './contexts/AuthContext'
import { ProtectedRoute, PublicRoute } from './components/auth/ProtectedRoute'
import { AuthPage } from './pages/AuthPage'
import DashboardPage from './pages/DashboardPage'
import { ProfilePage } from './pages/ProfilePage'
import { JobsPage } from './pages/JobsPage'
import { PipelinePage } from './pages/PipelinePage'
import { ErrorBoundary } from './components/ui/ErrorBoundary'

// Create a client with error handling
const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 5 * 60 * 1000, // 5 minutes
            retry: (failureCount, error: any) => {
                // Don't retry on 4xx errors (client errors)
                if (error?.response?.status >= 400 && error?.response?.status < 500) {
                    return false;
                }
                // Retry up to 2 times for other errors
                return failureCount < 2;
            },
            retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
        },
        mutations: {
            retry: false, // Don't retry mutations by default
        },
    },
})

function App() {
    return (
        <ErrorBoundary>
            <QueryClientProvider client={queryClient}>
                <AuthProvider>
                    <Router>
                        <div className="min-h-screen bg-gray-50">
                            <Routes>
                                <Route path="/" element={<HomePage />} />
                                <Route
                                    path="/login"
                                    element={
                                        <PublicRoute>
                                            <AuthPage />
                                        </PublicRoute>
                                    }
                                />
                                <Route
                                    path="/dashboard"
                                    element={
                                        <ProtectedRoute>
                                            <ErrorBoundary>
                                                <DashboardPage />
                                            </ErrorBoundary>
                                        </ProtectedRoute>
                                    }
                                />
                                <Route
                                    path="/profile"
                                    element={
                                        <ProtectedRoute>
                                            <ErrorBoundary>
                                                <ProfilePage />
                                            </ErrorBoundary>
                                        </ProtectedRoute>
                                    }
                                />
                                <Route
                                    path="/jobs"
                                    element={
                                        <ProtectedRoute>
                                            <ErrorBoundary>
                                                <JobsPage />
                                            </ErrorBoundary>
                                        </ProtectedRoute>
                                    }
                                />
                                <Route
                                    path="/pipeline"
                                    element={
                                        <ProtectedRoute>
                                            <ErrorBoundary>
                                                <PipelinePage />
                                            </ErrorBoundary>
                                        </ProtectedRoute>
                                    }
                                />
                                {/* Redirect any unknown routes to home */}
                                <Route path="*" element={<Navigate to="/" replace />} />
                            </Routes>
                        </div>
                    </Router>
                </AuthProvider>
            </QueryClientProvider>
        </ErrorBoundary>
    )
}

// Home page component
const HomePage = () => (
    <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
                Job Application Automation Platform
            </h1>
            <p className="text-xl text-gray-600 mb-8">
                Automate your job search and application process
            </p>
            <div className="space-x-4">
                <a
                    href="/login"
                    className="inline-block bg-blue-600 text-white px-6 py-3 rounded-md font-medium hover:bg-blue-700 transition-colors"
                >
                    Get Started
                </a>
                <a
                    href="/dashboard"
                    className="inline-block bg-gray-200 text-gray-800 px-6 py-3 rounded-md font-medium hover:bg-gray-300 transition-colors"
                >
                    Dashboard
                </a>
            </div>
        </div>
    </div>
)

export default App