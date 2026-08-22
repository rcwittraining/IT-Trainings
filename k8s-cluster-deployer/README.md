# RCW K8s Deployer — Single App to Deploy Kubernetes Cluster

**One Python file = Complete Kubernetes cluster deployer with UI**

This app lets you deploy production-ready K8s clusters in 30 seconds from a beautiful web UI. No Terraform, no complex setup.

### Features
- 🚀 **4 Cluster Types**: 
  - **k3d (k3s)** — Fastest, 30s, needs only Docker
  - **kind** — CNCF certified, Docker-in-Docker
  - **minikube** — Full VM or Docker
  - **kubeadm** — Generates bare-metal install script for any Ubuntu VM
- 📦 **Add-ons one-click**: NGINX Ingress, Metrics Server, Dashboard, Prometheus
- 📡 **Live logs** via Server-Sent Events (real-time terminal)
- 🔍 **Auto-detect** Docker, kubectl, kind, k3d, minikube, helm
- 📄 **Generate script only** mode — get bash script to run elsewhere
- 📱 **PWA Ready** — responsive, works on Android phone to manage clusters
- 🎯 **Single file** — `app.py` contains backend + frontend + API

### Quick Start

```bash
# 1. Install deps
pip install flask

# 2. Run
python app.py

# 3. Open
http://localhost:8080
```

### What it does under the hood

For `k3d`:
```bash
k3d cluster create rcw-dev --servers 1 --agents 2 --image rancher/k3s:v1.30.0-k3s1
kubectl apply -f ingress-nginx
kubectl apply -f metrics-server
```

For `kind`:
```bash
# generates kind.yaml with N nodes
kind create cluster --name rcw-dev --config kind.yaml
```

For `kubeadm` (bare-metal):
- Generates full Ubuntu setup script: containerd, kubeadm init, Calico CNI, ingress

### Deploy as Single App

**Option 1: Docker (self-contained)**
```bash
docker build -t rcw-k8s-deployer .
docker run -p 8080:8080 -v /var/run/docker.sock:/var/run/docker.sock -v ~/.kube:/root/.kube rcw-k8s-deployer
```

**Option 2: Binary (PyInstaller)**
```bash
pip install pyinstaller
pyinstaller --onefile app.py
./dist/app
```

**Option 3: Android APK**
- Host this app on a server
- Open in Chrome on Android → Add to Home Screen (PWA)
- Or wrap with Capacitor: `npx cap add android`

### API Endpoints

- `GET /` — UI
- `GET /api/status` — tools + clusters
- `GET /api/deploy-stream?name=&type=&nodes=` — SSE deploy
- `POST /api/generate-script` — returns bash script
- `POST /api/delete` — delete cluster
- `GET /api/kubeconfig?name=` — download kubeconfig

### For RCW Office

You already have the RCW zombie game in `rcw-zombie-game/`. This deployer uses same RCW branding colors and can be deployed to manage the game server's K8s cluster!

Game → Deployer → Production in one click.

### Requirements

- Python 3.8+
- Docker (for kind/k3d/minikube)
- kubectl (auto-installs addons)

No Docker? Use kubeadm mode — it generates script you run on any VM.

Built for IT Admins who fight zombies and deploy clusters.
