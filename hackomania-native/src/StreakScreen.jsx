import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

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

export default function StreakScreen({ colors }) {
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
      <View style={[styles.pointsCard, { backgroundColor: colors.panel, borderColor: colors.border }]}>
        <Text style={[styles.pointsLabel, { color: colors.subtext }]}>User points</Text>
        <Text style={[styles.pointsValue, { color: colors.accent }]}>{points}</Text>
      </View>

      <View style={styles.sectionBlock}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Tasks</Text>
        <View style={styles.rowWrap}>
          {['daily', 'weekly', 'monthly'].map((name) => (
            <Pressable
              key={name}
              onPress={() => setTaskTab(name)}
              style={[
                styles.pill,
                { borderColor: colors.border, backgroundColor: colors.bg },
                taskTab === name && { backgroundColor: colors.accent },
              ]}
            >
              <Text
                style={[
                  styles.pillText,
                  { color: colors.text },
                  taskTab === name && { color: '#fff' },
                ]}
              >
                {name}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.inputRow}>
          <TextInput
            value={taskInput}
            onChangeText={setTaskInput}
            placeholder="Add task"
            placeholderTextColor={colors.subtext}
            style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.bg }]}
          />
          <Pressable onPress={addTask} style={[styles.addBtn, { backgroundColor: colors.accent }]}>
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
              style={[
                styles.taskCard,
                { backgroundColor: colors.panel, borderColor: colors.border },
                isDone && { opacity: 0.6 },
              ]}
            >
              <View style={styles.taskLeft}>
                <Text style={[styles.taskText, { color: colors.text }]}>{task.label}</Text>
                <Text style={[styles.taskPoints, { color: colors.subtext }]}>+{task.points} pts</Text>
              </View>
              <View
                style={[
                  styles.checkDot,
                  { borderColor: colors.border },
                  isDone && { backgroundColor: colors.success },
                ]}
              />
            </Pressable>
          );
        })}
      </View>

      <View style={styles.sectionBlock}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Rewards</Text>
        <View style={styles.rewardGrid}>
          {REWARDS.map((reward) => {
            const unlocked = points >= reward.points;
            return (
              <View
                key={reward.title}
                style={[
                  styles.rewardCard,
                  { backgroundColor: colors.panel, borderColor: colors.border },
                ]}
              >
                <Text style={[styles.rewardTitle, { color: colors.text }]}>{reward.title}</Text>
                <Text style={[styles.rewardPoints, { color: colors.subtext }]}>{reward.points} points</Text>
                <Text
                  style={[
                    styles.rewardState,
                    { color: unlocked ? colors.success : colors.subtext },
                  ]}
                >
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

const styles = StyleSheet.create({
  screenStack: {
    gap: 16,
  },
  pointsCard: {
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  pointsLabel: {
    fontSize: 14,
    marginBottom: 4,
  },
  pointsValue: {
    fontSize: 40,
    fontWeight: '800',
  },
  sectionBlock: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  rowWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pill: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
  },
  pillText: {
    fontSize: 14,
    fontWeight: '600',
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
  taskCard: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  taskLeft: {
    flex: 1,
  },
  taskText: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  taskPoints: {
    fontSize: 12,
  },
  checkDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
  },
  rewardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  rewardCard: {
    width: '48%',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  rewardTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 6,
  },
  rewardPoints: {
    fontSize: 12,
    marginBottom: 8,
  },
  rewardState: {
    fontSize: 12,
    fontWeight: '700',
  },
});
