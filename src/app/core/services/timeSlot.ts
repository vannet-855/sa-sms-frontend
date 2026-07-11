import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CreateTimeSlotPayload, TimeSlot } from '../models/time-slot';

const BASE = `${environment.apiUrl}/time-slots`;

@Injectable({ providedIn: 'root' })
export class TimeSlotService {
  private http = inject(HttpClient);

  private readonly _items = signal<TimeSlot[]>([]);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);

  readonly items = this._items.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  fetchAll(shiftId?: string) {
    this._loading.set(true);
    this._error.set(null);

    let url = BASE;
    if (shiftId) {
      url += `?shift_id=${shiftId}`;
    }

    return this.http.get<TimeSlot[]>(url).pipe(
      tap({
        next: (res) => {
          this._items.set(res ?? []);
          this._loading.set(false);
        },
        error: () => {
          this._error.set('Could not load time slots.');
          this._loading.set(false);
        },
      }),
    );
  }

  getByShift(shiftId: number): Observable<TimeSlot[]> {
    return this.http.get<TimeSlot[]>(`${BASE}/by-shift/${shiftId}`);
  }

  create(payload: CreateTimeSlotPayload): Observable<any> {
    return this.http.post(BASE, payload);
  }

  update(id: number, payload: Partial<CreateTimeSlotPayload>): Observable<any> {
    return this.http.put(`${BASE}/${id}`, payload);
  }

  delete(id: number): Observable<any> {
    return this.http.delete(`${BASE}/${id}`);
  }
}
