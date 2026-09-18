import { create } from 'zustand';
import { taskAPI } from '../services/api';
import { Task } from '../types';

interface TaskState {
  tasks: Task[];
  isLoading: boolean;
  fetchTasks: () => Promise<void>;
  addTask: (data: any) => Promise<void>;
  toggleTask: (id: string, isCompleted: boolean) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
}

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  isLoading: false,
  fetchTasks: async () => {
    set({ isLoading: true });
    try {
      const res = await taskAPI.getTasks();
      // The backend already sorts them with our Winning Algorithm!
      set({ tasks: res.data, isLoading: false });
    } catch (err) {
      set({ isLoading: false });
    }
  },
  addTask: async (data) => {
    try {
      await taskAPI.createTask(data);
      await get().fetchTasks();
    } catch (err) {
      console.error('Failed to add task', err);
    }
  },
  toggleTask: async (id, isCompleted) => {
    try {
      await taskAPI.updateTask(id, { isCompleted });
      await get().fetchTasks();
    } catch (err) {
      console.error('Failed to update task', err);
    }
  },
  deleteTask: async (id) => {
    try {
      await taskAPI.deleteTask(id);
      await get().fetchTasks();
    } catch (err) {
      console.error('Failed to delete task', err);
    }
  },
}));
