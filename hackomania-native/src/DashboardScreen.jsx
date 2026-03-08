import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Polyline } from 'react-native-svg';
import { ScreenCard } from './utils';

const CHART_W = 720;
const CHART_H = 180;
const CHART_PAD = 10;

function getPoints(values, maxValue) {
  return values.map((value, index) => {
    const x = CHART_PAD + (index * (CHART_W - CHART_PAD * 2)) / Math.max(1, values.length - 1);
    const y = CHART_H - CHART_PAD - (value / Math.max(0.1, maxValue)) * (CHART_H - CHART_PAD * 2);
    return { x, y, value };
  });
}

export default function DashboardScreen({ data, colors }) {
  const m = data?.dashboardMetrics || {
    currentMonthUsage: 0,
    lastMonthUsage: 0,
    percentageChange: 0,
    peakPeriod: '6:00 PM - 10:00 PM',
    energyScore: 0,
    percentile: 50,
  };

  const daily = Array.isArray(data?.dailyUsageData) ? data.dailyUsageData : [];
  const halfHourly = Array.isArray(data?.halfHourlyUsageData) ? data.halfHourlyUsageData : [];

  // computed metrics
  const avgDaily = daily.length ? Number((daily.reduce((sum, d) => sum + Number(d.kWh || 0), 0) / daily.length).toFixed(1)) : 0;
  const todayUsage = daily.length ? daily[daily.length - 1].kWh : 0;
  const estimatedBill = m.estimated_bill || 0;
  const tariff = m.tariff || 0;
  const peakRatio = m.peak_ratio_pct || m.peakRatio || 0;
  const standbyCost = m.standby_monthly_cost || 0;
  const weekendUplift = m.weekend_uplift_pct || 0;
  const halfHourlyLatest = halfHourly.length ? halfHourly[halfHourly.length - 1].kWh : 0;

  const barsMax = Math.max(1, ...daily.map((d) => d.kWh || 0));
  const isIncrease = m.percentageChange > 0;

  const anomaliesCount = data?.anomaliesCount || 0;
  const anomaliesSamples = Array.isArray(data?.anomaliesSamples) ? data.anomaliesSamples : [];
  const savings = data?.savings || { peak:0, standby:0, ac:0 };
  const billingHistory = Array.isArray(data?.billingHistory) ? data.billingHistory : [];
  const profile = data?.profile || {};
  const peakRatio = data?.dashboardMetrics?.peak_ratio_pct || data?.dashboardMetrics?.peakRatio || 0;

  const hourlyData = Array.from({ length: 24 }, (_, hour) => {
    const samples = halfHourly.filter((d) => Number(String(d.time || '0:00').split(':')[0]) === hour);
    const avg = samples.length ? samples.reduce((sum, d) => sum + Number(d.kWh || 0), 0) / samples.length : 0;
    return { hour, kwh: avg };
  });

  const hourlyValues = hourlyData.map((d) => d.kwh);
  const hourlyMax = Math.max(0.1, ...hourlyValues);
  const hourlyPoints = getPoints(hourlyValues, hourlyMax);
  const polylinePoints = hourlyPoints.map((p) => `${p.x},${p.y}`).join(' ');

  return (
    <View style={styles.stack12}>
      <ScreenCard colors={colors} title="Key Metrics (Last 30 Days)">
        <View style={styles.metricsGrid}>
          <View style={styles.metricItem}>
            <Text style={[styles.metricLabel, { color: colors.subtext }]}>Monthly usage</Text>
            <Text style={[styles.metricValue, { color: colors.text }]}>{m.currentMonthUsage} kWh</Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={[styles.metricLabel, { color: colors.subtext }]}>Avg daily</Text>
            <Text style={[styles.metricValue, { color: colors.text }]}>{avgDaily} kWh</Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={[styles.metricLabel, { color: colors.subtext }]}>Today's usage</Text>
            <Text style={[styles.metricValue, { color: colors.text }]}>{todayUsage} kWh</Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={[styles.metricLabel, { color: colors.subtext }]}>Estimated bill</Text>
            <Text style={[styles.metricValue, { color: colors.text }]}>S${estimatedBill}</Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={[styles.metricLabel, { color: colors.subtext }]}>Tariff rate</Text>
            <Text style={[styles.metricValue, { color: colors.text }]}>{tariff} SGD/kWh</Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={[styles.metricLabel, { color: colors.subtext }]}>Peak ratio</Text>
            <Text style={[styles.metricValue, { color: colors.text }]}>{peakRatio}%</Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={[styles.metricLabel, { color: colors.subtext }]}>Standby cost</Text>
            <Text style={[styles.metricValue, { color: colors.text }]}>S${standbyCost}</Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={[styles.metricLabel, { color: colors.subtext }]}>Weekend uplift</Text>
            <Text style={[styles.metricValue, { color: colors.text }]}>{weekendUplift}%</Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={[styles.metricLabel, { color: colors.subtext }]}>Latest interval</Text>
            <Text style={[styles.metricValue, { color: colors.text }]}>{halfHourlyLatest} kWh</Text>
          </View>
        </View>
      </ScreenCard>

      <ScreenCard colors={colors} title="24-Hour Monitor" subtitle="Today's usage pattern">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scrollChart}>
          <View style={styles.lineChartRow}>
            <View style={styles.yAxisLabels}>
              <Text style={[styles.axisText, { color: colors.subtext }]}>{hourlyMax.toFixed(1)}</Text>
              <Text style={[styles.axisText, { color: colors.subtext }]}>{(hourlyMax / 2).toFixed(1)}</Text>
              <Text style={[styles.axisText, { color: colors.subtext }]}>0.0</Text>
            </View>

            <View>
              <Svg width={CHART_W} height={CHART_H}>
                <Line x1={CHART_PAD} y1={CHART_PAD} x2={CHART_PAD} y2={CHART_H - CHART_PAD} stroke={colors.border} strokeWidth="1" />
                <Line
                  x1={CHART_PAD}
                  y1={CHART_H - CHART_PAD}
                  x2={CHART_W - CHART_PAD}
                  y2={CHART_H - CHART_PAD}
                  stroke={colors.border}
                  strokeWidth="1"
                />

                <Polyline points={polylinePoints} fill="none" stroke={colors.accent} strokeWidth="2.5" />

                {hourlyPoints.map((p, index) => {
                  const isPeak = hourlyData[index].hour >= 18 && hourlyData[index].hour <= 22;
                  return (
                    <Circle
                      key={`hour-${hourlyData[index].hour}`}
                      cx={p.x}
                      cy={p.y}
                      r="3"
                      fill={isPeak ? colors.danger : colors.accent}
                    />
                  );
                })}
              </Svg>

              <View style={styles.xAxisLabelsWrap}>
                {hourlyData.filter((_, idx) => idx % 3 === 0).map((d) => {
                  const label = d.hour === 0 ? '12a' : d.hour < 12 ? `${d.hour}a` : d.hour === 12 ? '12p' : `${d.hour - 12}p`;
                  return (
                    <Text key={`x-${d.hour}`} style={[styles.axisText, { color: colors.subtext }]}>
                      {label}
                    </Text>
                  );
                })}
              </View>
            </View>
          </View>
        </ScrollView>

        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.accent }]} />
            <Text style={{ color: colors.subtext, fontSize: 11 }}>Off-Peak</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.danger }]} />
            <Text style={{ color: colors.subtext, fontSize: 11 }}>Peak Hours</Text>
          </View>
        </View>
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

      {/* Anomalies */}
      {m.anomaliesCount > 0 ? (
        <ScreenCard colors={colors} title="Anomalies Detected">
          <Text style={{ color: colors.warning, fontWeight: '700' }}>{m.anomaliesCount} unusual spike(s) this week</Text>
          {m.anomaliesSamples.slice(0,3).map((a, idx) => (
            <Text key={idx} style={{ color: colors.subtext, fontSize: 12 }}>
              {new Date(a._ts).toLocaleString()} – {a._kwh.toFixed(2)} kWh
            </Text>
          ))}
        </ScreenCard>
      ) : (
        <ScreenCard colors={colors} title="Anomalies Detected">
          <Text style={{ color: colors.success }}>None in the past 7 days</Text>
        </ScreenCard>
      )}

      {/* Peak demand */}
      <ScreenCard colors={colors} title="Peak Demand">
        <Text style={{ color: colors.text }}>Peak hour ratio (6‑10 PM): {m.peakRatio}%</Text>
        {m.peakRatio > 45 ? (
          <Text style={{ color: colors.danger }}>Above district average – consider shifting loads off‑peak.</Text>
        ) : (
          <Text style={{ color: colors.success }}>Below district average. Good job!</Text>
        )}
      </ScreenCard>

      {/* Billing history */}
      {m.billingHistory && m.billingHistory.length ? (
        <ScreenCard colors={colors} title="Billing History">
          {m.billingHistory.slice(-3).map((row, idx) => {
            const period = row.billing_period || '';
            const cost = row.cost_sgd || row.amount || 0;
            return (
              <Text key={idx} style={{ color: colors.subtext, fontSize: 12 }}>
                {period}: S${Number(cost || 0).toFixed(2)}
              </Text>
            );
          })}
        </ScreenCard>
      ) : null}

      {/* Profile */}
      {m.profile && Object.keys(m.profile).length ? (
        <ScreenCard colors={colors} title="Household Profile">
          {Object.entries(m.profile).map(([k,v]) => (
            <Text key={k} style={{ color: colors.subtext, fontSize: 12 }}>
              {k}: {v}
            </Text>
          ))}
        </ScreenCard>
      ) : null}

      {/* Savings potential */}
      <ScreenCard colors={colors} title="Savings Potential">
        <Text style={{ color: colors.warning }}>Peak shift: S${m.savings.peak.toFixed(2)}/mo</Text>
        <Text style={{ color: colors.warning }}>Standby: S${m.savings.standby.toFixed(2)}/mo</Text>
        <Text style={{ color: colors.warning }}>AC tweaks: S${m.savings.ac.toFixed(2)}/mo</Text>
      </ScreenCard>
    </View>
  );
}

const styles = StyleSheet.create({
  stack12: {
    gap: 12,
  },
  metricBig: {
    fontSize: 32,
    fontWeight: '800',
    marginBottom: 6,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  metricItem: {
    width: '48%',
    marginBottom: 8,
  },
  metricLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  scoreBadge: {
    borderWidth: 3,
    borderRadius: 999,
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollChart: {
    marginTop: 8,
  },
  lineChartRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  yAxisLabels: {
    height: CHART_H,
    justifyContent: 'space-between',
    paddingRight: 8,
    paddingTop: CHART_PAD - 2,
    paddingBottom: CHART_PAD - 2,
  },
  xAxisLabelsWrap: {
    width: CHART_W,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: CHART_PAD,
    paddingTop: 6,
  },
  axisText: {
    fontSize: 10,
  },
  legendRow: {
    flexDirection: 'row',
    gap: 16,
    justifyContent: 'center',
    marginTop: 10,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  chartRow: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-around',
  },
  chartBarItem: {
    alignItems: 'center',
    gap: 4,
  },
  chartBarTrack: {
    width: 28,
    height: 100,
    borderRadius: 4,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  chartBarFill: {
    width: '100%',
    borderRadius: 4,
  },
});