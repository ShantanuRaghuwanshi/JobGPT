# Job Scraping UI Components

## Overview
The job scraping UI provides a comprehensive interface for managing automated job collection, monitoring queue status, and triggering manual scraping operations.

## Components

### 1. JobScrapingManager
**Location:** `src/components/jobs/JobScrapingManager.tsx`

The main management interface for job scraping operations.

**Features:**
- Quick action buttons for common operations
- Advanced options for custom scraping
- Real-time queue statistics
- Status indicators and progress tracking
- Error handling and success notifications

**Usage:**
```tsx
import { JobScrapingManager } from '../components/jobs/JobScrapingManager';

<JobScrapingManager />
```

**Quick Actions:**
- **Quick Crawl**: Basic job scraping without validation
- **Full Crawl + Validation**: Complete scraping with existing job validation

**Advanced Options:**
- Target specific companies
- Enable/disable existing job validation
- Custom crawl parameters

### 2. JobScrapingWidget
**Location:** `src/components/dashboard/JobScrapingWidget.tsx`

A compact dashboard widget showing scraping status at a glance.

**Features:**
- Real-time queue status
- Active/waiting/failed job counts
- Quick navigation to full manager
- Auto-refresh every 30 seconds

**Usage:**
```tsx
import { JobScrapingWidget } from '../components/dashboard/JobScrapingWidget';

<JobScrapingWidget />
```

### 3. JobScrapingNotification
**Location:** `src/components/jobs/JobScrapingNotification.tsx`

Toast-style notifications for scraping events.

**Features:**
- Automatic notifications for completed jobs
- Success/warning/info message types
- Auto-dismiss after 5 seconds
- Manual dismiss option

**Usage:**
```tsx
import { JobScrapingNotification } from '../components/jobs/JobScrapingNotification';

<JobScrapingNotification onDismiss={() => console.log('Dismissed')} />
```

### 4. JobScrapingPage
**Location:** `src/pages/JobScrapingPage.tsx`

Dedicated page for job scraping management (optional standalone page).

**Usage:**
```tsx
import { JobScrapingPage } from '../pages/JobScrapingPage';

// In your router
<Route path="/scraping" element={<JobScrapingPage />} />
```

## Integration

### Jobs Page Integration
The job scraping manager is integrated as a tab in the main Jobs page:

1. Navigate to `/jobs`
2. Click on the "Scraping" tab
3. Access all scraping management features

### Dashboard Integration
Add the scraping widget to your dashboard:

```tsx
import { JobScrapingWidget } from '../components/dashboard/JobScrapingWidget';

// In your dashboard component
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  <JobScrapingWidget />
  {/* Other dashboard widgets */}
</div>
```

## API Integration

### Required API Endpoints
The UI components use these API endpoints:

- `POST /api/jobs/crawl` - Trigger job scraping
- `GET /api/jobs/queue/stats` - Get queue statistics

### API Types
```typescript
interface CrawlJobRequest {
    validateExisting?: boolean;
    companies?: string[];
}

interface QueueStats {
    crawling: {
        waiting: number;
        active: number;
        completed: number;
        failed: number;
    };
    validation: {
        waiting: number;
        active: number;
        completed: number;
        failed: number;
    };
}
```

## Styling

### Theme Integration
All components use the existing design system:

- **Colors**: Uses accent colors (blue, green, orange, red) for status indicators
- **Dark Theme**: Consistent with the dark theme using `dark-800`, `dark-700`, etc.
- **Icons**: Lucide React icons for consistency
- **Spacing**: Tailwind CSS spacing utilities

### Status Colors
- **Green**: Success states, completed jobs
- **Blue**: Active/in-progress states
- **Orange**: Warning states, waiting jobs
- **Red**: Error states, failed jobs
- **Gray**: Neutral/idle states

## User Experience

### Real-time Updates
- Queue statistics refresh automatically (5-30 second intervals)
- Visual indicators show active scraping operations
- Progress feedback for user actions

### Error Handling
- Graceful error states with retry options
- Clear error messages and troubleshooting hints
- Fallback UI when services are unavailable

### Accessibility
- Proper ARIA labels and roles
- Keyboard navigation support
- Screen reader friendly status updates
- Color-blind friendly status indicators

## Usage Examples

### Basic Setup
```tsx
// In your Jobs page
import { JobDiscovery } from '../components/jobs/JobDiscovery';

export function JobsPage() {
    return (
        <Layout title="Jobs">
            <JobDiscovery />
        </Layout>
    );
}
```

### Dashboard Integration
```tsx
// In your Dashboard page
import { JobScrapingWidget } from '../components/dashboard/JobScrapingWidget';

export function DashboardPage() {
    return (
        <Layout title="Dashboard">
            <div className="grid grid-cols-3 gap-6">
                <JobScrapingWidget />
                {/* Other widgets */}
            </div>
        </Layout>
    );
}
```

### Notifications
```tsx
// In your main App component
import { JobScrapingNotification } from '../components/jobs/JobScrapingNotification';

export function App() {
    return (
        <div>
            {/* Your app content */}
            <JobScrapingNotification />
        </div>
    );
}
```

## Configuration

### Refresh Intervals
- **Manager**: 5 seconds (real-time monitoring)
- **Widget**: 30 seconds (dashboard overview)
- **Notifications**: 10 seconds (event detection)

### Customization
You can customize refresh intervals by modifying the `refetchInterval` in the useQuery hooks:

```tsx
const { data } = useQuery({
    queryKey: ['queue-stats'],
    queryFn: () => jobApi.getQueueStats(),
    refetchInterval: 15000, // 15 seconds
});
```

## Troubleshooting

### Common Issues

1. **Queue stats not loading**
   - Check API endpoint availability
   - Verify authentication token
   - Check Redis connection

2. **Scraping not triggering**
   - Verify API permissions
   - Check server logs for errors
   - Ensure Redis queue is running

3. **UI not updating**
   - Check network connectivity
   - Verify React Query cache
   - Check browser console for errors

### Debug Mode
Enable debug logging by setting localStorage:

```javascript
localStorage.setItem('debug', 'job-scraping:*');
```