#!/bin/bash

# Start development environment script

echo "🚀 Starting Job Application Automation Platform Development Environment"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Start databases
echo "📊 Starting databases..."
docker-compose up -d postgres redis

# Wait for databases to be ready
echo "⏳ Waiting for databases to be ready..."
sleep 5

# Check if databases are healthy
echo "🔍 Checking database health..."
if docker-compose ps postgres | grep -q "healthy"; then
    echo "✅ PostgreSQL is ready"
else
    echo "⚠️  PostgreSQL is starting up..."
fi

if docker-compose ps redis | grep -q "healthy"; then
    echo "✅ Redis is ready"
else
    echo "⚠️  Redis is starting up..."
fi

echo ""
echo "🎉 Development environment is ready!"
echo ""
echo "Next steps:"
echo "1. Copy environment files:"
echo "   cp backend/.env.example backend/.env"
echo "   cp frontend/.env.example frontend/.env"
echo ""
echo "2. Start the development servers:"
echo "   npm run dev"
echo ""
echo "3. Access the application:"
echo "   Frontend: http://localhost:3000"
echo "   Backend API: http://localhost:5000"
echo "   Health Check: http://localhost:5000/api/health"
echo ""
echo "Optional tools (run 'npm run tools:up'):"
echo "   pgAdmin: http://localhost:8080 (admin@example.com / admin)"
echo "   Redis Commander: http://localhost:8081"