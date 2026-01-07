#!/bin/bash

# Smart Cost Calculator - Deployment Script
# This script helps deploy the application using Docker

set -e  # Exit on error

echo "================================================"
echo "Smart Cost Calculator - Deployment Script"
echo "================================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if .env file exists
if [ ! -f .env ]; then
    echo -e "${YELLOW}Warning: .env file not found${NC}"
    echo "Creating .env from .env.example..."
    
    if [ -f .env.example ]; then
        cp .env.example .env
        echo -e "${GREEN}✓ Created .env file${NC}"
        echo -e "${YELLOW}Please edit .env file with your Supabase credentials before continuing${NC}"
        echo ""
        echo "Required variables:"
        echo "  - NEXT_PUBLIC_SUPABASE_URL"
        echo "  - NEXT_PUBLIC_SUPABASE_ANON_KEY"
        echo "  - SUPABASE_SERVICE_ROLE_KEY"
        echo ""
        read -p "Press Enter after editing .env file..."
    else
        echo -e "${RED}Error: .env.example not found${NC}"
        exit 1
    fi
fi

# Verify required environment variables
echo "Checking environment variables..."
source .env

if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ]; then
    echo -e "${RED}Error: NEXT_PUBLIC_SUPABASE_URL not set in .env${NC}"
    exit 1
fi

if [ -z "$NEXT_PUBLIC_SUPABASE_ANON_KEY" ]; then
    echo -e "${RED}Error: NEXT_PUBLIC_SUPABASE_ANON_KEY not set in .env${NC}"
    exit 1
fi

if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo -e "${RED}Error: SUPABASE_SERVICE_ROLE_KEY not set in .env${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Environment variables configured${NC}"
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Error: Docker is not installed${NC}"
    echo "Please install Docker first: https://docs.docker.com/get-docker/"
    exit 1
fi

echo -e "${GREEN}✓ Docker is installed${NC}"

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo -e "${YELLOW}Warning: docker-compose not found, trying docker compose...${NC}"
    if ! docker compose version &> /dev/null; then
        echo -e "${RED}Error: Docker Compose is not installed${NC}"
        echo "Please install Docker Compose: https://docs.docker.com/compose/install/"
        exit 1
    fi
    DOCKER_COMPOSE="docker compose"
else
    DOCKER_COMPOSE="docker-compose"
fi

echo -e "${GREEN}✓ Docker Compose is available${NC}"
echo ""

# Ask user what to do
echo "What would you like to do?"
echo "1) Build and start the application"
echo "2) Stop the application"
echo "3) Restart the application"
echo "4) View logs"
echo "5) Check status"
echo "6) Clean rebuild (remove old images)"
echo "7) Exit"
echo ""
read -p "Enter your choice (1-7): " choice

case $choice in
    1)
        echo ""
        echo "Building and starting the application..."
        echo "This may take 5-10 minutes on first run..."
        echo ""
        $DOCKER_COMPOSE up -d --build
        echo ""
        echo -e "${GREEN}✓ Application started successfully!${NC}"
        echo ""
        echo "Access the application at:"
        echo "  http://localhost:3000"
        echo ""
        echo "To view logs, run:"
        echo "  $DOCKER_COMPOSE logs -f"
        echo ""
        echo "To check health:"
        echo "  curl http://localhost:3000/api/health"
        ;;
    
    2)
        echo ""
        echo "Stopping the application..."
        $DOCKER_COMPOSE down
        echo -e "${GREEN}✓ Application stopped${NC}"
        ;;
    
    3)
        echo ""
        echo "Restarting the application..."
        $DOCKER_COMPOSE restart
        echo -e "${GREEN}✓ Application restarted${NC}"
        ;;
    
    4)
        echo ""
        echo "Showing logs (Ctrl+C to exit)..."
        echo ""
        $DOCKER_COMPOSE logs -f
        ;;
    
    5)
        echo ""
        echo "Container status:"
        $DOCKER_COMPOSE ps
        echo ""
        echo "Resource usage:"
        docker stats --no-stream smart-cost-calculator 2>/dev/null || echo "Container not running"
        echo ""
        echo "Health check:"
        curl -s http://localhost:3000/api/health | jq . 2>/dev/null || curl -s http://localhost:3000/api/health || echo "Application not responding"
        ;;
    
    6)
        echo ""
        echo -e "${YELLOW}Warning: This will remove all containers and images${NC}"
        read -p "Are you sure? (yes/no): " confirm
        if [ "$confirm" = "yes" ]; then
            echo ""
            echo "Stopping containers..."
            $DOCKER_COMPOSE down
            echo "Removing images..."
            docker rmi smart-cost-calculator-app 2>/dev/null || true
            echo "Rebuilding..."
            $DOCKER_COMPOSE build --no-cache
            echo "Starting..."
            $DOCKER_COMPOSE up -d
            echo ""
            echo -e "${GREEN}✓ Clean rebuild complete${NC}"
        else
            echo "Cancelled"
        fi
        ;;
    
    7)
        echo "Exiting..."
        exit 0
        ;;
    
    *)
        echo -e "${RED}Invalid choice${NC}"
        exit 1
        ;;
esac

echo ""
echo "================================================"
echo "Done!"
echo "================================================"
