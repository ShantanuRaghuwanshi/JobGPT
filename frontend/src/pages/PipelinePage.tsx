import React from 'react';
import Layout from '../components/layout/Layout';
import { JobPipeline } from '../components/jobs/JobPipeline';

export function PipelinePage() {
    return (
        <Layout
            title="Job Pipeline"
            subtitle="Manage your job applications with drag and drop"
        >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                <JobPipeline />
            </div>
        </Layout>
    );
}