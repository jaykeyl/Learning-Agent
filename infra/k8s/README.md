# Learning Agent - Kubernetes Deployment

Este directorio contiene todos los archivos de configuración y scripts necesarios para desplegar la aplicación Learning Agent en Kubernetes.

## 🛠️ Instalación de Prerrequisitos

### Para Arch Linux

```bash
# 1. Actualizar el sistema
sudo pacman -Syu

# 2. Instalar Docker
sudo pacman -S docker docker-compose
sudo systemctl enable docker
sudo systemctl start docker
sudo usermod -aG docker $USER
# Nota: Cerrar sesión e iniciar sesión nuevamente para aplicar cambios de grupo

# 3. Instalar kubectl
sudo pacman -S kubectl

# 4. Instalar Minikube
sudo pacman -S minikube

# 5. Verificar instalaciones
docker --version
kubectl version --client
minikube version
```

### Para Ubuntu/Debian

```bash
# 1. Actualizar el sistema
sudo apt update && sudo apt upgrade -y

# 2. Instalar Docker
sudo apt install -y apt-transport-https ca-certificates curl gnupg lsb-release
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
sudo systemctl enable docker
sudo systemctl start docker
sudo usermod -aG docker $USER

# 3. Instalar kubectl
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl

# 4. Instalar Minikube
curl -LO https://storage.googleapis.com/minikube/releases/latest/minikube-linux-amd64
sudo install minikube-linux-amd64 /usr/local/bin/minikube

# 5. Verificar instalaciones
docker --version
kubectl version --client
minikube version
```

### Para macOS

```bash
# Opción 1: Usando Homebrew (recomendado)
# 1. Instalar Homebrew si no está instalado
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# 2. Instalar herramientas
brew install docker docker-compose kubectl minikube

# 3. Instalar Docker Desktop
brew install --cask docker

# Opción 2: Instalación manual
# 1. Docker Desktop: Descargar desde https://www.docker.com/products/docker-desktop
# 2. kubectl:
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/darwin/amd64/kubectl"
chmod +x kubectl
sudo mv kubectl /usr/local/bin/

# 3. Minikube:
curl -LO https://storage.googleapis.com/minikube/releases/latest/minikube-darwin-amd64
sudo install minikube-darwin-amd64 /usr/local/bin/minikube

# 4. Verificar instalaciones
docker --version
kubectl version --client
minikube version
```

### Para Windows

#### Opción 1: PowerShell/Chocolatey (recomendado)
```powershell
# 1. Instalar Chocolatey (ejecutar como Administrador)
Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))

# 2. Instalar herramientas
choco install docker-desktop kubectl minikube

# 3. Reiniciar el sistema
```

#### Opción 2: Instalación manual
```powershell
# 1. Docker Desktop: Descargar desde https://www.docker.com/products/docker-desktop

# 2. kubectl:
curl -LO "https://dl.k8s.io/release/v1.28.2/bin/windows/amd64/kubectl.exe"
# Mover kubectl.exe a una carpeta en PATH

# 3. Minikube:
# Descargar desde https://github.com/kubernetes/minikube/releases/latest
# O usando PowerShell:
New-Item -Path 'c:\' -Name 'minikube' -ItemType Directory -Force
Invoke-WebRequest -OutFile 'c:\minikube\minikube.exe' -Uri 'https://github.com/kubernetes/minikube/releases/latest/download/minikube-windows-amd64.exe' -UseBasicParsing
$env:PATH += ";c:\minikube"

# 4. Verificar instalaciones
docker --version
kubectl version --client
minikube version
```

### ⚠️ Versiones Recomendadas

Para asegurar compatibilidad, usa estas versiones específicas:

- **Docker**: 24.0 o superior
- **kubectl**: v1.28.2 (igual que Minikube)
- **Minikube**: v1.31.0 o superior con Kubernetes v1.28.2
- **Node.js**: 18.x o 20.x (para desarrollo local)

### 🔧 Configuración Inicial

Después de instalar los prerrequisitos:

```bash
# 1. Verificar que Docker funcione
docker run hello-world

# 2. Iniciar Minikube con la versión específica de Kubernetes
minikube start --kubernetes-version=v1.28.2

# 3. Verificar que kubectl puede conectarse
kubectl cluster-info

# 4. Verificar el contexto de kubectl
kubectl config current-context
# Debería mostrar: minikube
```

## 📋 Prerrequisitos para el Despliegue

Una vez que tengas las herramientas instaladas, asegúrate de tener:

- **Cluster de Kubernetes** funcionando (Minikube, Docker Desktop, o proveedor cloud)
- **kubectl** instalado y configurado
- **Docker** funcionando (si usas Minikube)
- **Archivos de entorno** configurados correctamente:
  - `infra/docker/.env` - Secretos de infraestructura (PostgreSQL, credenciales MinIO)
  - `backend/.env` - Configuración de la aplicación backend

## 🏗️ Architecture

The deployment consists of:

- **PostgreSQL** - Database with pgvector extension for vector operations
- **MinIO** - Object storage for document management
- **Jenkins** - CI/CD pipeline management
- **Backend** - NestJS API server (2 replicas)
- **Frontend** - React/Vite application (2 replicas)

All services run in the `learning-agent` namespace.

## 🔧 Configuración de Archivos de Entorno

Antes de ejecutar el despliegue, debes crear y configurar los archivos de entorno necesarios:

### 1. Crear `infra/docker/.env`

```bash
# Navegar al directorio correcto
cd /path/to/Learning-Agent/infra/docker

# Crear el archivo .env
cat > .env << 'EOF'
# Configuración de PostgreSQL
POSTGRES_USER=app_user
POSTGRES_PASSWORD=secure_postgres_password_123
POSTGRES_DB=learning_agent

# Configuración de MinIO
MINIO_ENDPOINT=http://localhost:9000
MINIO_ROOT_USER=adminminio
MINIO_ROOT_PASSWORD=adminpassword123
MINIO_BUCKET_NAME=documents
MINIO_REGION=us-east-1
EOF
```

### 2. Crear `backend/.env`

```bash
# Navegar al directorio del backend
cd /path/to/Learning-Agent/backend

# Crear el archivo .env
cat > .env << 'EOF'
# Base de datos
DATABASE_URL_DEPLOY=postgresql://app_user:secure_postgres_password_123@postgres-service:5432/learning_agent?schema=public
DATABASE_URL=postgresql://app_user:secure_postgres_password_123@postgres-service:5432/learning_agent?schema=public

# Configuración de MinIO
MINIO_ENDPOINT=http://minio-service:9000
MINIO_ACCESS_KEY=adminminio
MINIO_SECRET_KEY=adminpassword123
MINIO_BUCKET_NAME=documents
MINIO_REGION=us-east-1
MINIO_PUBLIC_ENDPOINT=http://localhost:9000

# APIs de IA (configura según tus claves)
OPENAI_API_KEY=sk-your_openai_api_key_here
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
OPENAI_EMBEDDING_DIMENSIONS=1536
GEMINI_API_KEY=your_gemini_api_key_here
HF_API_TOKEN=your_huggingface_token_here

# Configuración de JWT
JWT_SECRET=your_very_secure_jwt_secret_key_here
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=7d
JWT_ACCESS_SECRET=your_access_secret_key_here
JWT_REFRESH_SECRET=your_refresh_secret_key_here

# Configuración de la aplicación
NODE_ENV=production
PORT=3000

# Configuración de IA
AI_MODEL=gemini-2.0-flash-exp
AI_MAX_OUTPUT_TOKENS=512
AI_TEMPERATURE=0.2

# Configuración de procesamiento
CHUNK_SIZE=1000
CHUNK_OVERLAP=100
MAX_CONCURRENT_PROCESSING=3

# Redis (si se usa)
REDIS_HOST=localhost
REDIS_PORT=6379
EOF
```

### 3. Opcional: Crear `client/.env` (si existe configuración específica)

```bash
# Navegar al directorio del cliente
cd /path/to/Learning-Agent/client

# Crear el archivo .env si es necesario
cat > .env << 'EOF'
VITE_API_URL=http://localhost:3000
VITE_APP_NAME=Learning Agent
EOF
```

### ⚠️ Notas Importantes sobre Configuración

1. **Contraseñas Seguras**: Cambia todas las contraseñas por defecto por unas seguras
2. **APIs de IA**: Necesitas claves válidas de OpenAI, Gemini, etc. para que las funciones de IA funcionen
3. **Consistencia**: Las credenciales en `infra/docker/.env` deben coincidir con las de `backend/.env`
4. **URLs Internas vs Públicas**: 
   - `MINIO_ENDPOINT` usa el servicio interno (`minio-service:9000`)
   - `MINIO_PUBLIC_ENDPOINT` usa la URL pública (`localhost:9000`)

### 🔑 Obtener Claves de API

#### OpenAI
1. Visita https://platform.openai.com/api-keys
2. Crea una nueva clave API
3. Copia la clave que empieza con `sk-`

#### Google Gemini
1. Visita https://ai.google.dev/
2. Obtén acceso a Gemini API
3. Genera una clave API

#### Hugging Face
1. Visita https://huggingface.co/settings/tokens
2. Crea un nuevo token
3. Copia el token generado

## 🚀 Despliegue Rápido

### Método Automático (Recomendado)

Una vez que tengas todos los prerrequisitos instalados y los archivos de entorno configurados:

```bash
# 1. Navegar al directorio de Kubernetes
cd /path/to/Learning-Agent/infra/k8s

# 2. Hacer el script ejecutable
chmod +x deploy.sh

# 3. Ejecutar el despliegue completo
./deploy.sh
```

Este script automáticamente:
- ✅ Verifica prerrequisitos
- ✅ Inicia Minikube si no está corriendo
- ✅ Construye imágenes Docker (si usa Minikube)
- ✅ Crea namespace y secretos
- ✅ Despliega todos los servicios
- ✅ Configura MinIO bucket
- ✅ Espera que todos los pods estén listos
- ✅ Configura port-forwarding
- ✅ Muestra URLs de acceso

### 2. Manual Deployment

If you prefer manual control:

```bash
cd infra/k8s

# 1. Create namespace
kubectl apply -f namespace.yaml

# 2. Create secrets from environment files
kubectl create secret generic infra-secrets \
  --from-env-file=../docker/.env \
  --namespace=learning-agent

kubectl create secret generic backend-env-secrets \
  --from-env-file=../../backend/.env \
  --namespace=learning-agent

# 3. Deploy infrastructure services
kubectl apply -f postgres-init-configmap.yaml
kubectl apply -f postgres-deployment.yaml
kubectl apply -f minio-deployment.yaml
kubectl apply -f jenkins-deployment.yaml

# 4. Deploy application services
kubectl apply -f backend-deployment.yaml
kubectl apply -f frontend-deployment.yaml

# 5. Wait for MinIO and create bucket
kubectl wait --for=condition=available --timeout=300s deployment/minio -n learning-agent
kubectl run minio-bucket-setup --rm -i --restart=Never --image=minio/mc \
  --namespace=learning-agent -- sh -c \
  "mc alias set myminio http://minio-service:9000 \$MINIO_ROOT_USER \$MINIO_ROOT_PASSWORD && \
   mc mb myminio/documents --ignore-existing && \
   mc anonymous set download myminio/documents"
```

## 🔧 Environment Configuration

### Required Environment Files

#### `infra/docker/.env`
```env
# PostgreSQL Configuration
POSTGRES_USER=app_user
POSTGRES_PASSWORD=your_postgres_password
POSTGRES_DB=learning_agent

# MinIO Configuration
MINIO_ROOT_USER=your_minio_user
MINIO_ROOT_PASSWORD=your_minio_password
MINIO_BUCKET_NAME=documents
MINIO_ENDPOINT=http://localhost:9000
MINIO_REGION=us-east-1
```

#### `backend/.env`
```env
# Database
DATABASE_URL="postgresql://app_user:your_postgres_password@postgres-service:5432/learning_agent?schema=public"

# MinIO
MINIO_ENDPOINT=http://minio-service:9000
MINIO_ACCESS_KEY=your_minio_user
MINIO_SECRET_KEY=your_minio_password
MINIO_BUCKET_NAME=documents

# Application settings
JWT_SECRET=your_jwt_secret
NODE_ENV=production
PORT=3000

# AI/LLM Configuration (if applicable)
DEEPSEEK_API_KEY=your_deepseek_api_key
# ... other environment variables
```

## 📊 Monitoring & Management

### Check Deployment Status

```bash
# Using the script
./deploy.sh status

# Or manually
kubectl get all -n learning-agent
kubectl get pods -n learning-agent
```

### View Logs

```bash
# Using the script
./deploy.sh logs backend
./deploy.sh logs frontend

# Or manually
kubectl logs -n learning-agent deployment/backend --tail=50
kubectl logs -n learning-agent deployment/frontend --tail=50
```

## 🌐 Acceso a los Servicios

Después de un despliegue exitoso, puedes acceder a los servicios en las siguientes URLs:

### URLs Principales
- **🎯 Frontend (Aplicación Principal)**: http://localhost:5173
- **🔧 Backend API**: http://localhost:3000
- **📦 MinIO Console**: http://localhost:9090
- **🚀 Jenkins CI/CD**: http://localhost:8080  
- **🐘 PostgreSQL**: localhost:5432

### Credenciales por Defecto

#### MinIO Console (http://localhost:9090)
- **Usuario**: `adminminio`
- **Contraseña**: `adminpassword123` (o la que configuraste en `.env`)

#### Jenkins (http://localhost:8080)
- **Usuario**: `admin`
- **Contraseña**: Ejecuta `./deploy.sh logs jenkins` y busca la contraseña inicial

#### PostgreSQL (localhost:5432)
- **Usuario**: `app_user`
- **Contraseña**: `secure_postgres_password_123` (o la que configuraste)
- **Base de datos**: `learning_agent`

### 🧪 Pruebas de Funcionalidad

#### 1. Verificar Frontend
```bash
# Abrir en navegador
curl http://localhost:5173
# Debería devolver el HTML de la aplicación React
```

#### 2. Verificar Backend API
```bash
# Verificar que el backend responde
curl http://localhost:3000/health
# O verificar documentación de API
curl http://localhost:3000/api
```

#### 3. Verificar MinIO
```bash
# Verificar que MinIO API responde
curl http://localhost:9000/minio/health/live
# Verificar que el bucket existe
curl http://localhost:9000/documents/
```

#### 4. Verificar PostgreSQL
```bash
# Conectar usando psql (si está instalado)
psql -h localhost -p 5432 -U app_user -d learning_agent

# O verificar desde un pod
kubectl exec -n learning-agent deployment/postgres -- psql -U app_user -d learning_agent -c "SELECT version();"
```

## 📊 Monitoreo y Gestión

### Comandos Útiles de Monitoreo

```bash
# Ver estado de todos los pods
kubectl get pods -n learning-agent -w

# Ver uso de recursos
kubectl top pods -n learning-agent
kubectl top nodes

# Ver logs en tiempo real
kubectl logs -f -n learning-agent deployment/backend
kubectl logs -f -n learning-agent deployment/frontend

# Ver eventos del namespace
kubectl get events -n learning-agent --sort-by='.lastTimestamp'

# Ver configuración de servicios
kubectl get svc -n learning-agent -o wide
```

### Gestión de Port-Forwarding

```bash
# Iniciar todos los port-forwards
./deploy.sh port-forward

# Ver procesos de port-forwarding activos
ps aux | grep "kubectl port-forward"

# Detener todos los port-forwards
./deploy.sh stop-forward

# Port-forward específico
kubectl port-forward -n learning-agent service/backend-service 3000:3000 &
```

## 🔄 Comandos de Gestión del Script

El script `deploy.sh` incluye varios comandos útiles:

```bash
# Despliegue completo (por defecto)
./deploy.sh
./deploy.sh deploy

# Verificar estado del despliegue
./deploy.sh status

# Ver logs de servicios específicos
./deploy.sh logs backend
./deploy.sh logs frontend
./deploy.sh logs postgres
./deploy.sh logs minio
./deploy.sh logs jenkins

# Iniciar port-forwarding solamente
./deploy.sh port-forward

# Detener port-forwarding
./deploy.sh stop-forward

# Limpieza completa
./deploy.sh cleanup
```

## 🔧 Mantenimiento

### Actualizar la Aplicación

```bash
# 1. Reconstruir imágenes con cambios
eval $(minikube docker-env)
docker build -t learning-agent-backend:latest ../../backend/
docker build -t learning-agent-frontend:latest ../../client/

# 2. Reiniciar deployments
kubectl rollout restart deployment/backend -n learning-agent
kubectl rollout restart deployment/frontend -n learning-agent

# 3. Esperar que estén listos
kubectl rollout status deployment/backend -n learning-agent
kubectl rollout status deployment/frontend -n learning-agent
```

### Backup de Datos

```bash
# Backup de PostgreSQL
kubectl exec -n learning-agent deployment/postgres -- pg_dump -U app_user learning_agent > backup.sql

# Backup de MinIO (documentos)
kubectl exec -n learning-agent deployment/minio -- mc mirror local/documents /tmp/minio-backup
```

### Restaurar desde Backup

```bash
# Restaurar PostgreSQL
kubectl exec -i -n learning-agent deployment/postgres -- psql -U app_user learning_agent < backup.sql

# Restaurar MinIO
kubectl exec -n learning-agent deployment/minio -- mc mirror /tmp/minio-backup local/documents
```

### MinIO API access for browser downloads

When the backend generates signed URLs using the internal service name (`http://minio-service:9000`), the browser cannot resolve that hostname. You have two options:

- Port-forward the MinIO API as well:

```bash
kubectl port-forward -n learning-agent service/minio-service 9000:9000
kubectl port-forward -n learning-agent service/minio-service 9090:9090
```

- Or expose MinIO via Ingress/NodePort and use a public hostname.

Then set the backend env var to rewrite signed URLs for clients:

```env
# backend/.env
MINIO_ENDPOINT=http://minio-service:9000        # internal SDK endpoint
MINIO_PUBLIC_ENDPOINT=http://localhost:9000     # public/browser endpoint (or your Ingress URL)
MINIO_ACCESS_KEY=your_minio_user
MINIO_SECRET_KEY=your_minio_password
MINIO_BUCKET_NAME=documents
MINIO_REGION=us-east-1
```

With this, the backend will return signed URLs using the public endpoint, and downloads from the frontend will work.

## 🛠️ Script Commands

The `deploy.sh` script supports multiple commands:

```bash
# Deploy the application (default)
./deploy.sh
./deploy.sh deploy

# Check deployment status
./deploy.sh status

# View service logs
./deploy.sh logs backend
./deploy.sh logs frontend
./deploy.sh logs postgres
./deploy.sh logs minio
./deploy.sh logs jenkins

# Complete cleanup (removes everything)
./deploy.sh cleanup
```

## 📁 File Structure

```
infra/k8s/
├── deploy.sh                     # Automated deployment script
├── namespace.yaml                # Kubernetes namespace definition
├── postgres-deployment.yaml      # PostgreSQL database with pgvector
├── postgres-init-configmap.yaml  # SQL scripts for pgvector setup
├── minio-deployment.yaml         # MinIO object storage
├── jenkins-deployment.yaml       # Jenkins CI/CD
├── backend-deployment.yaml       # NestJS backend API
├── frontend-deployment.yaml      # React frontend application
└── README.md                     # This file
```

## 🐳 Docker Images

The deployment uses these images:

- **Backend**: `learning-agent-backend:latest` (built from `backend/Dockerfile`)
- **Frontend**: `learning-agent-frontend:latest` (built from `client/Dockerfile`)
- **PostgreSQL**: `pgvector/pgvector:pg16`
- **MinIO**: `quay.io/minio/minio:latest`
- **Jenkins**: `jenkins/jenkins:lts`

### Building Images (Minikube)

If using Minikube, the script automatically builds images in Minikube's Docker environment:

```bash
# Manual build (if needed)
eval $(minikube docker-env)
docker build -t learning-agent-backend:latest ../../backend/
docker build -t learning-agent-frontend:latest ../../client/
```

## 🚨 Solución de Problemas por Sistema Operativo

### Problemas Comunes en Arch Linux

```bash
# Error: "Docker daemon not running"
sudo systemctl start docker
sudo systemctl enable docker

# Error: "Permission denied" con Docker
sudo usermod -aG docker $USER
# Cerrar sesión e iniciar sesión nuevamente

# Error: Minikube no puede iniciar
minikube delete
minikube start --driver=docker --kubernetes-version=v1.28.2

# Error: kubectl no encuentra el cluster
kubectl config use-context minikube
```

### Problemas Comunes en Ubuntu/Debian

```bash
# Error: "kubectl: command not found"
sudo snap install kubectl --classic
# O reinstalar manualmente

# Error: Docker no inicia automáticamente
sudo systemctl enable docker
sudo systemctl start docker

# Error: Minikube requiere virtualización
# Verificar que la virtualización esté habilitada en BIOS
egrep -c '(vmx|svm)' /proc/cpuinfo
# Si es 0, habilitar virtualización en BIOS

# Error: Espacio insuficiente
minikube start --disk-size=20gb
```

### Problemas Comunes en macOS

```bash
# Error: "Docker Desktop not running"
open /Applications/Docker.app

# Error: Homebrew no instalado
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Error: kubectl no en PATH
echo 'export PATH="/usr/local/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc

# Error: Minikube en Apple Silicon (M1/M2)
minikube start --driver=docker --kubernetes-version=v1.28.2
```

### Problemas Comunes en Windows

```powershell
# Error: "Docker Desktop requires WSL 2"
# 1. Habilitar WSL 2
wsl --install
# 2. Reiniciar el sistema
# 3. Reinstalar Docker Desktop

# Error: "kubectl not recognized"
# Agregar kubectl al PATH manualmente
$env:PATH += ";C:\path\to\kubectl"

# Error: Minikube no puede iniciar en Hyper-V
minikube start --driver=docker --kubernetes-version=v1.28.2

# Error: Chocolatey requiere privilegios de administrador
# Ejecutar PowerShell como Administrador
```

### Problemas Generales del Despliegue

```bash
# Error: "No space left on device"
# Limpiar Docker
docker system prune -a --volumes -f
minikube delete && minikube start --kubernetes-version=v1.28.2

# Error: Pods en estado "Pending"
kubectl describe pod <pod-name> -n learning-agent
# Verificar recursos y PVC

# Error: Imágenes no encontradas (Minikube)
eval $(minikube docker-env)
docker images | grep learning-agent
# Si no aparecen, reconstruir:
./deploy.sh

# Error: MinIO no accesible desde el navegador
# Verificar port-forwarding
kubectl port-forward -n learning-agent service/minio-service 9000:9000 &
kubectl port-forward -n learning-agent service/minio-service 9090:9090 &

# Error: Backend no puede conectar a PostgreSQL
kubectl logs -n learning-agent deployment/backend
kubectl logs -n learning-agent deployment/postgres

# Error: "Secret not found"
# Verificar que los archivos .env existen
ls -la ../docker/.env
ls -la ../../backend/.env
```

## 🔍 Verificación de la Instalación

Después de la instalación, ejecuta estos comandos para verificar que todo funciona:

```bash
# 1. Verificar Docker
docker run hello-world

# 2. Verificar Minikube
minikube status

# 3. Verificar kubectl
kubectl version --client
kubectl cluster-info

# 4. Verificar que puedes construir imágenes
eval $(minikube docker-env)
docker build --help

# 5. Verificar conectividad a internet (para descargar imágenes)
ping google.com
```

### ✅ Lista de Verificación Pre-Despliegue

- [ ] Docker instalado y funcionando
- [ ] kubectl instalado y puede conectarse al cluster
- [ ] Minikube iniciado y funcionando
- [ ] Archivo `infra/docker/.env` creado y configurado
- [ ] Archivo `backend/.env` creado y configurado
- [ ] Claves de API obtenidas (OpenAI, Gemini, etc.)
- [ ] Suficiente espacio en disco (al menos 10GB libres)
- [ ] Puertos 3000, 5173, 9000, 9090, 5432, 8080 disponibles

## 🚨 Troubleshooting

### Common Issues

1. **Pods stuck in Pending state**
   ```bash
   kubectl describe pod <pod-name> -n learning-agent
   # Check for resource constraints or PVC issues
   ```

2. **MinIO bucket not created**
   ```bash
   # Manually create the bucket
   kubectl exec -n learning-agent deployment/minio -- mc alias set local http://localhost:9000 $MINIO_ROOT_USER $MINIO_ROOT_PASSWORD
   kubectl exec -n learning-agent deployment/minio -- mc mb local/documents
   ```

3. **Backend database connection issues**
   ```bash
   # Check PostgreSQL is running and accessible
   kubectl logs -n learning-agent deployment/postgres
   kubectl exec -n learning-agent deployment/postgres -- pg_isready -U app_user -d learning_agent
   ```

4. **Images not found (Minikube)**
   ```bash
   # Ensure you're using Minikube's Docker environment
   eval $(minikube docker-env)
   docker images | grep learning-agent
   ```

### Health Checks

All services include health checks and liveness probes:

```bash
# Check service health
kubectl get pods -n learning-agent
kubectl describe pod <pod-name> -n learning-agent
```

## 🧹 Cleanup

To completely remove the deployment:

```bash
./deploy.sh cleanup
```

Or manually:

```bash
kubectl delete namespace learning-agent
```

## 🔒 Security Notes

- All secrets are stored in Kubernetes secrets, not in plain text
- Services communicate internally using ClusterIP services
- No services are exposed externally by default (use port-forwarding for access)
- MinIO bucket has controlled access policies

## 📈 Scaling

To scale the application:

```bash
# Scale backend
kubectl scale deployment backend --replicas=3 -n learning-agent

# Scale frontend
kubectl scale deployment frontend --replicas=3 -n learning-agent
```

## 🤝 Contributing

When making changes to the Kubernetes configuration:

1. Update the relevant YAML files
2. Test the deployment with `./deploy.sh`
3. Update this README if needed
4. Ensure the `deploy.sh` script handles your changes

## 📞 Support

If you encounter issues:

1. Check the troubleshooting section above
2. View pod logs: `./deploy.sh logs <service>`
3. Check pod status: `./deploy.sh status`
4. Verify environment configuration files exist and are correct

---

## 🚀 RESUMEN DE INICIO RÁPIDO

### Para una nueva máquina (cualquier OS):

```bash
# 1. Instalar prerrequisitos (según tu OS - ver secciones arriba)
# Arch Linux:
sudo pacman -S docker kubectl minikube
sudo systemctl enable docker && sudo systemctl start docker
sudo usermod -aG docker $USER
# Reiniciar sesión

# 2. Verificar instalación
docker --version && kubectl version --client && minikube version

# 3. Iniciar Minikube
minikube start --kubernetes-version=v1.28.2

# 4. Configurar archivos de entorno
cd /path/to/Learning-Agent/infra/docker
# Crear .env con credenciales de PostgreSQL y MinIO

cd ../../backend  
# Crear .env con configuración completa del backend

# 5. Desplegar todo
cd ../infra/k8s
chmod +x deploy.sh
./deploy.sh

# 6. Acceder a la aplicación
# Frontend: http://localhost:5173
# Backend: http://localhost:3000
# MinIO: http://localhost:9090
```

### ⚡ En resumen, solo necesitas:
1. **Instalar**: Docker + kubectl + Minikube
2. **Configurar**: Archivos `.env` con credenciales
3. **Ejecutar**: `./deploy.sh`
4. **Usar**: http://localhost:5173

¡Y listo! 🎉
