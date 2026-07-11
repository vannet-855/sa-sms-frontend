import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CreateDepartmentPayload, Department } from '../models/department';

const BASE = `${environment.apiUrl}/departments`;

@Injectable({ providedIn: 'root' })
export class DepartmentService {
  private http = inject(HttpClient);

  private readonly _departments = signal<Department[]>([]);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);

  readonly departments = this._departments.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  // Faculties for dropdown
  private readonly _faculties = signal<Array<{ id: number; name: string }>>([]);
  readonly faculties = this._faculties.asReadonly();

  fetchAll() {
    this._loading.set(true);
    this._error.set(null);

    return this.http.get<Department[]>(BASE).pipe(
      tap({
        next: (res) => {
          this._departments.set(res ?? []);
          this._loading.set(false);
        },
        error: () => {
          this._error.set('Could not load departments.');
          this._loading.set(false);
        },
      }),
    );
  }

  fetchFaculties() {
    this.http.get<any[]>(`${environment.apiUrl}/faculties`).subscribe((arr) => {
      this._faculties.set(
        (arr ?? []).map((f) => ({
          id: f.faculty_id ?? f.id,
          name: f.faculty_name ?? f.name ?? 'Unknown',
        })),
      );
    });
  }

  create(payload: CreateDepartmentPayload): Observable<any> {
    return this.http.post(BASE, payload);
  }

  update(id: number, payload: CreateDepartmentPayload): Observable<any> {
    return this.http.put(`${BASE}/${id}`, payload);
  }

  delete(id: number): Observable<any> {
    return this.http.delete(`${BASE}/${id}`);
  }
}
