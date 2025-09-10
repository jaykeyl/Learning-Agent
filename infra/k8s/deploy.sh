#!/bin/bash

# Learning Agent Kubernetes Deployment Script
# This script deploys the complete Learning Agent application to Kubernetes

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print colored output
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

# Check if kubectl is installed
check_kubectl() {
    if ! command -v kubectl &> /dev/null; then
        print_error "kubectl is not installed. Please install kubectl first."
        exit 1
    fi
    print_success "kubectl is available"
}

# Check if Minikube is running (optional - works with any Kubernetes cluster)
check_cluster() {
    if ! kubectl cluster-info &> /dev/null; then
        print_warning "No Kubernetes cluster found."
        
        # Check if minikube is available
        if command -v minikube &> /dev/null; then
            print_status "Minikube is available. Attempting to start..."
            
            # Check if minikube is already running but not accessible
            if minikube status | grep -q "Running"; then
                print_warning "Minikube appears to be running but kubectl can't connect."
                print_status "Attempting to fix kubectl context..."
                minikube update-context
            else
                print_status "Starting Minikube..."
                minikube start --kubernetes-version=v1.28.2
            fi
            
            # Verify connection after start/fix
            if kubectl cluster-info &> /dev/null; then
                print_success "Kubernetes cluster is now accessible"
            else
                print_error "Failed to connect to Kubernetes cluster"
                exit 1
            fi
        else
            print_error "No Kubernetes cluster found and Minikube is not installed."
            print_status "Please either:"
            print_status "  1. Install and start Minikube: https://minikube.sigs.k8s.io/docs/start/"
            print_status "  2. Configure kubectl to connect to your existing cluster"
            exit 1
        fi
    else
        print_success "Kubernetes cluster is accessible"
    fi
}

# Check if Docker images exist (for Minikube)
check_images() {
    print_status "Checking if application images exist..."
    
    # Check if we're in Minikube environment
    if kubectl config current-context | grep -q "minikube"; then
        print_status "Minikube detected. Switching to Minikube's Docker environment..."
        eval $(minikube docker-env)
        
        # Always rebuild images to ensure latest changes
        print_status "Building backend image..."
        docker build -t learning-agent-backend:latest ../../backend/
        
        print_status "Building frontend image..."
        docker build -t learning-agent-frontend:latest ../../client/
        
        print_success "Images built successfully"
    else
        print_warning "Not using Minikube. Make sure your images are available in your cluster's registry."
    fi
}

# Create namespace
create_namespace() {
    print_status "Creating namespace..."
    kubectl apply -f namespace.yaml
    print_success "Namespace created/updated"
}

# Create secrets from .env files
create_secrets() {
    print_status "Creating secrets from .env files..."
    
    # Check if .env files exist
    if [ ! -f "../docker/.env" ]; then
        print_error "infra/docker/.env file not found. Please create it first."
        exit 1
    fi
    
    if [ ! -f "../../backend/.env" ]; then
        print_error "backend/.env file not found. Please create it first."
        exit 1
    fi
    
    # Create infra secrets from docker/.env
    kubectl create secret generic infra-secrets \
        --from-env-file=../docker/.env \
        --namespace=learning-agent \
        --dry-run=client -o yaml | kubectl apply -f -
    
    # Create backend secrets from backend/.env
    kubectl create secret generic backend-env-secrets \
        --from-env-file=../../backend/.env \
        --namespace=learning-agent \
        --dry-run=client -o yaml | kubectl apply -f -
    
    print_success "Secrets created/updated"
}

# Deploy PostgreSQL with initialization
deploy_postgres() {
    print_status "Deploying PostgreSQL with pgvector extension..."
    kubectl apply -f postgres-init-configmap.yaml
    kubectl apply -f postgres-deployment.yaml
    print_success "PostgreSQL deployed"
}

# Deploy MinIO
deploy_minio() {
    print_status "Deploying MinIO object storage..."
    kubectl apply -f minio-deployment.yaml
    
    # Wait for MinIO to be ready
    print_status "Waiting for MinIO to be ready..."
    kubectl wait --for=condition=available --timeout=300s deployment/minio -n learning-agent
    
    # Configure MinIO bucket and permissions
    configure_minio_bucket
    
    print_success "MinIO deployed and configured"
}

# Configure MinIO bucket and permissions
configure_minio_bucket() {
    print_status "Configuring MinIO bucket and permissions..."
    
    # Wait a bit more for MinIO to be fully ready
    sleep 10
    
    # Set up MinIO client alias
    print_status "Setting up MinIO client..."
    kubectl exec -n learning-agent deployment/minio -- mc alias set local http://localhost:9000 adminminio adminpassword
    
    # Create documents bucket if it doesn't exist
    print_status "Creating documents bucket..."
    kubectl exec -n learning-agent deployment/minio -- mc mb local/documents --ignore-existing
    
    # Set public read access for the bucket
    print_status "Setting public read access for documents bucket..."
    kubectl exec -n learning-agent deployment/minio -- mc anonymous set download local/documents
    
    print_success "MinIO bucket configured with public read access"
}

# Deploy Jenkins
deploy_jenkins() {
    print_status "Deploying Jenkins CI/CD..."
    kubectl apply -f jenkins-deployment.yaml
    print_success "Jenkins deployed"
}

# Deploy backend
deploy_backend() {
    print_status "Deploying backend application..."
    kubectl apply -f backend-deployment.yaml
    print_success "Backend deployed"
}

# Deploy frontend
deploy_frontend() {
    print_status "Deploying frontend application..."
    kubectl apply -f frontend-deployment.yaml
    print_success "Frontend deployed"
}

# Wait for all deployments
wait_for_deployments() {
    print_status "Waiting for all deployments to be ready..."
    
    kubectl wait --for=condition=available --timeout=300s deployment/postgres -n learning-agent
    # MinIO is already waited for in deploy_minio function
    kubectl wait --for=condition=available --timeout=300s deployment/jenkins -n learning-agent
    kubectl wait --for=condition=available --timeout=300s deployment/backend -n learning-agent
    kubectl wait --for=condition=available --timeout=300s deployment/frontend -n learning-agent
    
    print_success "All deployments are ready!"
}

# Show deployment status
show_status() {
    print_status "Deployment Status:"
    echo ""
    kubectl get pods -n learning-agent
    echo ""
    kubectl get services -n learning-agent
    echo ""
    print_success "Learning Agent application deployed successfully!"
    echo ""
    print_success " ALL SERVICES ARE READY AND ACCESSIBLE! "
    echo ""
    print_status "Access URLs (ready to use):"
    echo "  🌐 Frontend:       http://localhost:5173"
    echo "  🔧 Backend API:    http://localhost:3000"
    echo "  📦 MinIO Console:  http://localhost:9090"
    echo "  🔧 Jenkins:       http://localhost:8080"
    echo "  🐘 PostgreSQL:    localhost:5432"
    echo ""
    print_status "MinIO Credentials:"
    echo ""
    print_warning "Port-forwarding processes are running in background."
    print_warning "To stop all services: $0 cleanup"
    print_warning "To check logs: $0 logs <service-name>"
}

# Cleanup function
cleanup() {
    print_status "Cleaning up completed jobs..."
    kubectl delete jobs -n learning-agent -l app!=keep 2>/dev/null || true
}

# Stop all port-forwarding processes
stop_port_forwarding() {
    print_status "Stopping all port-forwarding processes..."
    pkill -f "kubectl port-forward" 2>/dev/null || true
    print_success "Port-forwarding stopped"
}

# Start port-forwarding for all services
start_port_forwarding() {
    print_status "Starting port-forwarding for all services..."
    
    # Stop any existing port-forwarding processes first
    stop_port_forwarding
    sleep 2
    
    # Start port-forwarding in background
    print_status "Setting up port-forwarding..."
    
    kubectl port-forward -n learning-agent service/backend-service 3000:3000 > /dev/null 2>&1 &
    kubectl port-forward -n learning-agent service/frontend-service 5173:5173 > /dev/null 2>&1 &
    kubectl port-forward -n learning-agent service/minio-service 9000:9000 > /dev/null 2>&1 &
    kubectl port-forward -n learning-agent service/minio-service 9090:9090 > /dev/null 2>&1 &
    kubectl port-forward -n learning-agent service/postgres-service 5432:5432 > /dev/null 2>&1 &
    kubectl port-forward -n learning-agent service/jenkins-service 8080:8080 > /dev/null 2>&1 &
    
    # Wait a moment for port-forwarding to establish
    sleep 5
    
    print_success "Port-forwarding started for all services"
}

# Main deployment function
main() {
    print_status "Starting Learning Agent Kubernetes deployment..."
    echo ""
    
    check_kubectl
    check_cluster
    check_images
    
    create_namespace
    create_secrets
    
    deploy_postgres
    deploy_minio  # MinIO configuration is now included
    deploy_jenkins
    deploy_backend
    deploy_frontend
    
    wait_for_deployments
    cleanup
    start_port_forwarding
    show_status
}

# Handle script arguments
case "${1:-deploy}" in
    "deploy")
        main
        ;;
    "cleanup")
        print_status "Cleaning up Learning Agent deployment..."
        stop_port_forwarding
        kubectl delete namespace learning-agent 2>/dev/null || true
        print_success "Cleanup completed"
        ;;
    "status")
        kubectl get all -n learning-agent
        ;;
    "logs")
        if [ -z "$2" ]; then
            print_error "Usage: $0 logs <service-name>"
            print_status "Available services: postgres, minio, jenkins, backend, frontend"
            exit 1
        fi
        kubectl logs -n learning-agent deployment/$2 --tail=50
        ;;
    "port-forward")
        print_status "Starting port-forwarding for all services..."
        start_port_forwarding
        show_status
        ;;
    "stop-forward")
        stop_port_forwarding
        ;;
    *)
        echo "Usage: $0 [deploy|cleanup|status|logs <service>|port-forward|stop-forward]"
        echo ""
        echo "Commands:"
        echo "  deploy        - Deploy the complete Learning Agent application (default)"
        echo "  cleanup       - Remove the entire deployment and stop port-forwarding"
        echo "  status        - Show deployment status"
        echo "  logs          - Show logs for a specific service"
        echo "  port-forward  - Start port-forwarding for all services"
        echo "  stop-forward  - Stop all port-forwarding processes"
        echo ""
        echo "Examples:"
        echo "  $0                     # Deploy the application with port-forwarding"
        echo "  $0 deploy             # Deploy the application with port-forwarding"
        echo "  $0 status             # Check deployment status"
        echo "  $0 logs backend       # View backend logs"
        echo "  $0 port-forward       # Start port-forwarding only"
        echo "  $0 stop-forward       # Stop port-forwarding only"
        echo "  $0 cleanup            # Remove everything"
        ;;
esac
