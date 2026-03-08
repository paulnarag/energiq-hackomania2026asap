import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Polyline, Text as SvgText } from 'react-native-svg';
import { ScreenCard } from './utils';

const SVG_W = 320;
const SVG_H = 150;
const SVG_PAD = 14;

function buildPoints(values, maxValue) {
  return values.map((value, idx) => {
    const x = SVG_PAD + (idx * (SVG_W - SVG_PAD * 2)) / Math.max(1, values.length - 1);
    const y = SVG_H - SVG_PAD - (value / Math.max(0.1, maxValue)) * (SVG_H - SVG_PAD * 2);
    return { x, y, value };
  });
}

function LineTrendChart({ rows, maxValue, strokeColor, labelFormatter, axisFormatter, colors }) {
  const values = rows.map((r) => Number(r.value || 0));
  const points = useMemo(() => buildPoints(values, maxValue), [values, maxValue]);
  const polyline = points.map((p) => `${p.x},${p.y}`).join(' ');

  return (
    <View style={styles.lineChartWrap}>
      <View style={styles.yAxis}>
        <Text style={[styles.axisText, { color: colors.subtext }]}>{axisFormatter(maxValue)}</Text>
        <Text style={[styles.axisText, { color: colors.subtext }]}>{axisFormatter(maxValue / 2)}</Text>
        <Text style={[styles.axisText, { color: colors.subtext }]}>{axisFormatter(0)}</Text>
      </View>

      <View>
        <Svg width={SVG_W} height={SVG_H}>
          <Line x1={SVG_PAD} y1={SVG_PAD} x2={SVG_PAD} y2={SVG_H - SVG_PAD} stroke={colors.border} strokeWidth="1" />
          <Line
            x1={SVG_PAD}
            y1={SVG_H - SVG_PAD}
            x2={SVG_W - SVG_PAD}
            y2={SVG_H - SVG_PAD}
            stroke={colors.border}
            strokeWidth="1"
          />

          <Polyline points={polyline} fill="none" stroke={strokeColor} strokeWidth="2.5" />

          {points.map((p, idx) => (
            <Circle key={`dot-${idx}`} cx={p.x} cy={p.y} r="3.5" fill={strokeColor} />
          ))}

          {points.map((p, idx) => (
            <SvgText
              key={`label-${idx}`}
              x={p.x}
              y={Math.max(10, p.y - 8)}
              fill={colors.text}
              fontSize="10"
              fontWeight="700"
              textAnchor="middle"
            >
              {labelFormatter(rows[idx].value)}
            </SvgText>
          ))}
        </Svg>

        <View style={styles.xAxisLabelsWrap}>
          {rows.map((r) => (
            <Text key={`x-${r.month}`} style={[styles.axisText, { color: colors.subtext }]}>
              {r.month}
            </Text>
          ))}
        </View>
      </View>
    </View>
  );
}

export default function ApplianceBreakdownScreen({ data, onBack, colors }) {
  const [selected, setSelected] = useState(null);
  const list = Array.isArray(data?.applianceBreakdown) ? data.applianceBreakdown : [];
  const totalKwh = list.reduce((sum, item) => sum + Number(item.kwh || 0), 0);

  if (selected) {
    const monthly = Array.isArray(selected.monthly) ? selected.monthly : [];
    const maxKwh = Math.max(1, ...monthly.map((m) => Number(m.kwh || 0)));
    const maxCost = Math.max(0.1, ...monthly.map((m) => Number(m.cost || 0)));
    const latest = monthly[monthly.length - 1] || { kwh: 0, cost: 0 };

    const usageRows = monthly.map((row) => ({ month: row.month, value: Number(row.kwh || 0) }));
    const costRows = monthly.map((row) => ({ month: row.month, value: Number(row.cost || 0) }));

    return (
      <ScrollView style={styles.stack12}>
        <Pressable onPress={() => setSelected(null)} style={[styles.backBtn, { borderColor: colors.border, backgroundColor: colors.panel }]}>
          <Text style={{ color: colors.text, fontWeight: '700' }}>Back</Text>
        </Pressable>

        <ScreenCard colors={colors} title={selected.name} subtitle="Monthly energy consumption">
          <View style={styles.summaryRow}>
            <View style={[styles.summaryItem, { backgroundColor: colors.bg, borderColor: colors.border }]}> 
              <Text style={{ color: colors.subtext, fontSize: 12 }}>Latest Month</Text>
              <Text style={[styles.summaryValue, { color: colors.accent }]}>{Number(latest.kwh).toFixed(1)} kWh</Text>
            </View>
            <View style={[styles.summaryItem, { backgroundColor: colors.bg, borderColor: colors.border }]}> 
              <Text style={{ color: colors.subtext, fontSize: 12 }}>Est. Cost</Text>
              <Text style={[styles.summaryValue, { color: colors.text }]}>${Number(latest.cost).toFixed(2)}</Text>
            </View>
          </View>
        </ScreenCard>

        <ScreenCard colors={colors} title="Energy Usage Trend" subtitle="kWh per month">
          <LineTrendChart
            rows={usageRows}
            maxValue={maxKwh}
            strokeColor={colors.accent}
            labelFormatter={(v) => Number(v).toFixed(1)}
            axisFormatter={(v) => Number(v).toFixed(0)}
            colors={colors}
          />
        </ScreenCard>

        <ScreenCard colors={colors} title="Cost Breakdown" subtitle="$ per month">
          <LineTrendChart
            rows={costRows}
            maxValue={maxCost}
            strokeColor={colors.warning}
            labelFormatter={(v) => `$${Number(v).toFixed(2)}`}
            axisFormatter={(v) => `$${Number(v).toFixed(0)}`}
            colors={colors}
          />
        </ScreenCard>

        <ScreenCard colors={colors} title="Monthly Details">
          {monthly.map((row) => (
            <View key={`detail-${selected.name}-${row.month}`} style={[styles.detailRow, { borderBottomColor: colors.border }]}> 
              <Text style={{ color: colors.text, fontWeight: '600', flex: 1 }}>{row.month}</Text>
              <Text style={{ color: colors.accent, fontWeight: '700' }}>{Number(row.kwh).toFixed(1)} kWh</Text>
              <Text style={{ color: colors.subtext, marginLeft: 12 }}>${Number(row.cost).toFixed(2)}</Text>
            </View>
          ))}
        </ScreenCard>
      </ScrollView>
    );
  }

  return (
    <View style={styles.stack12}>
      <Pressable onPress={onBack} style={[styles.backBtn, { borderColor: colors.border, backgroundColor: colors.panel }]}>
        <Text style={{ color: colors.text, fontWeight: '700' }}>Back to Insights</Text>
      </Pressable>

      <ScreenCard colors={colors} title="Appliance Breakdown" subtitle={data?.applianceWindowLabel || 'Latest period'}>
        <Text style={{ color: colors.subtext, fontSize: 13, marginBottom: 12 }}>Total: {totalKwh.toFixed(1)} kWh</Text>
        {list.map((item) => {
          const percentage = totalKwh > 0 ? (Number(item.kwh || 0) / totalKwh) * 100 : 0;
          return (
            <Pressable
              key={item.name}
              onPress={() => setSelected(item)}
              style={[styles.applianceCard, { borderColor: colors.border, backgroundColor: colors.panelSoft }]}
            >
              <View style={styles.applianceHeader}>
                <Text style={{ color: colors.text, fontWeight: '700', fontSize: 15 }}>{item.name}</Text>
                <Text style={{ color: colors.accent, fontWeight: '800', fontSize: 16 }}>{Number(item.kwh).toFixed(1)} kWh</Text>
              </View>
              <View style={[styles.percentBar, { backgroundColor: colors.bg }]}> 
                <View style={[styles.percentBarFill, { width: `${Math.max(2, percentage)}%`, backgroundColor: colors.accent }]} />
              </View>
              <Text style={{ color: colors.subtext, fontSize: 12, marginTop: 4 }}>
                {percentage.toFixed(1)}% of total - Tap for details
              </Text>
            </Pressable>
          );
        })}
      </ScreenCard>
    </View>
  );
}

const styles = StyleSheet.create({
  stack12: {
    gap: 12,
  },
  backBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  applianceCard: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  applianceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  percentBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  percentBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 4,
  },
  summaryItem: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '800',
    marginTop: 4,
  },
  lineChartWrap: {
    flexDirection: 'row',
    marginTop: 8,
  },
  yAxis: {
    height: SVG_H,
    justifyContent: 'space-between',
    paddingRight: 8,
    paddingTop: SVG_PAD - 2,
    paddingBottom: SVG_PAD - 2,
  },
  xAxisLabelsWrap: {
    width: SVG_W,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: SVG_PAD,
    paddingTop: 6,
  },
  axisText: {
    fontSize: 10,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
});