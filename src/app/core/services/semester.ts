import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Semester, CreateSemesterPayload } from '../models/semester';

const BASE = `${environment.apiUrl}/semesters`;

@Injectable({ providedIn: 'root' })
export class SemesterService {
  private http = inject(HttpClient);

  private readonly _items = signal<Semester[]>([]);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);

  readonly items = this._items.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  fetchAll() {
    this._loading.set(true);
    this._error.set(null);

    return this.http.get<Semester[]>(BASE).pipe(
      tap({
        next: (res) => {
          this._items.set(res ?? []);
          this._loading.set(false);
        },
        error: () => {
          this._error.set('Could not load semesters.');
          this._loading.set(false);
        },
      }),
    );
  }

  create(payload: CreateSemesterPayload): Observable<any> {
    return this.http.post(BASE, payload);
  }

  update(id: number, payload: CreateSemesterPayload): Observable<any> {
    return this.http.put(`${BASE}/${id}`, payload);
  }

  delete(id: number): Observable<any> {
    return this.http.delete(`${BASE}/${id}`);
  }
}
