import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AcademicYear, CreateAcademicYearPayload } from '../models/academic-year';

const BASE = `${environment.apiUrl}/academic-years`;

@Injectable({ providedIn: 'root' })
export class AcademicYearService {
  private http = inject(HttpClient);

  private readonly _items = signal<AcademicYear[]>([]);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);

  readonly items = this._items.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  fetchAll() {
    this._loading.set(true);
    this._error.set(null);

    return this.http.get<AcademicYear[]>(BASE).pipe(
      tap({
        next: (res) => {
          this._items.set(res ?? []);
          this._loading.set(false);
        },
        error: () => {
          this._error.set('Could not load academic years.');
          this._loading.set(false);
        },
      }),
    );
  }

  create(payload: CreateAcademicYearPayload): Observable<any> {
    return this.http.post(BASE, payload);
  }

  update(id: number, payload: CreateAcademicYearPayload): Observable<any> {
    return this.http.put(`${BASE}/${id}`, payload);
  }

  delete(id: number): Observable<any> {
    return this.http.delete(`${BASE}/${id}`);
  }
}
