import { useState, useEffect } from 'react';
import type { Incident } from '../types';

const API_URL = import.meta.env.DEV ? 'http://localhost:3001/api' : 'https://aws-project-asa-backend.onrender.com/api';

interface ExecutiveReportModalProps {
  incident: Incident | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ExecutiveReportModal: React.FC<ExecutiveReportModalProps> = ({ incident, isOpen, onClose }) => {
  const [report, setReport] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && incident) {
      fetchReport();
    }
  }, [isOpen, incident]);

  const fetchReport = async () => {
    if (!incident) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/incidents/${incident.id}/report`);
      const data = await res.json();
      setReport(data.report || '');
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (!isOpen || !incident) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1100, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ background: '#0b192e', border: '1px solid rgba(100,255,218,0.3)', borderRadius: '16px', width: '100%', maxWidth: '850px', maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.9)' }}>
        {/* Header */}
        <div style={{ padding: '18px 24px', background: 'rgba(13,29,53,0.95)', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
              📄 CISO Executive Incident Report
            </h3>
            <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64ffda' }}>
              Formal SOC Audit Document · ID: {incident.id}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button
              onClick={handlePrint}
              style={{
                background: 'linear-gradient(135deg, #64ffda, #4db6ac)',
                color: '#061526',
                border: 'none',
                padding: '6px 16px', borderRadius: '6px', fontSize: '12px', fontWeight: 800, cursor: 'pointer'
              }}
            >
              🖨️ Print / Save PDF
            </button>
            <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#8892b0', fontSize: '20px', cursor: 'pointer' }}>✕</button>
          </div>
        </div>

        {/* Content Body */}
        <div style={{ padding: '28px', overflowY: 'auto', flex: 1, background: '#071224', color: '#e6f1ff', lineHeight: 1.7, fontSize: '14px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#64ffda' }}>Generating CISO Incident Report...</div>
          ) : (
            <div style={{ whiteSpace: 'pre-wrap', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
              {report}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
