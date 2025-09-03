import React from 'react';
import Layout from '../components/layout/Layout';
import { JobDiscovery } from '../components/jobs/JobDiscovery';

export function JobsPage() {
    return (
        <Layout
            title="Job Discovery"
            subtitle="Find and explore new job opportunities"
        >
            <JobDiscovery />
        </Layout>
    );
}