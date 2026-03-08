import { useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { ScreenCard } from './utils';

export default function SimulatorScreen({ data, onNavigate, colors }) {
  const halfHourly = Array.isArray(data?.halfHourlyUsageData) ? data.halfHourlyUsageData : [];
  const [acTemp, setAcTemp] = useState(23);
  const [unplugStandby, setUnplugStandby] = useState(false);
  const [shiftLaundry, setShiftLaundry] = useState(false);

  const tvFraction = 18 / (45 + 38 + 24 + 18 + 15 + 12);
  const nighttime = halfHourly.filter((d) => {
    const h = Number(String(d.time || '0:00').split(':')[0]);
    return h >= 23 || h < 7;
  });
  const totalNightKwh = nighttime.reduce((s, d) => s + Number(d.kWh || 0), 0);
  const standbyKwhPerMonth = Number((totalNightKwh * tvFraction * 30).toFixed(1));
  const standbyDollarsPerMonth = Number((standbyKwhPerMonth * 0.2671).toFixed(2));

  // Peak hour ratio calculation
  const peakHours = halfHourly.filter((d) => {
    const h = Number(String(d.time || '0:00').split(':')[0]);
    return h >= 18 && h <= 22;
  });
  const totalPeakKwh = peakHours.reduce((s, d) => s + Number(d.kWh || 0), 0);
  const totalKwh = halfHourly.reduce((s, d) => s + Number(d.kWh || 0), 0);
  const currentPeakRatio = totalKwh > 0 ? (totalPeakKwh / totalKwh) * 100 : 0;
  
  // Simulate shifting laundry (assume ~3 kWh washer load during peak)
  const laundryShiftKwh = shiftLaundry ? 3 : 0;
  const newPeakKwh = Math.max(0, totalPeakKwh - laundryShiftKwh);
  const simulatedPeakRatio = totalKwh > 0 ? (newPeakKwh / totalKwh) * 100 : 0;
  const peakRatioImprovement = currentPeakRatio - simulatedPeakRatio;

  const diff = acTemp - 23;
  const acKwhSaved = Number((142 * 0.1 * diff).toFixed(1));
  const acDollarsSaved = Number((acKwhSaved * 0.2671).toFixed(2));

  const kwhSaved = Number((acKwhSaved + (unplugStandby ? standbyKwhPerMonth : 0) + laundryShiftKwh).toFixed(1));
  const dollarsSaved = Number((acDollarsSaved + (unplugStandby ? standbyDollarsPerMonth : 0) + (laundryShiftKwh * 0.2671)).toFixed(2));
  const points = Math.floor(Math.abs(dollarsSaved) * 2.5);

  return (
    <View style={styles.stack12}>
      <ScreenCard colors={colors} title="Estimated Monthly Impact" subtitle="Based on your selected actions">
        <Text style={[styles.metricBig, { color: dollarsSaved < 0 ? colors.danger : colors.text }]}> 
          {dollarsSaved < 0 ? '+' : '-'}${Math.abs(dollarsSaved).toFixed(2)}
        </Text>
        <Text style={{ color: colors.subtext }}>{kwhSaved} kWh saved • +{points} score</Text>
      </ScreenCard>

      <ScreenCard colors={colors} title="Peak Hour Ratio" subtitle={`Current: ${currentPeakRatio.toFixed(1)}%`}>
        <View style={styles.peakRatioBar}>
          <View style={[styles.peakRatioFill, { 
            width: `${Math.min(100, currentPeakRatio)}%`, 
            backgroundColor: currentPeakRatio > 40 ? colors.danger : colors.warning 
          }]} />
        </View>
        {shiftLaundry && (
          <View style={[styles.peakRatioBar, { marginTop: 8, opacity: 0.7 }]}>
            <View style={[styles.peakRatioFill, { 
              width: `${Math.min(100, simulatedPeakRatio)}%`, 
              backgroundColor: colors.success 
            }]} />
          </View>
        )}
        <View style={[styles.rowBetween, { marginTop: 12 }]}>
          <Text style={{ color: colors.subtext }}>Shift heavy loads off-peak</Text>
          <Switch value={shiftLaundry} onValueChange={setShiftLaundry} trackColor={{ true: colors.accent }} />
        </View>
        {shiftLaundry && (
          <Text style={{ color: colors.success, fontSize: 12, marginTop: 6 }}>
            New ratio: {simulatedPeakRatio.toFixed(1)}% (↓{peakRatioImprovement.toFixed(1)}%)
          </Text>
        )}
      </ScreenCard>

      <ScreenCard colors={colors} title="Air-Conditioning" subtitle={`${acTemp}°C selected`}>
        <View style={styles.rowBetween}>
          <Pressable onPress={() => setAcTemp((v) => Math.max(18, v - 1))} style={[styles.secondaryBtn, { borderColor: colors.border }]}>
            <Text style={{ color: colors.text }}>-</Text>
          </Pressable>
          <Text style={{ color: colors.accent, fontSize: 24, fontWeight: '800' }}>{acTemp}°C</Text>
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

const styles = StyleSheet.create({
  stack12: {
    gap: 12,
  },
  metricBig: {
    fontSize: 32,
    fontWeight: '800',
    marginBottom: 6,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  peakRatioBar: {
    height: 24,
    backgroundColor: '#e0e0e0',
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 8,
  },
  peakRatioFill: {
    height: '100%',
    borderRadius: 12,
  },
  secondaryBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  primaryBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  primaryBtnText: {
    color: '#fff',
    fontWeight: '700',
  },
});
