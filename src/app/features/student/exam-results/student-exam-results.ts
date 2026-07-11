import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, of, tap } from 'rxjs';
import { RouterLink } from '@angular/router';
import { SidebarComponent } from '../../../shared/components/sidebar/sidebar';
import { AuthService } from '../../../core/services/auth';
import { STUDENT_NAV_GROUPS } from '../../../shared/models/nav';
import { environment } from '../../../../environments/environment';

interface ExamResult {
  result_id: number;
  score: number | null;
  exam_id: number;
  exam_date: string;
  exam_type_name: string;
  group_name: string;
}

@Component({
  selector: 'app-student-exam-results',
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
          <span>Student</span> / <span class="text-emerald-400">Exam Results</span>
        </div>
        <div class="mb-6">
          <h1 class="text-xl font-bold text-white">My Exam Results</h1>
          <p class="mt-0.5 text-sm text-slate-500">View your exam scores and grades.</p>
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
                    <th class="py-3 font-medium">Date</th>
                    <th class="py-3 font-medium">Group</th>
                    <th class="py-3 font-medium">Type</th>
                    <th class="py-3 font-medium text-center">Score</th>
                  </tr>
                </thead>
                <tbody>
                  @for (r of results(); track r.result_id; let i = $index) {
                    <tr class="border-t border-slate-800/60 hover:bg-slate-800/20">
                      <td class="px-4 py-3 text-slate-500">{{ i + 1 }}</td>
                      <td class="py-3 text-slate-300">{{ formatDate(r.exam_date) }}</td>
                      <td class="py-3">
                        <p class="text-sm font-medium text-slate-200">{{ r.group_name }}</p>
                      </td>
                      <td class="py-3">
                        <span
                          class="rounded-full bg-violet-500/15 px-2.5 py-0.5 text-[11px] font-medium text-violet-400"
                          >{{ r.exam_type_name }}</span
                        >
                      </td>
                      <td class="py-3 text-center">
                        @if (r.score !== null) {
                          <span class="text-lg font-bold" [class]="scoreColor(r.score)">{{
                            r.score
                          }}</span>
                        } @else {
                          <span class="text-slate-600">—</span>
                        }
                      </td>
                    </tr>
                  } @empty {
                    <tr>
                      <td colspan="5" class="px-4 py-16 text-center text-slate-600">
                        <i class="fa-solid fa-chart-simple mb-2 block text-lg"></i>No exam results
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
export class StudentExamResultsComponent implements OnInit {
  readonly STUDENT_NAV_GROUPS = STUDENT_NAV_GROUPS;
  private auth = inject(AuthService);
  private http = inject(HttpClient);

  readonly sidebarUser = computed(() => {
    const u = this.auth.currentUser();
    return { initials: u?.initials ?? 'ST', name: u?.full_name ?? 'Student', roleLabel: 'Student' };
  });

  private readonly _results = signal<ExamResult[]>([]);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);

  readonly results = this._results.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  scoreColor(score: number): string {
    if (score >= 85) return 'text-emerald-400';
    if (score >= 70) return 'text-sky-400';
    if (score >= 50) return 'text-amber-400';
    if (score >= 40) return 'text-orange-400';
    return 'text-red-400';
  }

  formatDate(d: string): string {
    if (!d) return '—';
    const date = new Date(d + 'T00:00:00');
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  ngOnInit(): void {
    this._loading.set(true);
    this._error.set(null);

    this.http
      .get<ExamResult[]>(`${environment.apiUrl}/exam-results/student/me`)
      .pipe(
        catchError((err) => {
          this._error.set(err.error?.message || 'Failed to load exam results.');
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
