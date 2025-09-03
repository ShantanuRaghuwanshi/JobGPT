import React, { ReactNode, useState } from 'react';
import Navigation from './Navigation';
import Sidebar from './Sidebar';
import MobileBottomNav from './MobileBottomNav';

interface LayoutProps {
    children: ReactNode;
    showNavigation?: boolean;
    showSidebar?: boolean;
    title?: string;
    subtitle?: string;
}

const Layout: React.FC<LayoutProps> = ({
    children,
    showNavigation = true,
    showSidebar = true,
    title,
    subtitle
}) => {
    const [sidebarOpen, setSidebarOpen] = useState(false);

    return (
        <div className="min-h-screen bg-gradient-dark">
            {showSidebar && (
                <Sidebar
                    isOpen={sidebarOpen}
                    onToggle={() => setSidebarOpen(!sidebarOpen)}
                />
            )}

            {showNavigation && <Navigation />}

            <main className={`${showSidebar ? 'lg:ml-64' : ''} ${showNavigation ? 'pt-16' : ''} pb-16 lg:pb-0`}>
                {(title || subtitle) && (
                    <div className="bg-dark-800/80 backdrop-blur-sm shadow-dark border-b border-dark-700">
                        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                            {title && (
                                <h1 className="text-2xl lg:text-3xl font-bold text-white">{title}</h1>
                            )}
                            {subtitle && (
                                <p className="mt-2 text-sm lg:text-base text-dark-300">{subtitle}</p>
                            )}
                        </div>
                    </div>
                )}
                <div className="min-h-screen">
                    {children}
                </div>
            </main>

            {/* Mobile Bottom Navigation */}
            <MobileBottomNav />
        </div>
    );
};

export default Layout;