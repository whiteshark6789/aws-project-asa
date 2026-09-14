import { GoogleGenAI } from '@google/genai';
import { AIAnalysisResult, SecurityEvent } from '../models/types';

export class AIService {
  private ai: GoogleGenAI | null = null;
  private readonly MODEL = 'gemini-3.6-flash';

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey && apiKey !== 'YOUR_GEMINI_API_KEY_HERE') {
      this.ai = new GoogleGenAI({ apiKey });
      console.log(`AI Service initialized with model: ${this.MODEL}`);
    } else {
      console.warn('GEMINI_API_KEY is missing. AI Service will run in mock mode.');
    }
  }

  async analyzeIncident(event: SecurityEvent): Promise<AIAnalysisResult> {
    if (!this.ai) {
      return this.mockAnalysis(event);
    }

    const prompt = `You are a senior cloud security incident analyst working in a Security Operations Center (SOC).
Analyze the following AWS security event and produce a detailed, accurate incident report.
IMPORTANT: Base your analysis ONLY on the data provided. Do NOT invent resources, IPs, users, or timestamps.

Security Event Data:
${JSON.stringify(event, null, 2)}

Return ONLY a valid JSON object matching this exact schema — no markdown, no commentary:
{
  "incident_title": "Short, specific, descriptive title of the incident",
  "summary": "2-3 sentence summary of what occurred and why it is suspicious",
  "severity": "CRITICAL | HIGH | MEDIUM | LOW",
  "incident_type": "Type of attack or anomaly category",
  "affected_resources": ["array of affected resource identifiers from the data"],
  "evidence": ["array of specific evidence facts extracted directly from the log data"],
  "attack_indicators": ["array of specific indicators of compromise or suspicious behavioral signs"],
  "analysis": "Detailed paragraph explaining the full technical reasoning, what the attacker may be attempting, and the risk to the organization",
  "recommended_actions": ["ordered array of specific, actionable remediation steps"],
  "justification": "Why these actions are the most appropriate response",
  "confidence": 0.0,
  "requires_human_approval": true
}`;

    try {
      const response = await this.ai.models.generateContent({
        model: this.MODEL,
        contents: prompt,
        config: { responseMimeType: 'application/json' }
      });

      const text = response.text;
      if (!text) throw new Error('Empty response from AI');
      const parsed: AIAnalysisResult = JSON.parse(text);
      return parsed;
    } catch (error) {
      console.error('AI Analysis error:', error);
      return {
        incident_title: `AI Analysis Error: ${event.event_type}`,
        summary: `AI analysis failed for this event. Raw error: ${error}`,
        severity: 'MEDIUM',
        incident_type: event.event_type,
        affected_resources: [event.resource],
        evidence: [`Source: ${event.source}`, `Actor: ${event.actor}`, `IP: ${event.ip}`],
        attack_indicators: [],
        analysis: 'AI analysis could not be completed. Manual review required.',
        recommended_actions: ['Manually review the raw event data', 'Escalate to senior analyst if suspicious'],
        justification: 'System error during automated analysis.',
        confidence: 0,
        requires_human_approval: true
      };
    }
  }

  private mockAnalysis(event: SecurityEvent): AIAnalysisResult {
    console.log('Running mock AI analysis for event:', event.event_id);
    return {
      incident_title: `[MOCK] ${event.event_type} on ${event.resource}`,
      summary: `Mock analysis: A ${event.event_type} event was detected originating from IP ${event.ip} by actor ${event.actor}. This is a simulated response — set GEMINI_API_KEY to enable real AI analysis.`,
      severity: 'HIGH',
      incident_type: event.event_type,
      affected_resources: [event.resource],
      evidence: [`Source IP: ${event.ip}`, `Actor: ${event.actor}`, `Event Source: ${event.source}`, `Region: ${event.region}`],
      attack_indicators: ['Unusual source IP', 'Unexpected event type for this resource'],
      analysis: 'This is a mock AI analysis. To enable real Gemini-powered analysis, add your GEMINI_API_KEY to the backend/.env file and restart the server.',
      recommended_actions: ['Investigate the source IP', 'Review CloudTrail logs for related events', 'Check resource access permissions'],
      justification: 'Mock justification: standard investigation protocol applies.',
      confidence: 0.5,
      requires_human_approval: true
    };
  }

  async chatAboutIncident(incidentContext: any, message: string): Promise<string> {
    if (!this.ai) {
      return `[MOCK AI] Based on the incident context, I recommend: Immediately isolate the affected resource, review all recent IAM activity for the actor involved, and check CloudTrail for lateral movement. Set GEMINI_API_KEY in backend/.env to enable real AI responses.`;
    }

    const prompt = `You are a Cloud Security Analyst AI Assistant embedded in a Security Operations Center (SOC) dashboard.
A human analyst is asking you about a specific active security incident. Be concise, expert, and actionable.
Do NOT use markdown headers or JSON. Respond in clear paragraphs like a senior analyst would.

INCIDENT CONTEXT:
${JSON.stringify(incidentContext, null, 2)}

ANALYST QUESTION: ${message}

YOUR EXPERT RESPONSE:`;

    try {
      const response = await this.ai.models.generateContent({
        model: this.MODEL,
        contents: prompt
      });
      return response.text || 'No response from AI.';
    } catch (error) {
      console.error('AI Chat error:', error);
      return `AI chat error: ${error}. Please verify your API key is valid.`;
    }
  }

  async chatAboutGlobalOverview(incidents: any[], stats: any, message: string, isTechnicalMode: boolean = false): Promise<string> {
    if (!this.ai) {
      return this.mockGlobalChat(incidents, stats, message);
    }

    const contextSummary = {
      total_incidents: incidents.length,
      stats,
      incidents_summary: incidents.map(i => ({
        id: i.id,
        title: i.title,
        severity: i.severity,
        status: i.status,
        type: i.type,
        source: i.source,
        affected_resources: i.affected_resources,
        timestamp: i.timestamp
      }))
    };

    const technicalInstructions = isTechnicalMode 
      ? `1. Provide a highly technical, deeply detailed analysis using markdown for structure (headers, bolding, lists).
2. If asked about summaries or which incident is most dangerous, clearly point out the highest severity incidents (e.g. CRITICAL or HIGH), affected resources, potential impact, and recommended priority containment step.
3. Keep a helpful, professional tone as ASA, senior cloud SOC analyst AI.`
      : `1. Respond in plain English without using ANY asterisks, markdown formatting, or overwhelming technical jargon. Provide a simple, highly human-readable response.
2. If asked about summaries or which incident is most dangerous, point out the highest severity incidents in simple terms, explaining the risk and recommended action simply.
3. Keep a helpful, professional tone as ASA, guiding the user clearly. Use simple bullet points if necessary but NO markdown bolding.`;

    const prompt = `You are ASA (Automated Security Assistant), a top-tier Cloud Security Incident Response AI embedded in an AWS SOC Security Operations Center.
You have a full real-time overview of all current active security incidents and dashboard metrics across the AWS infrastructure.

SYSTEM METRICS AND ALL INCIDENTS CONTEXT:
${JSON.stringify(contextSummary, null, 2)}

USER ANALYST INQUIRY: "${message}"

INSTRUCTIONS:
${technicalInstructions}`;

    try {
      const response = await this.ai.models.generateContent({
        model: this.MODEL,
        contents: prompt
      });
      return response.text || 'ASA was unable to analyze the request. Please try again.';
    } catch (error) {
      console.error('AI Global Chat error:', error);
      return this.mockGlobalChat(incidents, stats, message);
    }
  }

  private mockGlobalChat(incidents: any[], stats: any, message: string): string {
    const q = message.toLowerCase();
    const total = incidents.length;
    const criticals = incidents.filter((i: any) => i.severity === 'CRITICAL');
    const highs = incidents.filter((i: any) => i.severity === 'HIGH');
    const openIncidents = incidents.filter((i: any) => i.status === 'OPEN');

    if (total === 0) {
      return `👋 Hi, I'm ASA! System clear — no active security incidents detected in your environment. Everything is running securely!`;
    }

    const mostDangerous = criticals.length > 0 ? criticals[0] : (highs.length > 0 ? highs[0] : incidents[0]);

    if (q.includes('summary') || q.includes('summarize') || q.includes('overview') || q.includes('present issues')) {
      return `📊 **ASA Security Summary Report**\n\n• **Total Incidents**: ${total} (${openIncidents.length} OPEN)\n• **Critical**: ${criticals.length} | **High**: ${highs.length}\n\n🚨 **Top Active Threats**:\n` +
        incidents.slice(0, 3).map((i: any, index: number) => `${index + 1}. **[${i.severity}]** ${i.title} (Status: ${i.status.replace(/_/g, ' ')})`).join('\n') +
        `\n\n💡 *Recommendation*: Prioritize resolving critical alerts first to mitigate privilege escalation or data loss.`;
    }

    if (q.includes('dangerous') || q.includes('risk') || q.includes('critical') || q.includes('threat')) {
      return `🚨 **Most Dangerous Threat Detected**:\n\n` +
        `• **Incident**: ${mostDangerous.title}\n` +
        `• **Severity**: ${mostDangerous.severity}\n` +
        `• **Type**: ${mostDangerous.type}\n` +
        `• **Source**: ${mostDangerous.source}\n` +
        `• **Status**: ${mostDangerous.status.replace(/_/g, ' ')}\n\n` +
        `🔍 **Impact Assessment**: This incident presents the highest risk of compromise to your cloud assets. Immediate containment is strongly advised.`;
    }

    if (q.includes('stats') || q.includes('breakdown') || q.includes('count') || q.includes('numbers')) {
      return `📈 **Current Severity & Status Breakdown**:\n\n` +
        `🔴 **Critical**: ${stats?.critical || criticals.length}\n` +
        `🟠 **High**: ${stats?.high || highs.length}\n` +
        `🟡 **Medium**: ${incidents.filter((i: any) => i.severity === 'MEDIUM').length}\n` +
        `🟢 **Low**: ${incidents.filter((i: any) => i.severity === 'LOW').length}\n\n` +
        `📌 **Status**: ${openIncidents.length} Open, ${total - openIncidents.length} Resolved/Simulated.`;
    }

    if (q.includes('action') || q.includes('do') || q.includes('recommend') || q.includes('fix') || q.includes('steps')) {
      return `🛡️ **ASA Top Priority Remediation Steps**:\n\n` +
        `1️⃣ Revoke suspicious IAM policies or credentials associated with ${mostDangerous.title}.\n` +
        `2️⃣ Review CloudTrail audit logs for IP addresses linked to open incidents.\n` +
        `3️⃣ Approve pending AI mitigations in the Incident Detail panel for automatic sandbox containment.`;
    }

    return `👋 **ASA AI Response**:\n\nCurrently monitoring **${total} incidents** across your AWS infrastructure (${criticals.length} Critical, ${highs.length} High).\n\n` +
      `The highest severity issue flagged is **"${mostDangerous.title}"** [${mostDangerous.severity}]. You can ask me to summarize issues, pinpoint the most dangerous threat, or detail remediation steps!`;
  }
}

export const aiService = new AIService();
