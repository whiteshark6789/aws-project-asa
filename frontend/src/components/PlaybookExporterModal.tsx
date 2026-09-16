import { useState, useEffect } from 'react';
import type { Incident } from '../types';
import { Wrench, X, Lightbulb, Terminal, Box, Zap, Check, Clipboard } from 'lucide-react';

const API_URL = import.meta.env.DEV ? 'http://localhost:3001/api' : 'https://aws-project-asa-backend.onrender.com/api';

interface PlaybookData {
  incident_id: string;
  incident_title: string;
  aws_cli: string;
  terraform_hcl: string;
  lambda_js: string;
  description: string;
}

interface PlaybookExporterModalProps {
  incident: Incident | null;
  isOpen: boolean;
  onClose: () => void;
}

export const PlaybookExporterModal: React.FC<PlaybookExporterModalProps> = ({ incident, isOpen, onClose }) => {
  const [playbook, setPlaybook] = useState<PlaybookData | null>(null);
  const [activeTab, setActiveTab] = useState<'cli' | 'terraform' | 'lambda'>('cli');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && incident) {
      fetchPlaybook();
    }
  }, [isOpen, incident]);

  const fetchPlaybook = async () => {
    if (!incident) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/incidents/${incident.id}/playbook`);
      const data = await res.json();
      setPlaybook(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!playbook) return;
    const textToCopy = activeTab === 'cli' ? playbook.aws_cli : activeTab === 'terraform' ? playbook.terraform_hcl : playbook.lambda_js;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen || !incident) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1100, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ background: '#081426', border: '1px solid rgba(100,255,218,0.3)', borderRadius: '16px', width: '100%', maxWidth: '800px', maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.8)' }}>
        {/* Header */}
        <div style={{ padding: '18px 24px', background: 'rgba(13,29,53,0.9)', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Wrench size={17} /> Executable Playbook & Code Exporter
            </h3>
            <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64ffda' }}>
              Incident: {incident.title}
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#8892b0', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={20} /></button>
        </div>

        {/* Content Body */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#64ffda' }}>Generating Executable Remediation Snippets...</div>
          ) : playbook ? (
            <>
              <div style={{ background: 'rgba(13,29,53,0.6)', padding: '12px 16px', borderRadius: '8px', borderLeft: '3px solid #64ffda', fontSize: '13px', color: '#e6f1ff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Lightbulb size={16} /> <span><strong>Playbook Overview</strong>: {playbook.description}</span>
              </div>

              {/* Tabs Bar */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '8px' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => setActiveTab('cli')}
                    style={{
                      padding: '6px 14px', borderRadius: '6px', border: 'none', fontSize: '12px', fontWeight: 700, cursor: 'pointer',
                      background: activeTab === 'cli' ? '#64ffda' : 'rgba(255,255,255,0.05)',
                      color: activeTab === 'cli' ? '#061526' : '#8892b0',
                      display: 'flex', alignItems: 'center', gap: '6px'
                    }}
                  >
                    <Terminal size={14} /> AWS CLI Script
                  </button>
                  <button
                    onClick={() => setActiveTab('terraform')}
                    style={{
                      padding: '6px 14px', borderRadius: '6px', border: 'none', fontSize: '12px', fontWeight: 700, cursor: 'pointer',
                      background: activeTab === 'terraform' ? '#64ffda' : 'rgba(255,255,255,0.05)',
                      color: activeTab === 'terraform' ? '#061526' : '#8892b0',
                      display: 'flex', alignItems: 'center', gap: '6px'
                    }}
                  >
                    <Box size={14} /> Terraform HCL
                  </button>
                  <button
                    onClick={() => setActiveTab('lambda')}
                    style={{
                      padding: '6px 14px', borderRadius: '6px', border: 'none', fontSize: '12px', fontWeight: 700, cursor: 'pointer',
                      background: activeTab === 'lambda' ? '#64ffda' : 'rgba(255,255,255,0.05)',
                      color: activeTab === 'lambda' ? '#061526' : '#8892b0',
                      display: 'flex', alignItems: 'center', gap: '6px'
                    }}
                  >
                    <Zap size={14} /> AWS Lambda Node.js
                  </button>
                </div>

                <button
                  onClick={handleCopy}
                  style={{
                    background: copied ? '#81c784' : 'rgba(100,255,218,0.15)',
                    color: copied ? '#061526' : '#64ffda',
                    border: '1px solid rgba(100,255,218,0.3)',
                    padding: '6px 16px', borderRadius: '6px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s',
                    display: 'flex', alignItems: 'center', gap: '6px'
                  }}
                >
                  {copied ? <><Check size={14} /> Copied to Clipboard!</> : <><Clipboard size={14} /> Copy Code</>}
                </button>
              </div>

              {/* Code Box */}
              <div style={{ background: '#030a16', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '16px', fontFamily: 'monospace', fontSize: '13px', color: '#64ffda', overflowX: 'auto', whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
                {activeTab === 'cli' ? playbook.aws_cli : activeTab === 'terraform' ? playbook.terraform_hcl : playbook.lambda_js}
              </div>
            </>
          ) : (
            <div style={{ color: '#ff6b6b' }}>Failed to load playbook data.</div>
          )}
        </div>
      </div>
    </div>
  );
};
