export type AttendanceStatus = 'Present' | 'Absent' | 'Late' | 'Permission';

/** Matches the backend attendance table columns exactly */
export interface Attendance {
  attendance_id: number;
  schedule_id: number;
  student_id: number;
  attendance_date: string;
  status: AttendanceStatus;
  remark: string | null;
  created_by: number | null;
  created_at: string;

  // Joined fields from backend JOINs
  student_first_name?: string;
  student_last_name?: string;
  student_full_name?: string;
  student_code?: string;
  day_of_week?: string;
  start_time?: string;
  end_time?: string;
  room?: string;
  group_name?: string;
  course_name?: string;
  course_code?: string;
  class_code?: string;
  teacher_name?: string;
}

export interface AttendanceListResponse {
  data: Attendance[];
  total: number;
  page: number;
  limit: number;
}

export interface CreateAttendancePayload {
  schedule_id: number;
  student_id: number;
  attendance_date: string;
  status?: AttendanceStatus;
  remark?: string;
  created_by?: number;
}

export interface BulkUpsertRecord {
  schedule_id: number;
  student_id: number;
  attendance_date: string;
  status: AttendanceStatus;
  remark?: string | null;
  created_by?: number | null;
}

export interface AttendanceStats {
  total: number;
  present_count: number;
  absent_count: number;
  late_count: number;
  permission_count: number;
}
