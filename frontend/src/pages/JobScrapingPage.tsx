import React from 'react';
import Layout from '../components/layout/Layout';
import { JobScrapingManager } from '../components/jobs/JobScrapingManager';

export function JobScrapingPage() {
    return (
        <Layout
            title="Job Scraping Management"
            subtitle="Monitor and control automated job collection"
        >
            <div className="max-w-4xl mx-auto">
                <JobScrapingManager />
            </div>
        </Layout>
    );
}