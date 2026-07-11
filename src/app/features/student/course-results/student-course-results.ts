import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, of, tap } from 'rxjs';
import { SidebarComponent } from '../../../shared/components/sidebar/sidebar';
import { AuthService } from '../../../core/services/auth';
import { STUDENT_NAV_GROUPS } from '../../../shared/models/nav';
import { environment } from '../../../../environments/environment';

interface CourseResult {
  result_id: number;
  midterm: number | null;
  final: number | null;
  total: number | null;
  grade: string | null;
  grade_point: number | null;
  course_id: number;
  course_name: string;
  course_code: string | null;
  group_name: string;
}

@Component({
  selector: 'app-student-course-results',
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
          <span>Student</span> / <span class="text-emerald-400">Course Results</span>
        </div>
        <div class="mb-6">
          <h1 class="text-xl font-bold text-white">My Course Results</h1>
          <p class="mt-0.5 text-sm text-slate-500">
            View your midterm, final, total scores, and final grades.
          </p>
        </div>

        <!-- Grade legend -->
        <div
          class="mb-4 flex flex-wrap gap-4 rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-2.5 text-xs text-slate-500"
        >
          <span
            ><span class="inline-block h-2 w-2 rounded bg-emerald-500 mr-1"></span>A (≥85, GPA
            4.0)</span
          >
          <span
            ><span class="inline-block h-2 w-2 rounded bg-sky-500 mr-1"></span>B (70–84, GPA
            3.0)</span
          >
          <span
            ><span class="inline-block h-2 w-2 rounded bg-amber-500 mr-1"></span>C (50–69, GPA
            2.0)</span
          >
          <span
            ><span class="inline-block h-2 w-2 rounded bg-orange-500 mr-1"></span>D (40–49, GPA
            1.0)</span
          >
          <span
            ><span class="inline-block h-2 w-2 rounded bg-red-500 mr-1"></span>F (<40, GPA
            0.0)</span
          >
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
                    <th class="py-3 font-medium">Course</th>
                    <th class="py-3 font-medium">Group</th>
                    <th class="py-3 font-medium text-center">Midterm</th>
                    <th class="py-3 font-medium text-center">Final</th>
                    <th class="py-3 font-medium text-center">Total</th>
                    <th class="py-3 font-medium text-center">Grade</th>
                    <th class="px-4 py-3 font-medium text-center">GPA</th>
                  </tr>
                </thead>
                <tbody>
                  @for (r of results(); track r.result_id; let i = $index) {
                    <tr class="border-t border-slate-800/60 hover:bg-slate-800/20">
                      <td class="px-4 py-3 text-slate-500">{{ i + 1 }}</td>
                      <td class="py-3">
                        <p class="text-sm font-medium text-slate-200">{{ r.course_name }}</p>
                        @if (r.course_code) {
                          <p class="text-[11px] text-slate-500">{{ r.course_code }}</p>
                        }
                      </td>
                      <td class="py-3 text-slate-400">{{ r.group_name }}</td>
                      <td class="py-3 text-center text-slate-300">{{ r.midterm ?? '—' }}</td>
                      <td class="py-3 text-center text-slate-300">{{ r.final ?? '—' }}</td>
                      <td
                        class="py-3 text-center font-mono font-bold"
                        [class]="totalColor(r.total)"
                      >
                        {{ r.total ?? '—' }}
                      </td>
                      <td class="py-3 text-center">
                        @if (r.grade) {
                          <span
                            class="rounded-md px-2.5 py-0.5 text-xs font-bold"
                            [class]="gradeBadgeClass(r.grade)"
                            >{{ r.grade }}</span
                          >
                        } @else {
                          <span class="text-slate-600">—</span>
                        }
                      </td>
                      <td class="px-4 py-3 text-center text-slate-400">
                        {{ r.grade_point ?? '—' }}
                      </td>
                    </tr>
                  } @empty {
                    <tr>
                      <td colspan="8" class="px-4 py-16 text-center text-slate-600">
                        <i class="fa-solid fa-square-check mb-2 block text-lg"></i>No course results
                        yet
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
            <div class="border-t border-slate-800/60 px-5 py-3">
              <span class="text-[11px] text-slate-600">{{ results().length }} result(s)</span>
            </div>
          </div>
        }
      </main>
    </div>
  `,
})
export class StudentCourseResultsComponent implements OnInit {
  readonly STUDENT_NAV_GROUPS = STUDENT_NAV_GROUPS;
  private auth = inject(AuthService);
  private http = inject(HttpClient);

  readonly sidebarUser = computed(() => {
    const u = this.auth.currentUser();
    return { initials: u?.initials ?? 'ST', name: u?.full_name ?? 'Student', roleLabel: 'Student' };
  });

  private readonly _results = signal<CourseResult[]>([]);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);

  readonly results = this._results.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  totalColor(total: number | null): string {
    if (total === null) return 'text-slate-400';
    if (total >= 85) return 'text-emerald-400';
    if (total >= 70) return 'text-sky-400';
    if (total >= 50) return 'text-amber-400';
    if (total >= 40) return 'text-orange-400';
    return 'text-red-400';
  }

  gradeBadgeClass(grade: string): string {
    switch (grade) {
      case 'A':
        return 'bg-emerald-500/20 text-emerald-400';
      case 'B':
        return 'bg-sky-500/20 text-sky-400';
      case 'C':
        return 'bg-amber-500/20 text-amber-400';
      case 'D':
        return 'bg-orange-500/20 text-orange-400';
      case 'F':
        return 'bg-red-500/20 text-red-400';
      default:
        return 'bg-slate-500/15 text-slate-400';
    }
  }

  ngOnInit(): void {
    this._loading.set(true);
    this._error.set(null);

    this.http
      .get<CourseResult[]>(`${environment.apiUrl}/course-results/student/me`)
      .pipe(
        catchError((err) => {
          this._error.set(err.error?.message || 'Failed to load course results.');
          this._loading.set(false);
          return of(null);
        }),
        tap((res) => {
          if (res) this._results.set(res);
          this._loading.set(false);
        }),
      )
      .subscribe();
  }
}
