import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { incidentService } from '../services/incident.service';
import { playbookService } from '../services/playbook.service';

const router = Router();

// Log Ingestion Endpoint
router.post('/logs/upload', async (req, res) => {
  try {
    const event = req.body;
    // Basic validation
    if (!event.event_id || !event.timestamp || !event.event_type) {
      return res.status(400).json({ error: 'Invalid security event payload' });
    }
    
    const incident = await incidentService.processSecurityEvent(event);
    res.status(201).json(incident);
  } catch (error) {
    res.status(500).json({ error: 'Failed to process log' });
  }
});

// Get all incidents (for Dashboard)
router.get('/incidents', (req, res) => {
  try {
    const incidents = incidentService.getAllIncidents();
    res.json(incidents);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve incidents' });
  }
});

// Get single incident
router.get('/incidents/:id', (req, res) => {
  try {
    const incident = incidentService.getIncident(req.params.id);
    if (!incident) {
      return res.status(404).json({ error: 'Incident not found' });
    }
    res.json(incident);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve incident' });
  }
});

// Approve Remediation
router.post('/incidents/:id/approve', (req, res) => {
  try {
    const incident = incidentService.approveRemediation(req.params.id);
    res.json(incident);
  } catch (error) {
    res.status(500).json({ error: 'Failed to approve remediation' });
  }
});

// Reject Remediation
router.post('/incidents/:id/reject', (req, res) => {
  try {
    const incident = incidentService.rejectRemediation(req.params.id);
    res.json(incident);
  } catch (error) {
    res.status(500).json({ error: 'Failed to reject remediation' });
  }
});

// Chat with AI about Incident
router.post('/incidents/:id/chat', async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: 'Message required' });
    const reply = await incidentService.chatWithIncident(req.params.id, message);
    res.json({ reply });
  } catch (error) {
    res.status(500).json({ error: 'Failed to chat with AI' });
  }
});

// Global ASA Chatbot Endpoint
router.post('/chat/global', async (req, res) => {
  try {
    const { message, incidents, stats, isTechnicalMode } = req.body;
    if (!message) return res.status(400).json({ error: 'Message required' });
    const reply = await incidentService.chatWithGlobalOverview(message, incidents, stats, isTechnicalMode);
    res.json({ reply });
  } catch (error) {
    res.status(500).json({ error: 'Failed to complete ASA chat' });
  }
});

// Re-analyze a failed incident
router.post('/incidents/:id/analyze', async (req, res) => {
  try {
    const updated = await incidentService.reAnalyzeIncident(req.params.id);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to re-analyze' });
  }
});

// Dashboard stats
router.get('/dashboard/stats', (req, res) => {
  try {
    const incidents = incidentService.getAllIncidents();
    const stats = {
      total: incidents.length,
      open: incidents.filter(i => i.status === 'OPEN').length,
      resolved: incidents.filter(i => i.status === 'RESOLVED' || i.status === 'SIMULATED_EXECUTED').length,
      critical: incidents.filter(i => i.severity === 'CRITICAL').length,
      high: incidents.filter(i => i.severity === 'HIGH').length,
    };
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

// Playbook Remediation Exporter
router.get('/incidents/:id/playbook', (req, res) => {
  try {
    const incident = incidentService.getIncident(req.params.id);
    if (!incident) return res.status(404).json({ error: 'Incident not found' });
    const playbook = playbookService.generatePlaybook(incident);
    res.json(playbook);
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate playbook' });
  }
});

// CISO Executive Report Exporter
router.get('/incidents/:id/report', (req, res) => {
  try {
    const incident = incidentService.getIncident(req.params.id);
    if (!incident) return res.status(404).json({ error: 'Incident not found' });
    const reportMarkdown = playbookService.generateExecutiveReport(incident);
    res.json({ report: reportMarkdown });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

// Simulation Scenarios List
router.get('/simulation/scenarios', (req, res) => {
  try {
    const scenariosDir = path.join(__dirname, '../../../simulation/scenarios');
    if (!fs.existsSync(scenariosDir)) {
      return res.json([]);
    }
    const files = fs.readdirSync(scenariosDir).filter(f => f.endsWith('.json'));
    const scenarios = files.map(file => {
      const filePath = path.join(scenariosDir, file);
      const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      return {
        file,
        id: file.replace('.json', ''),
        title: content.event_type || file,
        severity: content.event_type?.includes('Root') || content.event_type?.includes('Exfiltration') ? 'CRITICAL' : 'HIGH',
        source: content.source || 'AWS CloudTrail',
        resource: content.resource || 'arn:aws:ec2:us-east-1:123456789012:instance/i-0abc1234',
        data: content
      };
    });
    res.json(scenarios);
  } catch (error) {
    res.status(500).json({ error: 'Failed to read simulation scenarios' });
  }
});

// Trigger Attack Scenario Simulation
router.post('/simulation/trigger', async (req, res) => {
  try {
    const { scenarioId, rawData } = req.body;
    let eventData = rawData;

    if (!eventData && scenarioId) {
      const filePath = path.join(__dirname, `../../../simulation/scenarios/${scenarioId}.json`);
      if (fs.existsSync(filePath)) {
        eventData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      }
    }

    if (!eventData) {
      return res.status(400).json({ error: 'Scenario data or scenarioId required' });
    }

    // Refresh event ID & timestamp for live simulation feel
    const liveEvent = {
      ...eventData,
      event_id: `sim-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString()
    };

    const incident = await incidentService.processSecurityEvent(liveEvent);
    res.status(201).json({ success: true, incident, eventSent: liveEvent });
  } catch (error) {
    console.error('Trigger simulation error:', error);
    res.status(500).json({ error: 'Failed to trigger simulation' });
  }
});

export default router;
