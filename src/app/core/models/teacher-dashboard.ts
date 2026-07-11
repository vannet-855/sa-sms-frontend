export interface TeacherDashboardData {
  teacherName: string;
  totalClasses: number;
  totalStudents: number;
  todaySchedules: TodaySchedule[];
  todayScheduleCount: number;
  myClasses: TeacherClassInfo[];
  recentAttendance: RecentAttendanceRecord[];
  upcomingExams: TeacherUpcomingExam[];
  attendanceStats: AttendanceStats;
}

export interface TodaySchedule {
  schedule_id: number;
  day_of_week: string;
  start_time: string;
  end_time: string;
  room: string | null;
  course_name: string;
  group_name: string;
  class_code: string;
}

export interface TeacherClassInfo {
  class_id: number;
  class_code: string;
  course_name: string;
  group_name: string;
  student_count: number;
}

export interface RecentAttendanceRecord {
  attendance_id: number;
  attendance_date: string;
  status: 'Present' | 'Absent' | 'Late' | 'Permission';
  student_full_name: string;
  student_code: string;
  course_name: string;
  group_name: string;
}

export interface TeacherUpcomingExam {
  exam_id: number;
  exam_date: string;
  course_name: string;
  class_code: string;
  exam_type_name: string;
}

export interface AttendanceStats {
  total: number;
  present_count: number;
  absent_count: number;
  late_count: number;
  permission_count: number;
}
