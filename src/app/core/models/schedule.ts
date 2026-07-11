export type DayOfWeek = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat';

export interface Schedule {
  schedule_id: number;
  class_id: number;
  day_of_week: DayOfWeek;
  start_time: string;
  end_time: string;
  room: string | null;

  // Joined fields
  class_code?: string;
  course_name?: string;
  group_name?: string;
}

export interface CreateSchedulePayload {
  class_id: number;
  day_of_week: DayOfWeek;
  start_time: string;
  end_time: string;
  room?: string;
}
