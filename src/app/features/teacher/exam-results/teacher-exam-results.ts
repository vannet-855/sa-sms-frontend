import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { catchError, of, tap } from 'rxjs';
import { RouterLink } from '@angular/router';
import { SidebarComponent } from '../../../shared/components/sidebar/sidebar';
import { AuthService } from '../../../core/services/auth';
import { ToastService } from '../../../core/services/toast';
import { TEACHER_NAV_GROUPS } from '../../../shared/models/nav';
import { environment } from '../../../../environments/environment';

interface TeacherExam {
  exam_id: number;
  exam_date: string;
  class_id: number;
  exam_type_name: string;
  course_name: string;
  group_name: string;
  class_code: string;
}

interface EnrolledStudent {
  student_id: number;
  first_name: string;
  last_name: string;
  student_code: string;
  student_full_name?: string;
}

interface ExistingResult {
  result_id?: number;
  student_id: number;
  score: number | null;
}

@Component({
  selector: 'app-teacher-exam-results',
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
        <div class="mb-1 text-xs text-slate-600">
          <span>Teacher</span> / <span class="text-emerald-400">Exam Results</span>
        </div>

        <div class="mb-6">
          <h1 class="text-xl font-bold text-white">Exam Results</h1>
          <p class="mt-0.5 text-sm text-slate-500">
            Select an exam to view and grade student results.
          </p>
        </div>

        @if (loadingExams()) {
          <div
            class="flex h-40 items-center justify-center rounded-xl border border-slate-800 bg-slate-900/40 text-slate-500"
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

        @if (!loadingExams() && exams().length > 0) {
          <!-- Exam selector row -->
          <div class="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
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

            <div class="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
              <label class="mb-2 block text-[11px] font-semibold tracking-wide text-slate-500">
                EXAM
              </label>
              <select
                [(ngModel)]="selectedExamId"
                (change)="onExamChange()"
                [disabled]="!selectedGroupName()"
                class="w-full rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-2.5 text-sm text-slate-300 outline-none focus:border-sky-500 disabled:opacity-40"
              >
                <option [ngValue]="null" disabled>
                  {{ selectedGroupName() ? 'Choose an exam...' : 'Select a group first' }}
                </option>
                @for (e of filteredExams(); track e.exam_id) {
                  <option [ngValue]="e.exam_id">
                    {{ e.course_name }} — {{ e.exam_type_name }} ({{
                      e.exam_date | date: 'shortDate'
                    }})
                  </option>
                }
              </select>
            </div>

            <div class="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
              <label class="mb-2 block text-[11px] font-semibold tracking-wide text-slate-500">
                INFO
              </label>
              @if (selectedExam(); as exam) {
                <div class="text-sm text-slate-400">
                  <p>{{ exam.course_name }} — {{ exam.group_name }}</p>
                  <p class="text-xs text-slate-500">
                    {{ exam.class_code }} · {{ exam.exam_type_name }} ·
                    {{ exam.exam_date | date: 'mediumDate' }}
                  </p>
                </div>
              } @else {
                <div class="text-sm text-slate-600">Select an exam to begin grading</div>
              }
            </div>
          </div>

          <!-- Loading students -->
          @if (loadingStudents()) {
            <div
              class="flex h-40 items-center justify-center rounded-xl border border-slate-800 bg-slate-900/40 text-slate-500"
            >
              <i class="fa-solid fa-circle-notch fa-spin mr-2"></i> Loading students...
            </div>
          }

          <!-- Grade table -->
          @if (selectedExamId() && !loadingStudents()) {
            <div class="rounded-xl border border-slate-800 bg-slate-900/40 overflow-hidden">
              <div class="max-h-[600px] overflow-auto custom-scrollbar">
                <table class="min-w-full text-left text-sm">
                  <thead class="sticky top-0 z-10 bg-slate-900">
                    <tr class="text-[10px] uppercase tracking-wider text-slate-600">
                      <th class="px-4 py-3 font-medium">#</th>
                      <th class="py-3 font-medium">Student</th>
                      <th class="py-3 font-medium">Code</th>
                      <th class="py-3 font-medium">Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (s of gradeRecords(); track s.student_id; let i = $index) {
                      <tr class="border-t border-slate-800/60 hover:bg-slate-800/20">
                        <td class="px-4 py-3 text-slate-500">{{ i + 1 }}</td>
                        <td class="py-3">
                          <span class="text-sm font-medium text-slate-200">{{
                            s.student_full_name
                          }}</span>
                        </td>
                        <td class="py-3">
                          <span class="font-mono text-[13px] text-slate-400">{{
                            s.student_code
                          }}</span>
                        </td>
                        <td class="py-3">
                          <input
                            type="number"
                            step="0.5"
                            min="0"
                            max="100"
                            [value]="getScore(s.student_id)"
                            (input)="setScore(s.student_id, $any($event.target).value)"
                            class="w-24 rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-1.5 text-sm text-slate-300 outline-none focus:border-sky-500"
                            placeholder="—"
                          />
                        </td>
                      </tr>
                    } @empty {
                      <tr>
                        <td colspan="4" class="px-4 py-16 text-center text-slate-600">
                          <i class="fa-solid fa-user-graduate mb-2 block text-lg"></i>
                          No enrolled students found for this exam.
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>

              <div class="flex items-center justify-between border-t border-slate-800/60 px-5 py-3">
                <span class="text-[11px] text-slate-600">
                  {{ gradeRecords().length }} student(s)
                </span>
                <div class="flex gap-2">
                  <button
                    (click)="clearScores()"
                    class="rounded-lg border border-slate-700 px-4 py-1.5 text-xs font-medium text-slate-400 hover:border-slate-600"
                  >
                    Clear All
                  </button>
                  <button
                    (click)="submitGrades()"
                    [disabled]="saving() || !gradeRecords().length"
                    class="rounded-lg bg-emerald-500 px-5 py-1.5 text-xs font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-40"
                  >
                    @if (saving()) {
                      <i class="fa-solid fa-circle-notch fa-spin mr-1"></i> Saving...
                    } @else {
                      <i class="fa-solid fa-floppy-disk mr-1"></i> Save Results
                    }
                  </button>
                </div>
              </div>
            </div>
          }

          @if (!selectedExamId()) {
            <div
              class="flex h-48 items-center justify-center rounded-xl border border-slate-800 bg-slate-900/40 text-slate-600"
            >
              <div class="text-center">
                <i class="fa-solid fa-file-pen mb-2 block text-2xl"></i>
                <p class="text-sm">Select a group and exam to grade student results.</p>
              </div>
            </div>
          }
        }

        @if (!loadingExams() && exams().length === 0 && !error()) {
          <div
            class="flex h-48 items-center justify-center rounded-xl border border-slate-800 bg-slate-900/40 text-slate-600"
          >
            <div class="text-center">
              <i class="fa-solid fa-file-pen mb-2 block text-2xl"></i>
              <p class="text-sm">No exams assigned to you yet.</p>
            </div>
          </div>
        }
      </main>
    </div>
  `,
})
export class TeacherExamResultsComponent implements OnInit {
  readonly TEACHER_NAV_GROUPS = TEACHER_NAV_GROUPS;

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

  private readonly _exams = signal<TeacherExam[]>([]);
  private readonly _loadingExams = signal(false);
  private readonly _loadingStudents = signal(false);
  private readonly _saving = signal(false);
  private readonly _error = signal<string | null>(null);
  private readonly _gradeRecords = signal<
    Array<{
      student_id: number;
      student_full_name: string;
      student_code: string;
    }>
  >([]);

  readonly exams = this._exams.asReadonly();
  readonly loadingExams = this._loadingExams.asReadonly();
  readonly loadingStudents = this._loadingStudents.asReadonly();
  readonly saving = this._saving.asReadonly();
  readonly error = this._error.asReadonly();
  readonly gradeRecords = this._gradeRecords.asReadonly();

  private scoreMap = new Map<number, number | null>();

  readonly selectedGroupName = signal<string | null>(null);
  readonly selectedExamId = signal<number | null>(null);

  readonly groups = computed<string[]>(() => {
    const names = new Set(
      this._exams()
        .filter((e) => e.group_name)
        .map((e) => e.group_name!),
    );
    return Array.from(names).sort();
  });

  readonly filteredExams = computed(() => {
    const g = this.selectedGroupName();
    return g ? this._exams().filter((e) => e.group_name === g) : [];
  });

  readonly selectedExam = computed(() => {
    const id = this.selectedExamId();
    return this._exams().find((e) => e.exam_id === id);
  });

  getScore(studentId: number): number | null {
    return this.scoreMap.get(studentId) ?? null;
  }

  setScore(studentId: number, value: string): void {
    const num = value === '' ? null : parseFloat(value);
    this.scoreMap.set(studentId, isNaN(num as number) ? null : num);
  }

  clearScores(): void {
    this.scoreMap.clear();
  }

  ngOnInit(): void {
    this.fetchExams();
  }

  private fetchExams(): void {
    this._loadingExams.set(true);
    this._error.set(null);

    this.http
      .get<TeacherExam[]>(`${environment.apiUrl}/exam-results/teacher/exams`)
      .pipe(
        catchError((err) => {
          this._error.set(err.error?.message || 'Failed to load exams.');
          this._loadingExams.set(false);
          return of(null);
        }),
        tap((res) => {
          if (res && res.length > 0) {
            this._exams.set(res);

            const g = this.groups();
            if (g.length > 0) {
              this.selectedGroupName.set(g[0]);
              this.onGroupChange();
            }
          } else if (res) {
            this._exams.set([]);
          }
          this._loadingExams.set(false);
        }),
      )
      .subscribe();
  }

  onGroupChange(): void {
    this.selectedExamId.set(null);
    this._gradeRecords.set([]);
    this.scoreMap.clear();

    const exams = this.filteredExams();
    if (exams.length > 0) {
      this.selectedExamId.set(exams[0].exam_id);
      this.loadStudents(exams[0].exam_id);
    }
  }

  onExamChange(): void {
    const id = this.selectedExamId();
    if (id) {
      this.loadStudents(id);
    }
  }

  private loadStudents(examId: number): void {
    this._loadingStudents.set(true);
    this._error.set(null);

    this.http
      .get<{ students: EnrolledStudent[]; existing_results: ExistingResult[] }>(
        `${environment.apiUrl}/exam-results/teacher/exam/${examId}/students`,
      )
      .pipe(
        catchError((err) => {
          this._error.set(err.error?.message || 'Failed to load students.');
          this._loadingStudents.set(false);
          return of(null);
        }),
        tap((res) => {
          if (res) {
            const { students, existing_results } = res;

            this._gradeRecords.set(
              (students || []).map((s) => ({
                student_id: s.student_id,
                student_full_name: s.student_full_name || `${s.first_name} ${s.last_name}`,
                student_code: s.student_code,
              })),
            );

            this.scoreMap.clear();
            for (const r of existing_results || []) {
              this.scoreMap.set(r.student_id, r.score);
            }
          }
          this._loadingStudents.set(false);
        }),
      )
      .subscribe();
  }

  submitGrades(): void {
    const examId = this.selectedExamId();
    if (!examId) return;

    this._saving.set(true);
    this._error.set(null);

    const results = Array.from(this.scoreMap.entries()).map(([student_id, score]) => ({
      student_id,
      score,
    }));

    this.http
      .post<{ message: string; success_count: number; error_count: number }>(
        `${environment.apiUrl}/exam-results/grade`,
        { exam_id: examId, results },
      )
      .pipe(
        catchError((err) => {
          this._error.set(err.error?.message || 'Failed to save results.');
          this._saving.set(false);
          return of(null);
        }),
        tap((res) => {
          if (res) {
            const msg = `${res.success_count} result(s) saved`;
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
