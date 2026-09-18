import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useTaskStore } from '../store/taskStore';
import { useAuthStore } from '../store/authStore';
import Animated, { FadeInDown } from 'react-native-reanimated';

export default function DashboardScreen({ navigation }: any) {
  const { tasks, isLoading, fetchTasks, toggleTask, deleteTask } = useTaskStore();
  const { user, logout } = useAuthStore();
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    fetchTasks();
  }, []);

  const getPriorityColor = (priority: string) => {
    if (priority === 'High') return '#ff7675';
    if (priority === 'Medium') return '#fdcb6e';
    return '#55efc4';
  };

  const renderItem = ({ item, index }: any) => (
    <Animated.View entering={FadeInDown.delay(index * 100)} style={styles.card}>
      <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(item.priority) }]}>
        <Text style={styles.priorityText}>{item.priority}</Text>
      </View>
      <Text style={[styles.taskTitle, item.isCompleted && styles.completed]}>
        {item.isCompleted ? '✅ ' : '📌 '}{item.title}
      </Text>
      <Text style={styles.taskDesc}>{item.description}</Text>
      <Text style={styles.taskDate}>Deadline: {new Date(item.deadline).toLocaleDateString()}</Text>
      
      <View style={styles.cardActions}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => toggleTask(item._id, !item.isCompleted)}>
          <Text style={styles.actionText}>{item.isCompleted ? 'Undo' : 'Complete'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, styles.deleteBtn]} onPress={() => deleteTask(item._id)}>
          <Text style={styles.actionText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Hello, {user?.name}! 👋</Text>
        <TouchableOpacity onPress={logout}><Text style={styles.logout}>Logout</Text></TouchableOpacity>
      </View>
      
      {isLoading ? (
        <ActivityIndicator size="large" color="#0984e3" style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={tasks}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.empty}>No tasks yet. Add one!</Text>}
        />
      )}
      
      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('AddTask')}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  header: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, paddingTop: 60, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#dfe6e9' },
  greeting: { fontSize: 22, fontWeight: 'bold', color: '#2d3436' },
  logout: { color: '#d63031', fontSize: 16, fontWeight: 'bold' },
  list: { padding: 20 },
  card: { backgroundColor: '#fff', padding: 15, borderRadius: 12, marginBottom: 15, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5, elevation: 3 },
  priorityBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, marginBottom: 8 },
  priorityText: { fontSize: 12, fontWeight: 'bold', color: '#2d3436' },
  taskTitle: { fontSize: 18, fontWeight: 'bold', color: '#2d3436', marginBottom: 5 },
  completed: { textDecorationLine: 'line-through', color: '#b2bec3' },
  taskDesc: { fontSize: 14, color: '#636e72', marginBottom: 10 },
  taskDate: { fontSize: 12, color: '#0984e3', fontWeight: '600' },
  cardActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10 },
  actionBtn: { padding: 8, borderRadius: 6, backgroundColor: '#dfe6e9', marginLeft: 10 },
  deleteBtn: { backgroundColor: '#ff7675' },
  actionText: { color: '#2d3436', fontWeight: 'bold', fontSize: 12 },
  empty: { textAlign: 'center', color: '#b2bec3', fontSize: 16, marginTop: 50 },
  fab: { position: 'absolute', bottom: 30, right: 30, backgroundColor: '#0984e3', width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', shadowColor: '#0984e3', shadowOpacity: 0.3, shadowRadius: 10, elevation: 5 },
  fabText: { color: '#fff', fontSize: 30, fontWeight: 'bold' }
});
