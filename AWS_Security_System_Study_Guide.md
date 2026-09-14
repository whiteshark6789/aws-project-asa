# 📘 Cloud Security Incident Response System: Comprehensive Presentation & Study Guide

This study guide is structured specifically to help you present the project to an AWS cloud engineering & security expert (like your mom!). It covers **every layer of the implementation**—from cloud telemetry ingestion and GenAI threat analysis to infrastructure-as-code (IaC) playbooks and serverless AWS architecture.

---

## 1. Executive Summary (The 30-Second Elevator Pitch)

> *"We built **ASA (Automated Security Assistant)**—an AI-powered, real-time Cloud Security Incident Response & Auto-Remediation Platform for AWS.*
> 
> *When AWS security services like **GuardDuty**, **CloudTrail**, or **Security Hub** trigger alerts, our platform automatically ingests the telemetry, correlates related attack events within a 1-hour sliding window to prevent alert fatigue, and passes the context to an LLM (Gemini 3.6 Flash / AWS Bedrock).*
> 
> *The AI acts as a SOC analyst: it assesses root causes, computes IoCs (Indicators of Compromise), assigns risk scores, and generates **multi-format remediation playbooks** (AWS CLI, Terraform HCL, and AWS SDK Lambda functions). Finally, it enforces **Human-in-the-Loop (HITL) approval** so security teams can review and approve auto-remediation before execution."*

---

## 2. AWS Cloud Architecture: Prototype vs. Production

To impress an AWS veteran, explain how our working local prototype seamlessly maps onto production AWS serverless architecture defined in [template.yaml](file:///c:/VIT/AWS_Proj_Sid/infrastructure/template.yaml):

```
                        ┌────────────────────────────────────────────────────────┐
                        │              AWS TELEMETRY LOG SOURCES                 │
                        │  Amazon GuardDuty | AWS CloudTrail | AWS Security Hub  │
                        └───────────────────────────┬────────────────────────────┘
                                                    │
                                                    ▼
                        ┌────────────────────────────────────────────────────────┐
                        │             AWS EventBridge / API Gateway              │
                        └───────────────────────────┬────────────────────────────┘
                                                    │
                                                    ▼
                        ┌────────────────────────────────────────────────────────┐
                        │              AWS Lambda / Express Backend              │
                        │           - Log Ingestion & Schema Validation          │
                        │           - 1-Hour Sliding Window Correlation          │
                        └─────────────────────┬───────────────┬──────────────────┘
                                              │               │
                      ┌───────────────────────┘               └────────────────────────┐
                      ▼                                                                ▼
┌───────────────────────────────────────────┐                      ┌──────────────────────────────────────┐
│  GenAI Engine (Gemini / Amazon Bedrock)   │                      │    Amazon DynamoDB / SQLite Data     │
│  - Threat Root Cause & IoC Extraction     │                      │  - SecurityEvents Table              │
│  - Multi-Format Playbooks (CLI/TF/Lambda) │                      │  - SecurityIncidents Table           │
└───────────────────────────────────────────┘                      └──────────────────────────────────────┘
                                                                                       │
                                                                                       ▼
                                                                   ┌──────────────────────────────────────┐
                                                                   │       SOC React Web Dashboard        │
                                                                   │  - Visual Attack Node Graph          │
                                                                   │  - Risk Radar & Score Breakdown      │
                                                                   │  - Human-in-the-Loop Remediation     │
                                                                   │  - ASA Global Security AI Chatbot    │
                                                                   └──────────────────────────────────────┘
```

### Architectural Mapping Table

| Component | Local Prototype Implementation | AWS Production Architecture ([template.yaml](file:///c:/VIT/AWS_Proj_Sid/infrastructure/template.yaml)) |
| :--- | :--- | :--- |
| **API / Compute** | Node.js Express server running on port `3001` | **AWS Lambda** (`nodejs22.x`) fronted by **Amazon API Gateway** (`/{proxy+}`) |
| **Database** | SQLite via `better-sqlite3` ([db.adapter.ts](file:///c:/VIT/AWS_Proj_Sid/backend/src/adapters/db.adapter.ts)) | **Amazon DynamoDB** (`SecurityIncidents` & `SecurityEvents` tables, Pay-Per-Request) |
| **Telemetry Pipeline** | JSON ingestion via `/api/logs/upload` & simulator | **AWS EventBridge Rules** capturing CloudTrail/GuardDuty JSON events |
| **GenAI Engine** | Google Gemini 3.6 Flash (`@google/genai`) | **Amazon Bedrock** (Claude 3.5 Sonnet / Titan) or Gemini via AWS Lambda Environment variables |
| **IaC Orchestration** | Docker Compose (`docker-compose.yml`) | **AWS SAM (Serverless Application Model)** template transformation |

---

## 3. Deep Dive into Implementation Modules

### A. Telemetry Ingestion & Correlation Engine
* **Files**: [routes.ts](file:///c:/VIT/AWS_Proj_Sid/backend/src/api/routes.ts), [incident.service.ts](file:///c:/VIT/AWS_Proj_Sid/backend/src/services/incident.service.ts), [db.adapter.ts](file:///c:/VIT/AWS_Proj_Sid/backend/src/adapters/db.adapter.ts)
* **What it does**:
  1. Accepts security telemetry from GuardDuty, CloudTrail, or custom agents.
  2. Validates essential fields (`event_id`, `timestamp`, `event_type`, `actor`, `resource`, `ip`, `region`).
  3. **Alert Correlation Engine**: Scans all active `OPEN` incidents created in the last **60 minutes**. If an incident already exists involving the same IP address or resource ARN, it appends the new event to the existing incident rather than spawning duplicate alerts.

### B. GenAI Threat Analyst & Prompt Engineering
* **File**: [ai.service.ts](file:///c:/VIT/AWS_Proj_Sid/backend/src/services/ai.service.ts)
* **Model**: `gemini-3.6-flash` (configured with `responseMimeType: 'application/json'`).
* **Strict Schema Enforcement**: The prompt mandates strict JSON outputs containing:
  * `incident_title`, `summary`, `severity` (`CRITICAL` | `HIGH` | `MEDIUM` | `LOW`)
  * `affected_resources`, `evidence` array, `attack_indicators` (IoCs)
  * Detailed root-cause analysis, recommended ordered remediation steps, justification, confidence score (0.0 to 1.0), and `requires_human_approval` flag.
* **Dual AI Personas**:
  * *Incident-level Analyst*: Answers queries about a specific active incident context.
  * *Global ASA SOC Chatbot*: Analyzes overall organization security metrics, active threat counts, highest-risk alerts, and executive priorities.

### C. Auto-Remediation Playbook Exporter
* **File**: [playbook.service.ts](file:///c:/VIT/AWS_Proj_Sid/backend/src/services/playbook.service.ts)
* Generates remediation code across 3 distinct security attack domains:

```
                          ┌─────────────────────────────────────────┐
                          │     PLAYBOOK REMEDIATION DOMAINS        │
                          └────────────────────┬────────────────────┘
                                               │
         ┌─────────────────────────────────────┼─────────────────────────────────────┐
         ▼                                     ▼                                     ▼
┌────────────────────────┐           ┌────────────────────────┐           ┌────────────────────────┐
│  Identity Quarantine   │           │    S3 Data Shield      │           │   Network Containment  │
│ (IAM / Credential Theft│           │  (Storage Exfiltration)│           │ (EC2 / Port Probe)     │
└───────────┬────────────┘           └───────────┬────────────┘           └───────────┬────────────┘
            │                                    │                                    │
 ⚡ CLI: aws iam attach-user-          ⚡ CLI: aws s3api put-               ⚡ CLI: aws ec2 stop-instances
    policy AWSDenyAll                     public-access-block                   & revoke security group
 🛠️ TF:  aws_iam_access_key            🛠️ TF:  aws_s3_bucket_public           🛠️ TF:  quarantine sg egress
    status = "Inactive"                   _access_block                         to 127.0.0.1/32
 📜 JS:  @aws-sdk/client-iam           📜 JS:  @aws-sdk/client-s3           📜 JS:  @aws-sdk/client-ec2
```

1. **Identity Quarantine (IAM/Auth Attacks)**:
   * **AWS CLI**: Attaches explicit `AWSDenyAll` policy and sets access key to `Inactive`.
   * **Terraform HCL**: Generates `aws_iam_user_policy_attachment` & `aws_iam_access_key` containment.
   * **Lambda JS**: `@aws-sdk/client-iam` script executing `AttachUserPolicyCommand`.
2. **S3 Data Shield (Storage Misconfigurations & Data Leaks)**:
   * **AWS CLI**: Applies S3 Public Access Block (`BlockPublicAcls`, `BlockPublicPolicy`), AES256 server-side encryption, and access logging.
   * **Terraform HCL**: Configures `aws_s3_bucket_public_access_block` & `aws_s3_bucket_server_side_encryption_configuration`.
   * **Lambda JS**: `@aws-sdk/client-s3` script executing `PutPublicAccessBlockCommand`.
3. **Network Containment (EC2/Network Threats)**:
   * **AWS CLI**: Stops instance, revokes `0.0.0.0/0` security group ingress, creates EBS forensic snapshot (`aws ec2 create-snapshot`).
   * **Terraform HCL**: Isolates resource into a quarantine security group with egress strictly locked to loopback (`127.0.0.1/32`).
   * **Lambda JS**: `@aws-sdk/client-ec2` script executing `StopInstancesCommand`.

### D. CISO Executive Incident Report Exporter
* **File**: [playbook.service.ts](file:///c:/VIT/AWS_Proj_Sid/backend/src/services/playbook.service.ts)
* Dynamically compiles a Markdown CISO report containing:
  * Executive Summary & Impacted AWS Resources
  * IoCs & Evidence Breakdown
  * Containment Actions & Strategic Justification
  * Formal Sign-off Checkbox Matrix (AI Analysis, SOC Lead Authorization, Execution Verification).

---

## 4. Simulated AWS Attack Scenarios

Our simulator ([AttackSimulatorModal.tsx](file:///c:/VIT/AWS_Proj_Sid/frontend/src/components/AttackSimulatorModal.tsx) & [scenarios](file:///c:/VIT/AWS_Proj_Sid/simulation/scenarios)) covers 8 realistic AWS cloud attack vectors:

1. 🔍 **GuardDuty EC2 Port Probe** (`Recon:EC2/PortProbeUnprotectedPort`)
   * *Target*: EC2 Web Server (`i-0abcd1234efgh5678`)
   * *Vector*: External IP probing SSH Port 22.
2. 🔓 **S3 Public Access Misconfiguration** (`S3.1 Public Access Block Missing`)
   * *Target*: S3 Bucket `arn:aws:s3:::pharma-patient-records-prod`
   * *Vector*: Public ACL enabled exposing confidential data.
3. 🔑 **IAM Credential Theft & Exfiltration** (`GetPasswordData`)
   * *Target*: IAM User `dev-admin-user`
   * *Vector*: Access key leaked; unrecognised IP calling `GetPasswordData`.
4. 🪣 **S3 Bucket Sensitive Data Leak** (`S3.2 Public Policy Detected`)
   * *Target*: S3 Bucket `arn:aws:s3:::corporate-financial-reports`
   * *Vector*: Unauthenticated GET requests on private data objects.
5. 🛡️ **IAM Privilege Escalation Attack** (`AttachUserPolicy`)
   * *Target*: IAM Role `AppServer-Execution-Role`
   * *Vector*: Rogue insider attaching `AdministratorAccess` policy to standard service role.
6. 🚨 **Root Account Brute Force & Console Breach** (`MultipleFailedLoginsFollowedBySuccess`)
   * *Target*: AWS Root Account
   * *Vector*: 3 failed console login attempts followed by successful login from foreign IP (`91.108.4.77`).
7. 📤 **S3 Anomalous Bulk Data Exfiltration** (`DataExfiltration:S3/AnomalousGetBucket`)
   * *Target*: S3 Bucket `arn:aws:s3:::customer-pii-database-backup`
   * *Vector*: 50,000 S3 `GetObject` API calls executed within 5 minutes.
8. ⛏️ **EC2 Crypto-Mining Anomaly** (`CryptoCurrency:EC2/BitcoinDomainRequest`)
   * *Target*: EC2 Instance `i-0987654321fedcba0`
   * *Vector*: Instance attempting outbound DNS resolution to known mining pools.

---

## 5. Frontend & Security Operations Center (SOC) UX

* **Stack**: React, TypeScript, Vite, custom dark-mode glassmorphic styling ([App.css](file:///c:/VIT/AWS_Proj_Sid/frontend/src/App.css)).
* **Key Visual Features**:
  * **Header & Real-Time Stats Bar**: Live count of total incidents, active open threats, critical/high alerts, and executed mitigations.
  * **Risk Radar Index ([RiskRadarCard.tsx](file:///c:/VIT/AWS_Proj_Sid/frontend/src/components/RiskRadarCard.tsx))**: Dynamically calculates an organizational security score (0–100) based on severity weights, asset criticality, and unresolved alerts.
  * **Visual Attack Node Graph ([AttackGraph.tsx](file:///c:/VIT/AWS_Proj_Sid/frontend/src/components/AttackGraph.tsx))**: Interactive visual network mapping:
    $$\text{Threat Actor IP} \longrightarrow \text{Detection Engine (GuardDuty/CloudTrail)} \longrightarrow \text{Affected AWS Resource} \longrightarrow \text{Remediation Target}$$
  * **Human-in-the-Loop (HITL) Action Buttons**: Analysts review AI evidence and click **Approve Remediation** (triggers simulated remediation) or **Reject Remediation**.
  * **Interactive Modals**:
    * Playbook Code Exporter ([PlaybookExporterModal.tsx](file:///c:/VIT/AWS_Proj_Sid/frontend/src/components/PlaybookExporterModal.tsx)): Tabbed switching between CLI, Terraform, and Lambda.
    * CISO Executive Report ([ExecutiveReportModal.tsx](file:///c:/VIT/AWS_Proj_Sid/frontend/src/components/ExecutiveReportModal.tsx)): Rendered markdown view with download options.
    * Attack Simulator ([AttackSimulatorModal.tsx](file:///c:/VIT/AWS_Proj_Sid/frontend/src/components/AttackSimulatorModal.tsx)): One-click trigger for live attack scenarios.
  * **ASA Floating Global AI Assistant ([FloatingChatbot.tsx](file:///c:/VIT/AWS_Proj_Sid/frontend/src/components/FloatingChatbot.tsx))**: Embedded chat widget in the bottom-right corner for asking questions across the whole SOC dataset.

---

## 6. Questions Your Mom (AWS Expert) Might Ask & How to Answer

### Q1: *"How do you prevent auto-remediation from causing a production outage (blast radius)?"*
> **Answer**: *"We implement a **Human-in-the-Loop (HITL)** architecture. By default, high-impact remediations (like stopping an EC2 instance or revoking IAM keys) require approval from a SOC lead in the UI dashboard (`approval_status: PENDING`). Furthermore, the system generates **Terraform HCL previews** and **AWS CLI commands**, allowing engineers to inspect the exact IaC diff before applying it."*

### Q2: *"How does this scale across multi-account or multi-region AWS environments?"*
> **Answer**: *"The system ingests standardized JSON telemetry containing `region`, `account_id`, and full AWS Resource ARNs (`arn:aws:s3:::...`). In production, **AWS EventBridge Cross-Account Event Buses** collect logs from member accounts into a central security tooling account, where our API Gateway + Lambda backend processes them in parallel."*

### Q3: *"How do you ensure the LLM doesn't hallucinate non-existent IPs or resources?"*
> **Answer**: *"We strictly ground the GenAI prompt: `Base your analysis ONLY on the data provided. Do NOT invent resources, IPs, users, or timestamps.` We also enforce strict JSON schema parsing (`config: { responseMimeType: 'application/json' }`). If the JSON validation fails, the service falls back to safe deterministic logging."*

### Q4: *"How easy is it to deploy this from Docker to real AWS cloud infrastructure?"*
> **Answer**: *"Extremely straightforward! We authored an AWS SAM template ([template.yaml](file:///c:/VIT/AWS_Proj_Sid/infrastructure/template.yaml)). Running `sam deploy --guided` deploys the API Gateway, provisions the Lambda function, creates the DynamoDB `SecurityIncidents` table, and sets up appropriate IAM policies (`DynamoDBCrudPolicy`)."*

---

## Summary Checklist for your Presentation

- [x] **Show the Dashboard**: Point out the live metrics grid, Risk Radar score, and the visual Attack Graph.
- [x] **Trigger a Simulation**: Open the **Attack Simulator**, launch Scenario 6 (*Root Account Brute Force*) or Scenario 5 (*IAM Privilege Escalation*).
- [x] **Review AI Analysis**: Open the Incident detail view to show how Gemini parsed raw GuardDuty/CloudTrail logs into IoCs and root causes.
- [x] **Export a Playbook**: Open the **Playbook Exporter** to show the generated **AWS CLI**, **Terraform**, and **Lambda** code side-by-side.
- [x] **Approve Remediation**: Click **Approve Remediation** to show the Human-in-the-Loop status update.
- [x] **Interact with ASA Chatbot**: Use the floating chat widget to ask *"What is the most dangerous threat currently open?"* to demonstrate global security awareness.
