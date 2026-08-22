#!/bin/bash
# RCW K8s Deployer - Single Bash App (no Python needed)
# Usage: ./deploy.sh [k3d|kind|minikube] [cluster-name] [nodes]
set -e

TYPE=${1:-k3d}
NAME=${2:-rcw-dev}
NODES=${3:-3}
K8S_VER=${4:-v1.30.0}

echo "╔══════════════════════════════════════════╗"
echo "║  RCW K8s Deployer - Single Bash App     ║"
echo "║  Type: $TYPE  Name: $NAME  Nodes: $NODES"
echo "╚══════════════════════════════════════════╝"

check() { command -v $1 >/dev/null 2>&1; }

if ! check docker; then echo "❌ Docker required. Install docker first."; exit 1; fi

if [ "$TYPE" = "k3d" ]; then
  if ! check k3d; then echo "⬇️ Installing k3d..."; curl -s https://raw.githubusercontent.com/k3d-io/k3d/main/install.sh | bash; fi
  echo "🚀 Creating k3d cluster $NAME..."
  k3d cluster create $NAME --servers 1 --agents $((NODES-1)) --image rancher/k3s:${K8S_VER#v}-k3s1 --port "80:80@loadbalancer" --port "443:443@loadbalancer" --k3s-arg "--disable=traefik@server:0"
elif [ "$TYPE" = "kind" ]; then
  if ! check kind; then echo "⬇️ Installing kind..."; curl -Lo /tmp/kind https://kind.sigs.k8s.io/dl/v0.22.0/kind-linux-amd64 && chmod +x /tmp/kind && sudo mv /tmp/kind /usr/local/bin/kind; fi
  echo "🚀 Creating kind cluster $NAME..."
  cat <<EOF > /tmp/kind-$NAME.yaml
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
nodes:
- role: control-plane
  image: kindest/node:$K8S_VER
EOF
  for i in $(seq 1 $((NODES-1))); do echo "- role: worker
  image: kindest/node:$K8S_VER" >> /tmp/kind-$NAME.yaml; done
  kind create cluster --name $NAME --config /tmp/kind-$NAME.yaml
elif [ "$TYPE" = "minikube" ]; then
  if ! check minikube; then echo "⬇️ Install minikube from https://minikube.sigs.k8s.io"; exit 1; fi
  minikube start -p $NAME --nodes $NODES --kubernetes-version $K8S_VER --driver docker --addons ingress,metrics-server
else
  echo "Unknown type $TYPE. Use k3d, kind, minikube"
  exit 1
fi

echo "⏳ Waiting for Ready..."
kubectl wait --for=condition=Ready nodes --all --timeout=180s

echo "📦 Installing add-ons..."
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/kind/deploy.yaml
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml || true

echo ""
echo "✅ Cluster $NAME ready!"
kubectl get nodes
echo ""
echo "Use: kubectl config use-context k3d-$NAME  OR  kind-$NAME"
echo "Dashboard: kubectl proxy  then  http://localhost:8001/api/v1/namespaces/kubernetes-dashboard/services/https:kubernetes-dashboard:/proxy/"
