export interface AttendanceStats {
  total: number;
  present_count: number;
  absent_count: number;
  late_count: number;
  permission_count: number;
}

export interface RecentStudent {
  student_id: number;
  first_name: string;
  last_name: string;
  full_name: string;
  student_code: string;
  status: string;
  major_name: string | null;
}

export interface UpcomingExam {
  exam_id: number;
  exam_date: string;
  course_name: string;
  class_code: string;
  exam_type_name: string;
}

/** Real data returned by GET /dashboard/admin */
export interface AdminDashboardData {
  totalStudents: number;
  totalTeachers: number;
  totalSubjects: number;
  totalRevenue: number;
  totalClasses: number;
  totalEnrollments: number;
  recentStudents: RecentStudent[];
  upcomingExams: UpcomingExam[];
  attendanceStats: AttendanceStats;
}

export interface StatCardConfig {
  key: keyof AdminDashboardData;
  label: string;
  icon: string;
  iconBg: string;
  iconColor: string;
  isCurrency?: boolean;
}

export const ADMIN_STAT_CARDS: StatCardConfig[] = [
  {
    key: 'totalStudents',
    label: 'TOTAL STUDENTS',
    icon: 'fa-user-graduate',
    iconBg: 'bg-emerald-500/15',
    iconColor: 'text-emerald-400',
  },
  {
    key: 'totalTeachers',
    label: 'TOTAL TEACHERS',
    icon: 'fa-chalkboard-user',
    iconBg: 'bg-sky-500/15',
    iconColor: 'text-sky-400',
  },
  {
    key: 'totalSubjects',
    label: 'TOTAL SUBJECTS',
    icon: 'fa-book',
    iconBg: 'bg-violet-500/15',
    iconColor: 'text-violet-400',
  },
  {
    key: 'totalClasses',
    label: 'TOTAL CLASSES',
    icon: 'fa-school',
    iconBg: 'bg-rose-500/15',
    iconColor: 'text-rose-400',
  },
  {
    key: 'totalEnrollments',
    label: 'ENROLLMENTS',
    icon: 'fa-user-plus',
    iconBg: 'bg-cyan-500/15',
    iconColor: 'text-cyan-400',
  },
  {
    key: 'totalRevenue',
    label: 'TOTAL REVENUE',
    icon: 'fa-sack-dollar',
    iconBg: 'bg-amber-500/15',
    iconColor: 'text-amber-400',
    isCurrency: true,
  },
];
