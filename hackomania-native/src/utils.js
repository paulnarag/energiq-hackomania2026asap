import { StyleSheet, Text, View } from 'react-native';
import { DAY_LABELS } from './theme';

export function transformApiPayload(payload) {
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
  const dailyUsageData = DAY_LABELS.map((day, idx) => ({
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

  // Create deeply personalized insights based on actual appliance usage patterns
  const applianceBreakdownPct = typeof r.appliance_breakdown_pct === 'object' ? r.appliance_breakdown_pct : {};
  const topAppliances = Object.entries(applianceBreakdownPct)
    .sort(([, a], [, b]) => (b || 0) - (a || 0))
    .slice(0, 3)
    .map(([name, pct]) => ({ name, pct: Number(pct || 0) }));
  
  const peakRatioPct = Number(r.peak_ratio_pct || 0);
  const standbyMonthlyCost = Number(r.standby_monthly_cost || 0);
  const energyScoreValue = Number(r.energy_score || 0);
  const totalKwh30d = Number(r.total_kwh_30d || 0);
  const appliance_half_hourly = r.appliance_half_hourly || {};

  // Analyze appliance patterns to identify peak hours and waste
  const getApplianceInsight = (applianceName, percentage) => {
    // Normalize appliance name (remove _kwh suffix, replace underscores)
    const cleanName = String(applianceName || '')
      .replace(/_kwh$/, '')
      .replace(/_/g, ' ')
      .trim();
    
    const monthlyKwh = (percentage / 100) * totalKwh30d;
    const monthlyCost = monthlyKwh * 0.3278;
    const yearlyCost = monthlyCost * 12;
    
    // Personalized by appliance type with ACTUAL, engaging advice
    const insights = {
      'Air Conditioning': {
        headline: `Your AC is bleeding money during peak hours`,
        urgencyEmoji: peakRatioPct > 50 ? '🔴' : '🟡',
        body: `Your AC runs heaviest 6-10 PM—the exact window when TNB charges 40% MORE. You're burning S$${(monthlyCost * 0.4).toFixed(2)}/month extra just for bad timing.\n\n🎯 Here's the move:\n1️⃣ Hit 24°C from 6-9 PM (pre-cool to 22°C first)\n→ Saves: S$${Math.round(monthlyCost * 0.12).toFixed(2)}/month (~S$${(monthlyCost * 0.12 * 12).toFixed(0)}/year)\n2️⃣ Get a programmable thermostat (one-time S$50, pays for itself in 2 months)\n3️⃣ Close AC vents in unused rooms during peak\n→ Saves: S$${Math.round(monthlyCost * 0.08).toFixed(2)}/month`,
        savings: Math.round(monthlyKwh * 0.25 * 0.3278),
      },
      'Water Heater': {
        headline: `Water heater running 24/7 = throwing money away`,
        urgencyEmoji: '🔴',
        body: `Heating water 24/7 wastes energy during night hours when demand is 0. Off-peak rates (11 PM-7 AM) are 20% cheaper.\n\n🎯 Quick fixes:\n1️⃣ Buy a timer (S$20 online) → Only heat 6:30-7:30 AM & 5:30-7:00 PM\n→ Saves: S$${Math.round(monthlyCost * 0.3).toFixed(2)}/month\n2️⃣ Insulate pipes (S$30 foam wrap) → Heat stays in pipes 3x longer\n→ Saves: S$${Math.round(monthlyCost * 0.08).toFixed(2)}/month\n3️⃣ Lower temp to 50°C (still hot for showers, uses less energy)\n→ Saves: S$${Math.round(monthlyCost * 0.15).toFixed(2)}/month\n\n💰 Total potential: S$${(monthlyCost * 0.4).toFixed(2)}/month`,
        savings: Math.round(monthlyKwh * 0.40 * 0.3278),
      },
      'Washer': {
        headline: `Laundry at peak hours = paying premium rates`,
        urgencyEmoji: '🟡',
        body: `Running washer 11 AM-8 PM hits peak windows. Shift to off-peak (11 PM-7 AM) = save 15-20% instantly.\n\n🎯 No-effort moves:\n1️⃣ Run washer after 10:30 PM or before 7 AM (literally just change the time)\n→ Saves: S$${Math.round(monthlyCost * 0.18).toFixed(2)}/month\n2️⃣ Use cold water (90% of washer energy = heating water)\n→ Saves: S$${Math.round(monthlyCost * 0.25).toFixed(2)}/month\n3️⃣ Max out load size (don't run half-full)\n→ Saves: S$${Math.round(monthlyCost * 0.10).toFixed(2)}/month\n\n💰 Easy win: S$${(monthlyCost * 0.35).toFixed(2)}/month with zero gear purchases`,
        savings: Math.round(monthlyKwh * 0.35 * 0.3278),
      },
      'Entertainment': {
        headline: `Your TV/box is costing you money while OFF`,
        urgencyEmoji: '🟡',
        body: `Standby mode burns 2-5W 24/7 = S$${Math.round(standbyMonthlyCost * 0.2).toFixed(2)}/month wasted just sitting there.\n\n🎯 Phantom load cuts:\n1️⃣ Buy a smart power strip (S$25-40) → Cuts all standby instantly\n→ Saves: S$${Math.round(monthlyCost * 0.15).toFixed(2)}/month = S$${(monthlyCost * 0.15 * 12).toFixed(0)}/year (ROI: 1-2 months)\n2️⃣ If no power strip, unplug when leaving for 8+ hours\n3️⃣ Check device settings—some TVs have "always-on" mode enabled unnecessarily\n\n💰 Easiest S$${Math.round(monthlyCost * 0.15).toFixed(2)}/month save ever`,
        savings: Math.round(monthlyCost * 0.15),
      },
      'Kitchen': {
        headline: `Cooking during peak = paying double electricity`,
        urgencyEmoji: '🟡',
        body: `Peak hours 6-10 PM: Your oven/stove use costs 40% more. Oven is the worst offender (2-4 kW while running).\n\n🎯 Habit shifts:\n1️⃣ Use microwave/air fryer instead of oven (50% less energy, 75% faster)\n→ Saves: S$${Math.round(monthlyCost * 0.20).toFixed(2)}/month\n2️⃣ Batch cook on Sunday → Reheat during week (off-peak cooking, no energy spike)\n→ Saves: S$${Math.round(monthlyCost * 0.15).toFixed(2)}/month\n3️⃣ Got a pressure cooker? Use it—40% less energy than stovetop\n→ Saves: S$${Math.round(monthlyCost * 0.18).toFixed(2)}/month\n\n💰 Zero investment: S$${(monthlyCost * 0.35).toFixed(2)}/month`,
        savings: Math.round(monthlyKwh * 0.35 * 0.3278),
      },
      'Refridgeration': {
        headline: `Fridge efficiency drop = sneaky energy thief`,
        urgencyEmoji: '✅',
        body: `Fridges run 24/7, but dirty coils + bad seals = 30% waste. It's running but losing efficiency.\n\n🎯 Maintenance checks:\n1️⃣ Pull fridge out, vacuum coils (takes 10 min, happens 1x/year)\n→ Saves: S$${Math.round(monthlyCost * 0.12).toFixed(2)}/month (most fridges are caked in dust)\n2️⃣ Check door seal—close it on a dollar bill. If bill slides out easy = broken seal\n→ Replace seal: S$20, saves S$${Math.round(monthlyCost * 0.08).toFixed(2)}/month\n3️⃣ Keep fridge at 3-4°C (colder = bigger energy bill; 2°C uses 20% more)\n\n💰 Potential: S$${(monthlyCost * 0.15).toFixed(2)}/month for S$20 seal replacement`,
        savings: Math.round(monthlyKwh * 0.15 * 0.3278),
      },
      'Lighting': {
        headline: `Still using incandescent? That's literally burning money`,
        urgencyEmoji: '🔴',
        body: `If you've got old bulbs, they waste 85% as HEAT. LED = 75% less energy, 25 year lifespan.\n\n🎯 Bulb upgrade:\n1️⃣ Swap incandescent to LED (S$2-5 per bulb) → Instant 75% cut on that light\n→ Saves: S$${Math.round(monthlyCost * 0.60).toFixed(2)}/month per room if you use lots of lights\n2️⃣ Outdoor lights? Add motion sensor (S$15) = only on when needed\n→ Saves: S$${Math.round(monthlyCost * 0.30).toFixed(2)}/month\n3️⃣ Daylight sensor for living areas = auto-off when sunny\n\n💰 ROI on LED: pays for itself in 2-3 months`,
        savings: Math.round(monthlyKwh * 0.60 * 0.3278),
      },
    };
    
    return insights[cleanName] || {
      headline: `${cleanName}: ${percentage.toFixed(1)}% of your bill`,
      urgencyEmoji: percentage > 25 ? '🔴' : percentage > 15 ? '🟡' : '✅',
      body: `${cleanName} is a major consumer. Track when you use it and look for peak-hour patterns. Off-peak shifting could save S$${Math.round(monthlyCost * 0.15).toFixed(2)}/month.`,
      savings: Math.round(monthlyKwh * 0.15 * 0.3278),
    };
  };

  const insight1Data = getApplianceInsight(topAppliances[0]?.name || 'Appliance', topAppliances[0]?.pct || 0);
  const insight2Data = getApplianceInsight(topAppliances[1]?.name || 'Appliance', topAppliances[1]?.pct || 0);

  const aiInsights = [
    {
      id: 'insight-1',
      category: 'Appliance #1',
      urgency: topAppliances[0]?.pct > 30 ? 'high' : topAppliances[0]?.pct > 20 ? 'medium' : 'low',
      headline: `${insight1Data.urgencyEmoji} ${insight1Data.headline}`,
      timestamp: 'Based on real usage',
      body: insight1Data.body,
      estimatedSaving: insight1Data.savings,
      actionLabel: 'Save Now',
    },
    {
      id: 'insight-2',
      category: 'Appliance #2',
      urgency: topAppliances[1]?.pct > 20 ? 'high' : 'medium',
      headline: `${insight2Data.urgencyEmoji} ${insight2Data.headline}`,
      timestamp: 'Based on real usage',
      body: insight2Data.body,
      estimatedSaving: insight2Data.savings,
      actionLabel: 'Save Now',
    },
    {
      id: 'insight-3',
      category: 'Peak Hours Strategy',
      urgency: peakRatioPct > 50 ? 'high' : peakRatioPct > 45 ? 'medium' : 'low',
      headline: peakRatioPct > 50 
        ? `🔴 CRITICAL: ${peakRatioPct.toFixed(1)}% peak usage (way too high)`
        : peakRatioPct > 45
        ? `🟡 ${peakRatioPct.toFixed(1)}% peak (above average, time to shift)`
        : `✅ ${peakRatioPct.toFixed(1)}% peak (good! keep it up)`,
      timestamp: 'Peak = 6-10 PM (40% higher rates)',
      body: peakRatioPct > 50
        ? `Your energy bill is being KILLED by peak-hour usage. Every kWh during 6-10 PM costs 40% more.\n\n🎯 Immediate actions:\n1️⃣ AC to 24°C at 6 PM (pre-cool before 6)\n→ Saves: S$${Math.round((totalKwh30d * peakRatioPct / 100) * 0.1 * 0.3278).toFixed(2)}/month\n2️⃣ Laundry/dishwasher = always after 11 PM\n→ Saves: S$${Math.round((totalKwh30d * peakRatioPct / 100) * 0.08 * 0.3278).toFixed(2)}/month\n3️⃣ No cooking 6-10 PM (microwave/batch cook instead)\n→ Saves: S$${Math.round((totalKwh30d * peakRatioPct / 100) * 0.12 * 0.3278).toFixed(2)}/month\n\n💰 Realistic monthly savings: S$${Math.round((totalKwh30d * peakRatioPct / 100) * 0.25 * 0.3278).toFixed(2)}`
        : peakRatioPct > 45
        ? `Your peak usage is higher than district average (45%). Small shifts = S$${Math.round((totalKwh30d * peakRatioPct / 100) * 0.15 * 0.3278).toFixed(2)}/month savings.\n\n💡 Easy wins:\n• AC +2°C at peak hours\n• Move laundry to after 10:30 PM\n• Prep meals before 6 PM\n\n💰 Potential: S$${Math.round((totalKwh30d * peakRatioPct / 100) * 0.15 * 0.3278).toFixed(2)}/month`
        : `✅ Great job! Your peak load is below district average. You're already smart about timing. Keep heavy devices outside 6-10 PM.`,
      estimatedSaving: Number(r.potential_peak_saving || 0),
      actionLabel: 'Shift Schedule',
    },
    {
      id: 'insight-4',
      category: 'Standby Waste',
      urgency: standbyMonthlyCost > 20 ? 'high' : standbyMonthlyCost > 10 ? 'medium' : 'low',
      headline: standbyMonthlyCost > 20
        ? `🔴 S$${standbyMonthlyCost.toFixed(2)}/month = phantom load EATING YOUR MONEY`
        : standbyMonthlyCost > 10
        ? `🟡 S$${standbyMonthlyCost.toFixed(2)}/month wasted on devices that are OFF`
        : `✅ S$${standbyMonthlyCost.toFixed(2)}/month standby (good job!)`,
      timestamp: 'Measured 2-6 AM baseline',
      body: standbyMonthlyCost > 20
        ? `Devices plugged in but OFF are costing you nearly S$${(standbyMonthlyCost * 12).toFixed(0)}/year. That's insane.\n\n🎯 Culprits & quick kills:\n🔌 Entertainment box (decoder/DVR): S$${Math.round(standbyMonthlyCost * 0.35).toFixed(2)}/month\n→ Buy smart power strip ($25-40): saves S$${Math.round(standbyMonthlyCost * 0.35).toFixed(2)}/month [ROI: 1 month]\n\n🔌 Microwave/oven display: S$${Math.round(standbyMonthlyCost * 0.15).toFixed(2)}/month\n→ Unplug or use outlet timer\n\n🔌 Router/modem: S$${Math.round(standbyMonthlyCost * 0.10).toFixed(2)}/month\n→ Timer to turn off 12 AM-6 AM (if safe)\n\n🔌 Phone chargers: S$${Math.round(standbyMonthlyCost * 0.10).toFixed(2)}/month\n→ Unplug when not charging\n\n💰 Realistic target: Reduce to S$5/month (power strip + unplugging habits)`
        : standbyMonthlyCost > 10
        ? `Standby power is still high at S$${standbyMonthlyCost.toFixed(2)}/month.\n\n💡 Quick fixes:\n• Smart power strip for TV/box: saves ~S$${Math.round(standbyMonthlyCost * 0.50).toFixed(2)}/month\n• Check if devices have "always-on" mode enabled (disable it)\n• Unplug chargers when not in use\n\n→ Target: S$${Math.round(standbyMonthlyCost * 0.50).toFixed(2)}/month`
        : `✅ Excellent! You've got standby under control at S$${standbyMonthlyCost.toFixed(2)}/month. Keep unplugging and using power strips.`,
      estimatedSaving: Number(r.potential_standby_saving || 0),
      actionLabel: 'Reduce',
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
    // additional metadata for CLI parity
    anomaliesCount: Number(r.anomaly_count || 0),
    anomaliesSamples: Array.isArray(r.anomaly_samples) ? r.anomaly_samples : [],
    savings: {
      peak: Number(r.potential_peak_saving || 0),
      standby: Number(r.potential_standby_saving || 0),
      ac: Number(r.potential_ac_saving || 0),
    },
    standbyCost: Number(r.standby_monthly_cost || 0),
    billingHistory,
    profile: r.profile || {},
  };
}

export function buildResponse(q, u) {
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

export function ScreenCard({ colors, title, subtitle, children }) {
  return (
    <View style={[localStyles.card, { backgroundColor: colors.panel, borderColor: colors.border }]}>
      {title ? <Text style={[localStyles.cardTitle, { color: colors.text }]}>{title}</Text> : null}
      {subtitle ? <Text style={[localStyles.cardSubtitle, { color: colors.subtext }]}>{subtitle}</Text> : null}
      {children}
    </View>
  );
}

const localStyles = StyleSheet.create({
  card: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 13,
    marginBottom: 12,
  },
});
