export interface User {
  id: string;
  name: string;
  email: string;
}

export interface Task {
  _id: string;
  title: string;
  description: string;
  dateTime: string;
  deadline: string;
  priority: 'Low' | 'Medium' | 'High';
  category: string;
  isCompleted: boolean;
}
