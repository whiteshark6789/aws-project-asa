import { useEffect, useState, useCallback } from 'react';
import type { Incident, DashboardStats } from './types';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { FloatingChatbot } from './components/FloatingChatbot';
import { RiskRadarCard } from './components/RiskRadarCard';
import { AttackSimulatorModal } from './components/AttackSimulatorModal';
import { AttackGraph } from './components/AttackGraph';
import { PlaybookExporterModal } from './components/PlaybookExporterModal';
import { ExecutiveReportModal } from './components/ExecutiveReportModal';
import { Shield, Zap, Search, Network, Wrench, FileText } from 'lucide-react';
import './App.css';

const API_URL = import.meta.env.DEV ? 'http://localhost:3001/api' : 'https://aws-project-asa-backend.onrender.com/api';

function useLiveClock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return time;
}

function App() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterSeverity, setFilterSeverity] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [chatMessages, setChatMessages] = useState<{ sender: 'user' | 'ai'; text: string }[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatting, setIsChatting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Novelty Feature States
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
  const [isPlaybookOpen, setIsPlaybookOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [detailTab, setDetailTab] = useState<'overview' | 'graph'>('overview');

  const now = useLiveClock();

  const fetchData = useCallback(async () => {
    try {
      const [incRes, statsRes] = await Promise.all([
        fetch(`${API_URL}/incidents`),
        fetch(`${API_URL}/dashboard/stats`)
      ]);
      const incData: Incident[] = await incRes.json();
      const statsData: DashboardStats = await statsRes.json();
      setIncidents(incData);
      setStats(statsData);
      setLoading(false);
    } catch {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const t = setInterval(fetchData, 10000);
    return () => clearInterval(t);
  }, [fetchData]);

  const handleApprove = async (id: string) => {
    await fetch(`${API_URL}/incidents/${id}/approve`, { method: 'POST' });
    fetchData();
    setSelectedIncident(prev => prev?.id === id ? { ...prev, approval_status: 'APPROVED', status: 'SIMULATED_EXECUTED' } : prev);
  };

  const handleReject = async (id: string) => {
    await fetch(`${API_URL}/incidents/${id}/reject`, { method: 'POST' });
    fetchData();
    setSelectedIncident(prev => prev?.id === id ? { ...prev, approval_status: 'REJECTED' } : prev);
  };

  const handleReAnalyze = async (id: string) => {
    setIsAnalyzing(true);
    try {
      const res = await fetch(`${API_URL}/incidents/${id}/analyze`, { method: 'POST' });
      const updated = await res.json();
      setSelectedIncident(updated);
      fetchData();
    } catch {}
    setIsAnalyzing(false);
  };

  const handleChat = async () => {
    if (!chatInput.trim() || !selectedIncident) return;
    const userMsg = chatInput;
    setChatMessages(prev => [...prev, { sender: 'user', text: userMsg }]);
    setChatInput('');
    setIsChatting(true);
    try {
      const res = await fetch(`${API_URL}/incidents/${selectedIncident.id}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg })
      });
      const data = await res.json();
      setChatMessages(prev => [...prev, { sender: 'ai', text: data.reply }]);
    } catch {
      setChatMessages(prev => [...prev, { sender: 'ai', text: 'Error connecting to AI.' }]);
    }
    setIsChatting(false);
  };

  const safe = (str: string, fallback: any = {}) => {
    try { return JSON.parse(str); } catch { return fallback; }
  };

  const severityOrder = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
  const filteredIncidents = incidents
    .filter(i => (filterSeverity === 'ALL' || i.severity === filterSeverity))
    .filter(i => (filterStatus === 'ALL' || i.status === filterStatus))
    .sort((a, b) => severityOrder.indexOf(a.severity) - severityOrder.indexOf(b.severity));

  const severityData = [
    { name: 'CRITICAL', value: stats?.critical || 0, color: '#ff4d4d' },
    { name: 'HIGH', value: stats?.high || 0, color: '#ff9800' },
    { name: 'MEDIUM', value: incidents.filter(i => i.severity === 'MEDIUM').length, color: '#ffc107' },
    { name: 'LOW', value: incidents.filter(i => i.severity === 'LOW').length, color: '#4caf50' },
  ];

  if (loading) return <div className="loading-screen"><div className="loader" /><p>Initializing Security Console...</p></div>;

  return (
    <div className="app-container">
      {/* Header */}
      <header className="app-header">
        <div className="header-left">
          <div className="header-logo"><Shield size={24} /></div>
          <div>
            <h1>Cloud Security Operations</h1>
            <p className="header-subtitle">AWS Incident Response Platform</p>
          </div>
        </div>
        <div className="header-right">
          <button
            className="btn btn-solid"
            onClick={() => setIsSimulatorOpen(true)}
            style={{ padding: '6px 16px', fontSize: '12px', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Zap size={14} /> Attack Simulator
          </button>
          <div className="live-clock">{now.toLocaleTimeString()}</div>
          <div className="user-info">SOC Analyst</div>
        </div>
      </header>

      <main className="main-content">
        {!selectedIncident ? (
          <>
            {/* Risk Radar & Posture Card */}
            <RiskRadarCard incidents={incidents} stats={stats} />

            {/* Stats Row */}
            <div className="dashboard-grid">
              <div className="card stat-card">
                <h3>Total Incidents</h3>
                <div className="stat-value">{stats?.total || 0}</div>
              </div>
              <div className="card stat-card">
                <h3>Open</h3>
                <div className="stat-value" style={{ color: 'var(--severity-medium)' }}>{stats?.open || 0}</div>
              </div>
              <div className="card stat-card">
                <h3>Critical</h3>
                <div className="stat-value" style={{ color: 'var(--severity-critical)' }}>{stats?.critical || 0}</div>
              </div>
              <div className="card stat-card">
                <h3>High</h3>
                <div className="stat-value" style={{ color: 'var(--severity-high)' }}>{stats?.high || 0}</div>
              </div>
              <div className="card stat-card">
                <h3>Resolved</h3>
                <div className="stat-value" style={{ color: 'var(--severity-low)' }}>{stats?.resolved || 0}</div>
              </div>
              <div className="card stat-card chart-card">
                <h3>Severity Distribution</h3>
                <div style={{ height: '120px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={severityData} dataKey="value" cx="50%" cy="50%" outerRadius={50} innerRadius={25}>
                        {severityData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                      </Pie>
                      <Tooltip formatter={(v, n) => [v, n]} contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Incident Table */}
            <div className="card list-card">
              <div className="list-header">
                <h2>Active Incidents</h2>
                <div className="filters">
                  <select value={filterSeverity} onChange={e => setFilterSeverity(e.target.value)} className="filter-select">
                    <option value="ALL">All Severities</option>
                    {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map(s => <option key={s}>{s}</option>)}
                  </select>
                  <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="filter-select">
                    <option value="ALL">All Statuses</option>
                    <option value="OPEN">OPEN</option>
                    <option value="SIMULATED_EXECUTED">RESOLVED</option>
                    <option value="AI_ANALYSIS_FAILED">FAILED</option>
                  </select>
                  <button className="btn" onClick={fetchData}>↻ Refresh</button>
                </div>
              </div>
              <div className="table-responsive">
                <table className="incident-table">
                  <thead>
                    <tr>
                      <th>Severity</th><th>Title</th><th>Type</th><th>Status</th><th>Source</th><th>Time</th><th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredIncidents.length === 0 ? (
                      <tr><td colSpan={7} className="empty-state">No incidents found. Run a simulation to get started.</td></tr>
                    ) : filteredIncidents.map(inc => (
                      <tr key={inc.id} className={`incident-row ${inc.severity.toLowerCase()}`}>
                        <td><span className={`badge badge-${inc.severity.toLowerCase()}`}>{inc.severity}</span></td>
                        <td className="incident-title-cell">{inc.title}</td>
                        <td><span className="type-label">{inc.type}</span></td>
                        <td><span className={`status-pill status-${inc.status.toLowerCase()}`}>{inc.status.replace(/_/g, ' ')}</span></td>
                        <td className="source-cell">{inc.source}</td>
                        <td className="time-cell">{new Date(inc.timestamp).toLocaleString()}</td>
                        <td><button className="btn btn-sm" onClick={() => { setSelectedIncident(inc); setChatMessages([]); }}>Investigate →</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : (
          <div className="incident-details">
            <button className="btn back-btn" onClick={() => { setSelectedIncident(null); setChatMessages([]); }}>
              <span className="btn-icon">←</span> Back to Dashboard
            </button>

            <div className="details-header">
              <span className={`badge badge-${selectedIncident.severity.toLowerCase()} badge-lg`}>{selectedIncident.severity}</span>
              <div>
                <h2>{selectedIncident.title}</h2>
                <p className="text-secondary">{selectedIncident.source} · {new Date(selectedIncident.timestamp).toLocaleString()}</p>
              </div>
              <div className="details-actions">
                <button className="btn" style={{ display: 'flex', alignItems: 'center', gap: '6px' }} onClick={() => setIsPlaybookOpen(true)}><Wrench size={14} /> Executable Playbook</button>
                <button className="btn" style={{ display: 'flex', alignItems: 'center', gap: '6px' }} onClick={() => setIsReportOpen(true)}><FileText size={14} /> CISO Report</button>
                <span className={`status-pill status-${selectedIncident.status.toLowerCase()}`}>{selectedIncident.status.replace(/_/g, ' ')}</span>
                {(selectedIncident.status === 'AI_ANALYSIS_FAILED' || selectedIncident.confidence === 0) && (
                  <button className="btn" onClick={() => handleReAnalyze(selectedIncident.id)} disabled={isAnalyzing}>
                    {isAnalyzing ? '⟳ Analyzing...' : '⟳ Re-Analyze'}
                  </button>
                )}
              </div>
            </div>

            {/* Navigation Tabs Bar */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
              <button
                className={`btn ${detailTab === 'overview' ? 'btn-solid' : ''}`}
                onClick={() => setDetailTab('overview')}
                style={{ padding: '8px 20px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Search size={14} /> Incident Overview & Evidence
              </button>
              <button
                className={`btn ${detailTab === 'graph' ? 'btn-solid' : ''}`}
                onClick={() => setDetailTab('graph')}
                style={{ padding: '8px 20px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Network size={14} /> Blast Radius Attack Graph
              </button>
            </div>

            {/* Attack Graph Tab View */}
            {detailTab === 'graph' && (
              <div style={{ marginBottom: '24px' }}>
                <AttackGraph incident={selectedIncident} />
              </div>
            )}

            {/* Confidence Bar */}
            {selectedIncident.confidence > 0 && (
              <div className="confidence-bar-wrap card">
                <span>AI Confidence</span>
                <div className="confidence-track">
                  <div className="confidence-fill" style={{ width: `${Math.round(selectedIncident.confidence * 100)}%` }} />
                </div>
                <span className="confidence-val">{Math.round(selectedIncident.confidence * 100)}%</span>
              </div>
            )}

            <div className="details-grid">
              {/* Left Column */}
              <div className="details-left">
                <div className="card section-card">
                  <h3>AI Summary</h3>
                  <p className="analysis-text">{safe(selectedIncident.ai_analysis).summary || 'No summary available.'}</p>
                </div>

                <div className="card section-card">
                  <h3>Technical Analysis</h3>
                  <p className="analysis-text">{safe(selectedIncident.ai_analysis).analysis || 'No analysis available.'}</p>
                </div>

                <div className="card section-card">
                  <h3>Evidence</h3>
                  <ul className="evidence-list">
                    {(safe(selectedIncident.ai_analysis, {}).evidence || []).map((e: string, i: number) => (
                      <li key={i} className="evidence-item"><span className="evidence-dot" />  {e}</li>
                    ))}
                  </ul>
                </div>

                <div className="card section-card">
                  <h3>Attack Indicators</h3>
                  <div className="indicators-wrap">
                    {(safe(selectedIncident.ai_analysis, {}).attack_indicators || []).map((ind: string, i: number) => (
                      <span key={i} className="indicator-tag">{ind}</span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Column */}
              <div className="details-right">
                <div className="card section-card">
                  <h3>Incident Metadata</h3>
                  <ul className="meta-list">
                    <li><strong>Type</strong><span>{selectedIncident.type}</span></li>
                    <li><strong>Source</strong><span>{selectedIncident.source}</span></li>
                    <li><strong>Region</strong><span>{selectedIncident.affected_resources}</span></li>
                    <li><strong>Created</strong><span>{new Date(selectedIncident.created_at).toLocaleString()}</span></li>
                    <li><strong>Approval</strong><span>{selectedIncident.approval_status}</span></li>
                  </ul>
                </div>

                {/* Remediation */}
                <div className="card section-card remediation-card">
                  <h3>Recommended Remediation</h3>
                  <ol className="remediation-list">
                    {(safe(selectedIncident.recommended_actions, []) as string[]).map((a, i) => (
                      <li key={i}>{a}</li>
                    ))}
                  </ol>
                  <p className="justification-text">{safe(selectedIncident.ai_analysis, {}).justification}</p>

                  {selectedIncident.approval_status === 'PENDING' && (
                    <div className="approval-section">
                      <p className="warning-text">⚠️ High-impact remediation requires analyst approval</p>
                      <div className="approval-actions">
                        <button className="btn btn-solid" onClick={() => handleApprove(selectedIncident.id)}>✓ APPROVE & SIMULATE</button>
                        <button className="btn btn-danger" onClick={() => handleReject(selectedIncident.id)}>✕ REJECT</button>
                      </div>
                    </div>
                  )}
                  {selectedIncident.approval_status !== 'PENDING' && (
                    <div className="approval-done">
                      <span>{selectedIncident.approval_status === 'APPROVED' ? '✓ Remediation Approved & Simulated' : '✕ Remediation Rejected'}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* AI Chat */}
            <div className="card chat-card">
              <div className="chat-header">
                <h3>ASA Security Assistant</h3>
                <span className="ai-badge">Powered by ASA AI</span>
              </div>
              <p className="text-secondary" style={{ fontSize: 13, marginBottom: 15 }}>
                Ask ASA anything about this incident — correlation, containment steps, root cause analysis.
              </p>
              <div className="chat-window">
                {chatMessages.length === 0
                  ? <div className="chat-empty">Ask a question below to get expert AI analysis on this incident.</div>
                  : chatMessages.map((m, i) => (
                    <div key={i} className={`chat-message ${m.sender}`}>
                      <strong>{m.sender === 'user' ? 'Analyst' : 'ASA AI'}</strong>
                      <p>{m.text}</p>
                    </div>
                  ))}
                {isChatting && <div className="chat-message ai"><strong>ASA AI</strong><p className="thinking">Thinking...</p></div>}
              </div>
              <div className="chat-input-area">
                <input
                  type="text" value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !isChatting && handleChat()}
                  placeholder="e.g. What should I do first? Is this a known attack pattern?"
                  className="chat-input"
                  disabled={isChatting}
                />
                <button className="btn btn-solid chat-btn" onClick={handleChat} disabled={isChatting || !chatInput.trim()}>Send</button>
              </div>
            </div>
          </div>
        )}
      </main>

      <FloatingChatbot incidents={incidents} stats={stats} />

      {/* Modals */}
      <AttackSimulatorModal
        isOpen={isSimulatorOpen}
        onClose={() => setIsSimulatorOpen(false)}
        onSimulationTriggered={fetchData}
      />

      <PlaybookExporterModal
        incident={selectedIncident}
        isOpen={isPlaybookOpen}
        onClose={() => setIsPlaybookOpen(false)}
      />

      <ExecutiveReportModal
        incident={selectedIncident}
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
      />
    </div>
  );
}

export default App;
