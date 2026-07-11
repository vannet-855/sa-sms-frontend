import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CreateMajorPayload, Major } from '../models/major';

const BASE = `${environment.apiUrl}/majors`;

@Injectable({ providedIn: 'root' })
export class MajorService {
  private http = inject(HttpClient);

  private readonly _majors = signal<Major[]>([]);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);

  readonly majors = this._majors.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  // Departments for dropdown
  private readonly _departments = signal<Array<{ id: number; name: string }>>([]);
  readonly departments = this._departments.asReadonly();

  fetchAll() {
    this._loading.set(true);
    this._error.set(null);

    return this.http.get<Major[]>(BASE).pipe(
      tap({
        next: (res) => {
          this._majors.set(res ?? []);
          this._loading.set(false);
        },
        error: () => {
          this._error.set('Could not load majors.');
          this._loading.set(false);
        },
      }),
    );
  }

  fetchDepartments() {
    this.http.get<any[]>(`${environment.apiUrl}/departments`).subscribe((arr) => {
      this._departments.set(
        (arr ?? []).map((d) => ({
          id: d.department_id ?? d.id,
          name: d.name ?? 'Unknown',
        })),
      );
    });
  }

  create(payload: CreateMajorPayload): Observable<any> {
    return this.http.post(BASE, payload);
  }

  update(id: number, payload: CreateMajorPayload): Observable<any> {
    return this.http.put(`${BASE}/${id}`, payload);
  }

  delete(id: number): Observable<any> {
    return this.http.delete(`${BASE}/${id}`);
  }
}
