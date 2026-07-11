import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CreateShiftPayload, Shift } from '../models/shift';

const BASE = `${environment.apiUrl}/shifts`;

@Injectable({ providedIn: 'root' })
export class ShiftService {
  private http = inject(HttpClient);

  private readonly _shifts = signal<Shift[]>([]);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);

  readonly shifts = this._shifts.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  fetchAll() {
    this._loading.set(true);
    this._error.set(null);

    return this.http.get<Shift[]>(BASE).pipe(
      tap({
        next: (res) => {
          this._shifts.set(res ?? []);
          this._loading.set(false);
        },
        error: () => {
          this._error.set('Could not load shifts.');
          this._loading.set(false);
        },
      }),
    );
  }

  create(payload: CreateShiftPayload): Observable<any> {
    return this.http.post(BASE, payload);
  }

  update(id: number, payload: CreateShiftPayload): Observable<any> {
    return this.http.put(`${BASE}/${id}`, payload);
  }

  delete(id: number): Observable<any> {
    return this.http.delete(`${BASE}/${id}`);
  }
}
