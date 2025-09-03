import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import App from './App';

describe('App', () => {
    it('renders the main heading', () => {
        render(<App />);
        const heading = screen.getByText('Job Application Automation Platform');
        expect(heading).toBeInTheDocument();
    });

    it('renders the get started button', () => {
        render(<App />);
        const button = screen.getByText('Get Started');
        expect(button).toBeInTheDocument();
    });
});