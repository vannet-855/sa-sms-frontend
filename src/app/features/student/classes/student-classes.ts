import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, of, tap } from 'rxjs';
import { RouterLink } from '@angular/router';
import { SidebarComponent } from '../../../shared/components/sidebar/sidebar';
import { AuthService } from '../../../core/services/auth';
import { STUDENT_NAV_GROUPS } from '../../../shared/models/nav';
import { environment } from '../../../../environments/environment';

interface StudentClass {
  enrollment_id: number;
  class_id: number;
  class_code: string | null;
  course_id: number;
  course_name: string;
  course_code: string | null;
  group_name: string;
  semester_name: string | null;
  year_label: string | null;
  shift_name: string | null;
  schedule_count: number;
  teacher_name: string | null;
}

@Component({
  selector: 'app-student-classes',
  standalone: true,
  imports: [CommonModule, SidebarComponent, RouterLink],
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
          <span>Student</span> / <span class="text-emerald-400">My Classes</span>
        </div>

        <div class="mb-6">
          <h1 class="text-xl font-bold text-white">My Classes</h1>
          <p class="mt-0.5 text-sm text-slate-500">View all classes you are enrolled in.</p>
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
          <div class="rounded-xl border border-slate-800 bg-slate-900/40">
            <div class="max-h-[600px] overflow-auto custom-scrollbar">
              <table class="min-w-full text-left text-sm">
                <thead class="sticky top-0 z-10 bg-slate-900">
                  <tr class="text-[10px] uppercase tracking-wider text-slate-600">
                    <th class="px-4 py-3 font-medium">#</th>
                    <th class="py-3 font-medium">Code</th>
                    <th class="py-3 font-medium">Course</th>
                    <th class="py-3 font-medium">Group</th>
                    <th class="py-3 font-medium">Shift</th>
                    <th class="py-3 font-medium">Semester</th>
                    <th class="py-3 font-medium">Year</th>
                    <th class="py-3 font-medium">Teacher</th>
                    <th class="py-3 font-medium text-center">Schedules</th>
                    <th class="px-4 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  @for (c of classes(); track c.enrollment_id; let i = $index) {
                    <tr class="border-t border-slate-800/60 hover:bg-slate-800/20">
                      <td class="px-4 py-3 text-slate-500">{{ i + 1 }}</td>
                      <td class="py-3">
                        <span class="font-mono text-[13px] text-slate-300">{{
                          c.class_code || '—'
                        }}</span>
                      </td>
                      <td class="py-3">
                        <div class="min-w-0 max-w-[200px]">
                          <p class="truncate text-sm font-medium text-slate-200">
                            {{ c.course_name }}
                          </p>
                          @if (c.course_code) {
                            <p class="text-[11px] text-slate-500">{{ c.course_code }}</p>
                          }
                        </div>
                      </td>
                      <td class="py-3 text-slate-400">{{ c.group_name }}</td>
                      <td class="py-3 text-slate-400">{{ c.shift_name || '—' }}</td>
                      <td class="py-3 text-[13px] text-slate-400">{{ c.semester_name || '—' }}</td>
                      <td class="py-3 text-[13px] text-slate-400">{{ c.year_label || '—' }}</td>
                      <td class="py-3 text-slate-400">{{ c.teacher_name || '—' }}</td>
                      <td class="py-3 text-center">
                        <span
                          class="inline-flex items-center gap-1 rounded-full bg-sky-500/15 px-2.5 py-0.5 text-[12px] font-medium text-sky-400"
                        >
                          <i class="fa-regular fa-calendar text-[10px]"></i>
                          {{ c.schedule_count }}
                        </span>
                      </td>
                      <td class="px-4 py-3">
                        <div class="flex justify-end gap-1.5">
                          <a
                            [routerLink]="['/student/schedule']"
                            class="flex h-7 w-7 items-center justify-center rounded-md border border-slate-800 text-sky-400 hover:border-sky-500/50"
                            title="View Schedule"
                          >
                            <i class="fa-regular fa-calendar text-xs"></i>
                          </a>
                          <a
                            [routerLink]="['/student/attendance']"
                            class="flex h-7 w-7 items-center justify-center rounded-md border border-slate-800 text-emerald-400 hover:border-emerald-500/50"
                            title="Attendance"
                          >
                            <i class="fa-solid fa-clipboard-check text-xs"></i>
                          </a>
                        </div>
                      </td>
                    </tr>
                  } @empty {
                    <tr>
                      <td colspan="10" class="px-4 py-16 text-center text-slate-600">
                        <i class="fa-solid fa-school mb-2 block text-lg"></i>
                        No classes assigned yet
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
            <div class="border-t border-slate-800/60 px-5 py-3">
              <span class="text-[11px] text-slate-600">{{ classes().length }} class(es)</span>
            </div>
          </div>
        }
      </main>
    </div>
  `,
})
export class StudentClassesComponent implements OnInit {
  readonly STUDENT_NAV_GROUPS = STUDENT_NAV_GROUPS;
  private auth = inject(AuthService);
  private http = inject(HttpClient);

  readonly sidebarUser = computed(() => {
    const u = this.auth.currentUser();
    return { initials: u?.initials ?? 'ST', name: u?.full_name ?? 'Student', roleLabel: 'Student' };
  });

  private readonly _classes = signal<StudentClass[]>([]);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);

  readonly classes = this._classes.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  ngOnInit(): void {
    this._loading.set(true);
    this._error.set(null);

    this.http
      .get<StudentClass[]>(`${environment.apiUrl}/enrollments/student/me`)
      .pipe(
        catchError((err) => {
          this._error.set(err.error?.message || 'Failed to load classes.');
          this._loading.set(false);
          return of(null);
        }),
        tap((res) => {
          if (res) this._classes.set(res);
          this._loading.set(false);
        }),
      )
      .subscribe();
  }
}
