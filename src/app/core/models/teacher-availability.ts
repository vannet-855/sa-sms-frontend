export interface TeacherBusySlot {
  schedule_id: number;
  day_of_week: string;
  start_time: string;
  end_time: string;
  room: string | null;
  class_id: number;
  class_code: string | null;
  course_code: string | null;
  course_name: string | null;
  group_name: string | null;
}

export interface TeacherAvailability {
  teacher_id: number;
  full_name: string;
  phone: string | null;
  email: string | null;
  is_busy: boolean;
  busy_count: number;
  busy_slots: TeacherBusySlot[];
}

export interface TeacherAvailabilityResponse {
  day: string;
  start_time: string | null;
  end_time: string | null;
  total_teachers: number;
  busy_teachers: number;
  free_teachers: number;
  teachers: TeacherAvailability[];
}

/** Response from GET /api/schedules/check-teacher */
export interface CheckTeacherResponse {
  teacher_id: number;
  day: string;
  start_time: string | null;
  end_time: string | null;
  is_available: boolean;
  conflict_count: number;
  conflicts: TeacherBusySlot[];
}

/** A single room's busy slot */
export interface RoomBusySlot {
  schedule_id: number;
  day_of_week: string;
  start_time: string;
  end_time: string;
  class_id: number;
  class_code: string | null;
  course_code: string | null;
  course_name: string | null;
  group_name: string | null;
  teacher_name: string | null;
}

export interface RoomAvailability {
  room_id: number;
  room_name: string;
  room_type: string;
  capacity: number | null;
  building: string | null;
  floor: number | null;
  is_busy: boolean;
  busy_count: number;
  busy_slots: RoomBusySlot[];
}

/** Response from GET /api/rooms/availability */
export interface RoomAvailabilityResponse {
  day: string;
  start_time: string | null;
  end_time: string | null;
  total_rooms: number;
  busy_rooms: number;
  free_rooms: number;
  rooms: RoomAvailability[];
}
