import React, { useMemo, useState } from 'react';
import { Check, Sparkles, Gift, Target } from 'lucide-react';

const REWARDS = [
  { title: 'NTUC $5 Coupon', points: 200, tone: 'mint' },
  { title: 'MRT Credit', points: 300, tone: 'peach' },
  { title: 'Coffee Voucher', points: 250, tone: 'sky' },
  { title: 'Grab Discount', points: 450, tone: 'gold' },
];

const buildDataTaskSets = (data) => {
  const metrics = data?.dashboardMetrics || {};
  const benchmark = data?.householdBenchmark || {};
  const applianceBreakdown = Array.isArray(data?.applianceBreakdown) ? data.applianceBreakdown : [];

  const percentageChange = Number(metrics.percentageChange || 0);
  const peakRatio = Number(metrics.peak_ratio_pct || 0);
  const standbyCost = Number(metrics.standby_monthly_cost || 0);
  const anomalies = Number(metrics.anomaly_count || 0);
  const weekendUplift = Number(metrics.weekend_uplift_pct || 0);
  const estimatedBill = Number(benchmark.estMonthlyBill || (Number(metrics.currentMonthUsage || 0) * 0.3278));
  const avgFlatSpend = Number(benchmark.avgMonthlySpend || 0);
  const flatType = String(benchmark.flatType || 'HDB flat');

  const topAppliance = applianceBreakdown
    .slice()
    .sort((a, b) => Number(b.kwh || 0) - Number(a.kwh || 0))[0];
  const topApplianceKwh = Number(topAppliance?.kwh || 0);

  return {
    daily: [
      {
        label: 'Keep peak-hour ratio at or below 45%',
        points: 20,
        done: peakRatio <= 45,
        reason: `Current peak ratio: ${peakRatio.toFixed(1)}%`,
      },
      {
        label: 'Keep standby waste under S$12/month',
        points: 20,
        done: standbyCost <= 12,
        reason: `Current standby cost: S$${standbyCost.toFixed(2)}/mo`,
      },
      {
        label: 'Avoid unusual usage spikes',
        points: 25,
        done: anomalies === 0,
        reason: `Current anomaly count: ${anomalies}`,
      },
    ],
    weekly: [
      {
        label: 'Show week-on-week positive trend',
        points: 35,
        done: percentageChange < 0,
        reason: `Month-on-month change: ${percentageChange.toFixed(1)}%`,
      },
      {
        label: 'Keep weekend uplift below 10%',
        points: 30,
        done: weekendUplift <= 10,
        reason: `Weekend uplift: ${weekendUplift.toFixed(1)}%`,
      },
      {
        label: 'Bring top appliance load below 140 kWh',
        points: 35,
        done: topApplianceKwh > 0 && topApplianceKwh < 140,
        reason: `${topAppliance?.name || 'Top appliance'} usage: ${topApplianceKwh.toFixed(1)} kWh`,
      },
    ],
    monthly: [
      {
        label: 'Reduce total usage by at least 3%',
        points: 60,
        done: percentageChange <= -3,
        reason: `Month-on-month change: ${percentageChange.toFixed(1)}%`,
      },
      {
        label: 'Keep anomalies below 5 for the month',
        points: 55,
        done: anomalies < 5,
        reason: `Current anomaly count: ${anomalies}`,
      },
      {
        label: `Stay below average ${flatType} spend`,
        points: 50,
        done: avgFlatSpend > 0 && estimatedBill <= avgFlatSpend,
        reason: `Your estimate S$${estimatedBill.toFixed(2)} vs avg S$${avgFlatSpend.toFixed(2)}`,
      },
    ],
  };
};

const StreakScreen = ({ data }) => {
  const [tab, setTab] = useState('daily');
  const taskSets = useMemo(() => buildDataTaskSets(data), [data]);
  const metrics = data?.dashboardMetrics || {};

  const tasks = useMemo(() => {
    return taskSets[tab] || [];
  }, [tab, taskSets]);

  const basePoints = Number(metrics.userPoints || data?.userPoints || 0);
  const completedCount = tasks.filter((task) => task.done).length;
  const progressPct = tasks.length ? Math.round((completedCount / tasks.length) * 100) : 0;

  const totalEarned = tasks.reduce((sum, task) => {
    return task.done ? sum + task.points : sum;
  }, 0);
  const points = basePoints + totalEarned;

  return (
    <div className="streak-board animate-fade-in">
      <div className="streak-points-card">
        <div className="streak-points-label">User points</div>
        <div className="streak-points-value">{points}</div>
        <div className="streak-points-note">Complete tasks to stack rewards faster</div>
      </div>

      <div className="streak-progress-card">
        <div className="streak-progress-head">
          <div className="streak-progress-title">
            <Target size={16} />
            <span>{tab} progress</span>
          </div>
          <span>{completedCount}/{tasks.length} done • +{totalEarned} pts</span>
        </div>
        <div className="streak-progress-track">
          <div className="streak-progress-fill" style={{ width: `${progressPct}%` }} />
        </div>
      </div>

      <div className="streak-section">
        <div className="streak-section-title">tasks</div>
        <span className="small-text" style={{ marginBottom: '0.5rem', display: 'block' }}>
          Task completion is automatically verified from your latest energy data.
        </span>
        <div className="streak-tabs">
          {['daily', 'weekly', 'monthly'].map((name) => (
            <button
              key={name}
              className={`streak-tab ${tab === name ? 'active' : ''}`}
              onClick={() => setTab(name)}
            >
              {name}
            </button>
          ))}
        </div>

        <div className="streak-task-list">
          {tasks.map((task) => {
            const key = `${tab}:${task.label}`;
            const isDone = !!task.done;
            return (
              <div
                key={key}
                className={`streak-task-card ${isDone ? 'done' : ''}`}
                title="Auto-tracked task"
              >
                <div className="streak-task-main">
                  <div className="flex-col">
                    <span className="streak-task-text">{task.label}</span>
                    <span className="small-text">{task.reason}</span>
                  </div>
                  <span className="streak-task-points">+{task.points} pts</span>
                </div>
                <div className="streak-task-right">
                  <span className="streak-task-tag">{tab}</span>
                  <span className={`streak-task-check ${isDone ? 'done' : ''}`}>
                    <Check size={15} />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="streak-section">
        <div className="streak-section-title">rewards</div>
        <div className="streak-reward-grid">
          {REWARDS.map((reward) => (
            <div key={reward.title} className={`streak-reward-card tone-${reward.tone}`}>
              <span className="streak-reward-icon"><Gift size={16} /></span>
              <span className="streak-reward-title">{reward.title}</span>
              <span className="streak-reward-points">{reward.points} points</span>
              <button
                className={`streak-redeem-btn ${points >= reward.points ? 'ready' : 'locked'}`}
                disabled={points < reward.points}
              >
                {points >= reward.points ? 'Redeem' : 'Locked'}
              </button>
            </div>
          ))}
        </div>
        <button className="streak-link-btn">
          <Sparkles size={16} />
          <span>Discover more rewards</span>
        </button>
      </div>
    </div>
  );
};

export default StreakScreen;
