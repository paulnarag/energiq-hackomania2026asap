import { useState } from 'react';
import { Brain, Zap, AlertTriangle, TrendingUp, Clock, Loader } from 'lucide-react';

const CATEGORY_ICONS = {
  STANDBY: Clock,
  PEAK: Zap,
  ANOMALY: AlertTriangle,
  PROGRESS: TrendingUp,
};

const PRIORITY_COLORS = {
  HIGH: 'var(--red)',
  MEDIUM: 'var(--yellow)',
  LOW: 'var(--green)',
};

function AIInsightsScreen({ onBack }) {
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [analyticsSum, setAnalyticsSum] = useState(null);
  const [insightSource, setInsightSource] = useState('');
  const [sourceWarning, setSourceWarning] = useState('');
  const [modelUsed, setModelUsed] = useState('');

  const fetchInsights = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/insights/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          generated_dir: 'generated_data',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to generate insights');
      }

      const data = await response.json();
      setInsights(data.insights);
      setAnalyticsSum(data.analytics_summary);
      setInsightSource(data.source || '');
      setSourceWarning(data.warning || '');
      setModelUsed(data.model || '');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getPriorityBadgeStyle = (priority) => ({
    backgroundColor: PRIORITY_COLORS[priority] || 'var(--glass-bg)',
    color: 'white',
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '0.75rem',
    fontWeight: 600,
    textTransform: 'uppercase',
  });

  return (
    <div className="screen-container">
      <div className="nav-bar">
        <button className="nav-back" onClick={onBack}>
          ← Back
        </button>
        <h1>
          <Brain size={24} style={{ marginRight: '8px' }} />
          AI Insights
        </h1>
      </div>

      <div style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto' }}>
        {/* Header Section */}
        <div className="glass-panel" style={{ marginBottom: '24px', textAlign: 'center' }}>
          <h2 style={{ marginBottom: '12px', color: 'var(--primary)' }}>
            Personalized Energy Insights
          </h2>
          <p className="body-text" style={{ marginBottom: '24px' }}>
            AI-powered recommendations based on your actual usage patterns
          </p>

          {!insights && (
            <button
              onClick={fetchInsights}
              disabled={loading}
              className="btn-primary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                opacity: loading ? 0.6 : 1,
              }}
            >
              {loading ? (
                <>
                  <Loader size={18} className="spin" />
                  Generating Insights...
                </>
              ) : (
                <>
                  <Brain size={18} />
                  Generate AI Insights
                </>
              )}
            </button>
          )}

          {insights && (
            <button
              onClick={fetchInsights}
              disabled={loading}
              className="btn-primary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: 'var(--glass-bg)',
              }}
            >
              <Brain size={18} />
              Regenerate
            </button>
          )}
        </div>

        {/* Error State */}
        {error && (
          <div
            className="glass-panel"
            style={{
              backgroundColor: 'rgba(255, 100, 100, 0.15)',
              border: '1px solid var(--red)',
              marginBottom: '24px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <AlertTriangle size={24} color="var(--red)" />
              <div>
                <h3 style={{ color: 'var(--red)', margin: 0 }}>Error</h3>
                <p className="body-text" style={{ margin: '4px 0 0 0' }}>
                  {error}
                </p>
                {error.includes('credentials') && (
                  <p className="small-text" style={{ marginTop: '8px', opacity: 0.8 }}>
                    Set PUTER_USERNAME and PUTER_PASSWORD environment variables in your backend.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Analytics Summary */}
        {analyticsSum && (
          <div
            className="glass-panel"
            style={{
              marginBottom: '24px',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '16px',
            }}
          >
            <div>
              <div className="small-text" style={{ opacity: 0.7 }}>
                Energy Score
              </div>
              <div className="h2" style={{ color: 'var(--primary)' }}>
                {analyticsSum.energy_score}/100
              </div>
            </div>
            <div>
              <div className="small-text" style={{ opacity: 0.7 }}>
                Monthly Usage
              </div>
              <div className="h2">{analyticsSum.monthly_consumption} kWh</div>
            </div>
            <div>
              <div className="small-text" style={{ opacity: 0.7 }}>
                Est. Bill
              </div>
              <div className="h2" style={{ color: 'var(--yellow)' }}>
                S${analyticsSum.estimated_bill}
              </div>
            </div>
            <div>
              <div className="small-text" style={{ opacity: 0.7 }}>
                Peak Ratio
              </div>
              <div className="h2">{analyticsSum.peak_ratio}%</div>
            </div>
          </div>
        )}

        {insightSource && (
          <div
            className="glass-panel"
            style={{
              marginBottom: '24px',
              border: insightSource === 'puter' ? '1px solid var(--success)' : '1px solid var(--warning)',
              backgroundColor: insightSource === 'puter' ? 'rgba(47, 122, 79, 0.08)' : 'rgba(201, 129, 42, 0.12)',
            }}
          >
            <div className="small-text" style={{ color: 'var(--text-primary)' }}>
              {insightSource === 'puter'
                ? `AI source: Puter${modelUsed ? ` (${modelUsed})` : ''}`
                : 'AI source: Local fallback insights'}
            </div>
            {sourceWarning && (
              <div className="small-text" style={{ marginTop: '6px', opacity: 0.85 }}>
                {sourceWarning}
              </div>
            )}
          </div>
        )}

        {/* Insight Cards */}
        {insights && insights.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {insights.map((insight, idx) => {
              const IconComponent = CATEGORY_ICONS[insight.category] || Brain;

              return (
                <div
                  key={idx}
                  className="glass-panel"
                  style={{
                    border: `1px solid ${PRIORITY_COLORS[insight.priority] || 'var(--glass-border)'}`,
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  {/* Priority stripe */}
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '4px',
                      height: '100%',
                      backgroundColor: PRIORITY_COLORS[insight.priority] || 'var(--glass-border)',
                    }}
                  />

                  <div style={{ paddingLeft: '12px' }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        justifyContent: 'space-between',
                        marginBottom: '12px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                        <IconComponent
                          size={28}
                          color={PRIORITY_COLORS[insight.priority] || 'var(--primary)'}
                        />
                        <h3 style={{ margin: 0, flex: 1 }}>{insight.headline}</h3>
                      </div>
                      <div style={getPriorityBadgeStyle(insight.priority)}>{insight.priority}</div>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        gap: '8px',
                        marginBottom: '12px',
                        flexWrap: 'wrap',
                      }}
                    >
                      <span
                        className="small-text"
                        style={{
                          backgroundColor: 'var(--glass-bg)',
                          padding: '4px 10px',
                          borderRadius: '8px',
                        }}
                      >
                        {insight.category}
                      </span>
                      {insight.saving && (
                        <span
                          className="small-text"
                          style={{
                            backgroundColor: 'rgba(100, 255, 100, 0.2)',
                            color: 'var(--green)',
                            padding: '4px 10px',
                            borderRadius: '8px',
                            fontWeight: 600,
                          }}
                        >
                          💰 {insight.saving}
                        </span>
                      )}
                    </div>

                    <p className="body-text" style={{ marginBottom: '16px' }}>
                      {insight.explanation}
                    </p>

                    <div
                      style={{
                        backgroundColor: 'rgba(100, 200, 255, 0.1)',
                        padding: '12px',
                        borderRadius: '8px',
                        borderLeft: '3px solid var(--primary)',
                      }}
                    >
                      <div
                        className="small-text"
                        style={{ opacity: 0.7, marginBottom: '4px', textTransform: 'uppercase' }}
                      >
                        Recommended Action
                      </div>
                      <div className="body-text" style={{ fontWeight: 500 }}>
                        {insight.action}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Loading State */}
        {loading && !insights && (
          <div style={{ textAlign: 'center', padding: '48px' }}>
            <Loader size={48} className="spin" style={{ margin: '0 auto 16px' }} />
            <p className="body-text">Analyzing your energy patterns...</p>
            <p className="small-text" style={{ opacity: 0.7 }}>
              This may take 10-20 seconds
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default AIInsightsScreen;
