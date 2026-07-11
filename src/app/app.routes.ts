import { Routes } from '@angular/router';
import { LoginComponent } from './features/auth/login/login';
import { AdminDashboardComponent } from './features/admin/dashboard/dashboard';
import { TeacherDashboardComponent } from './features/teacher/dashboard/dashboard';
import { StudentDashboardComponent } from './features/student/dashboard/dashboard';
import { authGuard, loginGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent, canActivate: [loginGuard] },

  // ─── Admin Routes ───
  {
    path: 'admin/dashboard',
    component: AdminDashboardComponent,
    canActivate: [authGuard('administrator')],
  },

  // MAIN
  {
    path: 'admin/students',
    loadComponent: () =>
      import('./features/admin/students/student-list/student-list').then(
        (m) => m.StudentListComponent,
      ),
  },
  {
    path: 'admin/teachers',
    loadComponent: () =>
      import('./features/admin/teachers/teacher-list/teacher-list').then(
        (m) => m.TeacherListComponent,
      ),
  },
  {
    path: 'admin/courses',
    loadComponent: () =>
      import('./features/admin/subjects/subject-list/subject-list').then(
        (m) => m.SubjectListComponent,
      ),
  },
  {
    path: 'admin/classes',
    loadComponent: () =>
      import('./features/admin/classes/class-list/class-list').then((m) => m.ClassListComponent),
  },
  {
    path: 'admin/attendance',
    loadComponent: () =>
      import('./features/admin/attendance/attendance-list/attendance-list').then(
        (m) => m.AttendanceListComponent,
      ),
  },

  // ACADEMIC
  {
    path: 'admin/enrollments',
    loadComponent: () =>
      import('./features/admin/enrollments/enrollment-list/enrollment-list').then(
        (m) => m.EnrollmentListComponent,
      ),
  },
  {
    path: 'admin/schedules',
    loadComponent: () =>
      import('./features/admin/schedules/schedule-list/schedule-list').then(
        (m) => m.ScheduleListComponent,
      ),
  },
  {
    path: 'admin/exams',
    loadComponent: () =>
      import('./features/admin/exams/exam-list/exam-list').then((m) => m.ExamListComponent),
  },
  {
    path: 'admin/exam-results',
    loadComponent: () =>
      import('./features/admin/exam-results/exam-result-list/exam-result-list').then(
        (m) => m.ExamResultListComponent,
      ),
  },
  {
    path: 'admin/course-results',
    loadComponent: () =>
      import('./features/admin/course-results/course-result-list/course-result-list').then(
        (m) => m.CourseResultListComponent,
      ),
  },

  // FINANCE
  {
    path: 'admin/payments',
    loadComponent: () =>
      import('./features/admin/payments/payment-list/payment-list').then(
        (m) => m.PaymentListComponent,
      ),
  },

  // REFERENCE DATA
  {
    path: 'admin/faculties',
    loadComponent: () =>
      import('./features/admin/faculties/faculty-list/faculty-list').then(
        (m) => m.FacultyListComponent,
      ),
  },
  {
    path: 'admin/departments',
    loadComponent: () =>
      import('./features/admin/departments/department-list/department-list').then(
        (m) => m.DepartmentListComponent,
      ),
  },
  {
    path: 'admin/majors',
    loadComponent: () =>
      import('./features/admin/majors/major-list/major-list').then((m) => m.MajorListComponent),
  },
  {
    path: 'admin/class-groups',
    loadComponent: () =>
      import('./features/admin/class-groups/class-group-list/class-group-list').then(
        (m) => m.ClassGroupListComponent,
      ),
  },
  {
    path: 'admin/shifts',
    loadComponent: () =>
      import('./features/admin/shifts/shift-list/shift-list').then((m) => m.ShiftListComponent),
  },
  {
    path: 'admin/academic-years',
    loadComponent: () =>
      import('./features/admin/academic-years/academic-year-list/academic-year-list').then(
        (m) => m.AcademicYearListComponent,
      ),
  },
  {
    path: 'admin/semesters',
    loadComponent: () =>
      import('./features/admin/semesters/semester-list/semester-list').then(
        (m) => m.SemesterListComponent,
      ),
  },
  {
    path: 'admin/exam-types',
    loadComponent: () =>
      import('./features/admin/exam-types/exam-type-list/exam-type-list').then(
        (m) => m.ExamTypeListComponent,
      ),
  },
  {
    path: 'admin/rooms',
    loadComponent: () =>
      import('./features/admin/rooms/room-list/room-list').then((m) => m.RoomListComponent),
  },
  {
    path: 'admin/time-slots',
    loadComponent: () =>
      import('./features/admin/time-slots/time-slot-list/time-slot-list').then(
        (m) => m.TimeSlotListComponent,
      ),
  },

  // SYSTEM
  {
    path: 'admin/users',
    loadComponent: () =>
      import('./features/admin/users/user-list/user-list').then((m) => m.UserListComponent),
  },

  // ─── Teacher Routes ───
  {
    path: 'teacher/dashboard',
    component: TeacherDashboardComponent,
    canActivate: [authGuard('teacher')],
  },
  {
    path: 'teacher/classes',
    loadComponent: () =>
      import('./features/teacher/classes/teacher-classes').then((m) => m.TeacherClassesComponent),
    canActivate: [authGuard('teacher')],
  },
  {
    path: 'teacher/schedule',
    loadComponent: () =>
      import('./features/teacher/schedule/teacher-schedule').then(
        (m) => m.TeacherScheduleComponent,
      ),
    canActivate: [authGuard('teacher')],
  },
  {
    path: 'teacher/attendance',
    loadComponent: () =>
      import('./features/teacher/attendance/teacher-attendance').then(
        (m) => m.TeacherAttendanceComponent,
      ),
    canActivate: [authGuard('teacher')],
  },
  {
    path: 'teacher/exam-results',
    loadComponent: () =>
      import('./features/teacher/exam-results/teacher-exam-results').then(
        (m) => m.TeacherExamResultsComponent,
      ),
    canActivate: [authGuard('teacher')],
  },
  {
    path: 'teacher/course-results',
    loadComponent: () =>
      import('./features/teacher/course-results/teacher-course-results').then(
        (m) => m.TeacherCourseResultsComponent,
      ),
    canActivate: [authGuard('teacher')],
  },
  {
    path: 'teacher/profile',
    loadComponent: () =>
      import('./features/teacher/profile/teacher-profile').then((m) => m.TeacherProfileComponent),
    canActivate: [authGuard('teacher')],
  },

  // ─── Student Routes ───
  {
    path: 'student/dashboard',
    component: StudentDashboardComponent,
    canActivate: [authGuard('student')],
  },
  {
    path: 'student/classes',
    loadComponent: () =>
      import('./features/student/classes/student-classes').then((m) => m.StudentClassesComponent),
    canActivate: [authGuard('student')],
  },
  {
    path: 'student/schedule',
    loadComponent: () =>
      import('./features/student/schedule/student-schedule').then(
        (m) => m.StudentScheduleComponent,
      ),
    canActivate: [authGuard('student')],
  },
  {
    path: 'student/attendance',
    loadComponent: () =>
      import('./features/student/attendance/student-attendance').then(
        (m) => m.StudentAttendanceComponent,
      ),
    canActivate: [authGuard('student')],
  },
  {
    path: 'student/exam-results',
    loadComponent: () =>
      import('./features/student/exam-results/student-exam-results').then(
        (m) => m.StudentExamResultsComponent,
      ),
    canActivate: [authGuard('student')],
  },
  {
    path: 'student/course-results',
    loadComponent: () =>
      import('./features/student/course-results/student-course-results').then(
        (m) => m.StudentCourseResultsComponent,
      ),
    canActivate: [authGuard('student')],
  },

  {
    path: 'student/payments',
    loadComponent: () =>
      import('./features/student/payments/student-payments').then(
        (m) => m.StudentPaymentsComponent,
      ),
    canActivate: [authGuard('student')],
  },
  {
    path: 'student/profile',
    loadComponent: () =>
      import('./features/student/profile/student-profile').then((m) => m.StudentProfileComponent),
    canActivate: [authGuard('student')],
  },
];
