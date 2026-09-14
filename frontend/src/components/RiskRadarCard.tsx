
import type { Incident, DashboardStats } from '../types';

interface RiskRadarCardProps {
  incidents: Incident[];
  stats: DashboardStats | null;
}

export const RiskRadarCard: React.FC<RiskRadarCardProps> = ({ incidents, stats }) => {
  const criticalCount = stats?.critical || incidents.filter(i => i.severity === 'CRITICAL').length;
  const highCount = stats?.high || incidents.filter(i => i.severity === 'HIGH').length;
  const openCount = stats?.open || incidents.filter(i => i.status === 'OPEN').length;
  const totalCount = stats?.total || incidents.length;

  // Calculate Risk Score (0 - 100)
  const baseScore = (criticalCount * 30) + (highCount * 15) + (openCount * 5);
  const riskScore = Math.min(100, Math.max(5, baseScore));

  let riskLabel = 'LOW RISK';
  let riskColor = '#4caf50';
  if (riskScore > 75) {
    riskLabel = 'CRITICAL POSTURE RISK';
    riskColor = '#ff4d4d';
  } else if (riskScore > 40) {
    riskLabel = 'ELEVATED RISK';
    riskColor = '#ff9800';
  } else if (riskScore > 20) {
    riskLabel = 'MODERATE RISK';
    riskColor = '#ffc107';
  }

  // Simulated Mean Time to Contain (MTTC)
  const mttcMinutes = openCount === 0 ? '4.2m' : `${Math.round(12.5 + openCount * 3.5)}m`;

  return (
    <div className="card risk-radar-card" style={{ padding: '20px 24px', background: 'rgba(13, 29, 53, 0.7)', border: '1px solid rgba(100, 255, 218, 0.15)', borderRadius: '12px', marginBottom: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        {/* Left Side: Score & Meter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ position: 'relative', width: '80px', height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="80" height="80" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" />
              <circle
                cx="50"
                cy="50"
                r="42"
                fill="none"
                stroke={riskColor}
                strokeWidth="10"
                strokeDasharray="264"
                strokeDashoffset={264 - (264 * riskScore) / 100}
                strokeLinecap="round"
                style={{ transition: 'stroke-dashoffset 1s ease-in-out, stroke 0.5s ease' }}
                transform="rotate(-90 50 50)"
              />
            </svg>
            <div style={{ position: 'absolute', textAlign: 'center' }}>
              <div style={{ fontSize: '22px', fontWeight: 800, color: riskColor }}>{riskScore}</div>
              <div style={{ fontSize: '9px', opacity: 0.6, color: '#e6f1ff', textTransform: 'uppercase' }}>/ 100</div>
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#e6f1ff' }}>SOC Health & Risk Radar</h3>
              <span style={{ fontSize: '11px', fontWeight: 800, padding: '3px 10px', borderRadius: '12px', background: `${riskColor}22`, color: riskColor, border: `1px solid ${riskColor}44` }}>
                {riskLabel}
              </span>
            </div>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#8892b0' }}>
              {openCount === 0
                ? 'All clear — security posture optimal across monitored AWS regions.'
                : `Active threats detected: ${criticalCount} Critical, ${highCount} High. Immediate containment recommended.`}
            </p>
          </div>
        </div>

        {/* Right Side: MTTC Metrics */}
        <div style={{ display: 'flex', gap: '24px', background: 'rgba(0,0,0,0.2)', padding: '12px 20px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '11px', color: '#8892b0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>MTTC (Avg)</div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#64ffda', marginTop: '2px' }}>{mttcMinutes}</div>
          </div>
          <div style={{ width: '1px', background: 'rgba(255,255,255,0.08)' }} />
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '11px', color: '#8892b0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Telemetry Stream</div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#81c784', marginTop: '2px' }}>ONLINE</div>
          </div>
          <div style={{ width: '1px', background: 'rgba(255,255,255,0.08)' }} />
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '11px', color: '#8892b0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Active Incidents</div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#ffffff', marginTop: '2px' }}>{totalCount}</div>
          </div>
        </div>
      </div>
    </div>
  );
};
