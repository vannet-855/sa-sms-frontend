import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, of, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AdminDashboardData } from '../models/admin-dashboard';

@Injectable({ providedIn: 'root' })
export class AdminDashboardService {
  private http = inject(HttpClient);

  private readonly _data = signal<AdminDashboardData | null>(null);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);

  readonly data = this._data.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  fetch() {
    this._loading.set(true);
    this._error.set(null);

    return this.http.get<AdminDashboardData>(`${environment.apiUrl}/dashboard/admin`).pipe(
      catchError((err) => {
        const msg =
          err.status === 0
            ? 'Could not connect to the server. Please check your network.'
            : err.error?.message || 'Could not load Dashboard data.';
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
