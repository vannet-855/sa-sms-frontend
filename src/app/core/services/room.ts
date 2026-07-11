import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CreateRoomPayload, Room } from '../models/room';

const BASE = `${environment.apiUrl}/rooms`;

@Injectable({ providedIn: 'root' })
export class RoomService {
  private http = inject(HttpClient);

  private readonly _rooms = signal<Room[]>([]);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);

  readonly rooms = this._rooms.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  fetchAll() {
    this._loading.set(true);
    this._error.set(null);

    return this.http.get<Room[]>(BASE).pipe(
      tap({
        next: (res) => {
          this._rooms.set(res ?? []);
          this._loading.set(false);
        },
        error: () => {
          this._error.set('Could not load rooms.');
          this._loading.set(false);
        },
      }),
    );
  }

  create(payload: CreateRoomPayload): Observable<any> {
    return this.http.post(BASE, payload);
  }

  update(id: number, payload: CreateRoomPayload): Observable<any> {
    return this.http.put(`${BASE}/${id}`, payload);
  }

  delete(id: number): Observable<any> {
    return this.http.delete(`${BASE}/${id}`);
  }
}
