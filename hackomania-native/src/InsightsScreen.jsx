import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ScreenCard } from './utils';

export default function InsightsScreen({ data, onNavigate, colors }) {
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

const styles = StyleSheet.create({
  stack12: {
    gap: 12,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
