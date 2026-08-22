"""RCW AI Log Analyzer Desktop. Local-only Windows/Linux GUI; no network calls."""
import re
import tkinter as tk
from tkinter import ttk, filedialog, messagebox

APP="RCW AI Log Analyzer"

class Analyzer(tk.Tk):
    def __init__(self):
        super().__init__(); self.title(APP); self.geometry("1050x700"); self.minsize(850,580)
        self.configure(bg="#f5f7fb"); self._build()
    def _build(self):
        top=tk.Frame(self,bg="#101d31",height=70); top.pack(fill="x")
        tk.Label(top,text="RCW AI Log Analyzer",bg="#101d31",fg="white",font=("Segoe UI",19,"bold")).pack(anchor="w",padx=22,pady=(12,0))
        tk.Label(top,text="Offline desktop edition · Logs never leave this computer",bg="#101d31",fg="#bdd0ec",font=("Segoe UI",10)).pack(anchor="w",padx=22)
        body=ttk.PanedWindow(self,orient="horizontal"); body.pack(fill="both",expand=True,padx=16,pady=16)
        left=ttk.Frame(body,padding=8); right=ttk.Frame(body,padding=8); body.add(left,weight=1); body.add(right,weight=1)
        ttk.Label(left,text="Paste a log or open a local file",font=("Segoe UI",13,"bold")).pack(anchor="w")
        ttk.Label(left,text="Supported: application, Linux, Nginx, Kubernetes, SSH, Ansible, Docker logs.",foreground="#64748b").pack(anchor="w",pady=(2,9))
        row=ttk.Frame(left);row.pack(fill="x");ttk.Button(row,text="Open log file…",command=self.open_file).pack(side="left");ttk.Button(row,text="Load missing-config sample",command=self.sample).pack(side="left",padx=8);ttk.Button(row,text="Clear",command=self.clear).pack(side="right")
        self.log=tk.Text(left,wrap="none",font=("Consolas",10),bg="#101c2e",fg="#e2ebf8",insertbackground="white",height=28);self.log.pack(fill="both",expand=True,pady=10)
        ttk.Button(left,text="Analyze locally",command=self.analyze).pack(anchor="w")
        ttk.Label(right,text="Findings and safe remediation",font=("Segoe UI",13,"bold")).pack(anchor="w")
        ttk.Label(right,text="Validate every recommendation against your environment and change policy.",foreground="#64748b").pack(anchor="w",pady=(2,9))
        self.out=tk.Text(right,wrap="word",font=("Consolas",10),bg="white",fg="#1e293b",state="disabled",height=30);self.out.pack(fill="both",expand=True)
    def open_file(self):
        path=filedialog.askopenfilename(filetypes=[("Log/text files","*.log *.txt *.out *.err *.json"),("All files","*.*")])
        if not path:return
        try:
            with open(path,"r",encoding="utf-8",errors="replace") as f:data=f.read()
            self.log.delete("1.0","end");self.log.insert("1.0",data);self.analyze()
        except Exception as e:messagebox.showerror(APP,f"Could not open file:\n{e}")
    def clear(self): self.log.delete("1.0","end");self.set_output("Ready. Paste a log or open a local file, then select Analyze locally.\n")
    def sample(self):
        self.log.delete("1.0","end");self.log.insert("1.0","I0822 11:35:20.123456       1 main.go:45] Starting application v1.0.2...\nF0822 11:35:20.125789       1 main.go:52] Failed to open config file /etc/config/app.env: no such file or directory\ngoroutine 1 [running]:\nmain.main() /app/main.go:52 +0x6c");self.analyze()
    def set_output(self,s):
        self.out.config(state="normal");self.out.delete("1.0","end");self.out.insert("1.0",s);self.out.config(state="disabled")
    def evidence(self, text, pattern):
        return next((x.strip() for x in text.splitlines() if re.search(pattern,x,re.I)), "")
    def finding(self,severity,title,cause,evidence,steps):
        return f"{'='*72}\n{severity}: {title}\n{'='*72}\nEvidence: {evidence}\n\nLikely cause:\n{cause}\n\nRecommended validation and remediation:\n{steps}\n\n"
    def analyze(self):
        s=self.log.get("1.0","end-1c"); l=s.lower();f=[]
        if re.search(r"failed to open config file|no such file or directory",l) and ("config" in l or "/etc/" in l):
            f.append(self.finding("CRITICAL","Required application configuration file is missing","The process stops during startup because the required configuration file is absent. Restore or mount the approved configuration; do not create an empty replacement unless the application documentation explicitly permits it.",self.evidence(s,r"failed to open config file|no such file or directory"),"Kubernetes: verify the ConfigMap/Secret key and volume mount.\n  kubectl get configmap app-config -n <namespace> -o yaml\n  kubectl exec -n <namespace> <pod> -- ls -la /etc/config\n\nFor a single ConfigMap file mount:\n  mountPath: /etc/config/app.env\n  subPath: app.env\n  readOnly: true\n\nDocker: bind-mount the approved file read-only:\n  -v ./app.env:/etc/config/app.env:ro\n\nVM/service: deploy /etc/config/app.env with the approved owner and permissions, then restart the service."))
        if re.search(r"no space left|disk quota exceeded",l): f.append(self.finding("CRITICAL","Filesystem capacity exhausted","A process cannot write to disk.",self.evidence(s,r"no space left|disk quota exceeded"),"Run: df -h\nIdentify large directories: sudo du -xhd1 / | sort -h\nReview retention and application data before removing files."))
        if re.search(r"oomkilled|out of memory|exit code: 137",l):f.append(self.finding("CRITICAL","Memory pressure / OOM termination","The kernel or Kubernetes terminated a workload because memory was exhausted.",self.evidence(s,r"oomkilled|out of memory|exit code: 137"),"Kubernetes: kubectl describe pod <pod> -n <namespace>\nKubernetes: kubectl top pod -A\nReview limits, requests, leaks, and node memory before increasing limits."))
        if re.search(r"crashloopbackoff|back-off restarting failed",l):f.append(self.finding("CRITICAL","Kubernetes CrashLoopBackOff","A container repeatedly fails during startup.",self.evidence(s,r"crashloopbackoff|back-off restarting failed"),"Run: kubectl logs <pod> -n <namespace> --previous\nRun: kubectl describe pod <pod> -n <namespace>\nUse the previous container logs to correct config, secrets, image, or command errors."))
        if re.search(r"connect\(\) failed|connection refused|upstream prematurely closed|502 bad gateway",l):f.append(self.finding("CRITICAL","Proxy upstream application unavailable","Nginx or a proxy cannot connect to the backend application.",self.evidence(s,r"connect\(\) failed|connection refused|upstream prematurely closed|502 bad gateway"),"Check backend service: systemctl status <service>\nCheck listener: ss -ltnp | grep <port>\nCheck configured upstream address/port and application logs before restarting."))
        if re.search(r"failed password|invalid user|authentication failure",l):f.append(self.finding("REVIEW","Repeated SSH authentication failure","Could be a brute-force attempt or bad automation credentials.",self.evidence(s,r"failed password|invalid user|authentication failure"),"Review source IP, user, and time window.\nRun: journalctl -u sshd --since '1 hour ago'\nUse SSH keys, disable unnecessary password/root login, and apply approved network controls."))
        if re.search(r"fatal: \[.*\]: failed|ansible.*failed",l):f.append(self.finding("REVIEW","Ansible task failure","An automation task failed; use the task message and target details to find the dependency or configuration issue.",self.evidence(s,r"fatal: \[.*\]: failed|ansible.*failed"),"Rerun safely with: ansible-playbook -i inventory.ini playbook.yml --limit <host> -vvv --check\nConfirm target OS, repository availability, credentials, and privilege escalation."))
        if not f:f.append("No high-confidence local pattern matched.\n\nNext steps:\n1. Include a wider time window around the failure.\n2. Search for ERROR, FATAL, exception, timeout, denied, or exit code.\n3. Include the service name and the 20–50 lines before the first error.\n")
        self.set_output(f"Scanned {len(s.splitlines())} lines locally. Found {len(f)} finding(s).\n\n"+"".join(f))
if __name__=='__main__': Analyzer().mainloop()
