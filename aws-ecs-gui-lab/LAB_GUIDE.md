# Amazon ECS End-to-End GUI Lab

**Provider:** RCW IT Training<br>
**Level:** Intermediate<br>
**Estimated time:** 75–100 minutes<br>
**Primary interaction:** AWS-console-style graphical workflow<br>
**Delivery:** Browser-local educational simulation<br>
**Lab URL:** [Open the GUI lab](./)

> This lab simulates an AWS Management Console workflow without connecting to AWS. It creates no cloud resources, accepts no credentials, makes no network calls, and incurs no charges. Product names are used only to teach the workflow; no vendor logo is used.
>
> The security and compliance material is **control-aligned educational guidance**, not a compliance certification, audit opinion, production authorization, or legal advice. Your organization must determine applicable laws, contracts, standards, Regions, retention periods, evidence, and compensating controls.

## Contents

1. [Learning objectives](#learning-objectives)
2. [Scenario and target outcome](#scenario-and-target-outcome)
3. [Prerequisites](#prerequisites)
4. [Reference architecture](#reference-architecture)
5. [Mandatory security and compliance baseline](#mandatory-security-and-compliance-baseline)
6. [Scoring and workflow](#scoring-and-workflow)
7. [Detailed GUI lab procedure](#detailed-gui-lab-procedure)
8. [Validation and expected results](#validation-and-expected-results)
9. [Evidence collection](#evidence-collection)
10. [Cleanup](#cleanup)
11. [Troubleshooting](#troubleshooting)
12. [Production implementation considerations](#production-implementation-considerations)
13. [Control-alignment map](#control-alignment-map)
14. [Official references](#official-references)

---

## Learning objectives

After completing the lab, you will be able to:

- authorize a container workload using a named owner, data classification, release boundary, and change obligation;
- configure a private Amazon ECR repository with immutable tags, continuous vulnerability scanning, KMS encryption, lifecycle controls, SBOM/provenance evidence, and a digest-pinned release;
- explain and separate the CI/CD build role, ECS task execution role, and application task role;
- reference a protected secret rather than baking it into an image or storing it as plain configuration;
- create an Amazon ECS cluster using AWS Fargate and Container Insights with enhanced observability;
- register a hardened Fargate task definition using `awsvpc`, explicit resources, a non-root user, a read-only root filesystem, protected logs, a container health check, and an immutable image digest;
- design public load-balancer subnets and private task subnets across two Availability Zones;
- restrict load-balancer and task ingress using separate security groups and private service endpoints;
- deploy an ECS service with two tasks, safe rolling percentages, Availability Zone rebalancing, deployment circuit breaker, automatic rollback, managed tags, and bounded target-tracking scaling;
- validate TLS, health, image approval, multi-AZ availability, logging, autoscaling, direct-access denial, and failed-deployment rollback;
- map evidence to governance, protection, detection, response, and recovery outcomes; and
- clean up resources in dependency order while retaining required evidence.

Governance, security, observability, recovery, evidence, cleanup, and human oversight are mandatory lab objectives—not optional reading.

## Scenario and target outcome

RCW IT Training needs to deploy the synthetic **RCW Orders** web API. The application listens on TCP port `8080` and exposes `/healthz`. It must be reachable through HTTPS, but its containers must not have public IP addresses or accept direct internet traffic.

The approved lab outcome is:

- a private ECR repository named `rcw-orders`;
- a versioned image pinned by digest, represented as `sha256:9a51…d824`;
- a Fargate cluster named `rcw-prod-ecs`;
- task definition `rcw-orders-web:1`;
- ECS service `rcw-orders-service`;
- two private tasks in separate Availability Zones;
- an internet-facing Application Load Balancer in public subnets;
- HTTPS listener on port `443` using an approved ACM certificate;
- an IP target group on port `8080` with health path `/healthz`;
- private endpoints for ECR API, ECR DKR, S3, CloudWatch Logs, and Secrets Manager;
- CloudTrail, VPC Flow Logs, protected application logs, enhanced Container Insights, alarms, and security findings;
- service autoscaling from two to six tasks; and
- a limited monitored pilot approved by an accountable human.

All identities, account numbers, transactions, images, events, scan findings, certificates, and resources in the browser lab are synthetic.

## Prerequisites

### Browser simulation

- A current browser with JavaScript enabled.
- No AWS account or credentials.
- No command-line tools.
- Permission to download JSON and PDF files if you want the evidence record and certificate.

### Comparable real AWS deployment

Obtain these through your organization's approved process before using a real account:

1. A workload account and AWS Region approved for the application's data, resilience, service availability, and legal requirements.
2. Federated, individual workforce access with MFA. Do not use the root user for this workflow.
3. Separate deployment and approval roles with permission boundaries or equivalent guardrails.
4. An approved VPC design with at least two Availability Zones, two public subnets for the ALB, and two private application subnets for Fargate tasks.
5. An approved DNS name and an AWS Certificate Manager certificate for HTTPS.
6. A customer-managed KMS key strategy for ECR, Fargate ephemeral storage where selected, Secrets Manager, log groups, CloudTrail, and evidence destinations.
7. An ECR private registry scanning configuration, Amazon Inspector coverage where enhanced scanning is used, and a vulnerability exception process.
8. A pre-staged application image produced by a trusted CI/CD pipeline, including source revision, build identity, SBOM, provenance/signing evidence, scan result, and image digest.
9. A Secrets Manager secret containing only synthetic/test content during validation.
10. CloudTrail, AWS Config, Security Hub CSPM, GuardDuty Runtime Monitoring, CloudWatch, EventBridge/SNS incident routing, budgets, and cost anomaly ownership as required by your baseline.
11. Approved log content, retention, evidence, incident, backup/recovery, change, and cleanup requirements.
12. Service quotas and account settings reviewed for ECS, Fargate, ENIs, load balancers, target groups, VPC endpoints, CloudWatch metrics/logs, KMS, Secrets Manager, and NAT if applicable.

### GUI-only image prerequisite

The Amazon ECR console does not provide a normal browser button for building and uploading a local container image. A real GUI-focused ECS deployment therefore starts with an **already approved image digest** staged by a trusted pipeline or platform team. Do not replace this control with an unreviewed public image or an unpinned `latest` tag. The browser simulation safely represents repository creation, scan review, and digest approval.

## Reference architecture

```text
Approved client CIDR
        |
        | HTTPS :443
        v
Application Load Balancer
  public subnet AZ-a + public subnet AZ-b
  ACM certificate / ALB security group
        |
        | TCP :8080, source = ALB security group
        v
ECS service: rcw-orders-service
  private app subnet AZ-a ---- Fargate task A
  private app subnet AZ-b ---- Fargate task B
  no public task IP
        |
        +--> ECR API + ECR DKR interface endpoints
        +--> S3 gateway endpoint for ECR image layers
        +--> CloudWatch Logs interface endpoint
        +--> Secrets Manager interface endpoint
        +--> KMS/service endpoints when the workload path requires them

ECR private repository
  immutable release tag + pinned digest
  enhanced continuous scanning / Inspector
  lifecycle policy + KMS + SBOM/provenance evidence

CloudTrail + CloudWatch + VPC Flow Logs + EventBridge
AWS Config + Security Hub CSPM + GuardDuty Runtime Monitoring
        |
        v
Protected evidence, tested alerts, incident owner, rollback runbook
```

### Trust boundaries

- **Identity boundary:** Humans use federated roles and MFA; workloads use roles for tasks. No static AWS access keys are placed in images, task definitions, or environment variables.
- **Build boundary:** Only the trusted delivery identity can push. The runtime execution role is pull-only.
- **Artifact boundary:** A tag is not sufficient evidence. Promotion records the immutable digest, scan result, SBOM, provenance, signer/build identity, and exception status.
- **Control-plane boundary:** CloudTrail records administrative API activity. `iam:PassRole`, ECS changes, task-definition registration, secret/KMS policy changes, and logging changes require review.
- **Network boundary:** The ALB is the only public entry. Tasks use private ENIs and accept application traffic only from the ALB security group.
- **Runtime boundary:** The container runs as non-root, without privileged mode, with a read-only root filesystem and explicit writable path only where needed.
- **Secret boundary:** The task definition references a Secrets Manager ARN. Secret content must not appear in images, logs, labels, tags, names, plain environment values, or evidence exports.
- **Operations boundary:** Logs and metrics can be incomplete, sensitive, or costly. Define collection, access, encryption, integrity, retention, alarm, and response requirements.
- **Human boundary:** A named person owns residual risk, release, incident response, rollback, exceptions, cost, and the next review.

## Mandatory security and compliance baseline

The lab accepts only the safer configuration below.

| Area | Mandatory lab decision | Control outcome |
|---|---|---|
| Governance | Named Application Service Owner; synthetic internal data; limited monitored pilot; production IaC | Accountability, purpose limitation, change control |
| ECR | Private repository; immutable tag; digest pin; continuous enhanced scan; customer-managed KMS key; lifecycle policy | Artifact integrity, vulnerability detection, encryption, inventory |
| Build | Trusted short-lived pipeline role; SBOM/provenance evidence; policy gate | Separated duties and software supply-chain evidence |
| IAM | Separate build, execution, and task roles; restricted `iam:PassRole`; MFA/federation | Least privilege and attributable access |
| Secrets | Secrets Manager reference and scoped KMS access | No secret in image/plain environment |
| Cluster | Fargate; enhanced Container Insights; protected ephemeral storage; tagged cost owner | Managed runtime, observability, encryption, accountability |
| Task | `awsvpc`; explicit CPU/memory; non-root; non-privileged; read-only root; health check; `awslogs` | Runtime hardening and bounded resources |
| Network | Two AZs; tasks private; no task public IP; HTTPS; SG-to-SG ingress; private endpoints | Segmentation and minimized exposure |
| Service | Two tasks; safe rolling bounds; latest approved platform; AZ rebalancing; circuit breaker + rollback | Availability and recoverable deployment |
| Scaling | Minimum 2, maximum 6, average CPU target 60%, tested cooldowns/quotas | Availability with cost ceiling |
| Detection | CloudTrail, protected logs, enhanced metrics, Flow Logs, scan findings, alarms, EventBridge | Traceability and tested detection |
| Security posture | Config/Security Hub ECS and ECR controls; GuardDuty Runtime Monitoring | Continuous configuration/threat monitoring |
| Release | Seven validation checks, risk owner, future review date, evidence and cleanup attestations | Human authorization and retained evidence |

Do not describe this baseline as “certified compliant.” A real assessor must evaluate scope, design, operation, exceptions, inherited controls, evidence quality, and applicable requirements.

## Scoring and workflow

| Objective | Points |
|---|---:|
| 1. Governance and workload boundary | 10 |
| 2. ECR supply-chain controls | 15 |
| 3. IAM and secrets | 10 |
| 4. Fargate cluster | 10 |
| 5. Hardened task definition | 15 |
| 6. Network and load balancer | 15 |
| 7. ECS service and autoscaling | 10 |
| 8. Operational validation and rollback | 10 |
| 9. Compliance review and release decision | 5 |
| **Total** | **100** |

Objectives are sequential. Unsafe selections are rejected rather than accepted for partial credit. The final certificate is available only after all mandatory gates pass.

## Detailed GUI lab procedure

### Objective 1 — Authorize the workload boundary (10 points)

#### In the simulation

1. Open **Overview**.
2. Review the scenario, architecture, and mandatory gates.
3. Enter your learner name.
4. Select **Application Service Owner**.
5. Select **Internal — synthetic lab transactions**.
6. Select **Limited monitored pilot**.
7. Accept all three guardrails:
   - synthetic data only;
   - named human accountability; and
   - infrastructure as code for production.
8. Choose **Approve workload scope**.

#### Real implementation checkpoint

Create a workload record before resources are built. At minimum capture:

- business purpose and prohibited use;
- owner, technical owner, security contact, privacy/data owner, on-call team, and cost owner;
- data categories, classification, residency/transfer constraints, and retention;
- availability and recovery objectives;
- threat model and abuse cases;
- release scope, rollback criteria, and review date;
- required standards, contracts, evidence, and exceptions; and
- approved Region, account, network, KMS, logging, and tagging baseline.

**Expected evidence:** approved architecture/risk record, named owners, release boundary, and `Workload boundary approved` event.

### Objective 2 — Create the protected ECR repository (15 points)

#### In the simulation

1. Open **ECR image**.
2. Keep repository name `rcw-orders`.
3. Choose **Immutable** tag mutability.
4. Choose **Enhanced — continuous** scanning.
5. Choose **Customer managed KMS key**.
6. Choose **Expire untagged after 7 days; retain 20 releases**.
7. Select the digest-pinned `2026.08.18@sha256:9a51…d824` image—not `latest`.
8. Confirm SBOM, zero unapproved critical/high findings, and trusted CI/CD identity.
9. Choose **Create repository and approve digest**.

#### Comparable AWS console procedure

1. Sign in through the approved federated role and select the approved Region.
2. Open **Amazon ECR → Private registry → Repositories → Create repository**.
3. Select **Private** and enter `rcw-orders`.
4. Configure tag immutability according to policy. For this lab, use immutable release tags without an exclusion that would make the selected release mutable.
5. Select **KMS** encryption and the approved customer-managed key. ECR repository encryption configuration is chosen at creation and should be treated as an architecture decision.
6. Create the repository.
7. Configure scanning at **Private registry → Settings/Scanning configuration**. Use **Enhanced scanning** with Amazon Inspector and set the approved repository filter/frequency to continuous scanning.
8. Open the repository and add a lifecycle policy. Preview affected images before saving.
9. Verify repository and KMS policies allow push only from the build identity and pull only from approved execution identities. Avoid open cross-account principals.
10. Review the pre-staged image's digest and scan findings. Record SBOM, provenance/build identity, source revision, approval, and exceptions.
11. Configure EventBridge notification for actionable Inspector findings and test the route.

**Why digest pinning matters:** An immutable tag helps, but the digest is the content identity used to prove exactly what is deployed.

**Expected evidence:** repository configuration, KMS key/policy reference, scanning configuration, lifecycle preview/policy, repository policy, digest, findings, SBOM/provenance, approval, and exception record.

### Objective 3 — Separate IAM roles and protect secrets (10 points)

#### In the simulation

1. Open **IAM & secrets**.
2. Select **Scoped ECR pull, logs write, one secret read** for the execution role.
3. Select **Read orders-config only** for the application task role.
4. Select **Secrets Manager ARN reference**.
5. Select **Customer managed KMS key with scoped policy**.
6. Confirm federated MFA, restricted `iam:PassRole`, and CloudTrail/access review.
7. Choose **Approve roles and secret path**.

#### Role responsibilities

- **Build role:** pushes image layers and manifests only to the approved repository. It does not become the runtime role.
- **Task execution role:** used by the ECS/Fargate agent to pull the image, publish `awslogs`, and retrieve referenced secrets/KMS data needed during task startup.
- **Task role:** credentials exposed to application code for its approved AWS API calls. It does not need ECR push permission or broad account access.

#### Comparable AWS console procedure

1. Open **IAM → Roles → Create role**.
2. Create an ECS task execution role trusted by `ecs-tasks.amazonaws.com`.
3. Start from the documented execution permissions, then scope resources and conditions where the service supports them. Add only the specific secret and KMS permissions required.
4. Create a separate task role trusted by `ecs-tasks.amazonaws.com`.
5. Grant only the application's required action on the `orders-config` resource. If no AWS API is required, keep the policy empty/minimal rather than borrowing the execution role.
6. Restrict deployment-role `iam:PassRole` to the approved role ARNs and service context.
7. In **Secrets Manager**, create or select the approved secret, KMS key, resource policy, rotation plan, readers, and deletion/recovery settings.
8. Use synthetic test content. Never place a real secret in the lab.
9. Review trust policies, permissions boundaries/SCP effects, cross-account access, CloudTrail, last-accessed information, and Access Analyzer findings.

**Expected evidence:** trust and permissions policies, Access Analyzer/last-access review, secret ARN without value, KMS policy reference, `iam:PassRole` restriction, and owner approvals.

### Objective 4 — Create the Fargate cluster (10 points)

#### In the simulation

1. Open **Cluster**.
2. Keep cluster name `rcw-prod-ecs`.
3. Select **AWS Fargate (serverless)**.
4. Select **Enhanced observability**.
5. Select **Customer managed KMS key** for the approved ephemeral-storage posture.
6. Select **Disabled by default; break-glass only** for execute command.
7. Keep **FARGATE** as the capacity provider.
8. Confirm mandatory tags and budget/anomaly ownership.
9. Choose **Create cluster**.

#### Comparable AWS console procedure

1. In **Amazon ECS**, review **Account settings** and configure Container Insights with enhanced observability under the correct principal/account scope. Understand the additional metric/log charges.
2. Open **Clusters → Create cluster**.
3. Enter `rcw-prod-ecs`.
4. Use the Fargate/serverless infrastructure option.
5. Enable or verify enhanced Container Insights for the cluster.
6. Configure approved encryption and execute-command behavior. If ECS Exec is allowed, require explicit break-glass authorization, least-privilege SSM permissions, KMS, session logging where supported, alerts, time limits, and post-use review.
7. Add mandatory tags: `Owner`, `Application`, `Environment`, `DataClass`, `CostCenter`, and `ManagedBy`.
8. Create the cluster and record its ARN and settings.
9. Configure budget thresholds and cost-anomaly routing for Fargate, ALB, metrics/logs, data transfer, endpoints, ECR/Inspector, KMS, secrets, and security services.

**Expected evidence:** cluster ARN/settings, account-level observability setting, KMS and ECS Exec decisions, tags, budget owner, and cost estimate.

### Objective 5 — Register the hardened task definition (15 points)

#### In the simulation

1. Open **Task definition**.
2. Keep family `rcw-orders-web`.
3. Use **Fargate / awsvpc**, **Linux / X86_64**, and **0.5 vCPU / 1 GB**.
4. Keep the digest-pinned ECR image URI.
5. Select port `8080/TCP`.
6. Select **Non-root UID 10001**.
7. Select **Read only with explicit /tmp volume**.
8. Disable privileged mode.
9. Select `awslogs → /rcw/prod/ecs/orders`.
10. Select **90 days / customer managed KMS key** for this lab's log policy.
11. Reference `DB_TOKEN` from a Secrets Manager ARN.
12. Configure `GET /healthz every 30s`.
13. Confirm dropped capabilities, essential-container behavior, and no sensitive plain environment values.
14. Choose **Register revision 1**.

#### Comparable AWS console procedure

1. Pre-create **CloudWatch Logs → Log groups → Create log group** named `/rcw/prod/ecs/orders`.
2. Associate the approved KMS key, retention, access policy, subscription/alert path, and data-protection/redaction controls.
3. Open **Amazon ECS → Task definitions → Create new task definition**.
4. Choose **AWS Fargate**.
5. Enter family `rcw-orders-web`.
6. Select `awsvpc`, Linux/X86_64, task execution role, separate task role, `0.5 vCPU`, and `1 GB` memory.
7. Add container `orders-web` using the full ECR URI with `@sha256:<digest>`.
8. Mark it essential and expose container port `8080/TCP` only.
9. In advanced settings:
   - set user to the non-root UID built into the approved image;
   - enable read-only root filesystem;
   - keep privileged mode disabled;
   - drop unnecessary capabilities;
   - create only the required writable volume/mount such as `/tmp`;
   - add a container health check suitable for the image;
   - reference the secret ARN in **Secrets**, not a plain environment value;
   - configure `awslogs`, Region, log group, and stream prefix; and
   - set graceful stop behavior and explicit limits supported by the application.
10. Review the generated definition. Register revision 1.
11. Export the definition/evidence through your approved configuration-management process. Treat task revisions as immutable.

#### Important health-check note

The lab writes `GET /healthz` as a readable design choice. A real ECS container health check executes a command inside the container, such as an approved `CMD-SHELL` command using a tool actually present in the image. The ALB target group separately performs an HTTP health check. Validate both.

**Expected evidence:** task-definition ARN/revision/JSON, image digest, roles, resources, user, filesystem, privilege/capabilities, secret reference without value, health configuration, logging, and approval.

### Objective 6 — Create the network and load-balancer boundary (15 points)

#### In the simulation

1. Open **Network & load balancer**.
2. Select two public and two private subnets across two Availability Zones.
3. Put tasks in the two private application subnets.
4. Disable task public IP assignment.
5. Choose HTTPS `443` with an ACM certificate.
6. Permit ALB port `443` only from the approved client CIDR.
7. Permit task port `8080` only from the ALB security group.
8. Use target type **IP**, port `8080`, health path `/healthz`.
9. Select private endpoints with scoped policies.
10. Confirm ECR API/DKR, S3, CloudWatch Logs/Secrets Manager endpoints, and VPC Flow Logs.
11. Choose **Create network controls**.

#### Comparable AWS console procedure

1. In **VPC**, verify two public ALB subnets and two private application subnets in different Availability Zones.
2. Public routes may reach an internet gateway as approved. Private task routes must not point directly to an internet gateway.
3. Create `rcw-orders-alb-sg`:
   - inbound TCP `443` from the approved client CIDR or approved edge/security service;
   - no unnecessary listener ports;
   - reviewed outbound to the target path.
4. Create `rcw-orders-task-sg`:
   - inbound TCP `8080` with source `rcw-orders-alb-sg`;
   - no SSH and no direct internet CIDR;
   - scoped outbound to required destinations.
5. Create a VPC endpoint security group allowing TCP `443` from the task security group.
6. Create interface endpoints with private DNS for ECR API, ECR DKR, CloudWatch Logs, and Secrets Manager. Add KMS or other service endpoints when required by the tested workload path.
7. Create the S3 gateway endpoint and scope its endpoint policy/route-table association for the required image-layer path.
8. If endpoints are not used, design and approve NAT egress, firewall/proxy, DNS, route, logging, and cost controls. Do not assume private subnets automatically have service access.
9. Enable VPC Flow Logs with approved fields, encryption, destination, access, and retention.
10. In **EC2 → Target groups**, create an **IP** target group for port `8080` and `/healthz`, with approved timeout/interval/threshold/matcher and deregistration delay.
11. In **EC2 → Load balancers**, create an Application Load Balancer in both public subnets using the ALB security group.
12. Configure HTTPS `443` using the approved ACM certificate and security policy. Forward to the target group.
13. If HTTP `80` is required for redirect, approve and configure redirect only; do not forward plaintext application traffic.
14. Configure ALB access/connection logs if required, with a protected destination and retention.

**Endpoint caution:** Endpoint availability, names, FIPS/dual-stack support, private DNS, endpoint policies, pull-through-cache behavior, and costs vary. Test the exact Region and platform path.

**Expected evidence:** VPC/subnet/AZ/route records, security-group rules, endpoint IDs/policies/DNS, Flow Logs, ALB/listener/certificate/security policy, target group health settings, and connectivity tests.

### Objective 7 — Create the ECS service and autoscaling policy (10 points)

#### In the simulation

1. Open **ECS service**.
2. Keep service name `rcw-orders-service`.
3. Select `rcw-orders-web:1` and `FARGATE`.
4. Set desired tasks to `2`.
5. Select the latest platform version approved during the release.
6. Use **Rolling update (ECS)** with `100%` minimum healthy and `200%` maximum.
7. Enable the deployment circuit breaker and automatic rollback.
8. Enable Availability Zone rebalancing.
9. Set health-check grace to 60 seconds.
10. Enable ECS managed tags and service-tag propagation.
11. Keep ECS Exec disabled except through the controlled break-glass workflow.
12. Configure scaling: minimum 2, maximum 6, CPU target 60%, scale-out 60 seconds, scale-in 300 seconds.
13. Confirm load-test/quota review.
14. Choose **Create service and wait for steady state**.

#### Comparable AWS console procedure

1. Open **Amazon ECS → Clusters → rcw-prod-ecs → Services → Create**.
2. Choose Fargate capacity and task definition `rcw-orders-web:1`.
3. Enter `rcw-orders-service` and desired count `2`.
4. Select the approved platform version. `LATEST` resolves over time, so record the platform version actually running and reassess it at release.
5. Use the ECS rolling deployment controller.
6. Set minimum/maximum healthy percentages according to tested capacity; the lab uses 100/200.
7. Enable deployment failure detection/circuit breaker and automatic rollback. Review current configurable failure-count/threshold options in the console and set them from measured startup behavior—not guesswork.
8. Enable Availability Zone rebalancing.
9. Select both private subnets, the task security group, and **do not assign a public IP**.
10. Attach the existing ALB/listener/target group and container port `8080`.
11. Set a tested health-check grace period of 60 seconds.
12. Enable ECS managed tags and propagate service tags.
13. Keep ECS Exec disabled unless the approved audited break-glass design is active.
14. Create the service and wait for `2 desired / 2 running / 2 healthy` in separate AZs.
15. Open **Set the number of tasks / Service auto scaling**:
    - minimum `2`;
    - maximum `6`;
    - target-tracking policy;
    - `ECSServiceAverageCPUUtilization` target `60`;
    - scale-out cooldown `60` seconds;
    - scale-in cooldown `300` seconds.
16. Test using representative load and confirm downstream dependencies, quotas, scaling lag, cost, and scale-in safety.

**Expected evidence:** service configuration, deployment settings, actual platform version, subnet/security group/public-IP decision, target attachment, running/healthy count, AZ distribution, tags, scaling target/policy, quotas, and cost owner.

### Objective 8 — Prove operational readiness (10 points)

1. Open **Operations**.
2. Choose **Run release validation**.
3. Confirm that six tests pass:
   - approved image digest and findings;
   - TLS and denial of direct task ingress;
   - `/healthz` through the ALB;
   - two healthy tasks in separate AZs;
   - protected telemetry; and
   - scale out from two to four and controlled return to two.
4. Choose **Run rollback drill**.
5. The simulation deploys a deliberately unhealthy revision 2. The circuit breaker records an expected failure and automatically restores revision 1.
6. Confirm **7 / 7 passed**.

#### Comparable real validation

Run in a non-production or approved pilot environment with a written change and rollback plan:

- compare running task image digests with the approved release record;
- verify current scan/exception status and alert routing;
- verify the certificate chain, hostname, TLS policy, and HTTPS response;
- verify direct task addresses are not publicly reachable;
- verify ALB health and the container health check;
- confirm two running healthy tasks in separate AZs with no public IP;
- inspect stopped-task reasons and service events;
- validate application logs without secret/personal-data leakage;
- validate CloudTrail, Flow Logs, enhanced Container Insights, ALB telemetry, and EventBridge/SNS alerts;
- generate controlled CPU/request load and observe bounded scale-out/scale-in;
- deploy a safe test revision that cannot pass health checks and confirm circuit-breaker rollback; and
- verify the incident owner receives and closes the alert with evidence.

Never intentionally create a harmful image, leak a secret, overload production, or weaken controls to prove detection.

### Objective 9 — Review evidence and approve only the pilot (5 points)

1. Open **Compliance review**.
2. Select **Approve limited monitored pilot**.
3. Enter the residual-risk owner.
4. Choose a future review date.
5. Confirm all four statements covering protected evidence, incident/rollback testing, material-change review, and cleanup/retention ownership.
6. Choose **Approve pilot and complete lab**.
7. Record the final score of `100/100`.
8. Download the evidence JSON and PDF certificate.

The certificate is issued by **RCW IT Training** and signed by **Pradeep Raju**. It recognizes educational lab completion; it is not an AWS or compliance certification.

## Validation and expected results

| Validation | Expected result |
|---|---|
| Artifact | Running image equals approved digest; no unresolved critical or unapproved high finding |
| Identity | Build, execution, and task roles are separate; no static key; PassRole scoped |
| Runtime | Non-root, non-privileged, read-only root, explicit resources, approved writable path |
| Secret | Task definition contains ARN reference, not secret value |
| Network | Tasks in private subnets across two AZs; public IP disabled |
| Ingress | HTTPS succeeds at ALB; task port accepts only ALB SG; direct access fails |
| Health | Container health and ALB `/healthz` pass |
| Availability | 2 desired, 2 running, 2 healthy, balanced across AZs |
| Deployment | Rolling bounds preserve capacity; failed revision rolls back |
| Scaling | Service scales within min 2/max 6 and returns safely |
| Logging | Expected application, API, network, metric, deployment, and finding events arrive |
| Data safety | No credential, token, personal data, payment data, or unapproved payload in logs/evidence |
| Cost | Budget owner, thresholds, expected services, and anomaly route are tested |
| Governance | Pilot, residual-risk owner, future review, change trigger, cleanup owner recorded |

## Evidence collection

The browser lab exports a local JSON record containing:

- learner and completion timestamp;
- score and objective states;
- seven operational test results;
- simulated architecture decisions;
- event stream;
- high-level control alignment;
- certificate ID; and
- an explicit simulation/compliance disclaimer.

A real evidence package should additionally contain protected, independently verifiable records such as:

- approved requirements, data classification, threat model, risk register, architecture, and change ticket;
- account/Region/organization policy and federated identity evidence;
- ECR repository, KMS, lifecycle, scanning, policy, digest, findings, SBOM, provenance, signer/build, and exception evidence;
- IAM trust/permissions/PassRole/access-analysis records;
- secret/KMS metadata without secret values;
- cluster/account settings, task definition, service definition, actual Fargate platform, tags, and scaling configuration;
- VPC/subnet/route/security-group/endpoint/Flow Log records;
- ALB listener/certificate/TLS/target health and access-log configuration;
- CloudTrail, log, metric, alarm, EventBridge, Config, Security Hub, GuardDuty, and incident-ticket evidence;
- load, health, isolation, scaling, rollback, restore, quota, failover, and cost-test results;
- release approval, residual risk, expiry/review date, rollback owner, and cleanup evidence.

Protect evidence as potentially sensitive. Use access control, encryption, integrity, retention, legal-hold, deletion, and segregation rules. Screenshots alone rarely demonstrate sustained operating effectiveness.

## Cleanup

### Browser simulation

Choose **Reset lab**, confirm, and close the tab. This removes browser-session progress. Download evidence first if needed.

### Comparable real AWS environment

Use an approved change and retention decision. Record identifiers before deletion.

1. Stop incoming traffic and preserve required logs, deployment records, findings, approvals, and incident evidence.
2. Disable/delete service scaling policies and scalable targets.
3. Update desired count to zero if required by the change procedure, then delete the ECS service and wait for tasks/ENIs to stop.
4. Delete listeners/rules, Application Load Balancer, target group, and related DNS records after dependency checks.
5. Deregister obsolete task-definition revisions according to rollback and retention policy.
6. Delete ECR images/repository only after legal, investigation, release, and rollback retention is satisfied. Preview lifecycle effects.
7. Schedule deletion of lab secrets and KMS keys only through approved recovery windows and after dependency/evidence review.
8. Delete alarms, dashboards, EventBridge rules/targets, log groups, Flow Logs, and evidence buckets only according to retention policy.
9. Delete the ECS cluster after services/tasks are gone.
10. Delete VPC endpoints and their ENIs, endpoint policies, security groups, NAT resources if any, routes, subnets, addresses, and VPC in dependency order.
11. Remove IAM roles, inline/managed policies, PassRole grants, resource policies, and temporary access.
12. Verify no orphaned ENIs, IP addresses, target groups, snapshots, log subscriptions, secrets, KMS grants, images, data, or recurring charges remain.
13. Close the change record with deletion evidence and an independent cost/resource check.

Never delete shared networking, keys, trails, logs, roles, or security services just because they appear in a lab resource list.

## Troubleshooting

### Service tasks remain `PENDING` or stop during startup

Check, in order:

- **ECS service events** and the stopped task's stop code/reason;
- Fargate CPU/memory combination and platform/Region availability;
- subnet free IP addresses, routes, DNS, security groups, endpoint ENIs, and quotas;
- task execution-role trust and permissions;
- ECR API/DKR and S3 endpoint path or NAT egress;
- exact image URI/digest and architecture compatibility;
- CloudWatch Logs and Secrets Manager endpoint path;
- secret and KMS key/resource policies; and
- log-group existence/permissions if auto-creation is not approved.

### `CannotPullContainerError` or `ResourceInitializationError`

Common causes include:

- missing ECR authorization/pull actions on the execution role;
- invalid repository/digest or cross-account repository policy;
- ECR API/DKR endpoint or S3 gateway endpoint missing/misconfigured;
- private DNS disabled;
- endpoint SG does not allow task SG on TCP 443;
- no NAT path when the selected image path requires public egress; or
- KMS/secret/log access failure during initialization.

Do not solve the issue by assigning public IPs or attaching administrator access without a reviewed design.

### Target stays unhealthy

Check:

- target type is `IP` for `awsvpc` Fargate tasks;
- target port matches container port `8080`;
- task SG permits `8080` from the ALB SG;
- application listens on `0.0.0.0`, not only loopback;
- `/healthz` exists and returns the expected code without authentication/dependency deadlock;
- health timeout, interval, threshold, matcher, and grace period fit measured startup;
- image architecture and application process are correct; and
- network ACLs and routes do not block return traffic.

### HTTPS does not work

Verify DNS, ACM certificate Region/status/hostname, listener/certificate attachment, TLS security policy, ALB SG, target rule, and client trust. Never publish a private key in the task definition.

### Secret is not injected

Verify the secret ARN and Region, execution-role `secretsmanager:GetSecretValue`, KMS decrypt permission/key policy, interface endpoint/DNS path, resource policy, version/stage selection, and task redeployment after rotation. Referenced secrets are retrieved at task startup; rotation may require a new deployment.

### Logs or Container Insights are missing

Check `awslogs` options, log group/Region/stream prefix, execution-role log permissions, Logs endpoint/SG, KMS key policy, cluster/account Container Insights setting, running tasks, and time range. Enhanced Container Insights metrics are billable and only exist for observed running resources.

### Deployment does not roll back

Confirm the service uses the ECS rolling deployment controller, circuit breaker and rollback are enabled, a prior completed deployment exists, and container/target health checks detect the failure. Review current circuit-breaker counting/threshold options and EventBridge deployment events.

### Autoscaling does not activate

Confirm the service is registered as a scalable target, min/max are correct, policy metric/dimensions are correct, metrics exist, the service has running tasks, alarms are not manually modified, cooldowns have elapsed, quotas allow more tasks/ENIs, and downstream capacity can support scale-out.

## Production implementation considerations

### Prefer reviewed infrastructure as code

The GUI is excellent for learning, investigation, and understanding service relationships. Production configuration should normally be delivered through reviewed, versioned, scanned, tested infrastructure as code with separated approval and drift detection. Block direct unmanaged changes where appropriate.

### Software supply chain

- Pin base images and application images by digest.
- Patch by rebuilding and redeploying; do not patch a running container.
- Generate and retain SBOM/provenance evidence.
- Restrict build identities and isolate untrusted build steps.
- Scan source, dependencies, image, IaC, and secrets.
- Continuously rescan stored images as vulnerability intelligence changes.
- Define severity, exploitability, exception, expiry, and emergency patch criteria.
- Evaluate signing/attestation verification appropriate to your delivery platform.

### IAM and secret safety

- Use short-lived federation and roles for tasks.
- Separate duties across developer, build, deploy, approve, operations, security, and audit paths.
- Restrict PassRole, trust policies, resource policies, cross-account access, and KMS grants.
- Do not put secrets in images, source, Docker build arguments, task environment values, labels, tags, command history, or logs.
- Rotate/revoke and force a new task deployment when startup-injected secret values change.

### Network and data protection

- Put tasks in private subnets and disable public IP assignment.
- Use SG references, not broad CIDRs, for ALB-to-task access.
- Model DNS, egress, private endpoints, endpoint policies, dual-stack/FIPS, third-party APIs, and data-transfer paths.
- Add WAF/edge controls, authentication, authorization, rate limits, request validation, and DDoS protections according to exposure and threat model.
- Encrypt in transit end to end where required; TLS termination at the ALB may not satisfy every internal-encryption requirement.
- Protect ALB logs, app logs, flow logs, traces, backups, and data stores.

### Availability and recovery

- Two tasks in two AZs are a starting point, not proof of an availability objective.
- Test AZ impairment, dependency failure, quota exhaustion, task crash, bad configuration, secret/KMS failure, DNS failure, image pull failure, and rollback.
- Measure startup, graceful termination, connection draining, health behavior, scaling lag, and recovery time.
- Use idempotent tasks and external durable state; do not assume Fargate task storage survives replacement.
- Preserve a completed healthy deployment before relying on automatic rollback.

### Observability and incident response

- Use structured logs with correlation IDs and data minimization.
- Monitor desired/running/pending/stopped count, CPU, memory, restarts, network, target health, 4xx/5xx, latency, deployment state, throttling, secret/KMS denial, image findings, and configuration drift.
- Test EventBridge/SNS/on-call delivery and ticket ownership.
- Audit ECS Exec as privileged diagnostic access; do not treat it as routine administration.
- Keep rollback/redeploy, credential revocation, image quarantine, network containment, evidence preservation, and communication runbooks.

### Cost and sustainability

Include Fargate CPU/memory/time, public IPv4, ALB capacity, endpoints, NAT/data processing, cross-AZ and internet transfer, ECR storage/scanning, CloudWatch logs/metrics, KMS, Secrets Manager, Config, Security Hub, GuardDuty, CloudTrail, WAF, and support costs. Right-size from measurements, control log volume/retention, expire unused images, and set scaling ceilings without compromising availability.

## Control-alignment map

| Lifecycle outcome | Lab evidence examples | Illustrative alignment |
|---|---|---|
| Govern | Owner, classification, limited pilot, IaC obligation, risk owner, review date | NIST CSF 2.0 GV; ISO/IEC 27001 context, leadership, risk, policy, roles |
| Identify | ECR inventory/digest/SBOM, tags, architecture, dependencies, data boundary, findings | NIST CSF ID; asset/configuration/risk inventory |
| Protect | Federation/MFA, least roles, PassRole scope, KMS, secrets, private tasks, TLS, non-root/read-only | NIST CSF PR; access, cryptography, network, secure configuration controls |
| Detect | Continuous scanning, CloudTrail, logs, Flow Logs, enhanced metrics, alarms, Config, Security Hub, GuardDuty | NIST CSF DE; logging, monitoring, vulnerability and configuration detection |
| Respond | Event routing, incident owner, failed-deployment signal, break-glass controls, rollback decision | NIST CSF RS; incident management and communication |
| Recover | Healthy revision, automatic rollback, multi-AZ tasks, redeployment/cleanup runbooks, retained evidence | NIST CSF RC; restoration, verification, lessons/change review |

The AWS Security Hub ECS/ECR controls referenced by the lab include control intent for private service networking, non-privileged containers, read-only root filesystems, no plain secret environment values, task logging, current Fargate platforms, Container Insights, non-root Linux users, image scanning, tag immutability, lifecycle policies, and KMS encryption. Enablement of a control does not prove every requirement or operating period.

## Official references

Verify current console labels, Region availability, pricing, quotas, and behavior before implementation.

### Amazon ECS

1. [Getting started with the Amazon ECS console](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/getting-started.html)
2. [Amazon ECS task definitions](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_definitions.html)
3. [Fargate task definition parameters](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_definition_parameters.html)
4. [IAM roles for Amazon ECS](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/security-ecs-iam-role-overview.html)
5. [Best practices for IAM roles in Amazon ECS](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/security-iam-roles.html)
6. [Pass sensitive data to an Amazon ECS container](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/specifying-sensitive-data.html)
7. [Fargate security best practices](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/security-fargate.html)
8. [Fargate security considerations](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/fargate-security-considerations.html)
9. [Fargate task networking](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/fargate-task-networking.html)
10. [ECS interface VPC endpoints](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/vpc-endpoints.html)
11. [Create an Amazon ECS service using the console](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/create-service-console-v2.html)
12. [ECS deployment circuit breaker](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/deployment-circuit-breaker.html)
13. [Service Auto Scaling](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/service-auto-scaling.html)
14. [Create a target-tracking scaling policy](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/target-tracking-create-policy.html)
15. [Container Insights with enhanced observability for ECS](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/cloudwatch-container-insights.html)
16. [Using ECS Exec for debugging](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/ecs-exec.html)
17. [Amazon ECS best practices guide](https://docs.aws.amazon.com/AmazonECS/latest/bestpracticesguide/intro.html)

### ECR, networking, logging, and security posture

18. [Amazon ECR image scanning](https://docs.aws.amazon.com/AmazonECR/latest/userguide/image-scanning.html)
19. [Amazon ECR tag immutability](https://docs.aws.amazon.com/AmazonECR/latest/userguide/image-tag-mutability.html)
20. [Amazon ECR lifecycle policies](https://docs.aws.amazon.com/AmazonECR/latest/userguide/LifecyclePolicies.html)
21. [Amazon ECR encryption at rest](https://docs.aws.amazon.com/AmazonECR/latest/userguide/encryption-at-rest.html)
22. [Amazon ECR VPC endpoints](https://docs.aws.amazon.com/AmazonECR/latest/userguide/vpc-endpoints.html)
23. [Application Load Balancer HTTPS listeners](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/create-https-listener.html)
24. [CloudTrail logging for Amazon ECS](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/logging-using-cloudtrail.html)
25. [Security Hub CSPM controls for Amazon ECS](https://docs.aws.amazon.com/securityhub/latest/userguide/ecs-controls.html)
26. [Security Hub CSPM controls for Amazon ECR](https://docs.aws.amazon.com/securityhub/latest/userguide/ecr-controls.html)
27. [GuardDuty Runtime Monitoring for ECS Fargate](https://docs.aws.amazon.com/guardduty/latest/ug/runtime-monitoring-ecs.html)
28. [AWS Config managed rules for Amazon ECS](https://docs.aws.amazon.com/config/latest/developerguide/managed-rules-by-aws-config.html)
29. [AWS Well-Architected Framework](https://docs.aws.amazon.com/wellarchitected/latest/framework/welcome.html)

### Governance frameworks

30. [NIST Cybersecurity Framework 2.0](https://www.nist.gov/cyberframework)
31. [NIST SP 800-190 — Application Container Security Guide](https://csrc.nist.gov/pubs/sp/800/190/final)
32. [ISO/IEC 27001 information security management systems](https://www.iso.org/standard/27001)
33. [CIS AWS Foundations Benchmark](https://www.cisecurity.org/benchmark/amazon_web_services)

---

**RCW IT Training**<br>
Secure, observable, recoverable container operations through hands-on learning.
