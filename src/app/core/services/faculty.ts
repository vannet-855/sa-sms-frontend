import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CreateFacultyPayload, Faculty } from '../models/faculty';

const BASE = `${environment.apiUrl}/faculties`;

@Injectable({ providedIn: 'root' })
export class FacultyService {
  private http = inject(HttpClient);

  private readonly _faculties = signal<Faculty[]>([]);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);

  readonly faculties = this._faculties.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  fetchAll() {
    this._loading.set(true);
    this._error.set(null);

    return this.http.get<Faculty[]>(BASE).pipe(
      tap({
        next: (res) => {
          this._faculties.set(res ?? []);
          this._loading.set(false);
        },
        error: () => {
          this._error.set('Could not load faculties.');
          this._loading.set(false);
        },
      }),
    );
  }

  create(payload: CreateFacultyPayload): Observable<any> {
    return this.http.post(BASE, payload);
  }

  update(id: number, payload: CreateFacultyPayload): Observable<any> {
    return this.http.put(`${BASE}/${id}`, payload);
  }

  delete(id: number): Observable<any> {
    return this.http.delete(`${BASE}/${id}`);
  }
}
