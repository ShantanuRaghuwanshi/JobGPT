#!/bin/bash

# Job Application Automation Platform - Test Runner Script
# This script runs all tests in the correct order with proper setup

set -e  # Exit on any error

echo "🚀 Starting comprehensive test suite for Job Application Automation Platform"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    print_error "Docker is not running. Please start Docker and try again."
    exit 1
fi

# Function to cleanup on exit
cleanup() {
    print_status "Cleaning up test environment..."
    docker-compose -f docker-compose.test.yml down -v > /dev/null 2>&1 || true
}

trap cleanup EXIT

# Start test services
print_status "Starting test database services..."
docker-compose -f docker-compose.test.yml up -d postgres-test redis-test

# Wait for services to be ready
print_status "Waiting for services to be ready..."
sleep 10

# Check if services are healthy
if ! docker-compose -f docker-compose.test.yml ps | grep -q "healthy"; then
    print_warning "Services may not be fully ready, continuing anyway..."
fi

# Run backend tests
print_status "Running backend tests..."

cd backend

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    print_status "Installing backend dependencies..."
    npm ci
fi

# Create test environment file
cat > .env.test << EOF
NODE_ENV=test
DB_HOST=localhost
DB_PORT=5432
DB_NAME=job_automation_test
DB_USER=postgres
DB_PASSWORD=password
REDIS_URL=redis://localhost:6379
JWT_SECRET=test-jwt-secret-key
OPENAI_API_KEY=test-openai-key
ANTHROPIC_API_KEY=test-anthropic-key
GOOGLE_API_KEY=test-google-key
EOF

# Run linting
print_status "Running backend linting..."
npm run lint || print_warning "Backend linting issues found"

# Run unit tests
print_status "Running backend unit tests..."
npm run test:unit || {
    print_error "Backend unit tests failed"
    exit 1
}

# Run integration tests
print_status "Running backend integration tests..."
npm run test:integration || {
    print_error "Backend integration tests failed"
    exit 1
}

# Run e2e tests
print_status "Running backend e2e tests..."
npm run test:e2e || {
    print_error "Backend e2e tests failed"
    exit 1
}

# Run performance tests
print_status "Running backend performance tests..."
npm run test:performance || {
    print_warning "Backend performance tests failed or took too long"
}

# Generate coverage report
print_status "Generating backend coverage report..."
npm run test:coverage

print_success "Backend tests completed successfully!"

cd ..

# Run frontend tests
print_status "Running frontend tests..."

cd frontend

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    print_status "Installing frontend dependencies..."
    npm ci
fi

# Create frontend environment file
cat > .env << EOF
VITE_API_URL=http://localhost:5000/api
VITE_APP_NAME=Job Automation Platform
EOF

# Run linting
print_status "Running frontend linting..."
npm run lint || print_warning "Frontend linting issues found"

# Run tests with coverage
print_status "Running frontend tests with coverage..."
npm run test:coverage || {
    print_error "Frontend tests failed"
    exit 1
}

# Build frontend to check for build issues
print_status "Building frontend..."
npm run build || {
    print_error "Frontend build failed"
    exit 1
}

print_success "Frontend tests completed successfully!"

cd ..

# Run security audits
print_status "Running security audits..."

print_status "Auditing backend dependencies..."
cd backend
npm audit --audit-level=moderate || print_warning "Backend security issues found"

cd ../frontend
print_status "Auditing frontend dependencies..."
npm audit --audit-level=moderate || print_warning "Frontend security issues found"

cd ..

# Generate combined coverage report
print_status "Generating combined coverage report..."

# Create coverage directory if it doesn't exist
mkdir -p coverage

# Copy coverage reports
cp -r backend/coverage coverage/backend 2>/dev/null || true
cp -r frontend/coverage coverage/frontend 2>/dev/null || true

# Display coverage summary
print_status "Coverage Summary:"
if [ -f "backend/coverage/coverage-summary.json" ]; then
    echo "Backend Coverage:"
    cat backend/coverage/coverage-summary.json | grep -E '"lines"|"functions"|"branches"|"statements"' | head -4
fi

if [ -f "frontend/coverage/coverage-summary.json" ]; then
    echo "Frontend Coverage:"
    cat frontend/coverage/coverage-summary.json | grep -E '"lines"|"functions"|"branches"|"statements"' | head -4
fi

# Final status
print_success "🎉 All tests completed successfully!"
print_status "Coverage reports available in:"
print_status "  - Backend: backend/coverage/lcov-report/index.html"
print_status "  - Frontend: frontend/coverage/index.html"

# Optional: Open coverage reports in browser
if command -v open > /dev/null 2>&1; then
    read -p "Open coverage reports in browser? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        open backend/coverage/lcov-report/index.html
        open frontend/coverage/index.html
    fi
fi

print_success "Test suite execution completed! 🚀"