import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, of, tap } from 'rxjs';
import { RouterLink } from '@angular/router';
import { SidebarComponent } from '../../../shared/components/sidebar/sidebar';
import { AuthService } from '../../../core/services/auth';
import { STUDENT_NAV_GROUPS } from '../../../shared/models/nav';
import { environment } from '../../../../environments/environment';

interface ScheduleEntry {
  schedule_id: number;
  class_id: number;
  day_of_week: string;
  start_time: string;
  end_time: string;
  room: string | null;
  class_code: string | null;
  course_name: string;
  course_code: string | null;
  group_name: string;
}

type DayLabel = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat';

@Component({
  selector: 'app-student-schedule',
  standalone: true,
  imports: [CommonModule, SidebarComponent],
  template: `
    <div class="flex min-h-screen bg-slate-950">
      <app-sidebar
        [navGroups]="STUDENT_NAV_GROUPS"
        [user]="sidebarUser()"
        portalRole="STUDENT PORTAL"
      ></app-sidebar>

      <main class="flex-1 overflow-y-auto p-6">
        <div class="mb-1 text-xs text-slate-600">
          <span>Student</span> / <span class="text-emerald-400">My Schedule</span>
        </div>
        <div class="mb-6">
          <h1 class="text-xl font-bold text-white">My Schedule</h1>
          <p class="mt-0.5 text-sm text-slate-500">Your weekly class schedule.</p>
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

        @if (!loading() && !error()) {
          <div class="grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-6">
            @for (day of dayNames; track day.key) {
              <div class="rounded-xl border border-slate-800 bg-slate-900/40 overflow-hidden">
                <div
                  class="border-b border-slate-800 px-4 py-3"
                  [class.border-sky-500/30]="day.isToday"
                >
                  <p
                    class="text-xs font-semibold tracking-wide"
                    [class.text-sky-400]="day.isToday"
                    [class.text-slate-500]="!day.isToday"
                  >
                    {{ day.label }}
                  </p>
                  @if (day.isToday) {
                    <span class="text-[10px] text-sky-500">Today</span>
                  }
                </div>
                <div class="space-y-2 p-3">
                  @if (scheduleByDay()[day.key]?.length) {
                    @for (entry of scheduleByDay()[day.key]; track entry.schedule_id) {
                      <div
                        class="rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2.5 hover:border-sky-700/50 transition"
                      >
                        <div class="mb-1 flex items-center justify-between">
                          <span class="text-[11px] font-mono font-bold text-sky-400">{{
                            formatTime(entry.start_time)
                          }}</span>
                          <span class="text-[11px] text-slate-600">{{
                            formatTime(entry.end_time)
                          }}</span>
                        </div>
                        <p class="text-sm font-medium text-slate-200 leading-tight truncate">
                          {{ entry.course_name }}
                        </p>
                        <div
                          class="mt-1 flex flex-wrap gap-x-2 gap-y-0.5 text-[10px] text-slate-500"
                        >
                          <span>{{ entry.group_name }}</span>
                          @if (entry.class_code) {
                            <span>{{ entry.class_code }}</span>
                          }
                          @if (entry.room) {
                            <span
                              ><i class="fa-regular fa-building mr-0.5"></i>{{ entry.room }}</span
                            >
                          }
                        </div>
                      </div>
                    }
                  } @else {
                    <div class="py-6 text-center text-xs text-slate-600">
                      <i class="fa-regular fa-calendar mb-1 block"></i> No classes
                    </div>
                  }
                </div>
              </div>
            }
          </div>

          <div class="mt-6 rounded-xl border border-slate-800 bg-slate-900/40">
            <div class="border-b border-slate-800 px-5 py-3">
              <h2 class="text-sm font-semibold text-white">All Scheduled Classes</h2>
            </div>
            <div class="max-h-[400px] overflow-auto custom-scrollbar">
              <table class="min-w-full text-left text-sm">
                <thead class="sticky top-0 z-10 bg-slate-900">
                  <tr class="text-[10px] uppercase tracking-wider text-slate-600">
                    <th class="px-4 py-3 font-medium">Day</th>
                    <th class="py-3 font-medium">Time</th>
                    <th class="py-3 font-medium">Course</th>
                    <th class="py-3 font-medium">Group</th>
                    <th class="py-3 font-medium">Room</th>
                  </tr>
                </thead>
                <tbody>
                  @for (entry of schedules(); track entry.schedule_id) {
                    <tr class="border-t border-slate-800/60 hover:bg-slate-800/20">
                      <td class="px-4 py-3">
                        <span
                          class="rounded-md px-2 py-0.5 text-xs font-medium"
                          [class.bg-sky-500/15]="entry.day_of_week === todayKey"
                          [class.text-sky-400]="entry.day_of_week === todayKey"
                          [class.text-slate-400]="entry.day_of_week !== todayKey"
                          >{{ entry.day_of_week }}</span
                        >
                      </td>
                      <td class="py-3 text-slate-400 font-mono text-[13px]">
                        {{ formatTime(entry.start_time) }} — {{ formatTime(entry.end_time) }}
                      </td>
                      <td class="py-3">
                        <p class="text-sm font-medium text-slate-200 truncate max-w-[200px]">
                          {{ entry.course_name }}
                        </p>
                      </td>
                      <td class="py-3 text-slate-400">{{ entry.group_name }}</td>
                      <td class="py-3 text-slate-400">{{ entry.room || '—' }}</td>
                    </tr>
                  } @empty {
                    <tr>
                      <td colspan="5" class="px-4 py-12 text-center text-slate-600">
                        <i class="fa-regular fa-calendar mb-2 block text-lg"></i>No schedule entries
                        found
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
            <div class="border-t border-slate-800/60 px-5 py-3">
              <span class="text-[11px] text-slate-600"
                >{{ schedules().length }} class(es) scheduled</span
              >
            </div>
          </div>
        }
      </main>
    </div>
  `,
})
export class StudentScheduleComponent implements OnInit {
  readonly STUDENT_NAV_GROUPS = STUDENT_NAV_GROUPS;
  private auth = inject(AuthService);
  private http = inject(HttpClient);

  readonly sidebarUser = computed(() => {
    const u = this.auth.currentUser();
    return { initials: u?.initials ?? 'ST', name: u?.full_name ?? 'Student', roleLabel: 'Student' };
  });

  private readonly _schedules = signal<ScheduleEntry[]>([]);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);

  readonly schedules = this._schedules.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  readonly dayNames = [
    { key: 'Mon' as DayLabel, label: 'Monday', isToday: false },
    { key: 'Tue' as DayLabel, label: 'Tuesday', isToday: false },
    { key: 'Wed' as DayLabel, label: 'Wednesday', isToday: false },
    { key: 'Thu' as DayLabel, label: 'Thursday', isToday: false },
    { key: 'Fri' as DayLabel, label: 'Friday', isToday: false },
    { key: 'Sat' as DayLabel, label: 'Saturday', isToday: false },
  ];

  private readonly shortDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  readonly todayKey = this.shortDays[new Date().getDay()] as DayLabel;

  readonly scheduleByDay = computed(() => {
    const map: Record<string, ScheduleEntry[]> = {};
    for (const d of this.dayNames) map[d.key] = [];
    for (const entry of this._schedules()) {
      if (map[entry.day_of_week]) map[entry.day_of_week].push(entry);
    }
    return map;
  });

  formatTime(t: string): string {
    if (!t) return '—';
    return t.slice(0, 5);
  }

  ngOnInit(): void {
    for (const day of this.dayNames) day.isToday = day.key === this.todayKey;

    this._loading.set(true);
    this._error.set(null);

    this.http
      .get<ScheduleEntry[]>(`${environment.apiUrl}/schedules/student`)
      .pipe(
        catchError((err) => {
          this._error.set(err.error?.message || 'Failed to load schedule.');
          this._loading.set(false);
          return of(null);
        }),
        tap((res) => {
          if (res) this._schedules.set(res);
          this._loading.set(false);
        }),
      )
      .subscribe();
  }
}
