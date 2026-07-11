import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { catchError, forkJoin, of, tap } from 'rxjs';
import { RouterLink } from '@angular/router';
import { SidebarComponent } from '../../../shared/components/sidebar/sidebar';
import { AuthService } from '../../../core/services/auth';
import { ToastService } from '../../../core/services/toast';
import { STUDENT_NAV_GROUPS } from '../../../shared/models/nav';
import { environment } from '../../../../environments/environment';

interface AttendanceRecord {
  attendance_id: number;
  schedule_id: number;
  student_id: number;
  attendance_date: string;
  status: 'Present' | 'Absent' | 'Late' | 'Permission';
  remark: string | null;
  created_by: number | null;
  created_at: string;
  day_of_week?: string;
  start_time?: string;
  end_time?: string;
  room?: string;
  group_name?: string;
  course_name?: string;
  course_code?: string;
  class_code?: string;
}

interface AttendanceStats {
  total: number;
  present_count: number;
  absent_count: number;
  late_count: number;
  permission_count: number;
}

interface ScheduleOption {
  schedule_id: number;
  day_of_week: string;
  start_time: string;
  end_time: string;
  room: string | null;
  course_name: string;
  course_code: string | null;
  group_name: string;
  class_code: string;
  class_id: number;
}

@Component({
  selector: 'app-student-attendance',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent],
  template: `
    <div class="flex min-h-screen bg-slate-950">
      <app-sidebar
        [navGroups]="STUDENT_NAV_GROUPS"
        [user]="sidebarUser()"
        portalRole="STUDENT PORTAL"
      >
      </app-sidebar>

      <main class="flex-1 overflow-y-auto p-6">
        <!-- Breadcrumb -->
        <div class="mb-1 text-xs text-slate-600">
          <span>Student</span> / <span class="text-emerald-400">My Attendance</span>
        </div>

        <div class="mb-6 flex items-center justify-between">
          <div>
            <h1 class="text-xl font-bold text-white">My Attendance</h1>
            <p class="mt-0.5 text-sm text-slate-500">
              View your attendance records and submit permission requests.
            </p>
          </div>
          <button
            (click)="openPermissionModal()"
            class="flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:opacity-90"
          >
            <i class="fa-solid fa-pen"></i> Submit Permission
          </button>
        </div>

        <!-- Stats Cards -->
        @if (!loadingStats()) {
          <div class="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
            <div class="rounded-xl border border-slate-800 bg-slate-900/40 p-4 text-center">
              <p class="text-2xl font-bold text-white">{{ stats().total }}</p>
              <p class="mt-0.5 text-[11px] text-slate-500">Total</p>
            </div>
            <div class="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-center">
              <p class="text-2xl font-bold text-emerald-400">{{ stats().present_count }}</p>
              <p class="mt-0.5 text-[11px] text-emerald-400/70">Present</p>
            </div>
            <div class="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-center">
              <p class="text-2xl font-bold text-red-400">{{ stats().absent_count }}</p>
              <p class="mt-0.5 text-[11px] text-red-400/70">Absent</p>
            </div>
            <div class="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-center">
              <p class="text-2xl font-bold text-amber-400">{{ stats().late_count }}</p>
              <p class="mt-0.5 text-[11px] text-amber-400/70">Late</p>
            </div>
            <div class="rounded-xl border border-sky-500/20 bg-sky-500/5 p-4 text-center">
              <p class="text-2xl font-bold text-sky-400">{{ stats().permission_count }}</p>
              <p class="mt-0.5 text-[11px] text-sky-400/70">Permission</p>
            </div>
          </div>
        }

        <!-- Loading -->
        @if (loading() || loadingStats()) {
          <div
            class="flex h-40 items-center justify-center rounded-xl border border-slate-800 bg-slate-900/40 text-slate-500"
          >
            <i class="fa-solid fa-circle-notch fa-spin mr-2"></i> Loading...
          </div>
        }

        <!-- Error -->
        @if (error()) {
          <div
            class="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400"
          >
            <i class="fa-solid fa-circle-exclamation mr-2"></i>{{ error() }}
          </div>
        }

        <!-- Empty State -->
        @if (!loading() && !error() && records().length === 0) {
          <div
            class="flex h-48 items-center justify-center rounded-xl border border-slate-800 bg-slate-900/40 text-slate-600"
          >
            <div class="text-center">
              <i class="fa-solid fa-clipboard-check mb-2 block text-2xl"></i>
              <p class="text-sm">No attendance records yet.</p>
              <p class="mt-1 text-xs text-slate-600">
                Records will appear once your teacher takes attendance.
              </p>
            </div>
          </div>
        }

        <!-- Attendance Table -->
        @if (!loading() && records().length > 0) {
          <div class="rounded-xl border border-slate-800 bg-slate-900/40 overflow-hidden">
            <div class="max-h-[500px] overflow-auto custom-scrollbar">
              <table class="min-w-full text-left text-sm">
                <thead class="sticky top-0 z-10 bg-slate-900">
                  <tr class="text-[10px] uppercase tracking-wider text-slate-600">
                    <th class="px-4 py-3 font-medium">#</th>
                    <th class="py-3 font-medium">Date</th>
                    <th class="py-3 font-medium">Course</th>
                    <th class="py-3 font-medium">Schedule</th>
                    <th class="py-3 font-medium">Group</th>
                    <th class="py-3 font-medium">Status</th>
                    <th class="py-3 font-medium">Remark</th>
                  </tr>
                </thead>
                <tbody>
                  @for (r of records(); track r.attendance_id; let i = $index) {
                    <tr class="border-t border-slate-800/60 hover:bg-slate-800/20">
                      <td class="px-4 py-3 text-slate-500">{{ i + 1 }}</td>
                      <td class="py-3">
                        <span class="text-slate-200">{{ formatDate(r.attendance_date) }}</span>
                        <span class="ml-2 text-[11px] text-slate-600">{{
                          r.day_of_week || ''
                        }}</span>
                      </td>
                      <td class="py-3">
                        <span class="text-slate-200">{{ r.course_name || '—' }}</span>
                        @if (r.course_code) {
                          <span class="ml-1 text-[11px] text-slate-500">({{ r.course_code }})</span>
                        }
                      </td>
                      <td class="py-3 text-slate-400 text-[13px]">
                        @if (r.start_time) {
                          {{ r.start_time.slice(0, 5) }}–{{ r.end_time?.slice(0, 5) }}
                        } @else {
                          —
                        }
                      </td>
                      <td class="py-3 text-slate-400">{{ r.group_name || '—' }}</td>
                      <td class="py-3">
                        <span
                          class="rounded-full px-2.5 py-0.5 text-[11px] font-medium"
                          [class]="statusClass(r.status)"
                        >
                          {{ r.status }}
                        </span>
                      </td>
                      <td class="py-3 text-slate-400 text-[13px] max-w-[150px] truncate">
                        {{ r.remark || '—' }}
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        }

        <!-- ========== SUBMIT PERMISSION MODAL ========== -->
        @if (showPermissionModal()) {
          <div
            class="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            (click)="closePermissionModal()"
          >
            <div
              class="w-full max-w-lg rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-2xl"
              (click)="$event.stopPropagation()"
            >
              <div class="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
                <h3 class="text-lg font-semibold text-slate-200">
                  <i class="fa-solid fa-pen mr-2 text-sky-400"></i>
                  Submit Permission
                </h3>
                <button
                  (click)="closePermissionModal()"
                  class="text-slate-400 hover:text-slate-200"
                >
                  <i class="fa-solid fa-xmark text-xl"></i>
                </button>
              </div>

              <!-- Loading schedules -->
              @if (loadingSchedules()) {
                <div class="flex items-center justify-center py-8 text-slate-500">
                  <i class="fa-solid fa-circle-notch fa-spin mr-2"></i> Loading schedules...
                </div>
              }

              @if (!loadingSchedules()) {
                <form #permForm="ngForm">
                  <div class="grid grid-cols-1 gap-4">
                    <!-- Schedule -->
                    <div>
                      <label class="block text-xs font-medium text-slate-400 mb-1">
                        Schedule <span class="text-rose-500">*</span>
                      </label>
                      <select
                        [(ngModel)]="permScheduleId"
                        name="schedule"
                        required
                        class="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-sky-500"
                      >
                        <option [ngValue]="null" disabled>Choose a schedule...</option>
                        @for (s of schedules(); track s.schedule_id) {
                          <option [ngValue]="s.schedule_id">
                            {{ s.course_name || s.course_code }}
                            — {{ s.day_of_week }} {{ formatTime(s.start_time) }}–{{
                              formatTime(s.end_time)
                            }}
                            @if (s.room) {
                              · {{ s.room }}
                            }
                          </option>
                        }
                      </select>
                      @if (schedules().length === 0) {
                        <p class="mt-1 text-xs text-amber-400">
                          No class schedules found. You may not be enrolled in any classes.
                        </p>
                      }
                    </div>

                    <!-- Date -->
                    <div>
                      <label class="block text-xs font-medium text-slate-400 mb-1">
                        Date <span class="text-rose-500">*</span>
                      </label>
                      <input
                        type="date"
                        [(ngModel)]="permDate"
                        name="date"
                        required
                        class="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-sky-500"
                      />
                    </div>

                    <!-- Reason / Remark -->
                    <div>
                      <label class="block text-xs font-medium text-slate-400 mb-1">
                        Reason <span class="text-slate-600">(optional)</span>
                      </label>
                      <textarea
                        [(ngModel)]="permRemark"
                        name="remark"
                        rows="3"
                        placeholder="Explain why you're requesting permission..."
                        class="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2.5 text-sm text-slate-200 placeholder-slate-600 outline-none focus:border-sky-500 resize-none"
                      ></textarea>
                    </div>

                    <!-- Info box -->
                    <div
                      class="rounded-lg bg-sky-500/10 border border-sky-500/20 px-4 py-3 text-xs text-sky-300"
                    >
                      <i class="fa-solid fa-info-circle mr-1.5"></i>
                      Once submitted, your teacher will see your Permission status when taking
                      attendance. The teacher may override it if needed.
                    </div>
                  </div>

                  <div class="flex justify-end gap-3 border-t border-slate-800 mt-6 pt-4">
                    <button
                      type="button"
                      (click)="closePermissionModal()"
                      [disabled]="savingPermission()"
                      class="rounded-lg border border-slate-800 px-4 py-2 text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-slate-200 disabled:opacity-60"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      (click)="submitPermission()"
                      [disabled]="!permScheduleId() || !permDate() || savingPermission()"
                      class="flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      @if (savingPermission()) {
                        <i class="fa-solid fa-circle-notch fa-spin"></i> Submitting...
                      } @else {
                        <i class="fa-solid fa-paper-plane"></i> Submit Permission
                      }
                    </button>
                  </div>
                </form>
              }
            </div>
          </div>
        }

        <!-- ========== SUCCESS TOAST (inline) ========== -->
        @if (successMessage()) {
          <div
            class="fixed bottom-6 right-6 z-50 rounded-lg border border-emerald-500/30 bg-emerald-500/15 px-5 py-3 text-sm text-emerald-400 shadow-xl"
          >
            <i class="fa-solid fa-check-circle mr-2"></i>{{ successMessage() }}
          </div>
        }
      </main>
    </div>
  `,
})
export class StudentAttendanceComponent implements OnInit {
  readonly STUDENT_NAV_GROUPS = STUDENT_NAV_GROUPS;

  private auth = inject(AuthService);
  private http = inject(HttpClient);
  private toast = inject(ToastService);

  readonly sidebarUser = computed(() => {
    const u = this.auth.currentUser();
    return {
      initials: u?.initials ?? 'ST',
      name: u?.full_name ?? 'Student',
      roleLabel: 'Student',
    };
  });

  // Attendance records
  private readonly _records = signal<AttendanceRecord[]>([]);
  private readonly _loading = signal(false);
  private readonly _loadingStats = signal(false);
  private readonly _error = signal<string | null>(null);
  private readonly _stats = signal<AttendanceStats>({
    total: 0,
    present_count: 0,
    absent_count: 0,
    late_count: 0,
    permission_count: 0,
  });
  private readonly _successMessage = signal<string | null>(null);

  readonly records = this._records.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly loadingStats = this._loadingStats.asReadonly();
  readonly error = this._error.asReadonly();
  readonly stats = this._stats.asReadonly();
  readonly successMessage = this._successMessage.asReadonly();

  // Permission modal
  private readonly _showPermissionModal = signal(false);
  private readonly _schedules = signal<ScheduleOption[]>([]);
  private readonly _loadingSchedules = signal(false);
  private readonly _savingPermission = signal(false);

  readonly showPermissionModal = this._showPermissionModal.asReadonly();
  readonly schedules = this._schedules.asReadonly();
  readonly loadingSchedules = this._loadingSchedules.asReadonly();
  readonly savingPermission = this._savingPermission.asReadonly();

  readonly permScheduleId = signal<number | null>(null);
  readonly permDate = signal<string>(new Date().toISOString().split('T')[0]);
  readonly permRemark = signal<string>('');

  ngOnInit(): void {
    this.loadData();
  }

  private loadData(): void {
    // Load records and stats in parallel
    this._loading.set(true);
    this._loadingStats.set(true);
    this._error.set(null);

    forkJoin({
      records: this.http.get<AttendanceRecord[]>(`${environment.apiUrl}/attendance/student/me`),
      stats: this.http.get<AttendanceStats>(`${environment.apiUrl}/attendance/student/me/stats`),
    })
      .pipe(
        catchError((err) => {
          this._error.set(err.error?.message || 'Failed to load attendance data.');
          this._loading.set(false);
          this._loadingStats.set(false);
          return of(null);
        }),
        tap((res) => {
          if (res) {
            this._records.set(res.records || []);
            this._stats.set(
              res.stats || {
                total: 0,
                present_count: 0,
                absent_count: 0,
                late_count: 0,
                permission_count: 0,
              },
            );
          }
          this._loading.set(false);
          this._loadingStats.set(false);
        }),
      )
      .subscribe();
  }

  // ─── Permission Modal ───

  openPermissionModal(): void {
    this._showPermissionModal.set(true);
    this._savingPermission.set(false);
    this.permScheduleId.set(null);
    this.permDate.set(new Date().toISOString().split('T')[0]);
    this.permRemark.set('');

    // Load schedules
    this._loadingSchedules.set(true);
    this.http
      .get<ScheduleOption[]>(`${environment.apiUrl}/attendance/student/my-schedules`)
      .pipe(
        catchError(() => {
          this._loadingSchedules.set(false);
          return of([]);
        }),
        tap((res) => {
          this._schedules.set(Array.isArray(res) ? res : []);
          this._loadingSchedules.set(false);
        }),
      )
      .subscribe();
  }

  closePermissionModal(): void {
    if (this._savingPermission()) return;
    this._showPermissionModal.set(false);
  }

  submitPermission(): void {
    const scheduleId = this.permScheduleId();
    const date = this.permDate();

    if (!scheduleId || !date) return;

    this._savingPermission.set(true);

    this.http
      .post<{ message: string }>(`${environment.apiUrl}/attendance/student/permission`, {
        schedule_id: scheduleId,
        attendance_date: date,
        remark: this.permRemark() || null,
      })
      .pipe(
        catchError((err) => {
          this._savingPermission.set(false);
          const msg = err.error?.message || 'Failed to submit permission request.';
          this.toast.error(msg);
          return of(null);
        }),
        tap((res) => {
          if (res) {
            this._savingPermission.set(false);
            this._showPermissionModal.set(false);
            this.toast.success('Permission submitted successfully!');

            // Refresh attendance records
            this.loadData();
          }
        }),
      )
      .subscribe();
  }

  // ─── Helpers ───

  formatDate(d: string): string {
    if (!d) return '—';
    const date = new Date(d + 'T00:00:00');
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  formatTime(t: string): string {
    if (!t) return '—';
    return t.slice(0, 5);
  }

  statusClass(status: string): string {
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
