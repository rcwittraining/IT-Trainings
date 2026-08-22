#!/usr/bin/env python3
"""
RCW K8s Deployer - Single App to Deploy Kubernetes Clusters
One file = Full stack deployer for kind, k3d, minikube, kubeadm

Run: pip install flask && python app.py
Then open http://localhost:8080
"""
import os, sys, json, time, shutil, subprocess, threading, queue, platform
from pathlib import Path
from flask import Flask, request, jsonify, Response, send_file

app = Flask(__name__)
LOG_QUEUES = {}  # cluster_name -> queue
CLUSTERS_FILE = Path.home() / ".k8s-deployer-clusters.json"

HTML = r"""
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>RCW K8s Deployer - Single App Cluster Launcher</title>
<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600&family=Space+Grotesk:wght@500;700&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#070b14;color:#dbe7ff;font-family:'Space Grotesk',sans-serif;min-height:100vh;overflow-x:hidden}
.mono{font-family:'JetBrains Mono',monospace}
header{padding:18px 24px;border-bottom:1px solid rgba(78,159,255,0.18);display:flex;justify-content:space-between;align-items:center;background:rgba(10,22,40,0.7);backdrop-filter:blur(12px);position:sticky;top:0;z-index:20}
.logo{display:flex;align-items:center;gap:12px;font-weight:700;font-size:18px;letter-spacing:-0.02em}
.logo i{width:36px;height:36px;background:linear-gradient(180deg,#4e9fff,#2a64c8);border-radius:10px;display:flex;align-items:center;justify-content:center;font-style:normal;box-shadow:0 4px 18px rgba(42,100,200,0.5)}
.badge{font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:0.14em;color:#6ea8ff;background:rgba(78,159,255,0.12);border:1px solid rgba(78,159,255,0.22);padding:5px 10px;border-radius:99px}
.wrap{max-width:1280px;margin:0 auto;padding:22px;display:grid;grid-template-columns:380px 1fr;gap:18px}
@media(max-width:980px){.wrap{grid-template-columns:1fr}}
.card{background:linear-gradient(180deg,rgba(19,41,77,0.9),rgba(10,22,40,0.96));border:1px solid rgba(78,159,255,0.18);border-radius:18px;padding:18px;box-shadow:0 12px 40px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.06)}
.card h2{font-size:15px;letter-spacing:0.02em;margin-bottom:14px;display:flex;align-items:center;gap:8px}
.card h2 span{font-family:'JetBrains Mono',monospace;font-size:10px;color:#6ea8ff;letter-spacing:0.14em;background:rgba(78,159,255,0.12);padding:3px 8px;border-radius:99px;border:1px solid rgba(78,159,255,0.18)}
label{font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:0.12em;color:#8aa0c2;text-transform:uppercase;display:block;margin:14px 0 6px}
input,select{width:100%;height:44px;background:rgba(0,0,0,0.35);border:1px solid rgba(255,255,255,0.1);border-radius:12px;color:#fff;padding:0 12px;font-family:'Space Grotesk',sans-serif;font-size:14px;outline:none;transition:border 0.15s}
input:focus,select:focus{border-color:#4e9fff;box-shadow:0 0 0 3px rgba(78,159,255,0.18)}
.type-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.type-card{border-radius:12px;background:rgba(0,0,0,0.28);border:1px solid rgba(255,255,255,0.08);padding:12px;cursor:pointer;transition:all 0.15s;position:relative;overflow:hidden}
.type-card.active{border-color:#4e9fff;background:rgba(78,159,255,0.14);box-shadow:0 0 0 3px rgba(78,159,255,0.14), inset 0 1px 0 rgba(255,255,255,0.08)}
.type-card h3{font-size:13px;margin-bottom:3px}
.type-card p{font-size:11px;color:#8aa0c2;line-height:1.35}
.type-card .check{position:absolute;top:8px;right:8px;width:18px;height:18px;border-radius:50%;background:#4e9fff;color:#fff;display:none;align-items:center;justify-content:center;font-size:11px}
.type-card.active .check{display:flex}
.row{display:flex;gap:10px}
.addons{display:grid;gap:8px;margin-top:6px}
.addon{display:flex;align-items:center;gap:10px;background:rgba(0,0,0,0.25);border:1px solid rgba(255,255,255,0.06);border-radius:10px;padding:9px 10px;cursor:pointer}
.addon input{width:16px;height:16px;accent-color:#4e9fff}
.addon b{font-size:12px}
.addon span{font-size:11px;color:#8aa0c2}
.btn{width:100%;height:50px;border-radius:12px;border:0;background:linear-gradient(180deg,#4e9fff,#2a64c8);color:#fff;font-weight:700;font-size:14px;letter-spacing:0.02em;cursor:pointer;box-shadow:0 8px 22px rgba(42,100,200,0.45), inset 0 1px 0 rgba(255,255,255,0.35);margin-top:16px;transition:transform 0.08s}
.btn:active{transform:scale(0.98)}
.btn:disabled{opacity:0.5;cursor:not-allowed}
.btn-ghost{background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);box-shadow:none;margin-top:10px;height:42px}
.terminal{background:#04070f;border:1px solid rgba(255,255,255,0.08);border-radius:14px;overflow:hidden;display:flex;flex-direction:column;min-height:420px}
.term-head{height:42px;display:flex;align-items:center;justify-content:space-between;padding:0 14px;background:rgba(255,255,255,0.03);border-bottom:1px solid rgba(255,255,255,0.06);font-family:'JetBrains Mono',monospace;font-size:11px;color:#8aa0c2}
.dots{display:flex;gap:6px}
.dots i{width:10px;height:10px;border-radius:50%;display:block}
.term-body{flex:1;padding:14px;font-family:'JetBrains Mono',monospace;font-size:12px;line-height:1.6;overflow:auto;white-space:pre-wrap;word-break:break-all;max-height:520px;background:radial-gradient(80% 80% at 50% 0%, rgba(78,159,255,0.08), transparent)}
.log-line{opacity:0;animation:fadeIn 0.18s forwards}
@keyframes fadeIn{to{opacity:1}}
.status-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:14px}
.stat{border-radius:12px;background:rgba(0,0,0,0.28);border:1px solid rgba(255,255,255,0.06);padding:10px 12px}
.stat .k{font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:0.12em;color:#6ea8ff;text-transform:uppercase}
.stat .v{font-size:18px;font-weight:700;margin-top:2px}
.cluster-list{display:grid;gap:10px}
.cluster-item{display:flex;align-items:center;justify-content:space-between;background:rgba(0,0,0,0.28);border:1px solid rgba(255,255,255,0.06);border-radius:12px;padding:12px}
.cluster-item .name{font-weight:700;font-size:13px}
.cluster-item .meta{font-family:'JetBrains Mono',monospace;font-size:10px;color:#8aa0c2;margin-top:2px}
.tag{font-family:'JetBrains Mono',monospace;font-size:9px;padding:3px 7px;border-radius:99px;background:rgba(78,159,255,0.14);border:1px solid rgba(78,159,255,0.22);color:#8ab6ff}
.actions{display:flex;gap:6px}
.icon-btn{width:32px;height:32px;border-radius:8px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.08);color:#c7d6ec;cursor:pointer;display:flex;align-items:center;justify-content:center}
.icon-btn:hover{background:rgba(255,255,255,0.1)}
.empty{padding:30px;text-align:center;color:#6b7f9f;font-size:13px;border:1px dashed rgba(255,255,255,0.12);border-radius:12px;background:rgba(0,0,0,0.18)}
pre.yaml{background:rgba(0,0,0,0.35);border:1px solid rgba(255,255,255,0.06);border-radius:10px;padding:12px;font-family:'JetBrains Mono',monospace;font-size:11px;overflow:auto;max-height:260px;margin-top:10px;color:#a8bdd8}
</style>
</head>
<body>
<header>
  <div class="logo"><i>☸️</i> RCW K8s Deployer <span style="opacity:0.5;font-weight:500">• SINGLE APP</span></div>
  <div style="display:flex;gap:8px;align-items:center">
    <div class="badge" id="envBadge">CHECKING ENV...</div>
    <button class="icon-btn" onclick="location.reload()" title="Refresh">↻</button>
  </div>
</header>

<div class="wrap">
  <!-- LEFT: CREATE -->
  <div>
    <div class="card">
      <h2>🚀 Create Cluster <span>STEP 1</span></h2>
      
      <label>Cluster Name</label>
      <input id="cName" value="rcw-dev" placeholder="my-cluster">

      <label>Cluster Type</label>
      <div class="type-grid" id="typeGrid">
        <div class="type-card active" data-type="k3d"><div class="check">✓</div><h3>k3d (k3s)</h3><p>Lightweight, fastest, 30 sec. Best for dev.</p></div>
        <div class="type-card" data-type="kind"><div class="check">✓</div><h3>kind</h3><p>Docker-in-Docker, CNCF certified.</p></div>
        <div class="type-card" data-type="minikube"><div class="check">✓</div><h3>minikube</h3><p>VM or Docker, full features.</p></div>
        <div class="type-card" data-type="kubeadm"><div class="check">✓</div><h3>kubeadm</h3><p>Bare-metal / VM script generator.</p></div>
      </div>

      <div class="row">
        <div style="flex:1">
          <label>K8s Version</label>
          <select id="k8sVer">
            <option value="v1.30.0">v1.30.0 (latest)</option>
            <option value="v1.29.3">v1.29.3</option>
            <option value="v1.28.8">v1.28.8</option>
          </select>
        </div>
        <div style="flex:1">
          <label>Nodes</label>
          <select id="nodes">
            <option value="1">1 (single)</option>
            <option value="2">2 (1+1)</option>
            <option value="3" selected>3 (1+2)</option>
            <option value="5">5 (1+4)</option>
          </select>
        </div>
      </div>

      <label>Add-ons</label>
      <div class="addons">
        <label class="addon"><input type="checkbox" id="aIngress" checked><div><b>NGINX Ingress</b><br><span>Route external traffic</span></div></label>
        <label class="addon"><input type="checkbox" id="aMetrics" checked><div><b>Metrics Server</b><br><span>kubectl top, HPA</span></div></label>
        <label class="addon"><input type="checkbox" id="aDash"><div><b>K8s Dashboard</b><br><span>Web UI for cluster</span></div></label>
        <label class="addon"><input type="checkbox" id="aProm"><div><b>Prometheus + Grafana</b><br><span>Monitoring stack</span></div></label>
      </div>

      <button class="btn" id="deployBtn">⚡ DEPLOY CLUSTER NOW</button>
      <button class="btn btn-ghost" id="genBtn">📄 Generate Script Only</button>

      <pre class="yaml" id="scriptPreview" style="display:none"></pre>
    </div>

    <div class="card" style="margin-top:14px">
      <h2>📦 Tool Status <span>AUTO-DETECT</span></h2>
      <div id="toolStatus" class="cluster-list" style="margin-top:8px"></div>
    </div>
  </div>

  <!-- RIGHT: LOGS & CLUSTERS -->
  <div>
    <div class="status-grid">
      <div class="stat"><div class="k">Clusters</div><div class="v" id="sClusters">0</div></div>
      <div class="stat"><div class="k">Docker</div><div class="v" id="sDocker">-</div></div>
      <div class="stat"><div class="k">kubectl</div><div class="v" id="sKubectl">-</div></div>
    </div>

    <div class="card" style="padding:0;overflow:hidden">
      <div class="terminal">
        <div class="term-head">
          <div style="display:flex;align-items:center;gap:10px"><div class="dots"><i style="background:#ff5f57"></i><i style="background:#ffbd2e"></i><i style="background:#28ca42"></i></div> deploy.log — live</div>
          <div style="display:flex;gap:6px"><button class="icon-btn" style="width:26px;height:26px" onclick="clearLog()">🗑️</button><span id="deployState" class="tag">IDLE</span></div>
        </div>
        <div class="term-body" id="termBody">> RCW K8s Deployer ready.
> Select cluster type and hit DEPLOY.
> This single app will install everything via Docker.

> Tip: k3d is fastest (needs only Docker). kind is CNCF conformant. minikube needs more resources.
</div>
      </div>
    </div>

    <div class="card" style="margin-top:14px">
      <h2>🟢 Active Clusters <span id="clusterCount">0</span></h2>
      <div id="clusterList" class="cluster-list"><div class="empty">No clusters yet. Deploy one on the left.</div></div>
    </div>

    <div class="card" style="margin-top:14px">
      <h2>⚙️ How it works <span>SINGLE APP</span></h2>
      <div style="font-size:12px;line-height:1.6;color:#a8bdd8">
        <b style="color:#fff">This is ONE Python file (app.py).</b> It runs a Flask server + UI + deployer logic.<br><br>
        • <b>k3d/kind/minikube</b> — executes real commands via subprocess, streams logs via SSE.<br>
        • <b>kubeadm</b> — generates a bash script you can run on any Ubuntu VM to get HA cluster.<br>
        • No Terraform, no cloud creds needed for local dev. For EKS/GKE, use generated manifests.<br><br>
        <b>Android?</b> Host this on a server and manage clusters from phone browser — it's responsive PWA.<br>
        <b>To build APK:</b> wrap with Capacitor or use PWABuilder — UI is already mobile-ready.
      </div>
    </div>
  </div>
</div>

<script>
let selectedType='k3d';
document.querySelectorAll('.type-card').forEach(c=>{
  c.onclick=()=>{
    document.querySelectorAll('.type-card').forEach(x=>x.classList.remove('active'));
    c.classList.add('active'); selectedType=c.dataset.type;
  }
});

const termBody=document.getElementById('termBody');
function logLine(t, cls=''){
  const d=document.createElement('div'); d.className='log-line'; d.textContent=t; if(cls) d.style.color=cls;
  termBody.appendChild(d); termBody.scrollTop=termBody.scrollHeight;
}
function clearLog(){ termBody.innerHTML=''; }

async function checkEnv(){
  try{
    const r=await fetch('/api/status'); const j=await r.json();
    document.getElementById('envBadge').textContent = `${j.os} • ${j.arch} • ${j.docker?'DOCKER OK':'NO DOCKER'}`;
    document.getElementById('sDocker').textContent = j.docker? '✓ OK':'✗';
    document.getElementById('sKubectl').textContent = j.kubectl? j.kubectl_version||'✓':'✗';
    document.getElementById('sClusters').textContent = j.clusters.length;
    const tools=j.tools;
    document.getElementById('toolStatus').innerHTML = Object.entries(tools).map(([k,v])=>`
      <div class="cluster-item"><div><div class="name">${k}</div><div class="meta">${v.installed? 'installed • '+ (v.version||''): 'not installed'}</div></div><div class="tag" style="${v.installed?'':'background:rgba(255,80,80,0.14);border-color:rgba(255,80,80,0.22);color:#ff8a8a'}">${v.installed?'READY':'MISSING'}</div></div>
    `).join('');
    renderClusters(j.clusters);
  }catch(e){ document.getElementById('envBadge').textContent='OFFLINE'; }
}
function renderClusters(list){
  document.getElementById('clusterCount').textContent=list.length;
  document.getElementById('sClusters').textContent=list.length;
  const el=document.getElementById('clusterList');
  if(!list.length){ el.innerHTML='<div class="empty">No clusters yet. Deploy one on the left.</div>'; return; }
  el.innerHTML=list.map(c=>`
    <div class="cluster-item">
      <div><div class="name">☸️ ${c.name} <span class="tag">${c.type}</span></div><div class="meta">${c.status} • ${c.nodes||'?'} nodes • ${c.version||''}</div></div>
      <div class="actions">
        <button class="icon-btn" onclick="getKubeconfig('${c.name}')" title="Kubeconfig">📄</button>
        <button class="icon-btn" onclick="deleteCluster('${c.name}','${c.type}')" title="Delete">🗑️</button>
      </div>
    </div>
  `).join('');
}

let deploying=false;
document.getElementById('deployBtn').onclick=async()=>{
  if(deploying) return;
  const payload={
    name: document.getElementById('cName').value || 'rcw-dev',
    type: selectedType,
    version: document.getElementById('k8sVer').value,
    nodes: parseInt(document.getElementById('nodes').value),
    addons:{
      ingress: document.getElementById('aIngress').checked,
      metrics: document.getElementById('aMetrics').checked,
      dashboard: document.getElementById('aDash').checked,
      prometheus: document.getElementById('aProm').checked
    }
  };
  deploying=true; document.getElementById('deployBtn').disabled=true; document.getElementById('deployBtn').textContent='DEPLOYING...';
  document.getElementById('deployState').textContent='DEPLOYING'; document.getElementById('deployState').style.background='rgba(255,211,53,0.18)';
  termBody.innerHTML=''; logLine(`> Deploying ${payload.type} cluster "${payload.name}" with ${payload.nodes} nodes, ${payload.version}`,'#8ab6ff');
  
  // SSE logs
  const es = new EventSource(`/api/deploy-stream?name=${encodeURIComponent(payload.name)}&type=${payload.type}&version=${payload.version}&nodes=${payload.nodes}&ingress=${payload.addons.ingress}&metrics=${payload.addons.metrics}&dashboard=${payload.addons.dashboard}&prometheus=${payload.addons.prometheus}`);
  es.onmessage = (e)=>{
    try{
      const d=JSON.parse(e.data);
      if(d.log) logLine(d.log, d.color);
      if(d.done){
        es.close(); deploying=false; document.getElementById('deployBtn').disabled=false; document.getElementById('deployBtn').textContent='⚡ DEPLOY CLUSTER NOW';
        document.getElementById('deployState').textContent = d.success? 'SUCCESS':'FAILED';
        document.getElementById('deployState').style.background = d.success? 'rgba(60,255,122,0.18)':'rgba(255,80,80,0.18)';
        checkEnv();
      }
    }catch(_){ logLine(e.data); }
  };
  es.onerror=()=>{ es.close(); deploying=false; document.getElementById('deployBtn').disabled=false; document.getElementById('deployBtn').textContent='⚡ DEPLOY CLUSTER NOW'; logLine('> Stream error',' #ff8a8a'); };
};

document.getElementById('genBtn').onclick=async()=>{
  const payload={
    name: document.getElementById('cName').value || 'rcw-dev',
    type: selectedType,
    version: document.getElementById('k8sVer').value,
    nodes: parseInt(document.getElementById('nodes').value),
  };
  const r=await fetch('/api/generate-script', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload)});
  const j=await r.json();
  const pre=document.getElementById('scriptPreview'); pre.style.display='block'; pre.textContent=j.script;
  logLine(`> Generated ${payload.type} script for "${payload.name}"`,'#ffd335');
};

async function deleteCluster(name,type){
  if(!confirm(`Delete cluster ${name}?`)) return;
  logLine(`> Deleting ${name}...`,'#ff8a8a');
  const r=await fetch('/api/delete', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({name,type})});
  const j=await r.json(); logLine(j.output||j.error||'done'); checkEnv();
}
async function getKubeconfig(name){
  window.open(`/api/kubeconfig?name=${encodeURIComponent(name)}`,'_blank');
}

checkEnv(); setInterval(checkEnv, 8000);
</script>
</body>
</html>
"""

def run_cmd(cmd, timeout=300):
    try:
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=timeout)
        return result.returncode==0, result.stdout + result.stderr
    except Exception as e:
        return False, str(e)

def get_tool_status():
    tools = {}
    for tool in ['docker','kubectl','kind','k3d','minikube','helm']:
        path = shutil.which(tool)
        ver = ""
        if path:
            ok, out = run_cmd(f"{tool} version --short 2>&1 || {tool} version 2>&1 || {tool} --version 2>&1", timeout=5)
            ver = out.strip().split('\n')[0][:80]
        tools[tool] = {"installed": bool(path), "version": ver, "path": path or ""}
    return tools

def list_clusters():
    clusters=[]
    # kind
    ok, out = run_cmd("kind get clusters 2>&1")
    if ok:
        for name in out.strip().split('\n'):
            if name.strip():
                clusters.append({"name": name.strip(), "type":"kind", "status":"running", "nodes":1, "version":""})
    # k3d
    ok, out = run_cmd("k3d cluster list -o json 2>&1 || k3d cluster list 2>&1")
    if ok:
        try:
            if out.strip().startswith('[') or out.strip().startswith('{'):
                data=json.loads(out)
                if isinstance(data, dict): data=[data]
                for c in data:
                    clusters.append({"name": c.get('name',''), "type":"k3d", "status":"running", "nodes": len(c.get('nodes',[])) or c.get('nodes',1), "version":""})
            else:
                for line in out.split('\n')[1:]:
                    parts=line.split()
                    if parts:
                        clusters.append({"name": parts[0], "type":"k3d", "status":"running", "nodes":1})
        except: pass
    # minikube
    ok, out = run_cmd("minikube profile list -o json 2>&1")
    if ok and out.strip():
        try:
            j=json.loads(out)
            for p in j.get('valid',[]):
                clusters.append({"name": p.get('Name','minikube'), "type":"minikube", "status": p.get('Status',''), "nodes":1, "version": p.get('Version','')})
        except:
            ok2, out2 = run_cmd("minikube status --format json 2>&1 || minikube status 2>&1")
            if ok2 and 'minikube' in out2.lower():
                clusters.append({"name":"minikube","type":"minikube","status":"running","nodes":1})
    # dedup
    seen=set(); uniq=[]
    for c in clusters:
        key=(c['name'],c['type'])
        if key not in seen:
            seen.add(key); uniq.append(c)
    return uniq

def generate_script(payload):
    name=payload.get('name','rcw-dev')
    typ=payload.get('type','k3d')
    ver=payload.get('version','v1.30.0')
    nodes=int(payload.get('nodes',3))
    if typ=='k3d':
        return f"""#!/bin/bash
# RCW k3d single-command deploy - {name}
# Requires: docker + k3d
set -e
echo "☸️ Creating k3d cluster {name} with {nodes} nodes ({ver})"
k3d cluster create {name} --image rancher/k3s:{ver.replace('v','')}-k3s1 --servers 1 --agents {max(0,nodes-1)} --port "80:80@loadbalancer" --port "443:443@loadbalancer" --k3s-arg "--disable=traefik@server:0"
echo "Waiting for nodes..."
kubectl wait --for=condition=Ready nodes --all --timeout=120s
echo "Installing ingress-nginx..."
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/kind/deploy.yaml
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml
echo "✅ Cluster {name} ready! kubectl config use-context k3d-{name}"
kubectl get nodes
"""
    elif typ=='kind':
        servers=nodes
        kind_cfg=f"""kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
nodes:
- role: control-plane
  image: kindest/node:{ver}
"""
        for i in range(servers-1):
            kind_cfg+=f"- role: worker\n  image: kindest/node:{ver}\n"
        return f"""#!/bin/bash
# RCW kind deploy - {name}
set -e
cat <<'EOF' > /tmp/kind-{name}.yaml
{kind_cfg}
EOF
kind create cluster --name {name} --config /tmp/kind-{name}.yaml --image kindest/node:{ver}
kubectl wait --for=condition=Ready nodes --all --timeout=120s
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/kind/deploy.yaml
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml
echo "✅ kind cluster {name} ready"
kubectl get nodes
"""
    elif typ=='minikube':
        return f"""#!/bin/bash
# RCW minikube deploy - {name}
set -e
minikube start -p {name} --nodes {nodes} --kubernetes-version {ver} --driver docker --addons ingress,metrics-server
kubectl config use-context {name}
echo "✅ minikube {name} ready"
kubectl get nodes
"""
    else: # kubeadm
        return f"""#!/bin/bash
# RCW kubeadm HA bare-metal deploy - {name}
# Run on Ubuntu 22.04 control-plane node
set -e
K8S_VER={ver.replace('v','').rsplit('.',1)[0]} # e.g. 1.30
echo "☸️ Installing kubeadm {ver} for cluster {name}"

# 1. Prerequisites
sudo swapoff -a
sudo sed -i '/ swap / s/^/#/' /etc/fstab
cat <<EOF | sudo tee /etc/modules-load.d/k8s.conf
overlay
br_netfilter
EOF
sudo modprobe overlay
sudo modprobe br_netfilter
cat <<EOF | sudo tee /etc/sysctl.d/k8s.conf
net.bridge.bridge-nf-call-iptables  = 1
net.bridge.bridge-nf-call-ip6tables = 1
net.ipv4.ip_forward                 = 1
EOF
sudo sysctl --system

# containerd
sudo apt-get update && sudo apt-get install -y containerd apt-transport-https ca-certificates curl gpg
sudo mkdir -p /etc/containerd && containerd config default | sudo tee /etc/containerd/config.toml
sudo sed -i 's/SystemdCgroup = false/SystemdCgroup = true/' /etc/containerd/config.toml
sudo systemctl restart containerd && sudo systemctl enable containerd

# kubeadm
curl -fsSL https://pkgs.k8s.io/core:/stable:/v$K8S_VER/deb/Release.key | sudo gpg --dearmor -o /etc/apt/keyrings/kubernetes-apt-keyring.gpg
echo "deb [signed-by=/etc/apt/keyrings/kubernetes-apt-keyring.gpg] https://pkgs.k8s.io/core:/stable:/v$K8S_VER/deb/ /" | sudo tee /etc/apt/sources.list.d/kubernetes.list
sudo apt-get update
sudo apt-get install -y kubelet kubeadm kubectl
sudo apt-mark hold kubelet kubeadm kubectl

# 2. Init cluster
sudo kubeadm init --pod-network-cidr=192.168.0.0/16 --kubernetes-version {ver} --control-plane-endpoint {name}.local

mkdir -p $HOME/.kube
sudo cp -i /etc/kubernetes/admin.conf $HOME/.kube/config
sudo chown $(id -u):$(id -g) $HOME/.kube/config

# 3. CNI - Calico
kubectl apply -f https://raw.githubusercontent.com/projectcalico/calico/v3.27.0/manifests/calico.yaml

# 4. Addons
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/baremetal/deploy.yaml
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml

echo "✅ Cluster {name} ready. Join workers with:"
sudo kubeadm token create --print-join-command

echo "To add {nodes-1} workers, run join command on each worker node."
"""

@app.route('/')
def index():
    return HTML

@app.route('/api/status')
def status():
    tools=get_tool_status()
    clusters=list_clusters()
    docker_ok=tools['docker']['installed']
    kubectl_ver=""
    if tools['kubectl']['installed']:
        ok,out=run_cmd("kubectl version --client -o json 2>&1 || kubectl version --client 2>&1", timeout=4)
        try:
            j=json.loads(out); kubectl_ver=j.get('clientVersion',{}).get('gitVersion','')
        except:
            kubectl_ver=out.split('\n')[0][:40]
    return jsonify({
        "os": platform.system(),
        "arch": platform.machine(),
        "docker": docker_ok,
        "kubectl": tools['kubectl']['installed'],
        "kubectl_version": kubectl_ver,
        "tools": tools,
        "clusters": clusters
    })

@app.route('/api/generate-script', methods=['POST'])
def gen_script():
    payload=request.get_json() or {}
    script=generate_script(payload)
    return jsonify({"script": script})

@app.route('/api/deploy-stream')
def deploy_stream():
    name=request.args.get('name','rcw-dev')
    typ=request.args.get('type','k3d')
    ver=request.args.get('version','v1.30.0')
    nodes=int(request.args.get('nodes','3'))
    addons={
        "ingress": request.args.get('ingress','true')=='true',
        "metrics": request.args.get('metrics','true')=='true',
        "dashboard": request.args.get('dashboard','false')=='true',
        "prometheus": request.args.get('prometheus','false')=='true',
    }
    payload={"name":name,"type":typ,"version":ver,"nodes":nodes,"addons":addons}

    def event_stream():
        q=queue.Queue()
        LOG_QUEUES[name]=q

        def log(msg,color="#dbe7ff"):
            q.put({"log": msg, "color": color})
        def run():
            try:
                tools=get_tool_status()
                # check docker for kind/k3d/minikube
                if typ in ['k3d','kind','minikube'] and not tools['docker']['installed']:
                    log("❌ Docker not found. Please install Docker first.", "#ff8a8a")
                    log("Dry-run mode: showing script instead.", "#ffd335")
                    script=generate_script(payload)
                    for line in script.split('\n'):
                        log(line, "#a8bdd8")
                        time.sleep(0.02)
                    q.put({"done": True, "success": False})
                    return

                if typ=='k3d' and not tools['k3d']['installed']:
                    log("⬇️ Installing k3d...", "#8ab6ff")
                    ok,out=run_cmd("curl -s https://raw.githubusercontent.com/k3d-io/k3d/main/install.sh | bash", timeout=60)
                    log(out[-2000:], "#a8bdd8")

                if typ=='kind' and not tools['kind']['installed']:
                    log("⬇️ Installing kind...", "#8ab6ff")
                    # try go install or curl
                    ok,out=run_cmd("curl -Lo /tmp/kind https://kind.sigs.k8s.io/dl/v0.22.0/kind-linux-amd64 && chmod +x /tmp/kind && sudo mv /tmp/kind /usr/local/bin/kind || mv /tmp/kind ./kind", timeout=60)
                    log(out[-2000:])

                # Build command
                if typ=='k3d':
                    cmd = f"k3d cluster create {name} --image rancher/k3s:{ver.replace('v','')}-k3s1 --servers 1 --agents {max(0,nodes-1)} --port \"80:80@loadbalancer\" --port \"443:443@loadbalancer\" --k3s-arg \"--disable=traefik@server:0\" 2>&1"
                elif typ=='kind':
                    kind_cfg_path=f"/tmp/kind-{name}.yaml"
                    kind_yaml=f"kind: Cluster\napiVersion: kind.x-k8s.io/v1alpha4\nnodes:\n- role: control-plane\n  image: kindest/node:{ver}\n"
                    for i in range(nodes-1):
                        kind_yaml+=f"- role: worker\n  image: kindest/node:{ver}\n"
                    Path(kind_cfg_path).write_text(kind_yaml)
                    cmd = f"kind create cluster --name {name} --config {kind_cfg_path} --image kindest/node:{ver} 2>&1"
                elif typ=='minikube':
                    cmd = f"minikube start -p {name} --nodes {nodes} --kubernetes-version {ver} --driver docker 2>&1"
                else: # kubeadm -> just generate
                    script=generate_script(payload)
                    for line in script.split('\n'):
                        log(line, "#a8bdd8")
                        time.sleep(0.015)
                    q.put({"done": True, "success": True})
                    return

                log(f"> Running: {cmd}", "#6ea8ff")
                proc = subprocess.Popen(cmd, shell=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, bufsize=1)
                for line in proc.stdout:
                    log(line.rstrip(), "#dbe7ff")
                proc.wait()
                if proc.returncode!=0:
                    log(f"❌ Failed with exit {proc.returncode}", "#ff8a8a")
                    q.put({"done": True, "success": False})
                    return

                log("✅ Cluster created, waiting for nodes Ready...", "#3cff7a")
                ok,out=run_cmd(f"kubectl wait --for=condition=Ready nodes --all --timeout=180s --context k3d-{name} 2>&1 || kubectl wait --for=condition=Ready nodes --all --timeout=180s --context kind-{name} 2>&1 || kubectl wait --for=condition=Ready nodes --all --timeout=180s 2>&1", timeout=200)
                log(out, "#a8bdd8")

                if addons['ingress']:
                    log("📦 Installing NGINX Ingress...", "#8ab6ff")
                    ok,out=run_cmd("kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/kind/deploy.yaml 2>&1", timeout=60)
                    log(out[-1500:])

                if addons['metrics']:
                    log("📦 Installing Metrics Server...", "#8ab6ff")
                    ok,out=run_cmd("kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml 2>&1", timeout=60)
                    log(out[-1000:])

                if addons['dashboard']:
                    log("📦 Installing Dashboard...", "#8ab6ff")
                    ok,out=run_cmd("kubectl apply -f https://raw.githubusercontent.com/kubernetes/dashboard/v2.7.0/aio/deploy/recommended.yaml 2>&1", timeout=60)
                    log(out[-1000:])

                log(f"🎉 Cluster {name} ready! Use: kubectl config use-context k3d-{name} or kind-{name}", "#3cff7a")
                ok,out=run_cmd("kubectl get nodes 2>&1", timeout=15)
                log(out, "#ffd335")

                q.put({"done": True, "success": True})
            except Exception as e:
                log(f"Exception: {e}", "#ff8a8a")
                q.put({"done": True, "success": False})

        threading.Thread(target=run, daemon=True).start()

        while True:
            try:
                item = q.get(timeout=30)
                yield f"data: {json.dumps(item)}\n\n"
                if item.get('done'):
                    break
            except queue.Empty:
                yield f"data: {json.dumps({'log': '...waiting...'})}\n\n"

    return Response(event_stream(), mimetype='text/event-stream', headers={'Cache-Control':'no-cache','X-Accel-Buffering':'no'})

@app.route('/api/delete', methods=['POST'])
def delete_cluster():
    data=request.get_json() or {}
    name=data.get('name'); typ=data.get('type','k3d')
    if not name:
        return jsonify({"error":"name required"}),400
    if typ=='k3d':
        ok,out=run_cmd(f"k3d cluster delete {name} 2>&1", timeout=60)
    elif typ=='kind':
        ok,out=run_cmd(f"kind delete cluster --name {name} 2>&1", timeout=60)
    elif typ=='minikube':
        ok,out=run_cmd(f"minikube delete -p {name} 2>&1", timeout=90)
    else:
        ok,out=True,f"kubeadm cluster {name} - run 'kubeadm reset' on nodes manually"
    return jsonify({"output": out, "success": ok})

@app.route('/api/kubeconfig')
def kubeconfig():
    name=request.args.get('name','')
    # try to get kubeconfig for cluster
    kube_path = Path.home() / ".kube" / "config"
    if kube_path.exists():
        return send_file(kube_path, as_attachment=True, download_name=f"{name}-kubeconfig.yaml")
    return jsonify({"error":"kubeconfig not found at ~/.kube/config"}),404

if __name__=='__main__':
    print("""
╔════════════════════════════════════════════════════╗
║  RCW K8s Deployer - Single App Cluster Launcher    ║
║  → http://localhost:8080                           ║
║  Supports: k3d, kind, minikube, kubeadm            ║
║  One file = Full deployer + UI + API               ║
╚════════════════════════════════════════════════════╝
    """)
    # ensure flask
    try:
        app.run(host='0.0.0.0', port=8080, debug=False, threaded=True)
    except OSError:
        app.run(host='0.0.0.0', port=8081, debug=False, threaded=True)
