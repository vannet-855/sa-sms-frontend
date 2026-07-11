import { inject, Injectable, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CreateTeacherPayload, Teacher, TeacherListResponse } from '../models/teacher';

const BASE = `${environment.apiUrl}/teachers`;

@Injectable({ providedIn: 'root' })
export class TeacherService {
  private http = inject(HttpClient);

  private readonly _teachers = signal<Teacher[]>([]);
  private readonly _total = signal(0);
  private readonly _page = signal(1);
  private readonly _limit = signal(10);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);

  readonly teachers = this._teachers.asReadonly();
  readonly total = this._total.asReadonly();
  readonly page = this._page.asReadonly();
  readonly limit = this._limit.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  fetchAll(page = 1, limit = 10, search = '') {
    this._loading.set(true);
    this._error.set(null);

    let params = new HttpParams().set('page', page.toString()).set('limit', limit.toString());

    if (search.trim()) params = params.set('search', search.trim());

    return this.http.get<TeacherListResponse>(BASE, { params }).pipe(
      tap({
        next: (res) => {
          this._teachers.set(res.data ?? []);
          this._total.set(res.total ?? 0);
          this._page.set(res.page ?? page);
          this._limit.set(res.limit ?? limit);
          this._loading.set(false);
        },
        error: () => {
          this._error.set('Could not load teacher list.');
          this._loading.set(false);
        },
      }),
    );
  }

  goToPage(pageNumber: number, search = '') {
    this.fetchAll(pageNumber, this._limit(), search).subscribe();
  }

  getById(id: number): Observable<Teacher> {
    return this.http.get<Teacher>(`${BASE}/${id}`);
  }

  create(payload: CreateTeacherPayload): Observable<any> {
    return this.http.post(BASE, payload);
  }

  update(id: number, payload: Partial<CreateTeacherPayload>): Observable<any> {
    return this.http.put(`${BASE}/${id}`, payload);
  }

  delete(id: number): Observable<any> {
    return this.http.delete(`${BASE}/${id}`);
  }

  bulkDelete(ids: number[]): Observable<any> {
    return this.http.post(`${BASE}/bulk-delete`, { ids });
  }
}
