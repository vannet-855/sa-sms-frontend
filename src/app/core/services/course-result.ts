import { inject, Injectable, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CourseResult, CreateCourseResultPayload } from '../models/course-result';

const BASE = `${environment.apiUrl}/course-results`;

@Injectable({ providedIn: 'root' })
export class CourseResultService {
  private http = inject(HttpClient);

  private readonly _results = signal<CourseResult[]>([]);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);

  readonly results = this._results.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  // Dropdown data
  private readonly _students = signal<Array<{ id: number; name: string; code: string }>>([]);
  readonly students = this._students.asReadonly();

  private readonly _courses = signal<Array<{ id: number; name: string }>>([]);
  readonly courses = this._courses.asReadonly();

  fetchAll() {
    this._loading.set(true);
    this._error.set(null);

    return this.http.get<CourseResult[]>(BASE).pipe(
      tap({
        next: (res) => {
          this._results.set(res ?? []);
          this._loading.set(false);
        },
        error: () => {
          this._error.set('Could not load course results.');
          this._loading.set(false);
        },
      }),
    );
  }

  /** Fetch students for dropdown */
  fetchStudents() {
    this.http
      .get<{ data: any[]; total: number }>(`${environment.apiUrl}/students`, {
        params: new HttpParams().set('limit', '1000'),
      })
      .subscribe((res) => {
        const arr = res?.data ?? [];
        this._students.set(
          arr.map((s: any) => ({
            id: s.student_id ?? s.id,
            name: `${s.first_name ?? ''} ${s.last_name ?? ''}`.trim() || 'Unknown',
            code: s.student_code ?? '',
          })),
        );
      });
  }

  /** Fetch courses for dropdown */
  fetchCourses() {
    this.http
      .get<{ data: any[]; total: number }>(`${environment.apiUrl}/courses`, {
        params: new HttpParams().set('limit', '1000'),
      })
      .subscribe((res) => {
        const arr = res?.data ?? [];
        this._courses.set(
          arr.map((c: any) => ({
            id: c.course_id ?? c.id,
            name: c.course_name ?? c.name ?? 'Unknown',
          })),
        );
      });
  }

  getById(id: number): Observable<CourseResult> {
    return this.http.get<CourseResult>(`${BASE}/${id}`);
  }

  getByStudent(studentId: number): Observable<CourseResult[]> {
    return this.http.get<CourseResult[]>(`${BASE}/student/${studentId}`);
  }

  getByCourse(courseId: number): Observable<CourseResult[]> {
    return this.http.get<CourseResult[]>(`${BASE}/course/${courseId}`);
  }

  create(payload: CreateCourseResultPayload): Observable<any> {
    return this.http.post(BASE, payload);
  }

  update(id: number, payload: CreateCourseResultPayload): Observable<any> {
    return this.http.put(`${BASE}/${id}`, payload);
  }

  delete(id: number): Observable<any> {
    return this.http.delete(`${BASE}/${id}`);
  }
}
