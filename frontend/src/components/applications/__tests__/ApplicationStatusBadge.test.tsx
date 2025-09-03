import React from 'react';
import { render, screen } from '@testing-library/react';
import ApplicationStatusBadge from '../ApplicationStatusBadge';
import { ApplicationStatus } from '../../../services/api';

describe('ApplicationStatusBadge', () => {
    const testCases: { status: ApplicationStatus; expectedLabel: string; expectedIcon: string }[] = [
        { status: 'applied', expectedLabel: 'Applied', expectedIcon: '📝' },
        { status: 'interview', expectedLabel: 'Interview', expectedIcon: '🗣️' },
        { status: 'offered', expectedLabel: 'Offered', expectedIcon: '🎉' },
        { status: 'rejected', expectedLabel: 'Rejected', expectedIcon: '❌' },
    ];

    testCases.forEach(({ status, expectedLabel, expectedIcon }) => {
        it(`should render ${status} status correctly`, () => {
            render(<ApplicationStatusBadge status={status} />);

            expect(screen.getByText(expectedLabel)).toBeInTheDocument();
            expect(screen.getByText(expectedIcon)).toBeInTheDocument();
        });

        it(`should apply correct CSS classes for ${status} status`, () => {
            const { container } = render(<ApplicationStatusBadge status={status} />);
            const badge = container.firstChild as HTMLElement;

            expect(badge).toHaveClass('inline-flex', 'items-center', 'gap-1', 'px-2.5', 'py-0.5', 'rounded-full', 'text-xs', 'font-medium', 'border');
        });
    });

    it('should apply custom className when provided', () => {
        const customClass = 'custom-test-class';
        const { container } = render(
            <ApplicationStatusBadge status="applied" className={customClass} />
        );
        const badge = container.firstChild as HTMLElement;

        expect(badge).toHaveClass(customClass);
    });

    it('should render with default className when none provided', () => {
        const { container } = render(<ApplicationStatusBadge status="applied" />);
        const badge = container.firstChild as HTMLElement;

        expect(badge).toHaveClass('inline-flex');
    });
});