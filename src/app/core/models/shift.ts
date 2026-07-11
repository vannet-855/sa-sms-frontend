export interface Shift {
  shift_id: number;
  shift_name: 'Morning' | 'Afternoon' | 'Evening';
  start_time: string;
  end_time: string;
}

export interface CreateShiftPayload {
  shift_name: string;
  start_time: string;
  end_time: string;
}
