import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { buildResponse, ScreenCard } from './utils';

export default function ChatScreen({ data, colors }) {
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

const styles = StyleSheet.create({
  stack12: {
    gap: 12,
  },
  chatBox: {
    gap: 8,
    marginBottom: 12,
  },
  chatRow: {
    flexDirection: 'row',
  },
  chatRowReverse: {
    flexDirection: 'row-reverse',
  },
  chatBubble: {
    maxWidth: '75%',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  input: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  addBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  addBtnText: {
    color: '#fff',
    fontWeight: '700',
  },
});
