import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, of, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { TeacherDashboardData } from '../models/teacher-dashboard';

@Injectable({ providedIn: 'root' })
export class TeacherDashboardService {
  private http = inject(HttpClient);

  private readonly _data = signal<TeacherDashboardData | null>(null);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);

  readonly data = this._data.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  fetch() {
    this._loading.set(true);
    this._error.set(null);

    return this.http.get<TeacherDashboardData>(`${environment.apiUrl}/dashboard/teacher`).pipe(
      catchError((err) => {
        const msg =
          err.status === 0
            ? 'Cannot connect to server. Please check your network.'
            : err.error?.message || 'Failed to load teacher dashboard data.';
        this._error.set(msg);
        this._loading.set(false);
        return of(null);
      }),
      tap((res) => {
        if (res) {
          this._data.set(res);
        }
        this._loading.set(false);
      }),
    );
  }
}
