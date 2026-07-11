import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { SidebarComponent } from '../../../shared/components/sidebar/sidebar';
import { AuthService } from '../../../core/services/auth';
import { STUDENT_NAV_GROUPS } from '../../../shared/models/nav';
import { environment } from '../../../../environments/environment';
import { catchError, of, tap } from 'rxjs';

interface ScheduleEntry {
  schedule_id: number;
  day_of_week: string;
  start_time: string;
  end_time: string;
  room: string | null;
  course_name: string;
  group_name: string;
  class_code: string | null;
}

interface RecentAttendance {
  attendance_id: number;
  attendance_date: string;
  status: 'Present' | 'Absent' | 'Late' | 'Permission';
  course_name: string;
  group_name: string;
}

interface UpcomingExam {
  exam_id: number;
  exam_date: string;
  group_name: string;
  exam_type_name: string;
}

interface AttendanceStats {
  total: number;
  present_count: number;
  absent_count: number;
  late_count: number;
  permission_count: number;
}

interface PaymentSummary {
  total_paid: number;
  paid_amount: number;
  pending_amount: number;
}

interface StudentDashboard {
  studentName: string;
  studentId: number;
  totalClasses: number;
  todaySchedules: ScheduleEntry[];
  todayScheduleCount: number;
  recentAttendance: RecentAttendance[];
  upcomingExams: UpcomingExam[];
  attendanceStats: AttendanceStats;
  paymentSummary: PaymentSummary;
}

@Component({
  selector: 'app-student-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, SidebarComponent],
  template: `
    <div class="flex min-h-screen bg-slate-950">
      <app-sidebar
        [navGroups]="STUDENT_NAV_GROUPS"
        [user]="sidebarUser()"
        portalRole="STUDENT PORTAL"
      >
      </app-sidebar>

      <main class="flex-1 overflow-y-auto p-6">
        <div class="mb-1 text-xs text-slate-600">
          <span>Student</span> / <span class="text-emerald-400">Dashboard</span>
        </div>
        <div class="mb-6">
          <h1 class="text-xl font-bold text-white">Student Dashboard</h1>
          <p class="text-sm text-slate-500">Welcome back, {{ sidebarUser().name }}</p>
        </div>

        @if (loading()) {
          <div
            class="flex h-64 items-center justify-center rounded-xl border border-slate-800 bg-slate-900/40 text-slate-500"
          >
            <i class="fa-solid fa-circle-notch fa-spin mr-2"></i> Loading...
          </div>
        }

        @if (error()) {
          <div
            class="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400"
          >
            <i class="fa-solid fa-circle-exclamation mr-2"></i>{{ error() }}
          </div>
        }

        @if (!loading() && data()) {
          <!-- Quick Stats Row -->
          <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <a
              routerLink="/student/classes"
              class="rounded-xl border border-slate-800 bg-slate-900/60 p-5 hover:border-amber-500/50 transition"
            >
              <div
                class="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/15"
              >
                <i class="fa-solid fa-school text-amber-400"></i>
              </div>
              <p class="text-2xl font-bold text-white">{{ data()?.totalClasses || 0 }}</p>
              <p class="text-xs text-slate-500 mt-1">My Classes</p>
            </a>

            <a
              routerLink="/student/schedule"
              class="rounded-xl border border-slate-800 bg-slate-900/60 p-5 hover:border-sky-500/50 transition"
            >
              <div class="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-sky-500/15">
                <i class="fa-solid fa-calendar-day text-sky-400"></i>
              </div>
              <p class="text-2xl font-bold text-white">{{ data()?.todayScheduleCount || 0 }}</p>
              <p class="text-xs text-slate-500 mt-1">Today's Classes</p>
            </a>

            <a
              routerLink="/student/attendance"
              class="rounded-xl border border-slate-800 bg-slate-900/60 p-5 hover:border-emerald-500/50 transition"
            >
              <div
                class="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/15"
              >
                <i class="fa-solid fa-clipboard-check text-emerald-400"></i>
              </div>
              <p class="text-2xl font-bold text-white">{{ attendancePercent() }}%</p>
              <p class="text-xs text-slate-500 mt-1">Attendance Rate</p>
            </a>

            <a
              routerLink="/student/payments"
              class="rounded-xl border border-slate-800 bg-slate-900/60 p-5 hover:border-violet-500/50 transition"
            >
              <div
                class="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-violet-500/15"
              >
                <i class="fa-solid fa-credit-card text-violet-400"></i>
              </div>
              <p class="text-2xl font-bold text-white">
                \${{ (data()?.paymentSummary?.total_paid || 0).toLocaleString() }}
              </p>
              <p class="text-xs text-slate-500 mt-1">Total Paid</p>
            </a>
          </div>
          <!-- Payment Summary -->
          <div class="mt-6 mb-6 rounded-xl border border-slate-800 bg-slate-900/40 p-5">
            <div class="mb-4 flex items-center justify-between">
              <h2 class="text-sm font-semibold text-white">
                <i class="fa-solid fa-sack-dollar mr-2 text-emerald-400"></i>Payment Summary
              </h2>
              <a routerLink="/student/payments" class="text-[11px] text-emerald-400 hover:underline"
                >View History →</a
              >
            </div>
            <div class="grid grid-cols-3 gap-4 text-center">
              <div>
                <p class="text-xs text-slate-500 mb-1">Paid</p>
                <p class="text-xl font-bold text-emerald-400">
                  \${{ (data()?.paymentSummary?.paid_amount || 0).toLocaleString() }}
                </p>
              </div>
              <div>
                <p class="text-xs text-slate-500 mb-1">Pending</p>
                <p class="text-xl font-bold text-amber-400">
                  \${{ (data()?.paymentSummary?.pending_amount || 0).toLocaleString() }}
                </p>
              </div>
              <div>
                <p class="text-xs text-slate-500 mb-1">Total</p>
                <p class="text-xl font-bold text-white">
                  \${{ (data()?.paymentSummary?.total_paid || 0).toLocaleString() }}
                </p>
              </div>
            </div>
          </div>
          <!-- Main Content Grid -->
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <!-- Today's Schedule -->
            <div class="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
              <div class="mb-4 flex items-center justify-between">
                <h2 class="text-sm font-semibold text-white">
                  <i class="fa-solid fa-calendar-day mr-2 text-sky-400"></i>Today's Schedule
                </h2>
                <a routerLink="/student/schedule" class="text-[11px] text-sky-400 hover:underline"
                  >View All →</a
                >
              </div>
              @if (data()?.todaySchedules?.length) {
                <div class="space-y-3">
                  @for (s of data()!.todaySchedules; track s.schedule_id) {
                    <div
                      class="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/60 px-4 py-3"
                    >
                      <div>
                        <p class="text-sm font-medium text-slate-200">{{ s.course_name }}</p>
                        <p class="text-[11px] text-slate-500">
                          {{ s.group_name }}
                          @if (s.class_code) {
                            · {{ s.class_code }}
                          }
                        </p>
                      </div>
                      <div class="text-right">
                        <p class="text-xs font-mono text-sky-400">
                          {{ formatTime(s.start_time) }}–{{ formatTime(s.end_time) }}
                        </p>
                        @if (s.room) {
                          <p class="text-[10px] text-slate-600">{{ s.room }}</p>
                        }
                      </div>
                    </div>
                  }
                </div>
              } @else {
                <div class="py-8 text-center text-xs text-slate-600">
                  No classes scheduled for today.
                </div>
              }
            </div>

            <!-- Attendance Overview -->
            <div class="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
              <div class="mb-4 flex items-center justify-between">
                <h2 class="text-sm font-semibold text-white">
                  <i class="fa-solid fa-chart-pie mr-2 text-emerald-400"></i>Attendance Overview
                </h2>
                <a
                  routerLink="/student/attendance"
                  class="text-[11px] text-emerald-400 hover:underline"
                  >View All →</a
                >
              </div>
              @if (data()?.attendanceStats?.total) {
                <div class="space-y-3">
                  <div>
                    <div class="mb-1 flex justify-between text-xs text-slate-500">
                      <span>Present</span
                      ><span class="text-emerald-400">{{
                        attendanceStats()?.present_count || 0
                      }}</span>
                    </div>
                    <div class="h-1.5 w-full rounded-full bg-slate-800">
                      <div
                        class="h-full rounded-full bg-emerald-500"
                        [style.width.%]="presentPercent()"
                      ></div>
                    </div>
                  </div>
                  <div>
                    <div class="mb-1 flex justify-between text-xs text-slate-500">
                      <span>Absent</span
                      ><span class="text-red-400">{{ attendanceStats()?.absent_count || 0 }}</span>
                    </div>
                    <div class="h-1.5 w-full rounded-full bg-slate-800">
                      <div
                        class="h-full rounded-full bg-red-500"
                        [style.width.%]="absentPercent()"
                      ></div>
                    </div>
                  </div>
                  <div>
                    <div class="mb-1 flex justify-between text-xs text-slate-500">
                      <span>Late</span
                      ><span class="text-amber-400">{{ attendanceStats()?.late_count || 0 }}</span>
                    </div>
                    <div class="h-1.5 w-full rounded-full bg-slate-800">
                      <div
                        class="h-full rounded-full bg-amber-500"
                        [style.width.%]="latePercent()"
                      ></div>
                    </div>
                  </div>
                  <div>
                    <div class="mb-1 flex justify-between text-xs text-slate-500">
                      <span>Permission</span
                      ><span class="text-sky-400">{{
                        attendanceStats()?.permission_count || 0
                      }}</span>
                    </div>
                    <div class="h-1.5 w-full rounded-full bg-slate-800">
                      <div
                        class="h-full rounded-full bg-sky-500"
                        [style.width.%]="permissionPercent()"
                      ></div>
                    </div>
                  </div>
                </div>
              } @else {
                <div class="py-8 text-center text-xs text-slate-600">
                  No attendance records yet.
                </div>
              }
            </div>

            <!-- Recent Attendance -->
            <div class="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
              <div class="mb-4 flex items-center justify-between">
                <h2 class="text-sm font-semibold text-white">
                  <i class="fa-solid fa-clock-rotate-left mr-2 text-amber-400"></i>Recent Attendance
                </h2>
                <a
                  routerLink="/student/attendance"
                  class="text-[11px] text-amber-400 hover:underline"
                  >View All →</a
                >
              </div>
              @if (data()?.recentAttendance?.length) {
                <div class="space-y-2">
                  @for (a of data()!.recentAttendance; track a.attendance_id) {
                    <div
                      class="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/60 px-4 py-2.5"
                    >
                      <div>
                        <p class="text-[13px] text-slate-300">
                          {{ a.course_name }} · {{ a.group_name }}
                        </p>
                        <p class="text-[10px] text-slate-500">
                          {{ formatDate(a.attendance_date) }}
                        </p>
                      </div>
                      <span
                        class="rounded-full px-2.5 py-0.5 text-[10px] font-medium"
                        [class]="attendanceStatusClass(a.status)"
                        >{{ a.status }}</span
                      >
                    </div>
                  }
                </div>
              } @else {
                <div class="py-8 text-center text-xs text-slate-600">
                  No recent attendance records.
                </div>
              }
            </div>

            <!-- Upcoming Exams -->
            <div class="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
              <div class="mb-4 flex items-center justify-between">
                <h2 class="text-sm font-semibold text-white">
                  <i class="fa-solid fa-file-pen mr-2 text-violet-400"></i>Upcoming Exams
                </h2>
                <a
                  routerLink="/student/exam-results"
                  class="text-[11px] text-violet-400 hover:underline"
                  >View Results →</a
                >
              </div>
              @if (data()?.upcomingExams?.length) {
                <div class="space-y-2">
                  @for (e of data()!.upcomingExams; track e.exam_id) {
                    <div
                      class="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/60 px-4 py-2.5"
                    >
                      <div>
                        <p class="text-[13px] text-slate-300">{{ e.group_name }}</p>
                        <p class="text-[10px] text-slate-500">
                          {{ e.exam_type_name }}
                        </p>
                      </div>
                      <span class="text-xs font-mono text-violet-400">{{
                        formatDate(e.exam_date)
                      }}</span>
                    </div>
                  }
                </div>
              } @else {
                <div class="py-8 text-center text-xs text-slate-600">No upcoming exams.</div>
              }
            </div>
          </div>
        }
      </main>
    </div>
  `,
})
export class StudentDashboardComponent {
  readonly STUDENT_NAV_GROUPS = STUDENT_NAV_GROUPS;
  private auth = inject(AuthService);
  private http = inject(HttpClient);

  readonly sidebarUser = computed(() => {
    const u = this.auth.currentUser();
    return {
      initials: u?.initials ?? 'ST',
      name: u?.full_name ?? 'Student',
      roleLabel: 'Student',
    };
  });

  private readonly _data = signal<StudentDashboard | null>(null);
  private readonly _loading = signal(true);
  private readonly _error = signal<string | null>(null);

  readonly data = this._data.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  readonly attendanceStats = computed(() => this._data()?.attendanceStats ?? null);
  readonly presentPercent = computed(() => {
    const s = this.attendanceStats();
    return s && s.total > 0 ? Math.round((s.present_count / s.total) * 100) : 0;
  });
  readonly absentPercent = computed(() => {
    const s = this.attendanceStats();
    return s && s.total > 0 ? Math.round((s.absent_count / s.total) * 100) : 0;
  });
  readonly latePercent = computed(() => {
    const s = this.attendanceStats();
    return s && s.total > 0 ? Math.round((s.late_count / s.total) * 100) : 0;
  });
  readonly permissionPercent = computed(() => {
    const s = this.attendanceStats();
    return s && s.total > 0 ? Math.round((s.permission_count / s.total) * 100) : 0;
  });
  readonly attendancePercent = computed(() => {
    const s = this.attendanceStats();
    return s && s.total > 0 ? Math.round((s.present_count / s.total) * 100) : 0;
  });

  constructor() {
    this.fetchDashboard();
  }

  private fetchDashboard(): void {
    this._loading.set(true);
    this._error.set(null);
    this.http
      .get<StudentDashboard>(`${environment.apiUrl}/dashboard/student`)
      .pipe(
        catchError((err) => {
          this._error.set(err.error?.message || 'Failed to load dashboard.');
          this._loading.set(false);
          return of(null);
        }),
        tap((res) => {
          if (res) this._data.set(res);
          this._loading.set(false);
        }),
      )
      .subscribe();
  }

  formatTime(t: string | undefined | null): string {
    if (!t) return '—';
    const parts = t.split(':');
    return `${parts[0]}:${parts[1]}`;
  }

  formatDate(d: string): string {
    if (!d) return '—';
    const date = new Date(d + 'T00:00:00');
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  attendanceStatusClass(status: string): string {
    switch (status) {
      case 'Present':
        return 'bg-emerald-500/15 text-emerald-400';
      case 'Absent':
        return 'bg-red-500/15 text-red-400';
      case 'Late':
        return 'bg-amber-500/15 text-amber-400';
      case 'Permission':
        return 'bg-sky-500/15 text-sky-400';
      default:
        return 'bg-slate-500/15 text-slate-400';
    }
  }
}
