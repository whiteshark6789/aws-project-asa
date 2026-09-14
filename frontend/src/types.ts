export type Severity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type IncidentStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'SIMULATED_EXECUTED' | 'AI_ANALYSIS_FAILED';

export interface Incident {
  id: string;
  title: string;
  type: string;
  severity: Severity;
  status: IncidentStatus;
  timestamp: string;
  affected_resources: string; // JSON array string
  source: string;
  raw_event_reference: string;
  ai_analysis: string; // JSON string
  recommended_actions: string; // JSON array string
  confidence: number;
  approval_status: 'PENDING' | 'APPROVED' | 'REJECTED';
  created_at: string;
  updated_at: string;
}

export interface DashboardStats {
  total: number;
  open: number;
  resolved: number;
  critical: number;
  high: number;
}
