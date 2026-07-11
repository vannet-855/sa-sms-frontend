import { inject, Injectable, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map, Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CreateStudentPayload, Student } from '../models/student';

export interface StudentListResponse {
  data: Student[];
  total: number;
  page: number;
  limit: number;
}

const BASE = `${environment.apiUrl}/students`;

@Injectable({ providedIn: 'root' })
export class StudentService {
  private http = inject(HttpClient);

  private readonly _students = signal<Student[]>([]);
  private readonly _total = signal(0);
  private readonly _page = signal(1);
  private readonly _limit = signal(10);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);

  readonly students = this._students.asReadonly();
  readonly total = this._total.asReadonly();
  readonly page = this._page.asReadonly();
  readonly limit = this._limit.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  private readonly _majors = signal<Array<{ id: number; name: string }>>([]);
  readonly majors = this._majors.asReadonly();

  private readonly _groups = signal<Array<{ id: number; name: string }>>([]);
  readonly groups = this._groups.asReadonly();

  fetchAll(page = 1, limit = 10, search = '', majorId = '', groupId = '') {
    this._loading.set(true);
    this._error.set(null);

    let params = new HttpParams().set('page', page.toString()).set('limit', limit.toString());

    if (search.trim()) params = params.set('search', search.trim());
    if (majorId) params = params.set('major_id', majorId);
    if (groupId) params = params.set('group_id', groupId);

    return this.http.get<StudentListResponse>(BASE, { params }).pipe(
      tap({
        next: (res) => {
          this._students.set(res.data ?? []);
          this._total.set(res.total ?? 0);
          this._page.set(res.page ?? page);
          this._limit.set(res.limit ?? limit);
          this._loading.set(false);
        },
        error: () => {
          this._error.set('Could not load student list.');
          this._loading.set(false);
        },
      }),
    );
  }

  /** GET /api/majors for filter dropdown */
  fetchMajors() {
    return this.http.get<any[]>(`${environment.apiUrl}/majors`).pipe(
      map((arr) => {
        if (!Array.isArray(arr)) return [];
        return arr.map((m) => ({
          id: m.major_id ?? m.id,
          name: m.name ?? m.major_name ?? 'Unknown',
        }));
      }),
      tap((result) => this._majors.set(result)),
    );
  }

  /** GET /api/class-groups for filter dropdown */
  fetchGroups() {
    return this.http.get<any[]>(`${environment.apiUrl}/class-groups`).pipe(
      map((arr) => {
        if (!Array.isArray(arr)) return [];
        return arr.map((g) => ({
          id: g.group_id ?? g.id,
          name: g.group_name ?? g.name ?? 'Unknown',
        }));
      }),
      tap((result) => this._groups.set(result)),
    );
  }

  goToPage(pageNumber: number, search = '', majorId = '', groupId = '') {
    this.fetchAll(pageNumber, this._limit(), search, majorId, groupId).subscribe();
  }

  getById(id: number): Observable<Student> {
    return this.http.get<Student>(`${BASE}/${id}`);
  }

  create(payload: CreateStudentPayload): Observable<any> {
    return this.http.post(BASE, payload);
  }

  update(id: number, payload: Partial<CreateStudentPayload>): Observable<any> {
    return this.http.put(`${BASE}/${id}`, payload);
  }

  delete(id: number): Observable<any> {
    return this.http.delete(`${BASE}/${id}`);
  }

  bulkDelete(ids: number[]): Observable<any> {
    return this.http.post(`${BASE}/bulk-delete`, { ids });
  }
}
