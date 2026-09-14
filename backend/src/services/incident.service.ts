import { v4 as uuidv4 } from 'uuid';
import { SecurityEvent, Incident } from '../models/types';
import { insertSecurityEvent, insertIncident, getIncidents, getIncidentById, updateIncidentStatus, appendToIncident, getSecurityEventById, updateIncidentAIAnalysis } from '../adapters/db.adapter';
import { aiService } from './ai.service';

export class IncidentService {
  async processSecurityEvent(event: SecurityEvent) {
    // 1. Save the raw event
    insertSecurityEvent(event);

    // 2. Correlation Check
    // Look for an OPEN incident in the last 1 hour with the same IP or resource
    const openIncidents = getIncidents().filter(i => i.status === 'OPEN');
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    
    let correlatedIncident = null;
    for (const inc of openIncidents) {
      const incTime = new Date(inc.timestamp).getTime();
      if (incTime > oneHourAgo) {
        // Simple correlation based on AI Analysis string (which contains original evidence)
        // or matching affected resources
        if (inc.affected_resources.includes(event.resource) || 
            (event.ip && inc.ai_analysis.includes(event.ip))) {
          correlatedIncident = inc;
          break;
        }
      }
    }

    if (correlatedIncident) {
      console.log(`[Correlation Engine] Event ${event.event_id} correlated with Incident ${correlatedIncident.id}`);
      const additionalResource = [event.resource].filter(Boolean);
      appendToIncident(correlatedIncident.id, additionalResource, event.event_id);
      return this.getIncident(correlatedIncident.id);
    }

    try {
      // 2. Send to AI for analysis
      const analysis = await aiService.analyzeIncident(event);

      // 3. Create incident record
      const incident: Incident = {
        id: uuidv4(),
        title: analysis.incident_title,
        type: analysis.incident_type,
        severity: analysis.severity,
        status: 'OPEN',
        timestamp: event.timestamp,
        affected_resources: JSON.stringify(analysis.affected_resources),
        source: event.source,
        raw_event_reference: event.event_id,
        ai_analysis: JSON.stringify(analysis),
        recommended_actions: JSON.stringify(analysis.recommended_actions),
        confidence: analysis.confidence,
        approval_status: analysis.requires_human_approval ? 'PENDING' : 'APPROVED',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // 4. Save to DB
      insertIncident(incident);

      return incident;
    } catch (error) {
      console.error('Failed to process event:', error);
      // Fallback incident creation if AI fails
      const fallbackIncident: Incident = {
        id: uuidv4(),
        title: 'Unanalyzed Security Event',
        type: event.event_type,
        severity: 'MEDIUM',
        status: 'AI_ANALYSIS_FAILED',
        timestamp: event.timestamp,
        affected_resources: JSON.stringify([event.resource]),
        source: event.source,
        raw_event_reference: event.event_id,
        ai_analysis: '{}',
        recommended_actions: '[]',
        confidence: 0,
        approval_status: 'PENDING',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      insertIncident(fallbackIncident);
      return fallbackIncident;
    }
  }

  getAllIncidents() {
    return getIncidents();
  }

  getIncident(id: string) {
    return getIncidentById(id);
  }

  approveRemediation(id: string) {
    updateIncidentStatus(id, 'APPROVED', 'SIMULATED_EXECUTED');
    return this.getIncident(id);
  }

  rejectRemediation(id: string) {
    updateIncidentStatus(id, 'REJECTED', 'OPEN');
    return this.getIncident(id);
  }

  async chatWithIncident(id: string, message: string) {
    const incident = this.getIncident(id);
    if (!incident) throw new Error('Incident not found');
    return aiService.chatAboutIncident(incident, message);
  }

  async reAnalyzeIncident(id: string) {
    const incident = this.getIncident(id);
    if (!incident) throw new Error('Incident not found');
    
    // Get the original event
    const originalEventId = incident.raw_event_reference.split(',')[0];
    const originalEvent = getSecurityEventById(originalEventId);
    if (!originalEvent) throw new Error('Original event not found');

    const analysis = await aiService.analyzeIncident(originalEvent);
    updateIncidentAIAnalysis(id, analysis);
    return this.getIncident(id);
  }

  async chatWithGlobalOverview(message: string, clientIncidents?: any[], clientStats?: any, isTechnicalMode?: boolean) {
    const incidents = clientIncidents || this.getAllIncidents();
    const stats = clientStats || {
      total: incidents.length,
      open: incidents.filter((i: any) => i.status === 'OPEN').length,
      resolved: incidents.filter((i: any) => i.status === 'RESOLVED' || i.status === 'SIMULATED_EXECUTED').length,
      critical: incidents.filter((i: any) => i.severity === 'CRITICAL').length,
      high: incidents.filter((i: any) => i.severity === 'HIGH').length,
    };
    return aiService.chatAboutGlobalOverview(incidents, stats, message, isTechnicalMode);
  }
}

export const incidentService = new IncidentService();
