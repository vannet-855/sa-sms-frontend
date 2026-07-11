import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, of, tap } from 'rxjs';
import { RouterLink } from '@angular/router';
import { SidebarComponent } from '../../../shared/components/sidebar/sidebar';
import { AuthService } from '../../../core/services/auth';
import { TEACHER_NAV_GROUPS } from '../../../shared/models/nav';
import { environment } from '../../../../environments/environment';

interface TeacherClass {
  class_id: number;
  class_code: string | null;
  course_id: number;
  course_code: string | null;
  course_name: string;
  group_name: string;
  shift_name: string | null;
  semester_name: string | null;
  year_label: string | null;
  student_count: number;
  status: string;
}

interface EnrolledStudent {
  student_id: number;
  student_code: string;
  first_name: string;
  last_name: string;
  gender: string;
  phone: string;
  status: string;
}

@Component({
  selector: 'app-teacher-classes',
  standalone: true,
  imports: [CommonModule, SidebarComponent, RouterLink],
  templateUrl: './teacher-classes.html',
})
export class TeacherClassesComponent implements OnInit {
  readonly TEACHER_NAV_GROUPS = TEACHER_NAV_GROUPS;
  private auth = inject(AuthService);
  private http = inject(HttpClient);

  readonly sidebarUser = computed(() => {
    const u = this.auth.currentUser();
    return {
      initials: u?.initials ?? 'TC',
      name: u?.full_name ?? 'Teacher',
      roleLabel: 'Teacher',
    };
  });

  private readonly _classes = signal<TeacherClass[]>([]);
  private readonly _total = signal(0);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);

  readonly classes = this._classes.asReadonly();
  readonly total = this._total.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  readonly searchTerm = signal('');

  // Students modal
  readonly showStudentsModal = signal(false);
  readonly studentsLoading = signal(false);
  readonly studentsError = signal<string | null>(null);
  readonly studentsList = signal<EnrolledStudent[]>([]);
  readonly studentsModalContext = signal<TeacherClass | null>(null);

  readonly filteredClasses = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    if (!term) return this._classes();
    return this._classes().filter(
      (c) =>
        c.course_name?.toLowerCase().includes(term) ||
        c.course_code?.toLowerCase().includes(term) ||
        c.group_name?.toLowerCase().includes(term) ||
        c.class_code?.toLowerCase().includes(term),
    );
  });

  ngOnInit(): void {
    this.fetchClasses();
  }

  private fetchClasses() {
    this._loading.set(true);
    this._error.set(null);

    this.http
      .get<{ data: TeacherClass[]; total: number }>(`${environment.apiUrl}/teachers/my-classes`)
      .pipe(
        catchError((err) => {
          this._error.set(err.error?.message || 'Failed to load your classes.');
          this._loading.set(false);
          return of(null);
        }),
        tap((res) => {
          if (res) {
            this._classes.set(res.data ?? []);
            this._total.set(res.total ?? 0);
          }
          this._loading.set(false);
        }),
      )
      .subscribe();
  }

  onSearch(value: string): void {
    this.searchTerm.set(value);
  }

  // ─── Students Modal ──────────────────────────────────────────

  openStudentsModal(cls: TeacherClass): void {
    this.studentsModalContext.set(cls);
    this.studentsList.set([]);
    this.studentsError.set(null);
    this.studentsLoading.set(true);
    this.showStudentsModal.set(true);

    this.http
      .get<EnrolledStudent[]>(
        `${environment.apiUrl}/enrollments/teacher/class/${cls.class_id}/students`,
      )
      .subscribe({
        next: (list) => {
          this.studentsList.set(list ?? []);
          this.studentsLoading.set(false);
        },
        error: () => {
          this.studentsError.set('Failed to load students.');
          this.studentsLoading.set(false);
        },
      });
  }

  closeStudentsModal(): void {
    this.showStudentsModal.set(false);
    this.studentsModalContext.set(null);
    this.studentsList.set([]);
    this.studentsError.set(null);
  }
}
