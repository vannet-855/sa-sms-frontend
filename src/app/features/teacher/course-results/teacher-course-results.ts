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

interface TeacherClass {
  class_id: number;
  class_code: string;
  course_id: number;
  course_name: string;
  course_code: string;
  group_id: number;
  group_name: string;
}

interface EnrolledStudent {
  student_id: number;
  student_full_name: string;
  student_code: string;
}

interface ExistingCourseResult {
  result_id?: number;
  student_id: number;
  midterm: number | null;
  final: number | null;
}

interface GroupStudentsResponse {
  class_id: number;
  course_id: number;
  course_name: string;
  course_code: string;
  midterm_max: number;
  final_max: number;
  students: EnrolledStudent[];
  existing_results: ExistingCourseResult[];
}

/**
 * Calculate total = midterm + final (raw scores), then letter grade & GPA.
 * midterm_max + final_max = 100 by default (e.g. 40 + 60).
 */
function calc(midterm: number | null, final: number | null) {
  const mid = Number(midterm) || 0;
  const fin = Number(final) || 0;
  const total = Math.round((mid + fin) * 100) / 100;

  let grade: string, gradePoint: number;
  if (total >= 85) {
    grade = 'A';
    gradePoint = 4.0;
  } else if (total >= 70) {
    grade = 'B';
    gradePoint = 3.0;
  } else if (total >= 50) {
    grade = 'C';
    gradePoint = 2.0;
  } else if (total >= 40) {
    grade = 'D';
    gradePoint = 1.0;
  } else {
    grade = 'F';
    gradePoint = 0.0;
  }

  return { total: total || 0, grade, gradePoint };
}

@Component({
  selector: 'app-teacher-course-results',
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
          <span>Teacher</span> / <span class="text-emerald-400">Course Results</span>
        </div>

        <div class="mb-6">
          <h1 class="text-xl font-bold text-white">Course Results</h1>
          <p class="mt-0.5 text-sm text-slate-500">
            Select a group to enter midterm and final scores. Total and grade are auto-calculated.
          </p>
        </div>

        @if (loadingClasses()) {
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

        @if (!loadingClasses() && groups().length > 0) {
          <!-- Group selector only — no class selector needed -->
          <div class="mb-6 max-w-sm">
            <div class="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
              <label class="mb-2 block text-[11px] font-semibold tracking-wide text-slate-500">
                SELECT GROUP
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
          </div>

          <!-- Course info banner when a group is selected -->
          @if (courseInfo(); as info) {
            <div
              class="mb-4 flex items-center gap-3 rounded-xl border border-sky-800/40 bg-sky-900/20 px-4 py-3 text-sm"
            >
              <i class="fa-solid fa-book text-sky-400"></i>
              <span class="font-medium text-sky-300">{{ info.course_name }}</span>
              <span class="text-xs text-sky-600">({{ info.course_code }})</span>
              <span class="ml-auto text-xs text-slate-500"
                >Midterm max: <strong class="text-sky-400">{{ info.midterm_max }}</strong> &nbsp;
                Final max: <strong class="text-sky-400">{{ info.final_max }}</strong></span
              >
            </div>
          }

          <!-- Grade legend -->
          <div
            class="mb-4 flex flex-wrap gap-4 rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-2.5 text-xs text-slate-500"
          >
            <span
              ><span class="inline-block h-2 w-2 rounded bg-emerald-500 mr-1"></span>A (≥85)</span
            >
            <span><span class="inline-block h-2 w-2 rounded bg-sky-500 mr-1"></span>B (70–84)</span>
            <span
              ><span class="inline-block h-2 w-2 rounded bg-amber-500 mr-1"></span>C (50–69)</span
            >
            <span
              ><span class="inline-block h-2 w-2 rounded bg-orange-500 mr-1"></span>D (40–49)</span
            >
            <span><span class="inline-block h-2 w-2 rounded bg-red-500 mr-1"></span>F (<40)</span>
            <span class="text-slate-600">Formula: <strong>Total = Midterm + Final</strong></span>
          </div>

          @if (loadingStudents()) {
            <div
              class="flex h-40 items-center justify-center rounded-xl border border-slate-800 bg-slate-900/40 text-slate-500"
            >
              <i class="fa-solid fa-circle-notch fa-spin mr-2"></i> Loading students...
            </div>
          }

          @if (selectedGroupName() && !loadingStudents()) {
            <div class="rounded-xl border border-slate-800 bg-slate-900/40 overflow-hidden">
              <div class="max-h-[600px] overflow-auto custom-scrollbar">
                <table class="min-w-full text-left text-sm">
                  <thead class="sticky top-0 z-10 bg-slate-900">
                    <tr class="text-[10px] uppercase tracking-wider text-slate-600">
                      <th class="px-4 py-3 font-medium">#</th>
                      <th class="py-3 font-medium">Student</th>
                      <th class="py-3 font-medium">Code</th>
                      <th class="py-3 font-medium text-center">Midterm (40%)</th>
                      <th class="py-3 font-medium text-center">Final (60%)</th>
                      <th class="py-3 font-medium text-center">Total</th>
                      <th class="py-3 font-medium text-center">Grade</th>
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
                        <td class="py-3 text-center">
                          <div class="relative inline-block">
                            <input
                              type="number"
                              step="0.5"
                              min="0"
                              [max]="midtermMax()"
                              [value]="getMidterm(s.student_id)"
                              (input)="setMidterm(s.student_id, $any($event.target).value)"
                              class="w-20 rounded-lg border px-2 py-1.5 text-sm text-center text-slate-300 outline-none bg-slate-900/70"
                              [class.border-rose-700]="isOverMidterm(s.student_id)"
                              [class.border-slate-700]="!isOverMidterm(s.student_id)"
                              [class.focus:border-rose-500]="isOverMidterm(s.student_id)"
                              [class.focus:border-sky-500]="!isOverMidterm(s.student_id)"
                              placeholder="—"
                            />
                            @if (isOverMidterm(s.student_id)) {
                              <span
                                class="absolute -top-2 -right-1 text-[9px] text-rose-500 font-semibold"
                                >max {{ midtermMax() }}</span
                              >
                            }
                          </div>
                        </td>
                        <td class="py-3 text-center">
                          <div class="relative inline-block">
                            <input
                              type="number"
                              step="0.5"
                              min="0"
                              [max]="finalMax()"
                              [value]="getFinal(s.student_id)"
                              (input)="setFinal(s.student_id, $any($event.target).value)"
                              class="w-20 rounded-lg border px-2 py-1.5 text-sm text-center text-slate-300 outline-none bg-slate-900/70"
                              [class.border-rose-700]="isOverFinal(s.student_id)"
                              [class.border-slate-700]="!isOverFinal(s.student_id)"
                              [class.focus:border-rose-500]="isOverFinal(s.student_id)"
                              [class.focus:border-sky-500]="!isOverFinal(s.student_id)"
                              placeholder="—"
                            />
                            @if (isOverFinal(s.student_id)) {
                              <span
                                class="absolute -top-2 -right-1 text-[9px] text-rose-500 font-semibold"
                                >max {{ finalMax() }}</span
                              >
                            }
                          </div>
                        </td>
                        <td
                          class="py-3 text-center font-mono text-sm font-bold"
                          [class]="totalColor(s.student_id)"
                        >
                          {{ computedGrade(s.student_id).total }}
                        </td>
                        <td class="py-3 text-center">
                          <span
                            class="rounded-md px-2.5 py-0.5 text-xs font-bold"
                            [class]="gradeBadgeClass(s.student_id)"
                          >
                            {{ computedGrade(s.student_id).grade || '—' }}
                          </span>
                        </td>
                      </tr>
                    } @empty {
                      <tr>
                        <td colspan="7" class="px-4 py-16 text-center text-slate-600">
                          <i class="fa-solid fa-user-graduate mb-2 block text-lg"></i>
                          No enrolled students found for this group.
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
                    (click)="clearAll()"
                    class="rounded-lg border border-slate-700 px-4 py-1.5 text-xs font-medium text-slate-400 hover:border-slate-600"
                  >
                    Clear
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

          @if (!selectedGroupName()) {
            <div
              class="flex h-48 items-center justify-center rounded-xl border border-slate-800 bg-slate-900/40 text-slate-600"
            >
              <div class="text-center">
                <i class="fa-solid fa-square-check mb-2 block text-2xl"></i>
                <p class="text-sm">Select a group to start grading.</p>
              </div>
            </div>
          }
        }

        @if (!loadingClasses() && groups().length === 0 && !error()) {
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
export class TeacherCourseResultsComponent implements OnInit {
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

  // State
  private readonly _classes = signal<TeacherClass[]>([]);
  private readonly _loadingClasses = signal(false);
  private readonly _loadingStudents = signal(false);
  private readonly _saving = signal(false);
  private readonly _error = signal<string | null>(null);
  private readonly _gradeRecords = signal<EnrolledStudent[]>([]);

  private courseId = 0;
  readonly midtermMax = signal(40);
  readonly finalMax = signal(60);

  private courseName = '';
  private courseCode = '';

  readonly classes = this._classes.asReadonly();
  readonly loadingClasses = this._loadingClasses.asReadonly();
  readonly loadingStudents = this._loadingStudents.asReadonly();
  readonly saving = this._saving.asReadonly();
  readonly error = this._error.asReadonly();
  readonly gradeRecords = this._gradeRecords.asReadonly();

  private midtermMap = new Map<number, number | null>();
  private finalMap = new Map<number, number | null>();

  readonly selectedGroupName = signal<string | null>(null);

  readonly groups = computed<string[]>(() => {
    const names = new Set(
      this._classes()
        .filter((c) => c.group_name)
        .map((c) => c.group_name!),
    );
    return Array.from(names).sort();
  });

  readonly courseInfo = computed(() => {
    const g = this.selectedGroupName();
    if (!g) return null;
    const cls = this._classes().find((c) => c.group_name === g);
    if (!cls) return null;
    return {
      course_name: cls.course_name,
      course_code: cls.course_code,
      midterm_max: this.midtermMax(),
      final_max: this.finalMax(),
    };
  });

  getMidterm(studentId: number): number | null {
    return this.midtermMap.get(studentId) ?? null;
  }

  getFinal(studentId: number): number | null {
    return this.finalMap.get(studentId) ?? null;
  }

  setMidterm(studentId: number, value: string): void {
    const num = value === '' ? null : parseFloat(value);
    this.midtermMap.set(studentId, num === null || isNaN(num) ? null : num);
  }

  setFinal(studentId: number, value: string): void {
    const num = value === '' ? null : parseFloat(value);
    this.finalMap.set(studentId, num === null || isNaN(num) ? null : num);
  }

  isOverMidterm(studentId: number): boolean {
    const v = this.midtermMap.get(studentId);
    return v !== null && v !== undefined && v > this.midtermMax();
  }

  isOverFinal(studentId: number): boolean {
    const v = this.finalMap.get(studentId);
    return v !== null && v !== undefined && v > this.finalMax();
  }

  computedGrade(studentId: number): {
    total: number;
    grade: string | null;
    gradePoint: number | null;
  } {
    const mid = this.midtermMap.get(studentId) ?? null;
    const fin = this.finalMap.get(studentId) ?? null;
    if (mid === null && fin === null) return { total: 0, grade: null, gradePoint: null };
    return calc(mid, fin);
  }

  totalColor(studentId: number): string {
    const g = this.computedGrade(studentId).grade;
    switch (g) {
      case 'A':
        return 'text-emerald-400';
      case 'B':
        return 'text-sky-400';
      case 'C':
        return 'text-amber-400';
      case 'D':
        return 'text-orange-400';
      case 'F':
        return 'text-red-400';
      default:
        return 'text-slate-400';
    }
  }

  gradeBadgeClass(studentId: number): string {
    const g = this.computedGrade(studentId).grade;
    switch (g) {
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

  clearAll(): void {
    this.midtermMap.clear();
    this.finalMap.clear();
  }

  ngOnInit(): void {
    this.fetchClasses();
  }

  private fetchClasses(): void {
    this._loadingClasses.set(true);
    this._error.set(null);

    this.http
      .get<TeacherClass[]>(`${environment.apiUrl}/course-results/teacher/classes`)
      .pipe(
        catchError((err) => {
          this._error.set(err.error?.message || 'Failed to load classes.');
          this._loadingClasses.set(false);
          return of(null);
        }),
        tap((res) => {
          if (res && res.length > 0) {
            this._classes.set(res);
            const g = this.groups();
            if (g.length > 0) {
              this.selectedGroupName.set(g[0]);
              this.loadStudents(g[0]);
            }
          } else if (res) {
            this._classes.set([]);
          }
          this._loadingClasses.set(false);
        }),
      )
      .subscribe();
  }

  onGroupChange(): void {
    this._gradeRecords.set([]);
    this.midtermMap.clear();
    this.finalMap.clear();

    const g = this.selectedGroupName();
    if (g) this.loadStudents(g);
  }

  private loadStudents(groupName: string): void {
    this._loadingStudents.set(true);
    this._error.set(null);

    const encoded = encodeURIComponent(groupName);

    this.http
      .get<GroupStudentsResponse>(
        `${environment.apiUrl}/course-results/teacher/group/${encoded}/students`,
      )
      .pipe(
        catchError((err) => {
          this._error.set(err.error?.message || 'Failed to load students.');
          this._loadingStudents.set(false);
          return of(null);
        }),
        tap((res) => {
          if (res) {
            this.courseId = res.course_id;
            this.courseName = res.course_name;
            this.courseCode = res.course_code;
            this.midtermMax.set(res.midterm_max ?? 40);
            this.finalMax.set(res.final_max ?? 60);

            this._gradeRecords.set(res.students || []);

            this.midtermMap.clear();
            this.finalMap.clear();
            for (const r of res.existing_results || []) {
              this.midtermMap.set(r.student_id, r.midterm);
              this.finalMap.set(r.student_id, r.final);
            }
          }
          this._loadingStudents.set(false);
        }),
      )
      .subscribe();
  }

  submitGrades(): void {
    if (!this.courseId) return;

    this._saving.set(true);
    this._error.set(null);

    const records = this._gradeRecords().map((s) => ({
      student_id: s.student_id,
      midterm: this.midtermMap.get(s.student_id) ?? null,
      final: this.finalMap.get(s.student_id) ?? null,
    }));

    this.http
      .post<{ message: string; success_count: number; error_count: number }>(
        `${environment.apiUrl}/course-results/grade`,
        { course_id: this.courseId, records },
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
