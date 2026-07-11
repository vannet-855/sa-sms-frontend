import { inject, Injectable, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Course, CourseListResponse, CreateCoursePayload } from '../models/course';

const BASE = `${environment.apiUrl}/courses`;

@Injectable({ providedIn: 'root' })
export class CourseService {
  private http = inject(HttpClient);

  private readonly _courses = signal<Course[]>([]);
  private readonly _total = signal(0);
  private readonly _page = signal(1);
  private readonly _limit = signal(10);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);

  readonly courses = this._courses.asReadonly();
  readonly total = this._total.asReadonly();
  readonly page = this._page.asReadonly();
  readonly limit = this._limit.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  // Dropdown data
  private readonly _majors = signal<Array<{ id: number; name: string }>>([]);
  readonly majors = this._majors.asReadonly();

  fetchAll(page = 1, limit = 10, search = '', majorId = '') {
    this._loading.set(true);
    this._error.set(null);

    let params = new HttpParams().set('page', page.toString()).set('limit', limit.toString());

    if (search.trim()) params = params.set('search', search.trim());
    if (majorId) params = params.set('major_id', majorId);

    return this.http.get<CourseListResponse>(BASE, { params }).pipe(
      tap({
        next: (res) => {
          this._courses.set(res.data ?? []);
          this._total.set(res.total ?? 0);
          this._page.set(res.page ?? page);
          this._limit.set(res.limit ?? limit);
          this._loading.set(false);
        },
        error: () => {
          this._error.set('Could not load course list.');
          this._loading.set(false);
        },
      }),
    );
  }

  fetchDepartments() {
    this.http.get<any[]>(`${environment.apiUrl}/majors`).subscribe((arr) => {
      this._majors.set(
        (arr ?? []).map((d) => ({
          id: d.major_id ?? d.id,
          name: d.name ?? 'Unknown',
        })),
      );
    });
  }

  goToPage(pageNumber: number, search = '', majorId = '') {
    this.fetchAll(pageNumber, this._limit(), search, majorId).subscribe();
  }

  getById(id: number): Observable<Course> {
    return this.http.get<Course>(`${BASE}/${id}`);
  }

  create(payload: CreateCoursePayload): Observable<any> {
    return this.http.post(BASE, payload);
  }

  update(id: number, payload: Partial<CreateCoursePayload>): Observable<any> {
    return this.http.put(`${BASE}/${id}`, payload);
  }

  delete(id: number): Observable<any> {
    return this.http.delete(`${BASE}/${id}`);
  }

  bulkDelete(ids: number[]): Observable<any> {
    return this.http.post(`${BASE}/bulk-delete`, { ids });
  }
}
