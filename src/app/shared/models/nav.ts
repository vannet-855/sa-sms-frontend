export interface NavItem {
  label: string;
  icon: string; // fa-solid class suffix, ex: 'fa-gauge'
  route: string;
  badge?: number;
  badgeColor?: string; // tailwind classes
}

export interface NavGroup {
  title?: string; // ex: 'MAIN', 'ACADEMIC'
  items: NavItem[];
}

export interface SidebarUser {
  initials: string;
  name: string;
  roleLabel: string;
}

// ─── Admin Navigation ───
export const ADMIN_NAV_GROUPS: NavGroup[] = [
  {
    title: 'MAIN',
    items: [
      { label: 'Dashboard', icon: 'fa-gauge', route: '/admin/dashboard' },
      { label: 'Students', icon: 'fa-user-graduate', route: '/admin/students' },
      { label: 'Teachers', icon: 'fa-chalkboard-user', route: '/admin/teachers' },
      { label: 'Courses', icon: 'fa-book', route: '/admin/courses' },
      { label: 'Classes', icon: 'fa-school', route: '/admin/classes' },
      { label: 'Enrollments', icon: 'fa-user-plus', route: '/admin/enrollments' },
    ],
  },
  {
    title: 'ACADEMIC',
    items: [
      { label: 'Schedules', icon: 'fa-calendar-days', route: '/admin/schedules' },
      { label: 'Attendance', icon: 'fa-clipboard-check', route: '/admin/attendance' },
      { label: 'Exams', icon: 'fa-file-pen', route: '/admin/exams' },
      { label: 'Exam Results', icon: 'fa-chart-simple', route: '/admin/exam-results' },
      { label: 'Course Results', icon: 'fa-square-check', route: '/admin/course-results' },
    ],
  },
  {
    title: 'FINANCE',
    items: [{ label: 'Payments', icon: 'fa-credit-card', route: '/admin/payments' }],
  },
  {
    title: 'REFERENCE DATA',
    items: [
      { label: 'Faculties', icon: 'fa-building-columns', route: '/admin/faculties' },
      { label: 'Departments', icon: 'fa-sitemap', route: '/admin/departments' },
      { label: 'Majors', icon: 'fa-graduation-cap', route: '/admin/majors' },
      { label: 'Class Groups', icon: 'fa-layer-group', route: '/admin/class-groups' },
      { label: 'Shifts', icon: 'fa-clock', route: '/admin/shifts' },
      { label: 'Academic Years', icon: 'fa-calendar', route: '/admin/academic-years' },
      { label: 'Semesters', icon: 'fa-calendar-week', route: '/admin/semesters' },
      { label: 'Exam Types', icon: 'fa-list-check', route: '/admin/exam-types' },
      { label: 'Rooms', icon: 'fa-door-open', route: '/admin/rooms' },
      { label: 'Time Slots', icon: 'fa-hourglass-half', route: '/admin/time-slots' },
    ],
  },
  {
    title: 'SYSTEM',
    items: [{ label: 'Users', icon: 'fa-users-gear', route: '/admin/users' }],
  },
];

// ─── Teacher Navigation ───
export const TEACHER_NAV_GROUPS: NavGroup[] = [
  {
    title: 'MAIN',
    items: [
      { label: 'Dashboard', icon: 'fa-gauge', route: '/teacher/dashboard' },
      { label: 'My Classes', icon: 'fa-school', route: '/teacher/classes' },
      { label: 'My Schedule', icon: 'fa-calendar-days', route: '/teacher/schedule' },
    ],
  },
  {
    title: 'TEACHING',
    items: [
      { label: 'Take Attendance', icon: 'fa-clipboard-check', route: '/teacher/attendance' },
      { label: 'Exam Results', icon: 'fa-chart-simple', route: '/teacher/exam-results' },
      { label: 'Course Results', icon: 'fa-square-check', route: '/teacher/course-results' },
    ],
  },
  {
    title: 'ACCOUNT',
    items: [{ label: 'My Profile', icon: 'fa-user', route: '/teacher/profile' }],
  },
];

// ─── Student Navigation ───
export const STUDENT_NAV_GROUPS: NavGroup[] = [
  {
    title: 'MAIN',
    items: [
      { label: 'Dashboard', icon: 'fa-gauge', route: '/student/dashboard' },
      { label: 'My Classes', icon: 'fa-school', route: '/student/classes' },
      { label: 'My Schedule', icon: 'fa-calendar-days', route: '/student/schedule' },
    ],
  },
  {
    title: 'ACADEMIC',
    items: [
      { label: 'My Attendance', icon: 'fa-clipboard-check', route: '/student/attendance' },
      { label: 'Exam Results', icon: 'fa-chart-simple', route: '/student/exam-results' },
      { label: 'Course Results', icon: 'fa-square-check', route: '/student/course-results' },
    ],
  },
  {
    title: 'PAYMENTS',
    items: [{ label: 'Payment History', icon: 'fa-credit-card', route: '/student/payments' }],
  },
  {
    title: 'ACCOUNT',
    items: [{ label: 'My Profile', icon: 'fa-user', route: '/student/profile' }],
  },
];
