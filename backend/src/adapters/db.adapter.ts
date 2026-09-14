import Database from 'better-sqlite3';
import { Incident, SecurityEvent } from '../models/types';
import path from 'path';
import fs from 'fs';

// Ensure data directory exists
const dataDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'incidents.db');
const db = new Database(dbPath);

// Initialize DB schema
export function initDB() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS security_events (
      event_id TEXT PRIMARY KEY,
      timestamp TEXT,
      source TEXT,
      event_type TEXT,
      actor TEXT,
      resource TEXT,
      ip TEXT,
      region TEXT,
      raw_data TEXT
    );

    CREATE TABLE IF NOT EXISTS incidents (
      id TEXT PRIMARY KEY,
      title TEXT,
      type TEXT,
      severity TEXT,
      status TEXT,
      timestamp TEXT,
      affected_resources TEXT,
      source TEXT,
      raw_event_reference TEXT,
      ai_analysis TEXT,
      recommended_actions TEXT,
      confidence REAL,
      approval_status TEXT,
      created_at TEXT,
      updated_at TEXT
    );
  `);
}

export function insertSecurityEvent(event: SecurityEvent) {
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO security_events 
    (event_id, timestamp, source, event_type, actor, resource, ip, region, raw_data)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    event.event_id,
    event.timestamp,
    event.source,
    event.event_type,
    event.actor,
    event.resource,
    event.ip,
    event.region,
    event.raw_data
  );
}

export function insertIncident(incident: Incident) {
  const stmt = db.prepare(`
    INSERT INTO incidents 
    (id, title, type, severity, status, timestamp, affected_resources, source, raw_event_reference, ai_analysis, recommended_actions, confidence, approval_status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    incident.id,
    incident.title,
    incident.type,
    incident.severity,
    incident.status,
    incident.timestamp,
    incident.affected_resources,
    incident.source,
    incident.raw_event_reference,
    incident.ai_analysis,
    incident.recommended_actions,
    incident.confidence,
    incident.approval_status,
    incident.created_at,
    incident.updated_at
  );
}

export function getIncidents(): Incident[] {
  const stmt = db.prepare(`SELECT * FROM incidents ORDER BY created_at DESC`);
  return stmt.all() as Incident[];
}

export function getIncidentById(id: string): Incident | undefined {
  const stmt = db.prepare(`SELECT * FROM incidents WHERE id = ?`);
  return stmt.get(id) as Incident | undefined;
}

export function updateIncidentStatus(id: string, approval_status: string, status: string) {
  const stmt = db.prepare(`
    UPDATE incidents 
    SET approval_status = ?, status = ?, updated_at = ?
    WHERE id = ?
  `);
  stmt.run(approval_status, status, new Date().toISOString(), id);
}

export function appendToIncident(id: string, additional_resources: string[], additional_event_id: string) {
  const incident = getIncidentById(id);
  if (!incident) return;
  
  const existingResources = JSON.parse(incident.affected_resources || '[]');
  const mergedResources = Array.from(new Set([...existingResources, ...additional_resources]));
  
  const stmt = db.prepare(`
    UPDATE incidents 
    SET affected_resources = ?, raw_event_reference = raw_event_reference || ',' || ?, updated_at = ?
    WHERE id = ?
  `);
  stmt.run(JSON.stringify(mergedResources), additional_event_id, new Date().toISOString(), id);
}

export function getSecurityEventById(event_id: string): SecurityEvent | undefined {
  const stmt = db.prepare(`SELECT * FROM security_events WHERE event_id = ?`);
  return stmt.get(event_id) as SecurityEvent | undefined;
}

export function updateIncidentAIAnalysis(id: string, analysis: any) {
  const stmt = db.prepare(`
    UPDATE incidents
    SET title = ?, type = ?, severity = ?, status = ?, ai_analysis = ?, recommended_actions = ?, confidence = ?, approval_status = ?, updated_at = ?
    WHERE id = ?
  `);
  stmt.run(
    analysis.incident_title,
    analysis.incident_type,
    analysis.severity,
    'OPEN',
    JSON.stringify(analysis),
    JSON.stringify(analysis.recommended_actions),
    analysis.confidence,
    analysis.requires_human_approval ? 'PENDING' : 'APPROVED',
    new Date().toISOString(),
    id
  );
}
