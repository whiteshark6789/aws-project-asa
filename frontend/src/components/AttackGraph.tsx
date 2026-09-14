
import type { Incident } from '../types';

interface AttackGraphProps {
  incident: Incident;
}

export const AttackGraph: React.FC<AttackGraphProps> = ({ incident }) => {
  let aiData: any = {};
  try {
    aiData = JSON.parse(incident.ai_analysis);
  } catch {}

  const resources = Array.isArray(aiData.affected_resources) ? aiData.affected_resources : [incident.affected_resources];
  const primaryResource = resources[0] || 'AWS Cloud Resource';
  const indicators = aiData.attack_indicators || ['Unauthorized Access', 'Suspicious IP'];
  const actor = aiData.evidence?.[1] || 'Unidentified Actor / IAM Principal';
  const ip = aiData.evidence?.[0] || '198.51.100.42 (Untrusted Source IP)';

  return (
    <div style={{ background: 'rgba(6, 15, 30, 0.85)', border: '1px solid rgba(100,255,218,0.2)', borderRadius: '12px', padding: '24px', position: 'relative', overflow: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '15px', color: '#64ffda', textTransform: 'uppercase', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            🕸️ Attack Path & Blast Radius Visualization
          </h3>
          <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#8892b0' }}>
            Visual topological map of threat entry vectors, compromised identities, and targeted assets.
          </p>
        </div>
        <span style={{ fontSize: '11px', fontWeight: 800, padding: '4px 12px', borderRadius: '16px', background: 'rgba(255,77,77,0.15)', color: '#ff6b6b', border: '1px solid rgba(255,77,77,0.3)' }}>
          BLAST RADIUS: CONTAINMENT PENDING
        </span>
      </div>

      {/* SVG Canvas Map */}
      <div style={{ width: '100%', height: '240px', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="100%" height="100%" viewBox="0 0 800 220" style={{ overflow: 'visible' }}>
          <defs>
            <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ff4d4d" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#64ffda" stopOpacity="0.8" />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Blast Radius Zone Circle */}
          <circle cx="560" cy="110" r="85" fill="rgba(255, 77, 77, 0.05)" stroke="rgba(255, 77, 77, 0.3)" strokeDasharray="4,4" filter="url(#glow)" />
          <text x="560" y="210" textAnchor="middle" fill="#ff6b6b" fontSize="10" fontWeight="bold">BLAST RADIUS ZONE</text>

          {/* Connection Lines */}
          <line x1="120" y1="110" x2="330" y2="110" stroke="url(#lineGrad)" strokeWidth="3" filter="url(#glow)" />
          <line x1="330" y1="110" x2="560" y2="110" stroke="url(#lineGrad)" strokeWidth="3" strokeDasharray="6,4" filter="url(#glow)" />
          <line x1="560" y1="110" x2="720" y2="60" stroke="#ff4d4d" strokeWidth="2" strokeDasharray="3,3" />
          <line x1="560" y1="110" x2="720" y2="160" stroke="#ff4d4d" strokeWidth="2" strokeDasharray="3,3" />

          {/* Animated Particle pulse */}
          <circle cx="225" cy="110" r="4" fill="#ff4d4d" filter="url(#glow)">
            <animate attributeName="cx" from="120" to="330" dur="2s" repeatCount="indefinite" />
          </circle>
          <circle cx="445" cy="110" r="4" fill="#64ffda" filter="url(#glow)">
            <animate attributeName="cx" from="330" to="560" dur="2s" repeatCount="indefinite" />
          </circle>

          {/* NODE 1: Threat Source IP */}
          <g transform="translate(120, 110)">
            <circle r="36" fill="#0d2b45" stroke="#ff4d4d" strokeWidth="2" filter="url(#glow)" />
            <text y="-5" textAnchor="middle" fill="#ffffff" fontSize="18">🌐</text>
            <text y="15" textAnchor="middle" fill="#ff6b6b" fontSize="10" fontWeight="bold">ENTRY IP</text>
            <text y="50" textAnchor="middle" fill="#e6f1ff" fontSize="10">{ip.split(' ')[0]}</text>
          </g>

          {/* NODE 2: Compromised Actor */}
          <g transform="translate(330, 110)">
            <circle r="36" fill="#0d2b45" stroke="#ffb74d" strokeWidth="2" filter="url(#glow)" />
            <text y="-5" textAnchor="middle" fill="#ffffff" fontSize="18">👤</text>
            <text y="15" textAnchor="middle" fill="#ffb74d" fontSize="10" fontWeight="bold">ACTOR / IAM</text>
            <text y="50" textAnchor="middle" fill="#e6f1ff" fontSize="10">{actor.slice(0, 18)}</text>
          </g>

          {/* NODE 3: Target Resource */}
          <g transform="translate(560, 110)">
            <circle r="40" fill="#061526" stroke="#64ffda" strokeWidth="3" filter="url(#glow)" />
            <text y="-5" textAnchor="middle" fill="#ffffff" fontSize="20">☁️</text>
            <text y="15" textAnchor="middle" fill="#64ffda" fontSize="10" fontWeight="bold">TARGET ASSET</text>
            <text y="55" textAnchor="middle" fill="#e6f1ff" fontSize="10" fontWeight="bold">{primaryResource.slice(0, 20)}</text>
          </g>

          {/* NODE 4: Potential Impact A */}
          <g transform="translate(720, 60)">
            <circle r="22" fill="#14355a" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" />
            <text y="4" textAnchor="middle" fill="#ffffff" fontSize="13">🔒</text>
            <text y="36" textAnchor="middle" fill="#8892b0" fontSize="9">Data Access</text>
          </g>

          {/* NODE 5: Potential Impact B */}
          <g transform="translate(720, 160)">
            <circle r="22" fill="#14355a" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" />
            <text y="4" textAnchor="middle" fill="#ffffff" fontSize="13">⚠️</text>
            <text y="36" textAnchor="middle" fill="#8892b0" fontSize="9">Privilege Esc</text>
          </g>
        </svg>
      </div>

      {/* Footer Tags */}
      <div style={{ marginTop: '16px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '11px', color: '#8892b0' }}>Threat Indicators:</span>
        {indicators.map((ind: string, idx: number) => (
          <span key={idx} style={{ fontSize: '11px', background: 'rgba(255,77,77,0.1)', color: '#ff6b6b', padding: '2px 8px', borderRadius: '10px', border: '1px solid rgba(255,77,77,0.2)' }}>
            {ind}
          </span>
        ))}
      </div>
    </div>
  );
};
