import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { catchError, forkJoin, of, tap } from 'rxjs';
import { RouterLink } from '@angular/router';
import { SidebarComponent } from '../../../shared/components/sidebar/sidebar';
import { AuthService } from '../../../core/services/auth';
import { ToastService } from '../../../core/services/toast';
import { TEACHER_NAV_GROUPS } from '../../../shared/models/nav';
import { environment } from '../../../../environments/environment';

type AttendanceStatus = 'Present' | 'Absent' | 'Late' | 'Permission';

interface TeacherSchedule {
  schedule_id: number;
  class_id: number;
  day_of_week: string;
  start_time: string;
  end_time: string;
  room: string | null;
  course_name: string;
  course_code: string | null;
  group_name: string;
  class_code: string;
}

interface ClassGroup {
  class_id: number;
  course_name: string;
  group_name: string;
  class_code: string;
  schedules: TeacherSchedule[];
}

interface EnrolledStudent {
  student_id: number;
  first_name: string;
  last_name: string;
  student_code: string;
  student_full_name?: string;
}

interface AttendanceRecord {
  attendance_id?: number;
  student_id: number;
  schedule_id: number;
  attendance_date: string;
  status: AttendanceStatus;
  student_full_name?: string;
  student_code?: string;
}

@Component({
  selector: 'app-teacher-attendance',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent],
  template: `
    <div class="flex min-h-screen bg-slate-950">
      <app-sidebar
        [navGroups]="TEACHER_NAV_GROUPS"
        [user]="sidebarUser()"
        portalRole="TEACHER PORTAL"
      >
      </app-sidebar>

      <main class="flex-1 overflow-y-auto p-6">
        <!-- Breadcrumb -->
        <div class="mb-1 text-xs text-slate-600">
          <span>Teacher</span> / <span class="text-emerald-400">Take Attendance</span>
        </div>

        <div class="mb-6">
          <h1 class="text-xl font-bold text-white">Take Attendance</h1>
          <p class="mt-0.5 text-sm text-slate-500">
            Select group, class, and schedule to mark student attendance.
          </p>
        </div>

        <!-- Loading -->
        @if (loadingSchedules()) {
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

        @if (!loadingSchedules() && groups().length > 0) {
          <!-- 4-step selection: Group → Class → Schedule → Date -->
          <div class="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
            <!-- Group -->
            <div class="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
              <label class="mb-2 block text-[11px] font-semibold tracking-wide text-slate-500">
                GROUP
              </label>
              <select
                [(ngModel)]="selectedGroupName"
                (change)="onGroupChange()"
                class="w-full rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-2.5 text-sm text-slate-300 outline-none focus:border-emerald-500"
              >
                <option [ngValue]="null" disabled>Choose a group...</option>
                @for (g of groups(); track g) {
                  <option [ngValue]="g">{{ g }}</option>
                }
              </select>
            </div>

            <!-- Class -->
            <div class="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
              <label class="mb-2 block text-[11px] font-semibold tracking-wide text-slate-500">
                CLASS
              </label>
              <select
                [(ngModel)]="selectedClassId"
                (change)="onClassChange()"
                [disabled]="!selectedGroupName()"
                class="w-full rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-2.5 text-sm text-slate-300 outline-none focus:border-emerald-500 disabled:opacity-40"
              >
                <option [ngValue]="null" disabled>
                  {{ selectedGroupName() ? 'Choose a class...' : 'Select a group first' }}
                </option>
                @for (g of filteredClassGroups(); track g.class_id) {
                  <option [ngValue]="g.class_id">{{ g.course_name }} — {{ g.class_code }}</option>
                }
              </select>
            </div>

            <!-- Schedule -->
            <div class="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
              <label class="mb-2 block text-[11px] font-semibold tracking-wide text-slate-500">
                SCHEDULE
              </label>
              <select
                [(ngModel)]="selectedScheduleId"
                (change)="onScheduleChange()"
                [disabled]="!selectedClassId()"
                class="w-full rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-2.5 text-sm text-slate-300 outline-none focus:border-sky-500 disabled:opacity-40"
              >
                <option [ngValue]="null" disabled>
                  {{ selectedClassId() ? 'Choose a schedule...' : 'Select a class first' }}
                </option>
                @for (s of filteredSchedules(); track s.schedule_id) {
                  <option [ngValue]="s.schedule_id">
                    {{ s.day_of_week }} {{ formatTime(s.start_time) }}-{{ formatTime(s.end_time) }}
                    @if (s.room) {
                      · {{ s.room }}
                    }
                  </option>
                }
              </select>
            </div>

            <!-- Date -->
            <div class="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
              <label class="mb-2 block text-[11px] font-semibold tracking-wide text-slate-500">
                DATE
              </label>
              <input
                type="date"
                [(ngModel)]="selectedDate"
                (change)="onDateChange()"
                class="w-full rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-2.5 text-sm text-slate-300 outline-none focus:border-sky-500"
              />
            </div>
          </div>

          <!-- Quick actions -->
          @if (selectedScheduleId() && selectedDate()) {
            <div class="mb-4 rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-3">
              <div class="flex flex-wrap items-center justify-between gap-2">
                <div class="text-sm">
                  <span class="text-slate-500">Taking attendance for:</span>
                  <span class="ml-2 font-medium text-slate-200">{{ selectedScheduleLabel() }}</span>
                  <span class="ml-2 text-slate-500">on</span>
                  <span class="ml-1 font-medium text-sky-400">{{ selectedDate() }}</span>
                </div>
                <div class="flex flex-wrap gap-1.5">
                  <span class="text-[11px] text-slate-600 self-center mr-1">Quick:</span>
                  <button
                    (click)="markAll('Present')"
                    [disabled]="!students().length"
                    class="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-400 hover:bg-emerald-500/20 disabled:opacity-40"
                  >
                    All Present
                  </button>
                  <button
                    (click)="markAll('Absent')"
                    [disabled]="!students().length"
                    class="rounded-lg border border-red-500/30 bg-red-500/10 px-2.5 py-1 text-[11px] font-medium text-red-400 hover:bg-red-500/20 disabled:opacity-40"
                  >
                    All Absent
                  </button>
                  <button
                    (click)="markAll('Late')"
                    [disabled]="!students().length"
                    class="rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[11px] font-medium text-amber-400 hover:bg-amber-500/20 disabled:opacity-40"
                  >
                    All Late
                  </button>
                  <button
                    (click)="markAll('Permission')"
                    [disabled]="!students().length"
                    class="rounded-lg border border-sky-500/30 bg-sky-500/10 px-2.5 py-1 text-[11px] font-medium text-sky-400 hover:bg-sky-500/20 disabled:opacity-40"
                  >
                    All Permission
                  </button>
                </div>
              </div>
            </div>
          }

          <!-- Loading students -->
          @if (loadingStudents()) {
            <div
              class="flex h-40 items-center justify-center rounded-xl border border-slate-800 bg-slate-900/40 text-slate-500"
            >
              <i class="fa-solid fa-circle-notch fa-spin mr-2"></i> Loading students...
            </div>
          }

          <!-- Attendance table -->
          @if (selectedScheduleId() && selectedDate() && !loadingStudents()) {
            <div class="rounded-xl border border-slate-800 bg-slate-900/40 overflow-hidden">
              <div class="max-h-[600px] overflow-auto custom-scrollbar">
                <table class="min-w-full text-left text-sm">
                  <thead class="sticky top-0 z-10 bg-slate-900">
                    <tr class="text-[10px] uppercase tracking-wider text-slate-600">
                      <th class="px-4 py-3 font-medium">#</th>
                      <th class="py-3 font-medium">Student</th>
                      <th class="py-3 font-medium">Code</th>
                      <th class="py-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (s of attendanceRecords(); track s.student_id; let i = $index) {
                      <tr class="border-t border-slate-800/60 hover:bg-slate-800/20">
                        <td class="px-4 py-3 text-slate-500">{{ i + 1 }}</td>
                        <td class="py-3">
                          <span class="text-sm font-medium text-slate-200">
                            {{ s.student_full_name || s.student_code }}
                          </span>
                        </td>
                        <td class="py-3">
                          <span class="font-mono text-[13px] text-slate-400">
                            {{ s.student_code }}
                          </span>
                        </td>
                        <td class="py-3">
                          <div class="flex gap-1.5 flex-wrap">
                            @for (status of statusOptions; track status) {
                              <button
                                (click)="setStatus(s.student_id, status)"
                                class="rounded-md border px-2.5 py-1 text-[11px] font-medium transition"
                                [class.border-emerald-500]="
                                  getStatus(s.student_id) === status && status === 'Present'
                                "
                                [class.bg-emerald-500/15]="
                                  getStatus(s.student_id) === status && status === 'Present'
                                "
                                [class.text-emerald-400]="
                                  getStatus(s.student_id) === status && status === 'Present'
                                "
                                [class.border-red-500]="
                                  getStatus(s.student_id) === status && status === 'Absent'
                                "
                                [class.bg-red-500/15]="
                                  getStatus(s.student_id) === status && status === 'Absent'
                                "
                                [class.text-red-400]="
                                  getStatus(s.student_id) === status && status === 'Absent'
                                "
                                [class.border-amber-500]="
                                  getStatus(s.student_id) === status && status === 'Late'
                                "
                                [class.bg-amber-500/15]="
                                  getStatus(s.student_id) === status && status === 'Late'
                                "
                                [class.text-amber-400]="
                                  getStatus(s.student_id) === status && status === 'Late'
                                "
                                [class.border-sky-500]="
                                  getStatus(s.student_id) === status && status === 'Permission'
                                "
                                [class.bg-sky-500/15]="
                                  getStatus(s.student_id) === status && status === 'Permission'
                                "
                                [class.text-sky-400]="
                                  getStatus(s.student_id) === status && status === 'Permission'
                                "
                                [class.border-slate-700]="getStatus(s.student_id) !== status"
                                [class.text-slate-500]="getStatus(s.student_id) !== status"
                                class="hover:border-slate-600"
                              >
                                {{ status }}
                              </button>
                            }
                          </div>
                        </td>
                      </tr>
                    } @empty {
                      <tr>
                        <td colspan="4" class="px-4 py-16 text-center text-slate-600">
                          <i class="fa-solid fa-user-graduate mb-2 block text-lg"></i>
                          No enrolled students found for this schedule.
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>

              <div class="flex items-center justify-between border-t border-slate-800/60 px-5 py-3">
                <span class="text-[11px] text-slate-600">
                  {{ attendanceRecords().length }} student(s) enrolled
                </span>
                <div class="flex gap-2">
                  <button
                    (click)="resetAll()"
                    class="rounded-lg border border-slate-700 px-4 py-1.5 text-xs font-medium text-slate-400 hover:border-slate-600"
                  >
                    Reset
                  </button>
                  <button
                    (click)="submitAttendance()"
                    [disabled]="saving() || !attendanceRecords().length"
                    class="rounded-lg bg-emerald-500 px-5 py-1.5 text-xs font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-40"
                  >
                    @if (saving()) {
                      <i class="fa-solid fa-circle-notch fa-spin mr-1"></i> Saving...
                    } @else {
                      <i class="fa-solid fa-floppy-disk mr-1"></i> Save Attendance
                    }
                  </button>
                </div>
              </div>
            </div>
          }

          @if (!selectedScheduleId() || !selectedDate()) {
            <div
              class="flex h-48 items-center justify-center rounded-xl border border-slate-800 bg-slate-900/40 text-slate-600"
            >
              <div class="text-center">
                <i class="fa-solid fa-clipboard-check mb-2 block text-2xl"></i>
                <p class="text-sm">Select group, class, schedule, and date to take attendance.</p>
              </div>
            </div>
          }
        }

        @if (!loadingSchedules() && groups().length === 0 && !error()) {
          <div
            class="flex h-48 items-center justify-center rounded-xl border border-slate-800 bg-slate-900/40 text-slate-600"
          >
            <div class="text-center">
              <i class="fa-solid fa-school mb-2 block text-2xl"></i>
              <p class="text-sm">No classes assigned to you yet.</p>
            </div>
          </div>
        }
      </main>
    </div>
  `,
})
export class TeacherAttendanceComponent implements OnInit {
  readonly TEACHER_NAV_GROUPS = TEACHER_NAV_GROUPS;
  readonly statusOptions: AttendanceStatus[] = ['Present', 'Absent', 'Late', 'Permission'];

  private auth = inject(AuthService);
  private http = inject(HttpClient);
  private toast = inject(ToastService);

  readonly sidebarUser = computed(() => {
    const u = this.auth.currentUser();
    return {
      initials: u?.initials ?? 'TC',
      name: u?.full_name ?? 'Teacher',
      roleLabel: 'Teacher',
    };
  });

  private readonly _schedules = signal<TeacherSchedule[]>([]);
  private readonly _loadingSchedules = signal(false);
  private readonly _loadingStudents = signal(false);
  private readonly _saving = signal(false);
  private readonly _error = signal<string | null>(null);
  private readonly _students = signal<EnrolledStudent[]>([]);
  private readonly _attendanceRecords = signal<AttendanceRecord[]>([]);

  readonly schedules = this._schedules.asReadonly();
  readonly loadingSchedules = this._loadingSchedules.asReadonly();
  readonly loadingStudents = this._loadingStudents.asReadonly();
  readonly saving = this._saving.asReadonly();
  readonly error = this._error.asReadonly();
  readonly students = this._students.asReadonly();
  readonly attendanceRecords = this._attendanceRecords.asReadonly();

  private statusMap = new Map<number, AttendanceStatus>();

  readonly selectedGroupName = signal<string | null>(null);
  readonly selectedClassId = signal<number | null>(null);
  readonly selectedScheduleId = signal<number | null>(null);
  readonly selectedDate = signal<string>(new Date().toISOString().split('T')[0]);

  /** Unique group names from all schedules */
  readonly groups = computed<string[]>(() => {
    const names = new Set(
      this._schedules()
        .map((s) => s.group_name)
        .filter(Boolean),
    );
    return Array.from(names).sort();
  });

  /** Class groups filtered by selected group name */
  readonly filteredClassGroups = computed<ClassGroup[]>(() => {
    const groupName = this.selectedGroupName();
    return this.classGroups().filter((g) => g.group_name === groupName);
  });

  /** Group schedules by class_id */
  readonly classGroups = computed<ClassGroup[]>(() => {
    const scheds = this._schedules();
    const map = new Map<number, ClassGroup>();

    for (const s of scheds) {
      if (!map.has(s.class_id)) {
        map.set(s.class_id, {
          class_id: s.class_id,
          course_name: s.course_name,
          group_name: s.group_name,
          class_code: s.class_code,
          schedules: [],
        });
      }
      map.get(s.class_id)!.schedules.push(s);
    }

    return Array.from(map.values());
  });

  /** Schedules filtered by selected class */
  readonly filteredSchedules = computed(() => {
    const classId = this.selectedClassId();
    if (!classId) return [];
    const group = this.classGroups().find((g) => g.class_id === classId);
    return group?.schedules ?? [];
  });

  readonly selectedScheduleLabel = computed(() => {
    const sid = this.selectedScheduleId();
    if (!sid) return '';
    const s = this._schedules().find((sch) => sch.schedule_id === sid);
    if (!s) return '';
    return `${s.course_name} (${s.group_name}) — ${s.day_of_week} ${this.formatTime(s.start_time)}-${this.formatTime(s.end_time)}${s.room ? ' · ' + s.room : ''}`;
  });

  formatTime(t: string): string {
    if (!t) return '—';
    const parts = t.split(':');
    return `${parts[0]}:${parts[1]}`;
  }

  getStatus(studentId: number): AttendanceStatus {
    return this.statusMap.get(studentId) ?? 'Present';
  }

  setStatus(studentId: number, status: AttendanceStatus): void {
    this.statusMap.set(studentId, status);
    this._attendanceRecords.update((records) =>
      records.map((r) => (r.student_id === studentId ? { ...r, status } : r)),
    );
  }

  markAll(status: AttendanceStatus): void {
    this._attendanceRecords.update((records) => records.map((r) => ({ ...r, status })));
    for (const r of this._attendanceRecords()) {
      this.statusMap.set(r.student_id, status);
    }
  }

  resetAll(): void {
    this.loadAttendanceData();
  }

  ngOnInit(): void {
    this.fetchSchedules();
  }

  private fetchSchedules(): void {
    this._loadingSchedules.set(true);
    this._error.set(null);

    this.http
      .get<TeacherSchedule[]>(`${environment.apiUrl}/attendance/teacher/schedules`)
      .pipe(
        catchError((err) => {
          this._error.set(err.error?.message || 'Failed to load classes.');
          this._loadingSchedules.set(false);
          return of(null);
        }),
        tap((res) => {
          if (res && res.length > 0) {
            this._schedules.set(res);

            // Auto-select first group
            const g = this.groups();
            if (g.length > 0) {
              this.selectedGroupName.set(g[0]);
              this.onGroupChange();
            }
          } else if (res) {
            this._schedules.set([]);
          }
          this._loadingSchedules.set(false);
        }),
      )
      .subscribe();
  }

  onGroupChange(): void {
    this.selectedClassId.set(null);
    this.selectedScheduleId.set(null);

    const groups = this.filteredClassGroups();
    if (groups.length > 0) {
      this.selectedClassId.set(groups[0].class_id);
      if (groups[0].schedules.length > 0) {
        this.selectedScheduleId.set(groups[0].schedules[0].schedule_id);
        this.loadAttendanceData();
      }
    }
  }

  onClassChange(): void {
    this.selectedScheduleId.set(null);

    const classId = this.selectedClassId();
    if (!classId) return;

    const group = this.classGroups().find((g) => g.class_id === classId);
    if (group && group.schedules.length > 0) {
      this.selectedScheduleId.set(group.schedules[0].schedule_id);
    }

    if (this.selectedScheduleId() && this.selectedDate()) {
      this.loadAttendanceData();
    }
  }

  onScheduleChange(): void {
    if (this.selectedScheduleId() && this.selectedDate()) {
      this.loadAttendanceData();
    }
  }

  onDateChange(): void {
    if (this.selectedScheduleId() && this.selectedDate()) {
      this.loadAttendanceData();
    }
  }

  private loadAttendanceData(): void {
    const scheduleId = this.selectedScheduleId();
    const date = this.selectedDate();
    if (!scheduleId || !date) return;

    this._loadingStudents.set(true);
    this._error.set(null);

    forkJoin({
      students: this.http.get<EnrolledStudent[]>(
        `${environment.apiUrl}/attendance/schedule/${scheduleId}/students`,
      ),
      existing: this.http.get<AttendanceRecord[]>(
        `${environment.apiUrl}/attendance/schedule/${scheduleId}/date/${date}`,
      ),
    })
      .pipe(
        catchError((err) => {
          this._error.set(err.error?.message || 'Failed to load attendance data.');
          this._loadingStudents.set(false);
          return of(null);
        }),
        tap((res) => {
          if (!res) {
            this._loadingStudents.set(false);
            return;
          }

          const { students, existing } = res;
          this._students.set(students || []);

          const existingMap = new Map<number, AttendanceStatus>();
          for (const rec of existing || []) {
            existingMap.set(rec.student_id, rec.status);
          }

          const records: AttendanceRecord[] = (students || []).map((st) => ({
            student_id: st.student_id,
            schedule_id: scheduleId,
            attendance_date: date,
            status: existingMap.get(st.student_id) ?? 'Present',
            student_full_name: st.student_full_name || `${st.first_name} ${st.last_name}`,
            student_code: st.student_code,
          }));

          this.statusMap.clear();
          for (const r of records) {
            this.statusMap.set(r.student_id, r.status);
          }

          this._attendanceRecords.set(records);
          this._loadingStudents.set(false);
        }),
      )
      .subscribe();
  }

  submitAttendance(): void {
    const scheduleId = this.selectedScheduleId();
    const date = this.selectedDate();
    if (!scheduleId || !date) return;

    this._saving.set(true);
    this._error.set(null);

    const records = this._attendanceRecords().map((r) => ({
      student_id: r.student_id,
      status: r.status,
    }));

    this.http
      .post<{ message: string; success_count: number; error_count: number }>(
        `${environment.apiUrl}/attendance/take`,
        { schedule_id: scheduleId, attendance_date: date, records },
      )
      .pipe(
        catchError((err) => {
          this._error.set(err.error?.message || 'Failed to save attendance.');
          this._saving.set(false);
          return of(null);
        }),
        tap((res) => {
          if (res) {
            const msg = `${res.success_count} record(s) saved successfully`;
            if (res.error_count > 0) {
              this.toast.warning(`${msg}, ${res.error_count} error(s).`);
            } else {
              this.toast.success(msg);
            }
          }
          this._saving.set(false);
        }),
      )
      .subscribe();
  }
}
