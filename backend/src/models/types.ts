export type Severity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type IncidentStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'SIMULATED_EXECUTED' | 'AI_ANALYSIS_FAILED';

export interface SecurityEvent {
  event_id: string;
  timestamp: string;
  source: string;
  event_type: string;
  actor: string;
  resource: string;
  ip: string;
  region: string;
  raw_data: string; // JSON string
}

export interface AIAnalysisResult {
  incident_title: string;
  summary: string;
  severity: Severity;
  incident_type: string;
  affected_resources: string[];
  evidence: string[];
  attack_indicators: string[];
  analysis: string;
  recommended_actions: string[];
  justification: string;
  confidence: number;
  requires_human_approval: boolean;
}

export interface Incident {
  id: string;
  title: string;
  type: string;
  severity: Severity;
  status: IncidentStatus;
  timestamp: string;
  affected_resources: string; // JSON string array
  source: string;
  raw_event_reference: string;
  ai_analysis: string; // JSON string
  recommended_actions: string; // JSON string array
  confidence: number;
  approval_status: 'PENDING' | 'APPROVED' | 'REJECTED';
  created_at: string;
  updated_at: string;
}
