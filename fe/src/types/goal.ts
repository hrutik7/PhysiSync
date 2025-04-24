interface Goal {
  id: string;
  date: string;
  goalType: 'short' | 'long' | 'functional';
  description: string;
  status: 'Pending' | 'Completed';
} 