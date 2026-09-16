import { useState, useEffect } from 'react';
import { Zap, X, Play, Terminal } from 'lucide-react';

const API_URL = import.meta.env.DEV ? 'http://localhost:3001/api' : 'https://aws-project-asa-backend.onrender.com/api';

interface Scenario {
  id: string;
  file: string;
  title: string;
  severity: string;
  source: string;
  resource: string;
  data: any;
}

interface AttackSimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSimulationTriggered: () => void;
}

export const AttackSimulatorModal: React.FC<AttackSimulatorModalProps> = ({
  isOpen,
  onClose,
  onSimulationTriggered
}) => {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeScenario, setActiveScenario] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [isSimulating, setIsSimulating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchScenarios();
    }
  }, [isOpen]);

  const fetchScenarios = async () => {
    try {
      const res = await fetch(`${API_URL}/simulation/scenarios`);
      const data = await res.json();
      setScenarios(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleRunSimulation = async (scenario: Scenario) => {
    setActiveScenario(scenario.id);
    setIsSimulating(true);
    setLogs([
      `[SIMULATOR] Initializing attack scenario: ${scenario.title}`,
      `[INGESTION] Connecting to AWS CloudTrail / GuardDuty telemetric pipeline...`,
      `[LOG EVENT] Source IP: ${scenario.data.ip || '198.51.100.42'} | Event: ${scenario.data.event_type}`,
      `[PAYLOAD] ${JSON.stringify(scenario.data)}`
    ]);

    try {
      const res = await fetch(`${API_URL}/simulation/trigger`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenarioId: scenario.id, rawData: scenario.data })
      });

      const result = await res.json();

      setLogs(prev => [
        ...prev,
        `[SUCCESS] Security Event Ingested Successfully! Incident ID: ${result.incident?.id}`,
        `[AI PIPELINE] Correlation engine triggered Gemini 3.6 Flash Incident Analysis.`
      ]);

      setTimeout(() => {
        onSimulationTriggered();
      }, 1000);
    } catch {
      setLogs(prev => [...prev, `[ERROR] Failed to send simulation log to backend.`]);
    } finally {
      setIsSimulating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1100, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ background: '#081426', border: '1px solid rgba(100,255,218,0.3)', borderRadius: '16px', width: '100%', maxWidth: '850px', maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.8)' }}>
        {/* Header */}
        <div style={{ padding: '18px 24px', background: 'rgba(13,29,53,0.9)', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Zap size={18} /> SOC Attack Scenario Simulator
            </h3>
            <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64ffda', opacity: 0.85 }}>
              Inject simulated AWS security events live into the detection & remediation engine
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#8892b0', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={20} /></button>
        </div>

        {/* Content Body */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#64ffda' }}>Loading Attack Scenarios...</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '14px' }}>
              {scenarios.map(sc => (
                <div
                  key={sc.id}
                  style={{
                    background: activeScenario === sc.id ? 'rgba(100,255,218,0.12)' : 'rgba(13,29,53,0.6)',
                    border: activeScenario === sc.id ? '1px solid #64ffda' : '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '10px',
                    padding: '16px',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onClick={() => !isSimulating && handleRunSimulation(sc)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '10px', fontWeight: 800, padding: '2px 8px', borderRadius: '4px', background: sc.severity === 'CRITICAL' ? 'rgba(255,77,77,0.2)' : 'rgba(255,152,0,0.2)', color: sc.severity === 'CRITICAL' ? '#ff6b6b' : '#ffb74d' }}>
                      {sc.severity}
                    </span>
                    <span style={{ fontSize: '11px', color: '#8892b0' }}>{sc.source}</span>
                  </div>
                  <h4 style={{ margin: '0 0 6px', fontSize: '14px', color: '#ffffff', fontWeight: 700 }}>{sc.title}</h4>
                  <div style={{ fontSize: '11px', color: '#8892b0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    Target: {sc.resource}
                  </div>
                  <button
                    disabled={isSimulating}
                    style={{
                      marginTop: '12px',
                      width: '100%',
                      padding: '8px',
                      borderRadius: '6px',
                      background: 'linear-gradient(135deg, #64ffda, #4db6ac)',
                      border: 'none',
                      color: '#061526',
                      fontWeight: 800,
                      fontSize: '12px',
                      cursor: isSimulating ? 'not-allowed' : 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                    }}
                  >
                    {isSimulating && activeScenario === sc.id ? <><Zap size={14} /> Injecting...</> : <><Play size={14} /> Launch Attack</>}
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Terminal Output */}
          {logs.length > 0 && (
            <div style={{ background: '#030a16', border: '1px solid rgba(100,255,218,0.2)', borderRadius: '10px', padding: '16px', fontFamily: 'monospace', fontSize: '12px', color: '#64ffda', maxHeight: '180px', overflowY: 'auto' }}>
              <div style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '6px', marginBottom: '8px', color: '#8892b0', fontSize: '11px', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Terminal size={14} /> Live Terminal Log Ingestion Stream
              </div>
              {logs.map((log, idx) => (
                <div key={idx} style={{ marginBottom: '4px', wordBreak: 'break-all' }}>{log}</div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
