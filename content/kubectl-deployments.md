---
description: Kubernetes Deployments hands-on: list, create with kubectl create deployment, scale replicas, and delete — with what a Deployment really is and how to read the STATUS columns.
---

# What a Deployment is (and what it is not)

New Kubernetes users often think a Deployment *is* the running application. It is not — it is a **controller** that describes the application you want and then works continuously to make reality match. Concretely, a Deployment owns a **ReplicaSet**, and the ReplicaSet owns the **Pods**. When you say "3 replicas", the Deployment tells the ReplicaSet to keep exactly three Pods alive; if a node dies and a Pod disappears, a new one is created without you doing anything.

That chain — Deployment → ReplicaSet → Pod — is the single most useful thing to hold in your head during this lab, because every `kubectl` command below is talking to a different link in it.

You are logged in to `k8s-master-01` as `admin` with a working kubeconfig, so `kubectl` already points at the cluster.

# 1. `kubectl get deployments` — read the columns properly

Run it first even if you expect the namespace to be empty; it proves the API server is reachable. When deployments exist, the output looks like this:

```
NAME   READY   UP-TO-DATE   AVAILABLE   AGE
web    2/3     3            2           45s
```

- **READY** `2/3` — two Pods are passing their readiness checks out of three desired.
- **UP-TO-DATE** — how many Pods run the *current* Pod template. During a rolling update this number climbs while old Pods are replaced.
- **AVAILABLE** — Pods ready for at least `minReadySeconds`. This is what your Service is actually sending traffic to.

If READY stays below the desired count for more than a minute, stop and run `kubectl get pods` — the Pod STATUS column (`ImagePullBackOff`, `CrashLoopBackOff`, `Pending`) tells you why, and the *Kubernetes Workload Failures* guide on this site walks through each one.

# 2. `kubectl create deployment web --image=nginx`

This imperative command generates a Deployment named `web` with one replica running the `nginx` image from Docker Hub. Behind the scenes it creates a ReplicaSet named `web-<hash>` and a Pod named `web-<hash>-<random>`. Check all three levels once:

```
kubectl get deployment,replicaset,pod -l app=web
```

The `-l app=web` label selector works because `kubectl create deployment` automatically adds the label `app=web` to everything it creates — that same label is what a Service would later use to find these Pods.

**In real work, prefer the declarative route:** `kubectl create deployment web --image=nginx --dry-run=client -o yaml > web.yaml`, edit the file, then `kubectl apply -f web.yaml`. Committing that YAML to Git is how changes stay reviewable. The imperative form is perfect for the CKA/CKAD exam clock and for labs like this one.

# 3. `kubectl scale deployment web --replicas=3`

Scaling changes one field — `.spec.replicas` — and the controller does the rest. Watch it happen:

```
kubectl get pods -l app=web -w
```

You will see two new Pods go `Pending → ContainerCreating → Running` within a few seconds on a healthy cluster. Two things worth knowing:

- Scaling to **0** is a legitimate way to "pause" an application without deleting its configuration. The Deployment and Service remain; only the Pods go.
- If you have a **HorizontalPodAutoscaler** attached, it will fight a manual `scale` and win. Check with `kubectl get hpa` before wondering why the count keeps changing back.

# 4. `kubectl delete deployment web`

Deleting the Deployment cascades: the ReplicaSet and its Pods are removed too (this is the default *background* propagation). Pods enter `Terminating`, receive SIGTERM, and are given `terminationGracePeriodSeconds` (30 s by default) to shut down before SIGKILL. For nginx that is instant; for a database you would want to raise the grace period.

If you only wanted to remove the Pods but keep the Deployment, you would scale to 0 instead — delete is permanent, and there is no undo other than re-applying the YAML you hopefully saved in step 2.

# Mistakes that cost points here and in the CKA

- Typing `kubectl create deploy web nginx` (positional image). The image must be a flag: `--image=nginx`.
- Forgetting `-n <namespace>` on a real cluster and creating things in `default` by accident. Use `kubectl config set-context --current --namespace=<ns>` at the start of a task.
- Running `kubectl delete pod web-xxxx` to "restart" and being surprised it comes back. That is the controller doing its job; use `kubectl rollout restart deployment web` for a controlled restart.
- Not checking `kubectl rollout status deployment web` after an image change. It blocks until the rollout succeeds or times out — the cleanest pass/fail signal you can get in a script.

# Next steps on this site

Pair this lab with **kubectl Services** (exposing the Deployment you just created) and the **Kubernetes Cluster Setup Challenge** if you want to see what happens underneath the API server.
