import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';

const COLORS = {
  bg: '#edf4f9',
  panel: '#ffffff',
  panelSoft: '#e5f6f9',
  border: '#c6d8e5',
  text: '#1f3448',
  subtext: '#5c7387',
  accent: '#00a8b8',
  accentDark: '#2f5f95',
  success: '#0c9f96',
  warning: '#2f7fb3',
  danger: '#bb4a56',
};

const DARK_COLORS = {
  bg: '#0f1a27',
  panel: '#142233',
  panelSoft: '#183844',
  border: '#2a4057',
  text: '#e6f0f8',
  subtext: '#9eb3c7',
  accent: '#1cc3cf',
  accentDark: '#7ebcf1',
  success: '#57d4cb',
  warning: '#68b4e0',
  danger: '#ea7d88',
};

const TABS = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'insights', label: 'Insights' },
  { key: 'simulator', label: 'Simulator' },
  { key: 'chat', label: 'Chat' },
  { key: 'streak', label: 'Streak' },
];

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8000';

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
  };

  const rawDaily = Array.isArray(r.daily_7d) ? r.daily_7d.slice(-7) : [];
  const dailyUsageData = DAY_LABELS.map((day, idx) => ({
    day,
    kWh: Number(Number(rawDaily[idx] || 0).toFixed(2)),
  }));

  const rawHourly = Array.isArray(r.half_hourly_today)
    ? r.half_hourly_today
    : Array.isArray(r.hourly_today)
      ? r.hourly_today
      : [];

  const halfHourlyUsageData = rawHourly.map((val, hour) => ({
    time: `${String(hour).padStart(2, '0')}:00`,
    kWh: Number(Number(val || 0).toFixed(3)),
  }));

  const aiInsights = [
    {
      id: 'insight-1',
      category: 'A',
      urgency: Number(r.peak_ratio_pct || 0) > 45 ? 'high' : 'medium',
      headline: `Peak-hour ratio at ${Number(r.peak_ratio_pct || 0).toFixed(1)}%`,
      timestamp: 'Latest analysis',
      body: `Your current peak usage ratio is ${Number(r.peak_ratio_pct || 0).toFixed(1)}%. Shifting heavy loads later can improve this and lower costs.`,
      estimatedSaving: Number(r.potential_peak_saving || 0),
      actionLabel: 'Simulate Savings',
    },
    {
      id: 'insight-2',
      category: 'B',
      urgency: Number(r.anomaly_count || 0) > 0 ? 'high' : 'medium',
      headline: `${Number(r.anomaly_count || 0)} unusual spike(s) detected`,
      timestamp: 'Latest analysis',
      body: `Standby estimate is about S$${Number(r.standby_monthly_cost || 0).toFixed(2)} per month. Reducing overnight standby can recover avoidable usage.`,
      estimatedSaving: Number(r.potential_standby_saving || 0),
      actionLabel: 'Reduce Standby',
    },
    {
      id: 'insight-3',
      category: 'C',
      urgency: 'medium',
      headline: 'See where your kWh goes by appliance',
      timestamp: 'Latest analysis',
      body: 'Open appliance breakdown for estimated split and identify the top devices to optimize first.',
      estimatedSaving: 0,
      actionLabel: 'Open Breakdown',
    },
    {
      id: 'insight-4',
      category: 'D',
      urgency: 'low',
      headline: 'Ask EnergiQ for personalized tips',
      timestamp: 'Live',
      body: 'Chat with the assistant to get actions tailored to this latest analysis.',
      estimatedSaving: 0,
      actionLabel: 'Chat',
    },
  ];

  const applianceKeyVariants = [
    { keys: ['Air Conditioning_kwh', 'Air_Conditioning_kwh'], name: 'Air Con' },
    { keys: ['Refridgeration_kwh'], name: 'Fridge' },
    { keys: ['Water Heater_kwh', 'Water_Heater_kwh'], name: 'Water Heater' },
    { keys: ['Washer_kwh'], name: 'Washer' },
    { keys: ['Entertainment_kwh'], name: 'TV/Media' },
    { keys: ['Kitchen_kwh'], name: 'Kitchen' },
    { keys: ['Lighting_kwh'], name: 'Lighting' },
  ];

  const billingHistory = Array.isArray(r.billing_history) ? r.billing_history : [];
  const latestBillingPeriod = billingHistory[billingHistory.length - 1]?.billing_period || 'Latest period';
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

  return {
    dashboardMetrics,
    dailyUsageData,
    halfHourlyUsageData,
    aiInsights,
    applianceBreakdown,
    applianceWindowLabel: String(latestBillingPeriod),
  };
}

function buildResponse(q, u) {
  const ql = q.toLowerCase();
  if (ql.includes('peak') || ql.includes('off-peak') || ql.includes('time'))
    return `Based on your data, your peak window is ${u.peakPeriod}. Shift heavy appliances after 11pm to cut peak usage.`;
  if (ql.includes('air con') || ql.includes('ac') || ql.includes('cooling'))
    return 'Setting AC 1 degree higher can reduce cooling energy by around 10 percent and save money monthly.';
  if (ql.includes('score'))
    return `Your Energy Score is ${u.energyScore}/100. Improve it by shifting loads off-peak and cutting standby power.`;
  if (ql.includes('save') || ql.includes('reduce') || ql.includes('lower'))
    return 'Top actions: increase AC temp, shift laundry off-peak, and unplug standby devices overnight.';
  return `You used ${u.usage} kWh this month. I can help you target the easiest changes first.`;
}

function ScreenCard({ colors, title, subtitle, children }) {
  return (
    <View style={[styles.card, { backgroundColor: colors.panel, borderColor: colors.border }]}>
      {title ? <Text style={[styles.cardTitle, { color: colors.text }]}>{title}</Text> : null}
      {subtitle ? <Text style={[styles.cardSubtitle, { color: colors.subtext }]}>{subtitle}</Text> : null}
      {children}
    </View>
  );
}

function DashboardScreen({ data, colors }) {
  const m = data?.dashboardMetrics || {
    currentMonthUsage: 0,
    lastMonthUsage: 0,
    percentageChange: 0,
    peakPeriod: '6:00 PM - 10:00 PM',
    energyScore: 0,
    percentile: 50,
  };
  const daily = Array.isArray(data?.dailyUsageData) ? data.dailyUsageData : [];
  const barsMax = Math.max(1, ...daily.map((d) => d.kWh || 0));
  const isIncrease = m.percentageChange > 0;

  return (
    <View style={styles.stack12}>
      <ScreenCard colors={colors} title="This Month Usage" subtitle="Oct 1-24">
        <Text style={[styles.metricBig, { color: colors.text }]}>{m.currentMonthUsage} kWh</Text>
        <Text style={{ color: isIncrease ? colors.danger : colors.success, fontWeight: '700' }}>
          {isIncrease ? '+' : '-'}{Math.abs(m.percentageChange)}% vs last month ({m.lastMonthUsage} kWh)
        </Text>
        <Text style={{ color: colors.subtext, marginTop: 6 }}>Peak Period: {m.peakPeriod}</Text>
      </ScreenCard>

      <ScreenCard colors={colors} title="Energy Score" subtitle={`Better than ${m.percentile}% of similar neighbors`}>
        <View style={[styles.scoreBadge, { borderColor: colors.accent }]}>
          <Text style={{ color: colors.accent, fontWeight: '800', fontSize: 24 }}>{m.energyScore}</Text>
        </View>
      </ScreenCard>

      <ScreenCard colors={colors} title="7-Day Analysis" subtitle="Daily kWh">
        <View style={styles.chartRow}>
          {daily.map((d) => (
            <View key={d.day} style={styles.chartBarItem}>
              <View style={[styles.chartBarTrack, { backgroundColor: colors.bg }]}>
                <View
                  style={[
                    styles.chartBarFill,
                    {
                      height: `${Math.max(6, (d.kWh / barsMax) * 100)}%`,
                      backgroundColor: colors.accent,
                    },
                  ]}
                />
              </View>
              <Text style={{ color: colors.subtext, fontSize: 11 }}>{d.day}</Text>
            </View>
          ))}
        </View>
      </ScreenCard>
    </View>
  );
}

function InsightsScreen({ data, onNavigate, colors }) {
  const insights = Array.isArray(data?.aiInsights) ? data.aiInsights.filter((i) => i.id !== 'insight-4') : [];

  return (
    <View style={styles.stack12}>
      {insights.map((item) => (
        <ScreenCard key={item.id} colors={colors} title={item.headline} subtitle={item.timestamp}>
          <Text style={{ color: colors.subtext, marginBottom: 10 }}>{item.body}</Text>
          <View style={styles.rowBetween}>
            <Text style={{ color: colors.success, fontWeight: '700' }}>
              {item.estimatedSaving > 0 ? `$${item.estimatedSaving.toFixed(2)}/mo` : 'No direct estimate'}
            </Text>
            <Pressable
              onPress={() => {
                if (item.id === 'insight-1') onNavigate('simulator');
                if (item.id === 'insight-3') onNavigate('appliance-breakdown');
                if (item.id === 'insight-2') onNavigate('simulator');
              }}
              style={[styles.primaryBtn, { backgroundColor: colors.accent }]}
            >
              <Text style={styles.primaryBtnText}>{item.actionLabel}</Text>
            </Pressable>
          </View>
        </ScreenCard>
      ))}
      <ScreenCard colors={colors} title="Need personalized help?" subtitle="Chat with EnergiQ for tailored tips">
        <Pressable onPress={() => onNavigate('chat')} style={[styles.primaryBtn, { backgroundColor: colors.accent }]}> 
          <Text style={styles.primaryBtnText}>Open Chat</Text>
        </Pressable>
      </ScreenCard>
    </View>
  );
}

function SimulatorScreen({ data, onNavigate, colors }) {
  const halfHourly = Array.isArray(data?.halfHourlyUsageData) ? data.halfHourlyUsageData : [];
  const [acTemp, setAcTemp] = useState(23);
  const [unplugStandby, setUnplugStandby] = useState(false);

  const tvFraction = 18 / (45 + 38 + 24 + 18 + 15 + 12);
  const nighttime = halfHourly.filter((d) => {
    const h = Number(String(d.time || '0:00').split(':')[0]);
    return h >= 23 || h < 7;
  });
  const totalNightKwh = nighttime.reduce((s, d) => s + Number(d.kWh || 0), 0);
  const standbyKwhPerMonth = Number((totalNightKwh * tvFraction * 30).toFixed(1));
  const standbyDollarsPerMonth = Number((standbyKwhPerMonth * 0.2671).toFixed(2));

  const diff = acTemp - 23;
  const acKwhSaved = Number((142 * 0.1 * diff).toFixed(1));
  const acDollarsSaved = Number((acKwhSaved * 0.2671).toFixed(2));

  const kwhSaved = Number((acKwhSaved + (unplugStandby ? standbyKwhPerMonth : 0)).toFixed(1));
  const dollarsSaved = Number((acDollarsSaved + (unplugStandby ? standbyDollarsPerMonth : 0)).toFixed(2));
  const points = Math.floor(Math.abs(dollarsSaved) * 2.5);

  return (
    <View style={styles.stack12}>
      <ScreenCard colors={colors} title="Estimated Monthly Impact" subtitle="Based on your selected actions">
        <Text style={[styles.metricBig, { color: dollarsSaved < 0 ? colors.danger : colors.text }]}> 
          {dollarsSaved < 0 ? '+' : '-'}${Math.abs(dollarsSaved).toFixed(2)}
        </Text>
        <Text style={{ color: colors.subtext }}>{kwhSaved} kWh saved • +{points} score</Text>
      </ScreenCard>

      <ScreenCard colors={colors} title="Air-Conditioning" subtitle={`${acTemp}C selected`}>
        <View style={styles.rowBetween}>
          <Pressable onPress={() => setAcTemp((v) => Math.max(18, v - 1))} style={[styles.secondaryBtn, { borderColor: colors.border }]}>
            <Text style={{ color: colors.text }}>-</Text>
          </Pressable>
          <Text style={{ color: colors.accent, fontSize: 24, fontWeight: '800' }}>{acTemp}C</Text>
          <Pressable onPress={() => setAcTemp((v) => Math.min(30, v + 1))} style={[styles.secondaryBtn, { borderColor: colors.border }]}>
            <Text style={{ color: colors.text }}>+</Text>
          </Pressable>
        </View>
      </ScreenCard>

      <ScreenCard colors={colors} title="Kill Standby Power" subtitle={`Approx ${standbyKwhPerMonth} kWh/mo`}>
        <View style={styles.rowBetween}>
          <Text style={{ color: colors.subtext }}>Enable standby reduction</Text>
          <Switch value={unplugStandby} onValueChange={setUnplugStandby} trackColor={{ true: colors.accent }} />
        </View>
      </ScreenCard>

      <Pressable onPress={() => onNavigate('streak')} style={[styles.primaryBtn, { backgroundColor: colors.accent }]}> 
        <Text style={styles.primaryBtnText}>View Streak Bonus</Text>
      </Pressable>
    </View>
  );
}

function ChatScreen({ data, colors }) {
  const ctx = {
    usage: Number(data?.dashboardMetrics?.currentMonthUsage || 0),
    change: Number(data?.dashboardMetrics?.percentageChange || 0),
    peakPeriod: data?.dashboardMetrics?.peakPeriod || '6:00 PM - 10:00 PM',
    energyScore: Number(data?.dashboardMetrics?.energyScore || 0),
  };

  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'ai',
      text: `Hi! You used ${ctx.usage} kWh this month (${ctx.change}% vs last month). Ask me how to save more.`,
    },
  ]);

  const send = (text) => {
    if (!text.trim()) return;
    const value = text.trim();
    setMessages((prev) => [...prev, { id: Date.now(), sender: 'user', text: value }]);
    setInput('');
    setTimeout(() => {
      setMessages((prev) => [...prev, { id: Date.now() + 1, sender: 'ai', text: buildResponse(value, ctx) }]);
    }, 600);
  };

  return (
    <View style={styles.stack12}>
      <ScreenCard colors={colors} title="EnergiQ AI" subtitle="Personalized chat coach">
        <View style={styles.chatBox}>
          {messages.map((m) => (
            <View key={m.id} style={[styles.chatRow, m.sender === 'user' && styles.chatRowReverse]}>
              <View
                style={[
                  styles.chatBubble,
                  {
                    backgroundColor: m.sender === 'user' ? colors.accent : colors.bg,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text style={{ color: m.sender === 'user' ? '#fff' : colors.text }}>{m.text}</Text>
              </View>
            </View>
          ))}
        </View>
        <View style={styles.inputRow}>
          <TextInput
            style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.bg }]}
            value={input}
            onChangeText={setInput}
            placeholder="Ask about your energy usage..."
            placeholderTextColor={colors.subtext}
          />
          <Pressable onPress={() => send(input)} style={[styles.addBtn, { backgroundColor: colors.accent }]}> 
            <Text style={styles.addBtnText}>Send</Text>
          </Pressable>
        </View>
      </ScreenCard>
    </View>
  );
}

function ApplianceBreakdownScreen({ data, onBack, colors }) {
  const [selected, setSelected] = useState(null);
  const list = Array.isArray(data?.applianceBreakdown) ? data.applianceBreakdown : [];

  if (selected) {
    return (
      <View style={styles.stack12}>
        <Pressable onPress={() => setSelected(null)} style={[styles.secondaryBtn, { borderColor: colors.border }]}> 
          <Text style={{ color: colors.text }}>Back</Text>
        </Pressable>
        <ScreenCard colors={colors} title={selected.name} subtitle="Monthly trend">
          {selected.monthly.map((row) => (
            <View key={`${selected.name}-${row.month}`} style={styles.rowBetween}>
              <Text style={{ color: colors.subtext }}>{row.month}</Text>
              <Text style={{ color: colors.text }}>{row.kwh} kWh • ${row.cost}</Text>
            </View>
          ))}
        </ScreenCard>
      </View>
    );
  }

  return (
    <View style={styles.stack12}>
      <Pressable onPress={onBack} style={[styles.secondaryBtn, { borderColor: colors.border }]}> 
        <Text style={{ color: colors.text }}>Back to Insights</Text>
      </Pressable>
      <ScreenCard colors={colors} title="Appliance Breakdown" subtitle={data?.applianceWindowLabel || 'Latest period'}>
        {list.map((item) => (
          <Pressable
            key={item.name}
            onPress={() => setSelected(item)}
            style={[styles.applianceRow, { borderColor: colors.border, backgroundColor: colors.bg }]}
          >
            <Text style={{ color: colors.text, fontWeight: '700' }}>{item.name}</Text>
            <Text style={{ color: colors.subtext }}>{item.kwh} kWh</Text>
          </Pressable>
        ))}
      </ScreenCard>
    </View>
  );
}

const TASK_SETS = {
  daily: [
    { label: 'Set AC to 24C tonight', points: 15 },
    { label: 'Unplug standby appliances before sleep', points: 20 },
    { label: 'Run washer only with full load', points: 18 },
  ],
  weekly: [
    { label: 'Clean air-con filters', points: 40 },
    { label: 'Review this week peak-hour usage', points: 35 },
    { label: 'Meal prep to reduce repeated cooking', points: 30 },
  ],
  monthly: [
    { label: 'Compare bill with last month', points: 60 },
    { label: 'Redeem one reward with points', points: 50 },
    { label: 'Set next month energy target', points: 55 },
  ],
};

const REWARDS = [
  { title: 'NTUC $5 Coupon', points: 200 },
  { title: 'MRT Credit', points: 300 },
  { title: 'Coffee Voucher', points: 250 },
  { title: 'Grab Discount', points: 450 },
];

function PlaceholderScreen({ title, subtitle }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardSubtitle}>{subtitle}</Text>
    </View>
  );
}

function StreakScreen() {
  const [taskTab, setTaskTab] = useState('daily');
  const [taskInput, setTaskInput] = useState('');
  const [extraTasks, setExtraTasks] = useState({ daily: [], weekly: [], monthly: [] });
  const [completed, setCompleted] = useState({});

  const tasks = useMemo(
    () => [...TASK_SETS[taskTab], ...extraTasks[taskTab]],
    [taskTab, extraTasks]
  );

  const points = 160;

  const addTask = () => {
    const clean = taskInput.trim();
    if (!clean) return;
    setExtraTasks((prev) => ({
      ...prev,
      [taskTab]: [...prev[taskTab], { label: clean, points: 10 }],
    }));
    setTaskInput('');
  };

  const toggleTask = (label) => {
    const key = `${taskTab}:${label}`;
    setCompleted((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <View style={styles.screenStack}>
      <View style={styles.pointsCard}>
        <Text style={styles.pointsLabel}>User points</Text>
        <Text style={styles.pointsValue}>{points}</Text>
      </View>

      <View style={styles.sectionBlock}>
        <Text style={styles.sectionTitle}>Tasks</Text>
        <View style={styles.rowWrap}>
          {['daily', 'weekly', 'monthly'].map((name) => (
            <Pressable
              key={name}
              onPress={() => setTaskTab(name)}
              style={[styles.pill, taskTab === name && styles.pillActive]}
            >
              <Text style={[styles.pillText, taskTab === name && styles.pillTextActive]}>{name}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.inputRow}>
          <TextInput
            value={taskInput}
            onChangeText={setTaskInput}
            placeholder="Add task"
            placeholderTextColor={COLORS.subtext}
            style={styles.input}
          />
          <Pressable onPress={addTask} style={styles.addBtn}>
            <Text style={styles.addBtnText}>+</Text>
          </Pressable>
        </View>

        {tasks.map((task) => {
          const key = `${taskTab}:${task.label}`;
          const isDone = !!completed[key];
          return (
            <Pressable
              key={key}
              onPress={() => toggleTask(task.label)}
              style={[styles.taskCard, isDone && styles.taskCardDone]}
            >
              <View style={styles.taskLeft}>
                <Text style={styles.taskText}>{task.label}</Text>
                <Text style={styles.taskPoints}>+{task.points} pts</Text>
              </View>
              <View style={[styles.checkDot, isDone && styles.checkDotOn]} />
            </Pressable>
          );
        })}
      </View>

      <View style={styles.sectionBlock}>
        <Text style={styles.sectionTitle}>Rewards</Text>
        <View style={styles.rewardGrid}>
          {REWARDS.map((reward) => {
            const unlocked = points >= reward.points;
            return (
              <View key={reward.title} style={styles.rewardCard}>
                <Text style={styles.rewardTitle}>{reward.title}</Text>
                <Text style={styles.rewardPoints}>{reward.points} points</Text>
                <Text style={[styles.rewardState, unlocked ? styles.rewardOpen : styles.rewardLocked]}>
                  {unlocked ? 'Redeem' : 'Locked'}
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
}

export default function App() {
  const [screen, setScreen] = useState('dashboard');
  const [dark, setDark] = useState(false);
  const [apiStatus, setApiStatus] = useState('loading');
  const [apiData, setApiData] = useState(null);
  const [apiError, setApiError] = useState('');

  const colors = dark ? DARK_COLORS : COLORS;

  const loadLatestData = async () => {
    const endpoint = `${API_BASE}/api/analyze/latest?generated_dir=generated_data&_ts=${Date.now()}`;
    const response = await fetch(endpoint);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    setApiData(transformApiPayload(payload));
    setApiStatus('connected');
  };

  const generateFreshData = async () => {
    const response = await fetch(`${API_BASE}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ days: 90, out_dir: 'generated_data' }),
    });
    if (!response.ok) throw new Error(`Generate failed: HTTP ${response.status}`);
  };

  useEffect(() => {
    (async () => {
      try {
        await loadLatestData();
      } catch (error) {
        setApiStatus('error');
        setApiError(String(error));
      }
    })();
  }, []);

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

  if (apiStatus === 'loading') {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg }]}> 
        <View style={[styles.centerBox, { backgroundColor: colors.panel, borderColor: colors.border }]}> 
          <ActivityIndicator color={colors.accent} />
          <Text style={{ color: colors.text, marginTop: 8 }}>Loading data from API...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (apiStatus === 'error' || !apiData) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg }]}> 
        <View style={[styles.centerBox, { backgroundColor: colors.panel, borderColor: colors.border }]}> 
          <Text style={{ color: colors.danger, fontWeight: '800', marginBottom: 6 }}>API unavailable</Text>
          <Text style={{ color: colors.subtext, textAlign: 'center', marginBottom: 8 }}>Check server on port 8000.</Text>
          <Text style={{ color: colors.subtext, fontSize: 12, marginBottom: 10 }}>{apiError}</Text>
          <Pressable style={[styles.primaryBtn, { backgroundColor: colors.accent }]} onPress={handleRetry}>
            <Text style={styles.primaryBtnText}>Retry</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg }]}> 
      <StatusBar style={dark ? 'light' : 'dark'} />

      <View style={[styles.topBar, { backgroundColor: colors.panel, borderColor: colors.border }]}>
        <Text style={[styles.brand, { color: colors.text }]}>EnergiQ Mobile</Text>
        <View style={styles.rowCenterGap}>
          <Text style={[styles.apiBadge, { color: colors.accentDark, backgroundColor: colors.panelSoft, borderColor: colors.border }]}>API connected</Text>
          <Switch value={dark} onValueChange={setDark} trackColor={{ true: colors.accent }} />
          <Pressable onPress={handleRefreshData} style={[styles.secondaryBtn, { borderColor: colors.border }]}>
            <Text style={{ color: colors.text, fontSize: 12 }}>Refresh</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {screen === 'dashboard' && <DashboardScreen data={apiData} colors={colors} />}
        {screen === 'insights' && <InsightsScreen data={apiData} onNavigate={setScreen} colors={colors} />}
        {screen === 'simulator' && <SimulatorScreen data={apiData} onNavigate={setScreen} colors={colors} />}
        {screen === 'chat' && <ChatScreen data={apiData} colors={colors} />}
        {screen === 'streak' && <StreakScreen />}
        {screen === 'appliance-breakdown' && (
          <ApplianceBreakdownScreen data={apiData} onBack={() => setScreen('insights')} colors={colors} />
        )}
      </ScrollView>

      <View style={[styles.bottomNav, { backgroundColor: colors.panel, borderColor: colors.border }]}>
        {TABS.map((item) => (
          <Pressable
            key={item.key}
            onPress={() => setScreen(item.key)}
            style={[styles.navBtn, screen === item.key && { backgroundColor: colors.accent }]}
          >
            <Text style={[styles.navText, { color: screen === item.key ? '#fff' : colors.subtext }]}>{item.label}</Text>
          </Pressable>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  topBar: {
    marginHorizontal: 12,
    marginTop: 8,
    marginBottom: 8,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.panel,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  brand: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '700',
  },
  apiBadge: {
    color: COLORS.accentDark,
    backgroundColor: COLORS.panelSoft,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 999,
    fontSize: 12,
    paddingVertical: 4,
    paddingHorizontal: 8,
    overflow: 'hidden',
  },
  content: {
    paddingHorizontal: 12,
    paddingBottom: 96,
    gap: 12,
  },
  card: {
    backgroundColor: COLORS.panel,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 18,
    padding: 16,
  },
  cardTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
  },
  cardSubtitle: {
    color: COLORS.subtext,
    fontSize: 14,
    lineHeight: 20,
  },
  bottomNav: {
    position: 'absolute',
    left: 8,
    right: 8,
    bottom: 10,
    backgroundColor: COLORS.panel,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    padding: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 4,
  },
  navBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 12,
    alignItems: 'center',
  },
  navText: {
    fontSize: 11,
    fontWeight: '700',
  },
  screenStack: {
    gap: 12,
  },
  pointsCard: {
    backgroundColor: COLORS.panel,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: 'center',
  },
  pointsLabel: {
    color: '#5c7387',
    fontSize: 12,
    textTransform: 'uppercase',
  },
  pointsValue: {
    color: '#1f3448',
    fontSize: 30,
    fontWeight: '800',
  },
  sectionBlock: {
    backgroundColor: COLORS.panel,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    padding: 12,
    gap: 10,
  },
  sectionTitle: {
    color: '#1f3448',
    fontSize: 22,
    fontWeight: '800',
  },
  rowWrap: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  pill: {
    borderWidth: 1,
    borderColor: '#c6d8e5',
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#edf4f9',
  },
  pillActive: {
    backgroundColor: '#00a8b8',
    borderColor: '#00a8b8',
  },
  pillText: {
    color: '#5c7387',
    fontSize: 12,
    fontWeight: '700',
  },
  pillTextActive: {
    color: '#fff',
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: COLORS.text,
    backgroundColor: COLORS.bg,
  },
  addBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#00a8b8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnText: {
    color: '#fff',
    fontSize: 24,
    lineHeight: 24,
    marginTop: -2,
  },
  taskCard: {
    borderWidth: 1,
    borderColor: '#c6d8e5',
    borderRadius: 12,
    backgroundColor: '#edf4f9',
    padding: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  taskCardDone: {
    backgroundColor: '#e5f6f9',
  },
  taskLeft: {
    flex: 1,
    gap: 2,
  },
  taskText: {
    color: '#1f3448',
    fontSize: 13,
    fontWeight: '600',
  },
  taskPoints: {
    color: '#0c9f96',
    fontSize: 12,
    fontWeight: '700',
  },
  checkDot: {
    width: 18,
    height: 18,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#c6d8e5',
    backgroundColor: '#ffffff',
  },
  checkDotOn: {
    backgroundColor: '#0c9f96',
    borderColor: '#0c9f96',
  },
  rewardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  rewardCard: {
    width: '48.7%',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    backgroundColor: '#d8eef4',
    padding: 10,
    minHeight: 112,
    justifyContent: 'space-between',
  },
  rewardTitle: {
    color: '#1f3448',
    fontSize: 13,
    fontWeight: '700',
  },
  rewardPoints: {
    color: '#5c7387',
    fontSize: 12,
  },
  rewardState: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    fontSize: 11,
    fontWeight: '700',
    overflow: 'hidden',
  },
  rewardOpen: {
    color: '#ffffff',
    backgroundColor: '#2f5f95',
  },
  rewardLocked: {
    color: '#5c7387',
    backgroundColor: '#edf4f9',
  },
  centerBox: {
    margin: 18,
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowCenterGap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stack12: {
    gap: 12,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowCenter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chartRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 150,
    marginTop: 8,
  },
  chartBarItem: {
    width: '13%',
    alignItems: 'center',
    gap: 6,
  },
  chartBarTrack: {
    width: '100%',
    height: 120,
    borderRadius: 8,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  chartBarFill: {
    width: '100%',
    borderRadius: 8,
    minHeight: 8,
  },
  metricBig: {
    fontSize: 34,
    fontWeight: '800',
  },
  scoreBadge: {
    width: 74,
    height: 74,
    borderRadius: 999,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  primaryBtn: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
  },
  secondaryBtn: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  chatBox: {
    gap: 8,
    marginTop: 8,
    marginBottom: 10,
  },
  chatRow: {
    flexDirection: 'row',
  },
  chatRowReverse: {
    justifyContent: 'flex-end',
  },
  chatBubble: {
    maxWidth: '84%',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  applianceRow: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});
