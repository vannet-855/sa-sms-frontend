import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ExamType, CreateExamTypePayload } from '../models/exam-type';

const BASE = `${environment.apiUrl}/exam-types`;

@Injectable({ providedIn: 'root' })
export class ExamTypeService {
  private http = inject(HttpClient);

  private readonly _items = signal<ExamType[]>([]);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);

  readonly items = this._items.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  fetchAll() {
    this._loading.set(true);
    this._error.set(null);

    return this.http.get<ExamType[]>(BASE).pipe(
      tap({
        next: (res) => {
          this._items.set(res ?? []);
          this._loading.set(false);
        },
        error: () => {
          this._error.set('Could not load exam types.');
          this._loading.set(false);
        },
      }),
    );
  }

  create(payload: CreateExamTypePayload): Observable<any> {
    return this.http.post(BASE, payload);
  }

  update(id: number, payload: CreateExamTypePayload): Observable<any> {
    return this.http.put(`${BASE}/${id}`, payload);
  }

  delete(id: number): Observable<any> {
    return this.http.delete(`${BASE}/${id}`);
  }
}
