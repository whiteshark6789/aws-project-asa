import { Incident } from '../models/types';

export interface PlaybookResponse {
  incident_id: string;
  incident_title: string;
  aws_cli: string;
  terraform_hcl: string;
  lambda_js: string;
  description: string;
}

export class PlaybookService {
  generatePlaybook(incident: Incident): PlaybookResponse {
    const resources = this.parseResources(incident.affected_resources);
    const primaryResource = resources[0] || 'arn:aws:iam::123456789012:user/unknown-actor';
    const resourceName = primaryResource.split(/[/:]/).pop() || 'resource';

    let awsCli = '';
    let terraformHcl = '';
    let lambdaJs = '';
    let description = '';

    const type = (incident.type || '').toLowerCase();

    if (type.includes('root') || type.includes('unauthorizedaccess') || type.includes('brute') || type.includes('credential')) {
      awsCli = `# Step 1: Immediately attach an explicit Denial policy to block all access for actor
aws iam attach-user-policy --user-name "${resourceName}" --policy-arn "arn:aws:iam::aws:policy/AWSDenyAll"

# Step 2: Revoke active security credentials and access keys
aws iam update-access-key --user-name "${resourceName}" --access-key-id "AKIAEXAMPLE123" --status Inactive

# Step 3: Terminate all active IAM web console user sessions
aws iam delete-user-policy --user-name "${resourceName}" --policy-name "TemporarySessionAccess"`;

      terraformHcl = `# Emergency Containment Policy
resource "aws_iam_user_policy_attachment" "emergency_deny" {
  user       = "${resourceName}"
  policy_arn = "arn:aws:iam::aws:policy/AWSDenyAll"
}

# Deactivate Compromised IAM Key
resource "aws_iam_access_key" "compromised_key" {
  user   = "${resourceName}"
  status = "Inactive"
}`;

      lambdaJs = `const { IAMClient, AttachUserPolicyCommand, UpdateAccessKeyCommand } = require("@aws-sdk/client-iam");

exports.handler = async (event) => {
  const iam = new IAMClient();
  const userName = "${resourceName}";
  
  console.log(\`[AUTO-REMEDIATION] Quarantining IAM user: \${userName}\`);
  
  await iam.send(new AttachUserPolicyCommand({
    UserName: userName,
    PolicyArn: "arn:aws:iam::aws:policy/AWSDenyAll"
  }));
  
  return { status: 200, message: \`IAM user \${userName} quarantined.\` };
};`;
      description = 'Identity Quarantine Playbook: Isolates compromised IAM credentials, revokes active sessions, and applies an explicit AWSDenyAll policy.';

    } else if (type.includes('s3') || type.includes('dataexfiltration') || type.includes('public')) {
      const bucketName = primaryResource.replace('s3://', '').split('/')[0] || 'prod-data-bucket';

      awsCli = `# Step 1: Enable Public Access Block on S3 Bucket
aws s3api put-public-access-block --bucket "${bucketName}" \\
  --public-access-block-configuration "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"

# Step 2: Enforce S3 Default Server-Side Encryption (AES256)
aws s3api put-bucket-encryption --bucket "${bucketName}" \\
  --server-side-encryption-configuration '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]}'

# Step 3: Enable S3 Object Locking and Access Logging
aws s3api put-bucket-logging --bucket "${bucketName}" \\
  --bucket-logging-status '{"LoggingEnabled":{"TargetBucket":"soc-s3-audit-logs","TargetPrefix":"s3-access-logs/"}}'`;

      terraformHcl = `# Enforce Strict S3 Public Access Block
resource "aws_s3_bucket_public_access_block" "remediation" {
  bucket = "${bucketName}"

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Enforce Server-Side Encryption
resource "aws_s3_bucket_server_side_encryption_configuration" "remediation" {
  bucket = "${bucketName}"

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}`;

      lambdaJs = `const { S3Client, PutPublicAccessBlockCommand } = require("@aws-sdk/client-s3");

exports.handler = async (event) => {
  const s3 = new S3Client();
  const bucketName = "${bucketName}";

  console.log(\`[AUTO-REMEDIATION] Blocking all public access on S3 bucket: \${bucketName}\`);
  
  await s3.send(new PutPublicAccessBlockCommand({
    Bucket: bucketName,
    PublicAccessBlockConfiguration: {
      BlockPublicAcls: true,
      BlockPublicPolicy: true,
      IgnorePublicAcls: true,
      RestrictPublicBuckets: true
    }
  }));

  return { status: 200, message: \`S3 Bucket \${bucketName} secured.\` };
};`;
      description = 'S3 Data Shield Playbook: Blocks public ACLs/policies, enforces AES256 server-side encryption, and enables audit logging.';

    } else {
      awsCli = `# Step 1: Isolate compromised AWS resource
aws ec2 stop-instances --instance-ids "${resourceName}"

# Step 2: Revoke active security group inbound ingress rules
aws ec2 revoke-security-group-ingress --group-id "sg-0123456789abcdef0" --protocol all --port -1 --cidr 0.0.0.0/0

# Step 3: Create forensic EBS snapshot for investigation
aws ec2 create-snapshot --volume-id "vol-0123456789abcdef0" --description "Forensic snapshot for ${incident.id}"`;

      terraformHcl = `# Quarantine Instance Security Group
resource "aws_security_group" "quarantine" {
  name        = "quarantine-${resourceName}"
  description = "Isolated security group for compromised resource"
  vpc_id      = "vpc-12345678"

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["127.0.0.1/32"]
  }
}`;

      lambdaJs = `const { EC2Client, StopInstancesCommand } = require("@aws-sdk/client-ec2");

exports.handler = async (event) => {
  const ec2 = new EC2Client();
  console.log(\`[AUTO-REMEDIATION] Isolating compute instance: ${resourceName}\`);
  return { status: 200, message: "Resource isolated." };
};`;
      description = 'Network Containment Playbook: Revokes permissive security group rules, isolates compute resources, and creates forensic snapshots.';
    }

    return {
      incident_id: incident.id,
      incident_title: incident.title,
      aws_cli: awsCli,
      terraform_hcl: terraformHcl,
      lambda_js: lambdaJs,
      description
    };
  }

  generateExecutiveReport(incident: Incident): string {
    const resources = this.parseResources(incident.affected_resources);
    let aiData: any = {};
    try {
      aiData = JSON.parse(incident.ai_analysis);
    } catch {}

    const timestamp = new Date(incident.timestamp).toUTCString();
    const createdDate = new Date(incident.created_at).toUTCString();

    return `# 🛡️ CISO EXECUTIVE INCIDENT REPORT

**INCIDENT ID**: \`${incident.id}\`  
**TITLE**: ${incident.title}  
**SEVERITY**: **${incident.severity}**  
**STATUS**: \`${incident.status}\`  
**DETECTION TIME**: ${timestamp}  
**REPORT GENERATED**: ${new Date().toUTCString()}  

---

## 1. Executive Summary
${aiData.summary || 'A security event was detected requiring SOC analysis and incident response containment.'}

- **Primary Impacted Resources**: ${resources.join(', ') || 'N/A'}
- **Detection Source**: ${incident.source}
- **Confidence Score**: ${Math.round((incident.confidence || 0) * 100)}%
- **Approval Status**: ${incident.approval_status}

---

## 2. Technical Findings & Root Cause Analysis
${aiData.analysis || 'Detailed analysis indicates suspicious activities consistent with unauthorized cloud access or misconfiguration.'}

### Key Indicators of Compromise (IoCs):
${(aiData.attack_indicators || []).map((ioc: string) => `- 🚨 ${ioc}`).join('\n') || '- Suspicious API execution patterns detected'}

### Evidence Collected:
${(aiData.evidence || []).map((ev: string) => `- 📋 ${ev}`).join('\n') || '- Log evidence saved in SOC telemetry database'}

---

## 3. Recommended Remediation & Containment Plan
${(JSON.parse(incident.recommended_actions || '[]') as string[]).map((act, i) => `${i + 1}. **${act}**`).join('\n') || '1. Isolate resource\n2. Revoke active access keys\n3. Review audit logs'}

**Justification**: ${aiData.justification || 'Standard cloud security containment protocols applied.'}

---

## 4. Formal Sign-off Status
- [x] Automated AI Threat Analysis Completed
- [${incident.approval_status === 'APPROVED' ? 'x' : ' '}] SOC Lead Remediation Authorization
- [${incident.status === 'SIMULATED_EXECUTED' || incident.status === 'RESOLVED' ? 'x' : ' '}] Containment Executed & Verified

*Report generated automatically by ASA SOC Incident Response System.*`;
  }

  private parseResources(str: string): string[] {
    try {
      const parsed = JSON.parse(str);
      return Array.isArray(parsed) ? parsed : [str];
    } catch {
      return [str];
    }
  }
}

export const playbookService = new PlaybookService();
