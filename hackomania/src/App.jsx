import { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';
import DashboardScreen from './DashboardScreen';
import InsightsScreen from './InsightsScreen';
import SimulatorScreen from './SimulatorScreen';
import ChatScreen from './ChatScreen';
import ApplianceBreakdownScreen from './ApplianceBreakdownScreen';
import StreakScreen from './StreakScreen';
import './App.css';

const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function transformApiPayload(payload) {
  const r = payload?.results || {};

  const currentMonthUsage = Number(r.total_kwh_30d || 0);
  const percentageChange = Number(r.mom_change_pct || 0);
  const denominator = 1 + percentageChange / 100;
  const lastMonthUsage = denominator !== 0 ? currentMonthUsage / denominator : currentMonthUsage;

  const dashboardMetrics = {
    currentMonthUsage: Math.round(currentMonthUsage),
    lastMonthUsage: Math.round(lastMonthUsage),
    percentageChange: Number(percentageChange.toFixed(1)),
    peakPeriod: '6:00 PM - 10:00 PM',
    energyScore: Number(r.energy_score || 0),
    percentile: Math.min(99, Math.max(1, Math.round((Number(r.energy_score || 0) / 100) * 90))),
    peak_ratio_pct: Number(r.peak_ratio_pct || 0),
    standby_monthly_cost: Number(r.standby_monthly_cost || 0),
    weekend_uplift_pct: Number(r.weekend_uplift_pct || 0),
    anomaly_count: Number(r.anomaly_count || 0),
  };

  const rawDaily = Array.isArray(r.daily_7d) ? r.daily_7d.slice(-7) : [];
  const dailyUsageData = dayLabels.map((day, idx) => ({
    day,
    kWh: Number(Number(rawDaily[idx] || 0).toFixed(2)),
  }));

  const rawHourly = Array.isArray(r.half_hourly_today)
    ? r.half_hourly_today
    : Array.isArray(r.hourly_today)
      ? r.hourly_today
      : [];
  const halfHourlyUsageData = rawHourly.map((val, idx) => {
    const hour = Math.floor(idx / 2);
    const minute = (idx % 2) * 30;
    return {
      time: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
      kWh: Number(Number(val || 0).toFixed(3)),
    };
  });

  const peakRatioPct = Number(r.peak_ratio_pct || 0);
  const standbyMonthlyCost = Number(r.standby_monthly_cost || 0);
  const standbyKwhPerSlot = Number(r.standby_kwh_per_slot || 0);
  const totalKwh30d = Number(r.total_kwh_30d || 0);
  const anomalyCount = Number(r.anomaly_count || 0);
  const billingHistory = Array.isArray(r.billing_history) ? r.billing_history : [];
  const momChangePct = Number(r.mom_change_pct || 0);
  const progressPct = Math.max(0, -momChangePct);
  const monthlyProgressSaving = Number((totalKwh30d * (progressPct / 100) * 0.3278).toFixed(2));
  const profile = typeof r.profile === 'object' ? r.profile : {};
  const residentName =
    String(
      profile.Resident ||
      profile['Resident Name'] ||
      profile.Name ||
      profile.Owner ||
      'Wei Jian',
    );
  const district =
    String(
      profile.Town ||
      profile.District ||
      profile.Estate ||
      'Punggol',
    );

  const estMonthlyBill = Number(r.est_monthly_bill || currentMonthUsage * 0.3278 || 0);
  const billingHistoryCosts = billingHistory
    .map((row) => Number(row.est_cost_sgd || row.amount || 0))
    .filter((value) => Number.isFinite(value) && value > 0);
  const avgFlatMonthlySpend = billingHistoryCosts.length
    ? Number((billingHistoryCosts.reduce((sum, value) => sum + value, 0) / billingHistoryCosts.length).toFixed(2))
    : Number(estMonthlyBill.toFixed(2));
  const flatType = String(
    profile['Flat Type'] ||
    profile.flat_type ||
    profile.Housing ||
    profile['Home Type'] ||
    'HDB flat',
  );

  const inferredUserPoints = (() => {
    const baseScore = Number(r.energy_score || 0);
    const trendBonus = percentageChange < 0 ? Math.round(Math.abs(percentageChange) * 8) : 0;
    const peakBonus = peakRatioPct <= 45 ? 60 : 0;
    const standbyBonus = standbyMonthlyCost <= 12 ? 50 : 0;
    const anomalyPenalty = Math.min(80, anomalyCount * 4);
    return Math.max(0, Math.round(baseScore * 8 + trendBonus + peakBonus + standbyBonus - anomalyPenalty));
  })();
  const userPoints = Number(r.user_points || inferredUserPoints);

  dashboardMetrics.userPoints = userPoints;

  // Identify the specific appliance causing anomalies by analyzing variability
  const applianceKeyVariants = [
    { keys: ['Air Conditioning_kwh', 'Air_Conditioning_kwh'], name: 'Air Conditioning', action: 'Your AC is likely overrunning. Set it 2-3°C higher or use a thermostat timer.' },
    { keys: ['Refridgeration_kwh'], name: 'Fridge', action: 'Your fridge compressor is cycling more than usual. Check if the door seals are intact.' },
    { keys: ['Water Heater_kwh', 'Water_Heater_kwh'], name: 'Water Heater', action: 'Your water heater is heating constantly. Install a timer to only heat during peak usage hours (mornings/evenings).' },
    { keys: ['Washer_kwh'], name: 'Washing Machine', action: 'Your washer is running irregularly. Use cold water cycles and schedule laundry for off-peak hours (after 11 PM).' },
    { keys: ['Kitchen_kwh'], name: 'Kitchen Appliances', action: 'Your oven/stove is in use sporadically. Switch to microwave/air fryer for smaller meals.' },
    { keys: ['Lighting_kwh'], name: 'Lighting', action: 'Your lights are left on longer than usual. Install motion sensors or timers.' },
    { keys: ['Entertainment_kwh'], name: 'TV/Media', action: 'Your entertainment devices are on standby too long. Use a smart power strip to cut standby drain.' },
  ];

  const culpritAppliance = (() => {
    let maxVariance = 0;
    let culprit = { name: 'forgotten appliance', action: 'Check devices you don\'t use daily—washer, heater, or oven left running.' };
    
    for (const entry of applianceKeyVariants) {
      const monthlyValues = billingHistory.map((row) => {
        const sourceKey = entry.keys.find((candidate) => Object.prototype.hasOwnProperty.call(row, candidate));
        return Number(sourceKey ? row[sourceKey] : 0);
      });
      
      if (monthlyValues.length > 1) {
        const avg = monthlyValues.reduce((a, b) => a + b, 0) / monthlyValues.length;
        const variance = monthlyValues.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / monthlyValues.length;
        const stdDev = Math.sqrt(variance);
        const coeffVar = avg > 0 ? stdDev / avg : 0; // coefficient of variation
        
        if (coeffVar > maxVariance) {
          maxVariance = coeffVar;
          culprit = { name: entry.name, action: entry.action };
        }
      }
    }
    
    return culprit;
  })();

  // Calculate spike impact: average spike kWh and cost
  const avgDailyKwh = totalKwh30d / 30;
  const avgSpikeKwh = Math.max(0.5, (avgDailyKwh * 0.5) / Math.max(1, anomalyCount)); // estimate: 50% of baseline per spike
  const spikeCostTotal = avgSpikeKwh * anomalyCount * 0.3278;
  const spikeCostBreakdown = `${anomalyCount} spikes × ${avgSpikeKwh.toFixed(1)} kWh = ~${(avgSpikeKwh * anomalyCount).toFixed(1)} kWh extra`;

  // Build appliance breakdown from latest billing data
  const topAppliances = (() => {
    const latestMonth = billingHistory[billingHistory.length - 1];
    if (!latestMonth) return [];
    
    const appliances = applianceKeyVariants
      .map((entry) => {
        const sourceKey = entry.keys.find((candidate) => Object.prototype.hasOwnProperty.call(latestMonth, candidate));
        const kwh = Number(sourceKey ? latestMonth[sourceKey] : 0);
        const pct = totalKwh30d > 0 ? (kwh / totalKwh30d) * 100 : 0;
        return {
          name: entry.name,
          kwh: Number(kwh.toFixed(1)),
          pct: Number(pct.toFixed(1)),
          cost: Number((kwh * 0.3278).toFixed(2)),
        };
      })
      .filter((a) => a.kwh > 0)
      .sort((a, b) => b.kwh - a.kwh)
      .slice(0, 3);

    return appliances;
  })();

  const applianceBreakdownText = topAppliances
    .map((app, i) => `${i + 1}. ${app.name}: ${app.kwh} kWh (${app.pct}% | S$${app.cost})`)
    .join('\n');
  const applianceBreakdownTitle = `Top 3 appliances this month:\n${applianceBreakdownText}`;

  const getStandbyActionText = () => {
    const leadName = String(topAppliances[0]?.name || '').toLowerCase();
    if (leadName.includes('air')) {
      return 'Set AC to 25-26C before sleep and add a timer to switch off after 1-2 hours.';
    }
    if (leadName.includes('kitchen')) {
      return 'Switch off kitchen appliances at the wall after dinner and avoid overnight warm/keep modes.';
    }
    if (leadName.includes('fridge') || leadName.includes('refridgeration')) {
      return 'Check fridge door seals, reduce door-open time, and keep temperature at efficient settings (around 3-5C).';
    }
    if (leadName.includes('heater')) {
      return 'Use a water-heater timer so it only runs before shower windows, not all night.';
    }
    return 'Tonight, switch off TV/router and unplug idle chargers at the power socket before bed.';
  };

  const aiInsights = [
    {
      id: 'insight-1',
      category: 'STANDBY',
      priority: standbyMonthlyCost >= 12 ? 'HIGH' : 'MEDIUM',
      urgency: standbyMonthlyCost >= 12 ? 'high' : 'medium',
      headline: `Your devices are quietly eating S$${standbyMonthlyCost.toFixed(2)} monthly while you sleep`,
      body: `Between 2-4 AM, your home still uses ${standbyKwhPerSlot.toFixed(2)} kWh every half hour - that's like leaving a ${Math.round(standbyKwhPerSlot * 2000)}W appliance running all night. This phantom power adds up to ${Math.max(1, Math.round((standbyMonthlyCost / Math.max(1, Number(r.est_monthly_bill || 1))) * 100))}% of your monthly bill, which is higher than most ${district} HDB households.\n\nWhat's using power at night:\n${applianceBreakdownText}`,
      actionText: getStandbyActionText(),
      estimatedSaving: Number(r.potential_standby_saving || standbyMonthlyCost * 0.6),
      applianceChart: topAppliances,
    },
    {
      id: 'insight-2',
      category: 'PEAK',
      priority: peakRatioPct <= 38 ? 'MEDIUM' : 'HIGH',
      urgency: peakRatioPct <= 38 ? 'medium' : 'high',
      headline:
        peakRatioPct <= 38
          ? `You're already beating 90% of your neighbours on peak usage`
          : `Peak-hour usage is still costing you more than your neighbours`,
      body:
        peakRatioPct <= 38
          ? `Your evening usage (6-10 PM) is ${peakRatioPct.toFixed(1)}% of daily total, while your district averages 45%. This smart timing means you're avoiding the most expensive hours when electricity demand across Singapore peaks.\n\nTop consumers:\n${applianceBreakdownText}`
          : `Your evening usage (6-10 PM) is ${peakRatioPct.toFixed(1)}% of daily total, above your district's 45% benchmark. Shifting heavy loads out of this window can quickly reduce cost exposure to expensive peak demand.\n\nTop consumers:\n${applianceBreakdownText}`,
      actionText:
        peakRatioPct <= 38
          ? 'Keep cooking dinner before 6 PM when possible to maintain this advantage'
          : 'Shift laundry and water-heating to after 10:30 PM this week',
      estimatedSaving: Number(r.potential_peak_saving || ((totalKwh30d * Math.max(0, peakRatioPct - 35)) / 100) * 0.3278 * 0.6),
      applianceChart: topAppliances,
    },
    {
      id: 'insight-3',
      category: 'ANOMALY',
      priority: anomalyCount >= 10 ? 'HIGH' : 'MEDIUM',
      urgency: anomalyCount >= 10 ? 'high' : 'medium',
      headline: `${culpritAppliance.name}: ${anomalyCount} spikes | ~${(avgSpikeKwh * anomalyCount).toFixed(1)} kWh extra`,
      body: `Your ${culpritAppliance.name} is spiking randomly. Breakdown: ${spikeCostBreakdown} | Cost impact: ~S$${spikeCostTotal.toFixed(2)} this week. Your baseline is ${avgDailyKwh.toFixed(1)} kWh/day, but spike days hit ${(avgDailyKwh * 1.5).toFixed(1)} kWh.`,
      actionText: culpritAppliance.action,
      estimatedSaving: Number(spikeCostTotal.toFixed(2)),
    },
    {
      id: 'insight-4',
      category: 'PROGRESS',
      priority: 'LOW',
      urgency: 'low',
      headline:
        progressPct > 0.5
          ? `Well done ${residentName}! You've cut usage by ${progressPct.toFixed(1)}% this month`
          : `Good job maintaining steady habits, ${residentName}`,
      body:
        progressPct > 0.5
          ? `Your ${Math.round(totalKwh30d)} kWh consumption is down from last month, saving you about S$${monthlyProgressSaving.toFixed(2)}. For a 5-room HDB with 4 residents, you're already more efficient than similar households in ${district}.`
          : `Your usage is stable at ${Math.round(totalKwh30d)} kWh this month. Keep up these consistent habits—you're performing better than your neighbours in ${district}.`,
      actionText:
        progressPct > 0.5
          ? 'This week, try unplugging your laptop charger when not in use'
          : 'Next month, challenge yourself to shift one heavy appliance off-peak hours',
      estimatedSaving: progressPct > 0.5 ? Number(monthlyProgressSaving.toFixed(2)) : Number((standbyMonthlyCost * 0.14).toFixed(2)),
    },
  ];

  const applianceBreakdown = applianceKeyVariants.map((entry) => {
    const monthly = billingHistory.map((row) => {
      const period = String(row.billing_period || '');
      const [year, month] = period.split('-');
      const date = new Date(Number(year || 0), Math.max(0, Number(month || 1) - 1), 1);
      const monthLabel = date.toLocaleString('en-US', { month: 'short' });
      const sourceKey = entry.keys.find((candidate) => Object.prototype.hasOwnProperty.call(row, candidate));
      const kwh = Number(sourceKey ? row[sourceKey] : 0);
      return {
        month: monthLabel,
        kwh: Number(kwh.toFixed(1)),
        cost: Number((kwh * 0.2671).toFixed(2)),
      };
    });

    const latestMonthly = monthly[monthly.length - 1]?.kwh || 0;
    return {
      key: entry.keys[0],
      name: entry.name,
      kwh: Number(latestMonthly.toFixed(1)),
      monthly,
    };
  });

  const applianceWindowLabel = String(billingHistory[billingHistory.length - 1]?.billing_period || 'Latest period');

  return {
    dashboardMetrics,
    dailyUsageData,
    halfHourlyUsageData,
    aiInsights,
    applianceBreakdown,
    applianceWindowLabel,
    anomaliesCount: Number(r.anomaly_count || 0),
    billingHistory,
    profile: typeof r.profile === 'object' ? r.profile : {},
    householdBenchmark: {
      flatType,
      avgMonthlySpend: avgFlatMonthlySpend,
      district,
      estMonthlyBill: Number(estMonthlyBill.toFixed(2)),
    },
    userPoints,
    savings: {
      peak: Number(r.potential_peak_saving || 0),
      standby: Number(r.potential_standby_saving || 0),
      ac: Number(r.potential_ac_saving || 0),
    },
  };
}

function App() {
  const [screen, setScreen] = useState('dashboard');
  const [apiStatus, setApiStatus] = useState('loading');
  const [apiData, setApiData] = useState(null);
  const [apiError, setApiError] = useState('');
  const [theme, setTheme] = useState(() => {
    if (typeof window === 'undefined') return 'light';
    const savedTheme = window.localStorage.getItem('theme');
    if (savedTheme === 'dark' || savedTheme === 'light') return savedTheme;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  const loadLatestData = async () => {
    const endpoint = `/api/analyze/latest?generated_dir=generated_data&_ts=${Date.now()}`;
    const response = await fetch(endpoint, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const payload = await response.json();
    setApiData(transformApiPayload(payload));
    setApiStatus('connected');
  };

  const generateFreshData = async () => {
    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ days: 90, out_dir: 'generated_data' }),
    });
    if (!response.ok) {
      throw new Error(`Generate failed: HTTP ${response.status}`);
    }
  };

  useEffect(() => {
    const load = async () => {
      try {
        await loadLatestData();
      } catch (error) {
        console.error('API unavailable:', error);
        setApiStatus('error');
        setApiError(String(error));
      }
    };

    load();
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    window.localStorage.setItem('theme', theme);
  }, [theme]);

  const handleRetry = async () => {
    setApiStatus('loading');
    setApiError('');
    try {
      await loadLatestData();
    } catch (error) {
      setApiStatus('error');
      setApiError(String(error));
    }
  };

  const handleRefreshData = async () => {
    setApiStatus('loading');
    setApiError('');
    try {
      await generateFreshData();
      await loadLatestData();
    } catch (error) {
      setApiStatus('error');
      setApiError(String(error));
    }
  };

  const toggleTheme = () => {
    setTheme((current) => (current === 'dark' ? 'light' : 'dark'));
  };

  const showMainNav = screen === 'dashboard' || screen === 'insights' || screen === 'simulator' || screen === 'streak' || screen === 'chat';

  if (apiStatus === 'loading') {
    return (
      <div className="App">
        <div className="glass-panel p-6 text-center">
          <span className="h3">Loading data from API...</span>
        </div>
      </div>
    );
  }

  if (apiStatus === 'error' || !apiData) {
    return (
      <div className="App">
        <div className="glass-panel p-6 flex-col gap-3">
          <span className="h3 text-danger">API unavailable</span>
          <span className="body-text">Could not load analytics data. Check that the API server is running on port 8000.</span>
          <span className="small-text">{apiError}</span>
          <button className="btn-primary" onClick={handleRetry}>Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="App">
      {showMainNav && (
        <>
          <div className="app-topbar">
            <button className="tab-btn" onClick={handleRefreshData}>
              Refresh
            </button>
            <div className="rocker-wrap" title="Single Pole Double Throw">
              <span className="small-text">Theme</span>
              <label className="rocker">
                <input
                  type="checkbox"
                  checked={theme === 'dark'}
                  onChange={toggleTheme}
                  aria-label="Dark mode rocker switch"
                />
                <span className="rocker-track" aria-hidden="true">
                  <span className="rocker-side rocker-off" title="Light mode">
                    <Sun size={13} />
                  </span>
                  <span className="rocker-side rocker-on" title="Dark mode">
                    <Moon size={13} />
                  </span>
                  <span className="rocker-thumb" />
                </span>
              </label>
            </div>
            <span className={`api-pill ${apiStatus === 'connected' ? 'connected' : 'mock'}`}>
              {apiStatus === 'connected' ? 'API connected' : 'API error'}
            </span>
          </div>

          <nav className="app-nav app-bottom-nav">
            <button className={`tab-btn ${screen === 'dashboard' ? 'active' : ''}`} onClick={() => setScreen('dashboard')}>
              Dashboard
            </button>
            <button className={`tab-btn ${screen === 'insights' ? 'active' : ''}`} onClick={() => setScreen('insights')}>
              Insights
            </button>
            <button className={`tab-btn ${screen === 'simulator' ? 'active' : ''}`} onClick={() => setScreen('simulator')}>
              Simulator
            </button>
            <button className={`tab-btn ${screen === 'chat' ? 'active' : ''}`} onClick={() => setScreen('chat')}>
              Chat
            </button>
            <button className={`tab-btn ${screen === 'streak' ? 'active' : ''}`} onClick={() => setScreen('streak')}>
              Streak
            </button>
          </nav>
        </>
      )}

      {screen === 'dashboard' && <DashboardScreen data={apiData} />}
      {screen === 'insights' && <InsightsScreen onNavigate={setScreen} data={apiData} />}
      {screen === 'simulator' && <SimulatorScreen data={apiData} onNavigate={setScreen} />}
      {screen === 'streak' && <StreakScreen data={apiData} />}
      {screen === 'chat' && <ChatScreen onBack={() => setScreen('insights')} data={apiData} />}
      {screen === 'appliance-breakdown' && (
        <ApplianceBreakdownScreen onBack={() => setScreen('insights')} data={apiData} />
      )}
    </div>
  );
}

export default App;
