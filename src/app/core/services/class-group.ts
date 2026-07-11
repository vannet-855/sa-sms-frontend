import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ClassGroup, CreateClassGroupPayload } from '../models/class-group';

const BASE = `${environment.apiUrl}/class-groups`;

@Injectable({ providedIn: 'root' })
export class ClassGroupService {
  private http = inject(HttpClient);

  private readonly _groups = signal<ClassGroup[]>([]);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);

  readonly groups = this._groups.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  fetchAll() {
    this._loading.set(true);
    this._error.set(null);

    return this.http.get<ClassGroup[]>(BASE).pipe(
      tap({
        next: (res) => {
          this._groups.set(res ?? []);
          this._loading.set(false);
        },
        error: () => {
          this._error.set('Could not load class groups.');
          this._loading.set(false);
        },
      }),
    );
  }

  create(payload: CreateClassGroupPayload): Observable<any> {
    return this.http.post(BASE, payload);
  }

  update(id: number, payload: CreateClassGroupPayload): Observable<any> {
    return this.http.put(`${BASE}/${id}`, payload);
  }

  delete(id: number): Observable<any> {
    return this.http.delete(`${BASE}/${id}`);
  }
}
