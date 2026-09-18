import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { useTaskStore } from '../store/taskStore';

const PRIORITIES = ['Low', 'Medium', 'High'] as const;

export default function AddTaskScreen({ navigation }: any) {
  const { addTask } = useTaskStore();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dateTime, setDateTime] = useState('');
  const [deadline, setDeadline] = useState('');
  const [priority, setPriority] = useState<typeof PRIORITIES[number]>('Medium');
  const [category, setCategory] = useState('General');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Missing title', 'Please enter a task title.');
      return;
    }
    if (!deadline.trim()) {
      Alert.alert('Missing deadline', 'Please enter a deadline (YYYY-MM-DD HH:MM).');
      return;
    }

    const parsedDeadline = new Date(deadline.replace(' ', 'T'));
    if (isNaN(parsedDeadline.getTime())) {
      Alert.alert('Invalid deadline', 'Use format: YYYY-MM-DD HH:MM (e.g. 2026-09-20 18:00)');
      return;
    }

    const parsedDateTime = dateTime.trim()
      ? new Date(dateTime.replace(' ', 'T'))
      : new Date();

    setIsSaving(true);
    try {
      await addTask({
        title: title.trim(),
        description: description.trim(),
        dateTime: parsedDateTime.toISOString(),
        deadline: parsedDeadline.toISOString(),
        priority,
        category: category.trim() || 'General',
      });
      navigation.goBack();
    } catch (err) {
      Alert.alert('Error', 'Failed to save task. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>New Task</Text>

      <Text style={styles.label}>Title</Text>
      <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="e.g. Finish report" />

      <Text style={styles.label}>Description</Text>
      <TextInput
        style={[styles.input, styles.multiline]}
        value={description}
        onChangeText={setDescription}
        placeholder="Details about the task"
        multiline
      />

      <Text style={styles.label}>Date/Time (optional, YYYY-MM-DD HH:MM)</Text>
      <TextInput
        style={styles.input}
        value={dateTime}
        onChangeText={setDateTime}
        placeholder="2026-09-19 09:00"
      />

      <Text style={styles.label}>Deadline (required, YYYY-MM-DD HH:MM)</Text>
      <TextInput
        style={styles.input}
        value={deadline}
        onChangeText={setDeadline}
        placeholder="2026-09-20 18:00"
      />

      <Text style={styles.label}>Priority</Text>
      <View style={styles.priorityRow}>
        {PRIORITIES.map((p) => (
          <TouchableOpacity
            key={p}
            style={[styles.priorityBtn, priority === p && styles.priorityBtnActive]}
            onPress={() => setPriority(p)}
          >
            <Text style={[styles.priorityBtnText, priority === p && styles.priorityBtnTextActive]}>{p}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Category</Text>
      <TextInput style={styles.input} value={category} onChangeText={setCategory} placeholder="General" />

      <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={isSaving}>
        <Text style={styles.saveBtnText}>{isSaving ? 'Saving...' : 'Save Task'}</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.goBack()}>
        <Text style={styles.cancel}>Cancel</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingTop: 60, backgroundColor: '#f8f9fa', flexGrow: 1 },
  title: { fontSize: 26, fontWeight: 'bold', color: '#2d3436', marginBottom: 20 },
  label: { fontSize: 13, fontWeight: '600', color: '#636e72', marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: '#fff', padding: 14, borderRadius: 10, fontSize: 16, borderWidth: 1, borderColor: '#dfe6e9' },
  multiline: { minHeight: 80, textAlignVertical: 'top' },
  priorityRow: { flexDirection: 'row', gap: 10 },
  priorityBtn: { flex: 1, padding: 12, borderRadius: 10, backgroundColor: '#fff', borderWidth: 1, borderColor: '#dfe6e9', alignItems: 'center' },
  priorityBtnActive: { backgroundColor: '#0984e3', borderColor: '#0984e3' },
  priorityBtnText: { color: '#2d3436', fontWeight: '600' },
  priorityBtnTextActive: { color: '#fff' },
  saveBtn: { backgroundColor: '#00b894', padding: 16, borderRadius: 10, alignItems: 'center', marginTop: 30 },
  saveBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  cancel: { color: '#d63031', textAlign: 'center', marginTop: 15, fontSize: 15 },
});
