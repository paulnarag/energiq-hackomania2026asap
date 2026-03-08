import React from 'react';
import { AlertTriangle, Clock3, TrendingUp, Zap } from 'lucide-react';

const getCategoryIcon = (category) => {
  switch (category) {
    case 'STANDBY':
      return <Clock3 size={20} className="text-danger" />;
    case 'PEAK':
      return <Zap size={20} className="text-warning" />;
    case 'ANOMALY':
      return <AlertTriangle size={20} className="text-danger" />;
    case 'PROGRESS':
      return <TrendingUp size={20} className="text-success" />;
    default:
      return <Zap size={20} className="text-info" />;
  }
};

const getPriorityClass = (priority) => {
  if (priority === 'HIGH') return 'bg-danger-light border border-danger/30';
  if (priority === 'MEDIUM') return 'bg-warning-light border border-warning/30';
  return 'glass-panel';
};

const formatMoney = (value) => Number(value || 0).toFixed(2);

const ApplianceChart = ({ appliances }) => {
  if (!appliances || appliances.length === 0) return null;

  const maxKwh = Math.max(...appliances.map((a) => a.kwh), 1);
  const colors = ['var(--accent-primary)', 'var(--warning)', 'var(--info)'];

  return (
    <div className="p-4 bg-bg-primary rounded-lg mb-4" style={{ borderRadius: 8, border: '1px solid var(--glass-border)' }}>
      <div className="small-text uppercase font-semibold text-accent mb-3" style={{ letterSpacing: '0.05em' }}>
        Top Appliances
      </div>
      <div className="flex-col gap-3">
        {appliances.map((app, idx) => (
          <div key={idx} className="flex-col gap-1">
            <div className="flex-row justify-between items-center">
              <span className="small-text font-semibold">{app.name}</span>
              <span className="small-text font-bold text-accent">{app.pct}%</span>
            </div>
            <div style={{ width: '100%', height: 24, background: 'var(--bg-secondary)', borderRadius: 4, overflow: 'hidden', border: '1px solid var(--glass-border)' }}>
              <div
                style={{
                  width: `${(app.kwh / maxKwh) * 100}%`,
                  height: '100%',
                  background: colors[idx] || 'var(--accent-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  paddingLeft: 6,
                  fontSize: '11px',
                  fontWeight: 600,
                  color: '#fff',
                  transition: 'width 0.3s ease',
                }}
              >
                {app.kwh.toFixed(0)} kWh
              </div>
            </div>
            <div className="small-text" style={{ opacity: 0.7 }}>
              S${app.cost}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const InsightsScreen = ({ data }) => {
  const aiInsights = Array.isArray(data?.aiInsights) ? data.aiInsights : [];

  return (
    <div className="flex-col gap-4 p-4 animate-fade-in">
      <div className="flex-col gap-1 mb-2">
        <h2 className="h2">AI Insights</h2>
        <span className="body-text">Powered by EnergiQ</span>
      </div>

      <div className="flex-col gap-4">
        {aiInsights.map((insight, index) => (
          <div
            key={insight.id}
            className={`${getPriorityClass(insight.priority)} p-4`}
            style={{ borderRadius: 'var(--radius-lg)', animationDelay: `${index * 100}ms` }}
          >
            <div className="flex-row items-center gap-3 mb-3">
              <div className="p-2 bg-bg-secondary rounded-full" style={{ borderRadius: '50%' }}>
                {getCategoryIcon(insight.category)}
              </div>
              <div className="flex-col flex-1 gap-1">
                <span className="small-text uppercase font-semibold" style={{ letterSpacing: '0.06em' }}>
                  Insight {index + 1}
                </span>
                <span className="h3">{insight.headline}</span>
              </div>
            </div>

            <div className="flex-row gap-2 mb-3" style={{ flexWrap: 'wrap' }}>
              <span className="small-text uppercase font-semibold bg-bg-primary p-2" style={{ borderRadius: 8 }}>
                Category: {insight.category}
              </span>
              <span className="small-text uppercase font-semibold bg-bg-primary p-2" style={{ borderRadius: 8 }}>
                Priority: {insight.priority}
              </span>
            </div>

            <p className="body-text mb-4" style={{ lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
              {insight.body}
            </p>

            {insight.applianceChart && <ApplianceChart appliances={insight.applianceChart} />}

            <div className="p-4 bg-bg-primary rounded-lg mb-4" style={{ borderRadius: 8, border: '1px solid var(--glass-border)' }}>
              <div className="small-text uppercase font-semibold text-accent mb-2" style={{ letterSpacing: '0.05em' }}>
                Recommended Action
              </div>
              <div className="body-text">{insight.actionText}</div>
            </div>

            <div className="flex-row justify-between items-center mt-2 pt-4 border-t" style={{ borderColor: 'var(--glass-border)' }}>
              <span className="small-text font-semibold">Estimated Savings</span>
              <span className="h3 text-success">S${formatMoney(insight.estimatedSaving)}/month</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default InsightsScreen;
