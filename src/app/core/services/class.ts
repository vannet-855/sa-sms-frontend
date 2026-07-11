import { inject, Injectable, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Class, ClassListResponse, CreateClassPayload } from '../models/class';

const BASE = `${environment.apiUrl}/classes`;

@Injectable({ providedIn: 'root' })
export class ClassService {
  private http = inject(HttpClient);

  private readonly _classes = signal<Class[]>([]);
  private readonly _total = signal(0);
  private readonly _page = signal(1);
  private readonly _limit = signal(10);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);

  readonly classes = this._classes.asReadonly();
  readonly total = this._total.asReadonly();
  readonly page = this._page.asReadonly();
  readonly limit = this._limit.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  // Dropdown data
  private readonly _courses = signal<Array<{ id: number; name: string }>>([]);
  readonly courses = this._courses.asReadonly();

  private readonly _teachers = signal<Array<{ id: number; name: string }>>([]);
  readonly teachers = this._teachers.asReadonly();

  private readonly _groups = signal<Array<{ id: number; name: string }>>([]);
  readonly groups = this._groups.asReadonly();

  private readonly _shifts = signal<Array<{ id: number; name: string }>>([]);
  readonly shifts = this._shifts.asReadonly();

  private readonly _semesters = signal<Array<{ id: number; name: string }>>([]);
  readonly semesters = this._semesters.asReadonly();

  private readonly _years = signal<Array<{ id: number; name: string }>>([]);
  readonly years = this._years.asReadonly();

  fetchAll(page = 1, limit = 10, search = '', courseId = '', teacherId = '') {
    this._loading.set(true);
    this._error.set(null);

    let params = new HttpParams().set('page', page.toString()).set('limit', limit.toString());

    if (search.trim()) params = params.set('search', search.trim());
    if (courseId) params = params.set('course_id', courseId);
    if (teacherId) params = params.set('teacher_id', teacherId);

    return this.http.get<ClassListResponse>(BASE, { params }).pipe(
      tap({
        next: (res) => {
          this._classes.set(res.data ?? []);
          this._total.set(res.total ?? 0);
          this._page.set(res.page ?? page);
          this._limit.set(res.limit ?? limit);
          this._loading.set(false);
        },
        error: () => {
          this._error.set('Could not load class list.');
          this._loading.set(false);
        },
      }),
    );
  }

  /** Fetch reference dropdown data */
  fetchDropdownData() {
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
    this.http
      .get<{ data: any[]; total: number }>(`${environment.apiUrl}/teachers`, {
        params: new HttpParams().set('limit', '1000'),
      })
      .subscribe((res) => {
        const arr = res?.data ?? [];
        this._teachers.set(
          arr.map((t: any) => ({
            id: t.teacher_id ?? t.id,
            name: t.full_name ?? t.name ?? 'Unknown',
          })),
        );
      });
    this.http.get<any[]>(`${environment.apiUrl}/class-groups`).subscribe((arr) => {
      this._groups.set(
        (arr ?? []).map((g) => ({
          id: g.group_id ?? g.id,
          name: g.group_name ?? g.name ?? 'Unknown',
        })),
      );
    });
    this.http.get<any[]>(`${environment.apiUrl}/shifts`).subscribe((arr) => {
      this._shifts.set(
        (arr ?? []).map((s) => ({
          id: s.shift_id ?? s.id,
          name: s.shift_name ?? s.name ?? 'Unknown',
        })),
      );
    });
    this.http.get<any[]>(`${environment.apiUrl}/semesters`).subscribe((arr) => {
      this._semesters.set(
        (arr ?? []).map((s) => ({
          id: s.semester_id ?? s.id,
          name: s.semester_name ?? s.name ?? 'Unknown',
        })),
      );
    });
    this.http.get<any[]>(`${environment.apiUrl}/academic-years`).subscribe((arr) => {
      this._years.set(
        (arr ?? []).map((y) => ({
          id: y.year_id ?? y.id,
          name: y.year_label ?? y.name ?? 'Unknown',
        })),
      );
    });
  }

  goToPage(pageNumber: number, search = '', courseId = '', teacherId = '') {
    this.fetchAll(pageNumber, this._limit(), search, courseId, teacherId).subscribe();
  }

  getById(id: number): Observable<Class> {
    return this.http.get<Class>(`${BASE}/${id}`);
  }

  create(payload: CreateClassPayload): Observable<any> {
    return this.http.post(BASE, payload);
  }

  update(id: number, payload: Partial<CreateClassPayload>): Observable<any> {
    return this.http.put(`${BASE}/${id}`, payload);
  }

  delete(id: number): Observable<any> {
    return this.http.delete(`${BASE}/${id}`);
  }

  bulkDelete(ids: number[]): Observable<any> {
    return this.http.post(`${BASE}/bulk-delete`, { ids });
  }
}
