import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';

import { API_BASE, COLORS, DARK_COLORS, TABS } from './src/theme';
import { transformApiPayload } from './src/utils';
import DashboardScreen from './src/DashboardScreen';
import InsightsScreen from './src/InsightsScreen';
import SimulatorScreen from './src/SimulatorScreen';
import ChatScreen from './src/ChatScreen';
import StreakScreen from './src/StreakScreen';
import ApplianceBreakdownScreen from './src/ApplianceBreakdownScreen';

export default function App() {
  const [screen, setScreen] = useState('dashboard');
  const [dark, setDark] = useState(false);
  const [apiStatus, setApiStatus] = useState('loading');
  const [apiData, setApiData] = useState(null);
  const [apiError, setApiError] = useState('');

  const colors = dark ? DARK_COLORS : COLORS;

  const loadLatestData = async () => {
    const endpoint = `${API_BASE}/analyze/latest?generated_dir=generated_data&_ts=${Date.now()}`;
    const response = await fetch(endpoint);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    setApiData(transformApiPayload(payload));
    setApiStatus('connected');
  };

  const generateFreshData = async () => {
    const response = await fetch(`${API_BASE}/generate`, {
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
        {screen === 'streak' && <StreakScreen colors={colors} />}
        {screen === 'appliance-breakdown' && (
          <ApplianceBreakdownScreen data={apiData} onBack={() => setScreen('insights')} colors={colors} />
        )}
      </ScrollView>

      <View style={[styles.bottomNav, { backgroundColor: colors.panel, borderColor: colors.border }]}>
        {TABS.map((item) => (
          <Pressable
            key={item.key}
            onPress={() => setScreen(item.key)}
            style={[
              styles.navBtn, 
              screen === item.key && [styles.navBtnActive, { backgroundColor: colors.accent }]
            ]}
          >
            <Text style={styles.navIcon}>{item.icon}</Text>
            <Text style={[
              styles.navText, 
              { color: screen === item.key ? '#fff' : colors.subtext }
            ]}>
              {item.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  topBar: {
    marginHorizontal: 12,
    marginTop: 8,
    marginBottom: 8,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  brand: {
    fontSize: 16,
    fontWeight: '700',
  },
  apiBadge: {
    borderWidth: 1,
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
  bottomNav: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 12,
    borderWidth: 1,
    borderRadius: 20,
    padding: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  navBtn: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  navBtnActive: {
    shadowColor: '#00a8b8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  navIcon: {
    fontSize: 20,
  },
  navText: {
    fontSize: 10,
    fontWeight: '700',
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
});
