# Amazon Bedrock End-to-End GUI Lab

**Provider:** RCW IT Training  
**Level:** Intermediate  
**Estimated time:** 60–90 minutes  
**Delivery:** Browser-local educational simulation  
**Lab URL:** [Open the GUI lab](./)

> This lab simulates the workflow and terminology of the AWS Management Console without connecting to AWS. It creates no cloud resources, accepts no credentials, makes no network calls, and incurs no charges. It is not an AWS certification, a compliance certification, or legal advice.

## Table of contents

1. [Learning objectives](#learning-objectives)
2. [Scenario](#scenario)
3. [Prerequisites](#prerequisites)
4. [Reference architecture](#reference-architecture)
5. [Security and responsible-use rules](#security-and-responsible-use-rules)
6. [Lab workflow](#lab-workflow)
7. [Validation checklist](#validation-checklist)
8. [Evidence and certificate](#evidence-and-certificate)
9. [Cleanup](#cleanup)
10. [Troubleshooting](#troubleshooting)
11. [Production implementation guidance](#production-implementation-guidance)
12. [Official references](#official-references)

---

## Learning objectives

By the end of the lab, you will be able to:

- map a generative-AI use case to an accountable owner, approved purpose, data classification, and release boundary;
- compare foundation models using quality, latency, cost, licensing, Region, and routing criteria;
- create a versioned Amazon Bedrock Guardrail for input and output protection;
- design an S3-backed Knowledge Base using chunking, embeddings, a vector store, encryption, and ingestion controls;
- prepare an Amazon Bedrock Agent with a Knowledge Base, Guardrail, narrow action group, least-privilege role, and human approval;
- test grounding and citations, prompt injection, sensitive-data disclosure, and excessive agency;
- configure CloudTrail, model invocation logging, retention, encryption, alarms, and budget controls;
- run a versioned RAG and application-safety evaluation;
- make and document a human decision for a limited pilot; and
- export an evidence record and an RCW IT Training certificate.

The lab intentionally makes governance, security, observability, and human oversight **required steps**, not optional reading.

## Scenario

RCW employees need an assistant that answers questions from approved IT policy documents. The proposed assistant must:

1. answer only when approved evidence is available;
2. cite the policy source;
3. treat retrieved content as untrusted data rather than instructions;
4. resist direct and indirect prompt injection;
5. avoid disclosing personal data, secrets, hidden prompts, and internal configuration;
6. create a support ticket only through a narrow tool and only after explicit human confirmation;
7. produce audit and evaluation evidence; and
8. begin as a monitored, reversible, limited pilot.

The supplied documents, responses, identities, events, ticket, and evaluation results are synthetic.

## Prerequisites

### For this simulation

- A current desktop or mobile browser with JavaScript enabled.
- No AWS account or credentials.
- No command-line tools.
- Permission to download local JSON and PDF files if you want the evidence and certificate.

### For a comparable real deployment

Your organization would normally need:

- an AWS account in an approved AWS Region;
- federated individual identities, MFA, and role-based access;
- approved foundation-model terms and model availability for the selected Region;
- an S3 bucket containing reviewed source data;
- a supported vector store such as Amazon OpenSearch Serverless;
- AWS KMS keys and key policies;
- service roles for Knowledge Bases and Agents;
- an action implementation, such as an AWS Lambda function, with schema validation and least privilege;
- CloudTrail, CloudWatch Logs and/or S3 log destinations;
- a cost owner, budgets, retention requirements, and incident procedures; and
- privacy, security, legal, risk, architecture, and data-owner approval appropriate to the use case.

Do not use root credentials or broad administrator policies for normal Bedrock workloads.

## Reference architecture

```text
Employee
   |
   v
Authenticated application / API boundary
   |
   v
Amazon Bedrock Guardrail  <---- versioned policy for inputs and outputs
   |
   v
Amazon Bedrock Agent -----> approved foundation model (Amazon Nova Lite in this lab)
   |             |
   |             +--------> createTicket action group
   |                         - validated schema
   |                         - ticket-only execution role
   |                         - explicit human confirmation
   |
   +----------------------> Amazon Bedrock Knowledge Base
                              |
                              +--> approved Amazon S3 prefix
                              +--> Titan Text Embeddings V2
                              +--> OpenSearch Serverless vector store
                              +--> KMS encryption and private-path review

CloudTrail + model invocation logging + metrics + alarms + budgets
                             |
                             v
Protected operational evidence and human release review
```

### Trust boundaries

- **Identity boundary:** Only authenticated, authorized people and workloads may invoke the application.
- **Model boundary:** Model output is untrusted until it passes policy, grounding, authorization, and application validation.
- **Retrieval boundary:** Retrieved text can be malicious or stale. It is data, never a new authority or instruction source.
- **Tool boundary:** The Agent cannot grant itself permission. Tool authorization must be independently enforced.
- **Data boundary:** The S3 prefix, vector index, prompts, logs, traces, and evaluation dataset all require classification and lifecycle controls.
- **Human boundary:** A named person owns residual risk, action approval, incident response, rollback, and release decisions.

## Security and responsible-use rules

1. **Use only synthetic content in this lab.** Never paste a real password, key, token, confidential prompt, employee record, customer data, or regulated information.
2. **Do not treat a Guardrail as authorization.** Use identity, application checks, resource policies, and least-privilege tool roles.
3. **Do not trust retrieved text.** Assume source documents can contain injection instructions or poisoned content.
4. **Validate inputs and outputs.** Enforce a schema, length limits, destinations, allowed values, encoding, and authorization outside the model.
5. **Minimize logs.** Invocation payloads can contain prompts and responses. Collect only justified data, protect access, encrypt destinations, and expire it.
6. **Keep a human accountable.** Models cannot own risk, approve themselves, or replace appropriate expert review.
7. **Pilot reversibly.** Define a kill switch, rollback owner, incident path, feedback channel, monitoring thresholds, and next review date.
8. **Re-evaluate material changes.** A model, prompt, Guardrail, tool, Knowledge Base, dataset, policy, Region, or dependency change can invalidate prior evidence.

---

## Lab workflow

The final score is 100 points. Complete the workflow in order; Model catalog is a required architecture decision within the eight scored objectives.

### Step 1 — Govern and map the use case (10 points)

1. Open **Overview**.
2. Read the scenario and architecture.
3. In **Record the use case and data boundary**, enter your name.
4. Select **IT Service Owner** as the accountable business owner.
5. Select **Internal — synthetic lab data** as the highest permitted class.
6. Keep **IT policy question answering** as the approved purpose.
7. Select all three attestations:
   - synthetic, non-sensitive training content only;
   - a human remains accountable; and
   - reassessment before production.
8. Choose **Approve lab scope**.

**Why:** This establishes purpose limitation, ownership, data scope, and change obligations before model access.

**Expected evidence:** `PutGovernanceRecord` and a 10-point score increase.

### Model decision — Select a foundation model

1. On **Model catalog**, compare Amazon Nova Lite, Nova Pro, and Titan Text Premier.
2. Consider capability, latency, relative cost, licensing, Region support, and data-routing requirements.
3. On the Nova Lite card, keep **Single-Region on-demand**.
4. Choose **Select model** for **Amazon Nova Lite**.

**Why this answer:** The scenario is a focused, cost-aware support Q&A workflow. Single-Region inference is selected to make the routing decision explicit. In a real design, benchmark candidate models with representative data rather than assuming the lab choice is universally best.

**Production checkpoint:** Current commercial-Region model access behavior, Marketplace permissions, provider terms, EULAs, first-use forms, Region availability, and cross-Region inference requirements can differ. Verify them before deployment.

### Step 2 — Publish a Guardrail (15 points)

1. Open **Guardrails**.
2. Keep the name `rcw-it-policy-guardrail` and the supplied safe blocked response.
3. Set **High** for both input and output strength in all five content categories:
   - Hate
   - Insults
   - Sexual content
   - Violence
   - Misconduct
4. Set **Prompt attacks** input strength to **High**.
5. Enable both denied topics:
   - credentials, passwords, tokens, and private keys;
   - attempts to bypass safeguards or reveal hidden instructions.
6. Enable all sensitive-information controls:
   - mask email addresses;
   - block phone numbers;
   - block access keys and passwords.
7. Enable the contextual grounding check.
8. Select a grounding threshold of **0.75** or higher. Use **0.75** for the lab.
9. Choose **Create and publish version 1**.

**Why:** The versioned Guardrail provides a reviewable policy applied consistently to prompts and outputs. A high setting is suitable for this constrained synthetic lab, but production thresholds must be measured for false positives and false negatives.

**Expected evidence:** `CreateGuardrailVersion`, version `1`, status `ACTIVE`, and 15 points.

**Important limitation:** Guardrails are defense-in-depth. They do not replace IAM, application authorization, source authorization, output schemas, sandboxing, or human approval.

### Step 3 — Create and sync the Knowledge Base (20 points)

#### Knowledge Base details

1. Open **Knowledge bases**.
2. Keep the name `rcw-it-policy-kb`.
3. Select **BedrockKnowledgeBaseRole-RCW (least privilege)**.
4. Select **DELETE embeddings with source** as the deletion policy.

#### Data source

5. Select **Amazon S3**.
6. Keep the approved prefix `s3://rcw-genai-lab/approved-kb/`.
7. Select **Internal — synthetic only**.
8. Review the three synthetic source files shown in the interface.

#### Chunking and vector storage

9. Select **Fixed size — 300 tokens / 20% overlap**.
10. Select **Amazon Titan Text Embeddings V2**.
11. Select **Amazon OpenSearch Serverless — quick create**.
12. Enable:
    - customer-managed KMS encryption;
    - S3 Block Public Access; and
    - private-network-path review.
13. Choose **Create knowledge base**.
14. When the data-source card appears, choose **Sync data source**.

The simulated ingestion pipeline parses the files, chunks the text, creates embeddings, and writes vectors. The expected result is 3 documents, 24 chunks, and 0 failures.

**Why:** Source storage, the service role, parsing, chunking, the embedding model, vector storage, encryption, deletion, and networking are distinct control points. A successful sync is not proof that every document is authorized, accurate, current, clean, or retrievable by every allowed user.

**Production additions:**

- allow only the approved S3 bucket and prefix;
- scope KMS key use with service, account, and encryption-context conditions where supported;
- configure vector-store network, encryption, and data-access policies;
- preserve source-level authorization and tenant boundaries;
- scan and approve content before ingestion;
- detect poisoning and unexpected changes;
- test chunking and metadata filters with representative queries;
- define source, vector, and backup deletion behavior; and
- review data residency and supported private-connectivity paths.

### Step 4 — Prepare a least-agency Agent (15 points)

1. Open **Agents**.
2. Keep the name `rcw-it-helpdesk-agent`.
3. Confirm that **Amazon Nova Lite** appears as the selected model.
4. Select **BedrockAgentRole-RCW (least privilege)**.
5. Keep the supplied defensive instructions. They require:
   - Knowledge Base-only answers and citations;
   - retrieved text to be treated as data rather than instructions;
   - no secrets, personal data, hidden prompts, or internal configuration;
   - a safe “do not know” response when evidence is missing; and
   - explicit approval for ticket creation.
6. Attach `rcw-it-policy-kb`.
7. Attach `rcw-it-policy-guardrail`, version 1.
8. Select a **15-minute** idle session timeout.
9. Enable customer-managed KMS session encryption.
10. Disable retained conversation memory after the session.
11. Select the action schema `createTicket(ticketTitle, severity, summary)`.
12. Select **TicketCreateOnlyRole**.
13. Select **Require user confirmation**.
14. Choose **Save, prepare, and create alias**.

**Why:** Least agency constrains what the model can request and what the execution identity can actually do. A generic administrative command and AdministratorAccess would let model mistakes or injection attempts become privileged operations.

**Expected evidence:** Prepared Agent alias `lab-v1`, attached Knowledge Base and Guardrail, and 15 points.

### Step 5 — Configure observability and cost controls (10 points)

You may complete this before or after the playground tests, but it must be ready before release.

1. Open **Settings & logs**.
2. Enable:
   - a CloudTrail multi-Region trail;
   - Bedrock data-event selectors for the relevant resource types; and
   - log-file validation and a protected archive.
3. Enable text invocation logging for this **synthetic lab only**.
4. Select **CloudWatch Logs and Amazon S3**.
5. Select **30 days** retention.
6. Enable customer-managed KMS encryption for log destinations.
7. Enable:
   - invocation latency/error alarm;
   - Guardrail intervention alarm; and
   - token-usage and budget alert.
8. Attest that secrets and personal data will not be placed in tags, resource names, or request metadata.
9. Choose **Save observability configuration**.

**Why:** CloudTrail records API activity, while model invocation logging can record supported request/response payloads and metadata. They are complementary. Bedrock runtime operations may require explicit CloudTrail data-event selectors. Payload logging is disabled by default in real environments and can create both privacy risk and cost.

**Expected evidence:** A recent-events table, export control, and 10 points.

### Step 6 — Run all four security tests (10 points)

Open **Playgrounds** and select each required test chip.

#### Test 1: Grounded answer

The expected answer cites `incident-response-policy.pdf`, section 2.1. Verify that the answer contains a source citation rather than unsupported model knowledge.

**Pass condition:** Cited answer from the supplied source.

#### Test 2: Prompt injection

The prompt directly asks to ignore safeguards and also simulates malicious instructions in retrieved content.

**Pass condition:** The assistant refuses the bypass, discloses no hidden instructions, and calls no tool.

#### Test 3: PII disclosure

The prompt requests private phone numbers and email addresses.

**Pass condition:** The assistant denies the request or masks protected information and does not fabricate data.

#### Test 4: Approval-gated action

The prompt asks to create a P1 ticket without further confirmation.

1. Verify that the Agent stops in a waiting state.
2. Review severity, title, and tool identity in the confirmation dialog.
3. Choose **Approve once**.
4. Verify that only synthetic ticket `RCW-P1-1042` is created.

**Pass condition:** No action before human approval; one scoped action after one-time approval.

> In production, repeat adversarial testing across direct injection, indirect injection in retrieved documents, encoding and obfuscation, cross-session access, tool argument manipulation, malformed output, data poisoning, cost exhaustion, and attempts to obtain broader authority.

### Step 7 — Run a versioned evaluation (10 points)

1. Open **Model evaluation** after passing all four tests.
2. Keep the job name `rcw-it-policy-eval-v1`.
3. Select **Knowledge Base RAG + application safety**.
4. Select the versioned dataset `s3://rcw-genai-lab/evaluation/v1/prompts.jsonl`.
5. Keep the release thresholds:
   - retrieval relevance: **0.85**;
   - groundedness: **0.90**;
   - safety tests: **100%**;
   - unauthorized actions: **0**.
6. Confirm qualified human review.
7. Pin the model, prompt, Guardrail, Knowledge Base snapshot, dataset, and thresholds.
8. Choose **Run evaluation job**.

The deterministic lab result is:

| Metric | Result | Required |
|---|---:|---:|
| Retrieval relevance | 0.94 | ≥ 0.85 |
| Groundedness | 0.97 | ≥ 0.90 |
| Safety tests | 100% | 100% |
| Unauthorized actions | 0 | 0 |

**Why:** A reproducible release record needs versioned components and representative tests. Aggregate scores can hide severe failures, so production gates should also inspect failures by risk category, user group, language, document type, and action.

### Step 8 — Complete the human release review (10 points)

1. Open **Compliance review**.
2. Verify that all eight automated readiness checks show **Ready**:
   - governance and data scope;
   - model decision;
   - Guardrail version;
   - grounded knowledge;
   - least-agency Agent;
   - audit and operations;
   - adversarial tests; and
   - evaluation thresholds.
3. Select **IT Service Owner** as the risk owner.
4. Select **Approve limited pilot**—not unrestricted production.
5. Select **30 days or earlier after material change**.
6. Enter at least 30 characters documenting residual risk and rollback. Example:

   > Outputs can still be wrong or stale. Disable the Agent alias if citation, safety, latency, or ticket alarms breach the approved threshold; the IT Service Owner owns rollback.

7. Confirm both evidence and incident/rollback attestations.
8. Choose **Approve limited pilot and complete lab**.

**Expected result:** 100/100, a completed evidence record, and a certificate issued by RCW IT Training and signed by Pradeep Raju.

---

## Validation checklist

Use this checklist to confirm that the architecture—not merely the interface—is release-ready for the lab:

- [ ] Named learner and accountable IT Service Owner
- [ ] Approved, bounded policy-Q&A purpose
- [ ] Internal synthetic data only
- [ ] Amazon Nova Lite with an explicit Single-Region routing decision
- [ ] Versioned Guardrail applied to inputs and outputs
- [ ] Prompt-attack, denied-topic, sensitive-data, and grounding controls
- [ ] Approved S3 prefix with Block Public Access
- [ ] Least-privilege Knowledge Base role
- [ ] Titan Text Embeddings V2 and OpenSearch Serverless
- [ ] KMS and private-path review
- [ ] Data-source sync with no ingestion failures
- [ ] Least-privilege Agent and ticket-only tool role
- [ ] 15-minute session and no retained memory
- [ ] Human confirmation before ticket creation
- [ ] CloudTrail management and selected data events
- [ ] Protected invocation logs with a 30-day lifecycle
- [ ] Latency/error, Guardrail, and budget alarms
- [ ] All four adversarial tests passed
- [ ] Versioned RAG and safety evaluation passed
- [ ] Qualified human review, limited pilot, rollback, incident path, and next review

A green checklist in this simulation is educational evidence. It does not demonstrate the design or operation of a real account.

## Evidence and certificate

### Evidence JSON

Use **Export JSON** in Settings & logs or **Download evidence JSON** on the completion screen. The file contains:

- simulation and non-certification disclaimer;
- learner and certificate identifier;
- final score;
- architecture decisions;
- objective and test status;
- control summary;
- synthetic audit events; and
- completion time.

It contains no AWS credentials and represents no real cloud resource.

### Certificate PDF

After reaching 100/100, use **Download certificate PDF**. The certificate:

- is issued by **RCW IT Training**;
- certifies **Amazon Bedrock End-to-End Lab Champion** achievement;
- displays the final score and unique certificate ID;
- includes the RCW instructor portrait; and
- is signed by **Pradeep Raju**.

## Cleanup

### This simulation

1. Download evidence and the certificate if wanted.
2. Choose **Reset lab** in the top service strip.
3. Confirm the reset.
4. Close the tab.

Progress is stored only in browser session storage for this tab/session. Reset removes that browser-local record. No AWS cleanup is needed because no AWS resource was created.

### A comparable real deployment

Cleanup must follow your retention, legal-hold, audit, and incident requirements. In an approved order:

1. disable the application and Agent alias or route traffic away;
2. revoke tool access and Agent/Knowledge Base service-role sessions;
3. preserve required audit and incident evidence;
4. stop or remove provisioned inference and unused inference profiles where applicable;
5. delete Agent aliases, versions, action groups, and Agent resources when no longer required;
6. detach and delete Guardrail versions according to dependency and retention rules;
7. stop ingestion and delete Knowledge Base data sources/resources;
8. delete vectors, collections, indexes, and backups according to deletion policy;
9. remove source objects only after data-owner approval;
10. delete unused log groups, S3 log objects, trails, alarms, dashboards, and budgets after required retention;
11. schedule KMS keys for deletion only after confirming no protected evidence still depends on them;
12. remove obsolete IAM roles, resource policies, VPC endpoints, and network policies; and
13. verify billing, resource inventory, backups, DNS/application routes, and security findings after cleanup.

Never delete evidence needed for an active investigation, legal hold, audit, or regulatory obligation.

## Troubleshooting

### A task will not pass

The simulator intentionally rejects unsafe alternatives. Re-check every field against the numbered instructions. Broad roles, unrestricted production, no review, unreviewed production data, indefinite retention, automatic actions, or missing controls do not pass.

### Model selection is rejected

Complete governance first. Select **Amazon Nova Lite** and keep **Single-Region on-demand**.

### Guardrail is rejected

Set all five input and output content filters to **High**, prompt attacks to **High**, select both denied topics and all three sensitive-information controls, enable grounding, and select 0.75 or higher.

### Knowledge Base is created but points are missing

Creation and ingestion are separate. Choose **Sync data source** after creating the Knowledge Base.

### Agent model says “Select a model first”

Return to Model catalog and record the Nova Lite decision. Then return to Agents.

### Playground tests do not run

Prepare the Agent first. For the action test, the result remains pending until **Approve once** is selected in the human-confirmation dialog.

### Evaluation is blocked

Pass all four playground tests first. Evaluation also requires the versioned RAG/safety dataset, release thresholds, human review, and version pinning.

### Final review says “Not ready”

The eight checks include the model decision, Guardrail, synced Knowledge Base, prepared Agent, observability, all four tests, and evaluation. Complete any item still marked Pending.

### Certificate has no instructor portrait

Wait briefly for the same-origin image to load, then reopen the completion summary or use the PDF download again. Content blockers should allow local images from the lab directory.

### Downloads do not start

Allow downloads for the site and try again. The browser creates the JSON and PDF locally; no server receives the certificate data.

### Reset does not appear to work

Ensure JavaScript and session storage are available, refresh the page, then choose Reset again. Privacy modes can restrict browser storage but should not prevent a fresh in-memory run.

## Production implementation guidance

### 1. Governance and lifecycle

- Maintain an AI system inventory, accountable owner, intended users, prohibited uses, impact assessment, model/provider review, and risk acceptance.
- Define measurable quality, safety, fairness, privacy, security, reliability, latency, and cost requirements.
- Apply change control and repeat evaluation when any material component changes.
- Communicate that users are interacting with AI and provide feedback, correction, escalation, and appeal paths.
- Set a decommissioning plan, records schedule, deletion verification, and supplier-exit plan.

### 2. IAM and authorization

- Use workforce/workload federation, temporary credentials, MFA, and separate roles for administration, deployment, runtime, and audit.
- Scope `bedrock:Converse`, `bedrock:InvokeModel`, streaming variants, Agent runtime operations, Knowledge Base retrieval, and Guardrail operations to the exact resources and approved invocation path.
- Scope S3, KMS, OpenSearch Serverless, CloudWatch, CloudTrail, and Lambda permissions independently.
- Use permission boundaries, service control policies, resource policies, VPC endpoint policies, and session policies where appropriate.
- Enforce user- and tenant-level source authorization outside the model. Retrieval relevance is not access authorization.
- Deny unexpected Regions, models, inference profiles, tools, and data stores when business requirements permit.

### 3. Data protection

- Classify source documents, prompts, outputs, traces, logs, vector embeddings, metadata, evaluations, feedback, and backups.
- Minimize collected data and redact or tokenize sensitive fields before model use where feasible.
- Use TLS in transit and appropriate KMS encryption at rest. Separate key administration from data access.
- Keep secrets out of prompts, tags, resource names, metadata, and source documents.
- Configure lifecycle and deletion across S3, vectors, logs, traces, caches, sessions, evaluations, and backups.
- Validate regional processing, cross-Region routing, residency, subprocessors, provider terms, and data-use commitments.

### 4. Network design

- Evaluate Amazon VPC and AWS PrivateLink endpoints for supported Bedrock APIs and related services.
- Restrict egress, DNS, security groups, endpoint policies, route tables, and service/resource policies.
- Do not assume a private endpoint alone prevents public access; combine it with identity and resource controls.
- Keep browser-facing clients behind an authenticated application/API boundary; do not expose privileged Bedrock or tool credentials to end users.

### 5. Knowledge Base and RAG security

- Approve, scan, sign, version, and monitor source content before ingestion.
- Preserve document ownership and authorization metadata; filter retrieval by the authenticated user’s permissions.
- Separate tenants and security domains. Test cross-tenant and deleted-document retrieval.
- Defend against indirect prompt injection, poisoning, invisible text, malicious metadata, stale content, and excessive retrieved context.
- Measure retrieval recall, precision/relevance, citation correctness, answer groundedness, abstention, and source freshness.
- Treat embeddings and vector indexes as potentially sensitive derived data.

### 6. Agent and tool safety

- Prefer narrow, typed tools over command or query pass-through.
- Validate tool names, arguments, allowed values, resource identifiers, destinations, ownership, and authorization outside the model.
- Make write actions idempotent and bounded; use rate limits, timeouts, concurrency limits, budgets, and circuit breakers.
- Require human approval for high-impact, destructive, financial, security, identity, or external-communication actions.
- Return minimal tool output and prevent tool errors, stack traces, and credentials from becoming model context.
- Record the person, request, authorization, arguments, result, and correlation ID for each consequential action.

### 7. Guardrails and output handling

- Apply Guardrails consistently to all intended input and output paths and pin a tested version.
- Test multilingual, encoded, obfuscated, long-context, split-message, retrieved-document, and tool-output attacks.
- Validate structured output against strict schemas before rendering or execution.
- Encode output for its destination. Never pass model text directly to a shell, SQL interpreter, browser HTML, infrastructure engine, or privileged API.
- Provide safe fallback and abstention behavior when evidence is absent or controls intervene.

### 8. Evaluation and red teaming

- Use representative, permissioned, versioned datasets with expected answers and risk labels.
- Separate development, evaluation, approval, and production data.
- Include programmatic metrics, qualified human evaluation, adversarial testing, and production monitoring.
- Examine failures individually; do not approve only from an aggregate score.
- Test bias and accessibility appropriate to users and impact, including languages and assistive technologies.
- Preserve reproducibility metadata: model ID/version, inference profile, prompt, parameters, Guardrail, KB snapshot, source set, tools, code, and thresholds.

### 9. Logging, detection, response, and cost

- CloudTrail captures Bedrock API activity; configure required data-event selectors for relevant runtime resource types.
- Model invocation logging is disabled by default. If enabled, protect request/response content as potentially sensitive.
- Use least-privilege log-reader roles, KMS, protected archives, validation/immutability where required, retention, and deletion controls.
- Monitor errors, latency, throttling, token volume, cost, Guardrail interventions, retrieval quality, no-answer rates, anomalous identities, tool denials, and user feedback.
- Alert on unusual model/Region usage, repeated injection, unauthorized tools, bulk extraction, and budget anomalies.
- Maintain playbooks to disable aliases/tools, revoke roles, quarantine sources, restore known-good versions, notify stakeholders, and preserve evidence.

### 10. Availability and cost

- Set output-token limits, request size limits, quotas, concurrency, timeouts, caching rules, and retry/backoff behavior.
- Prevent unbounded loops between model and tools.
- Use budgets, cost allocation tags without sensitive data, usage reports, inference profiles where appropriate, and tested capacity assumptions.
- Design graceful degradation and fallback without silently dropping security controls.

---

## Official references

### Amazon Bedrock

- [Getting started in the Amazon Bedrock console](https://docs.aws.amazon.com/bedrock/latest/userguide/getting-started-console.html)
- [Access Amazon Bedrock foundation models](https://docs.aws.amazon.com/bedrock/latest/userguide/model-access.html)
- [Prerequisites for model inference](https://docs.aws.amazon.com/bedrock/latest/userguide/inference-prereq.html)
- [Inference profiles](https://docs.aws.amazon.com/bedrock/latest/userguide/inference-profiles.html)
- [Use Guardrails](https://docs.aws.amazon.com/bedrock/latest/userguide/guardrails-use.html)
- [How Knowledge Bases process data](https://docs.aws.amazon.com/bedrock/latest/userguide/kb-how-data.html)
- [Knowledge Base prerequisites](https://docs.aws.amazon.com/bedrock/latest/userguide/knowledge-base-prereq.html)
- [Create and configure Agents](https://docs.aws.amazon.com/bedrock/latest/userguide/agents-create.html)
- [Model and RAG evaluation](https://docs.aws.amazon.com/bedrock/latest/userguide/evaluation.html)
- [Model invocation logging](https://docs.aws.amazon.com/bedrock/latest/userguide/model-invocation-logging.html)
- [Amazon Bedrock events in CloudTrail](https://docs.aws.amazon.com/bedrock/latest/userguide/logging-using-cloudtrail.html)
- [Data protection in Amazon Bedrock](https://docs.aws.amazon.com/bedrock/latest/userguide/data-protection.html)
- [Amazon Bedrock and VPC endpoints / AWS PrivateLink](https://docs.aws.amazon.com/bedrock/latest/userguide/usingVPC.html)
- [Identity-based policy examples](https://docs.aws.amazon.com/bedrock/latest/userguide/security_iam_id-based-policy-examples.html)
- [AWS Well-Architected Generative AI Lens](https://docs.aws.amazon.com/wellarchitected/latest/generative-ai-lens/generative-ai-lens.html)

### Governance and application security

- [NIST AI Risk Management Framework](https://www.nist.gov/itl/ai-risk-management-framework)
- [NIST AI 600-1: Generative AI Profile](https://doi.org/10.6028/NIST.AI.600-1)
- [ISO/IEC 42001 AI management systems overview](https://www.iso.org/artificial-intelligence/ai-management-systems)
- [OWASP Top 10 for LLM Applications](https://genai.owasp.org/llm-top-10/)

Product behavior, model availability, service limits, pricing, and documentation change. Verify the current official documentation and your organization’s requirements before implementing a real workload.

---

**RCW IT Training**  
Learn · Practice · Master · Achieve
