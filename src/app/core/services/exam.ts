import { inject, Injectable, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CreateExamPayload, Exam } from '../models/exam';

const BASE = `${environment.apiUrl}/exams`;

@Injectable({ providedIn: 'root' })
export class ExamService {
  private http = inject(HttpClient);

  private readonly _exams = signal<Exam[]>([]);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);

  readonly exams = this._exams.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  // Dropdown data
  private readonly _classGroups = signal<Array<{ id: number; name: string }>>([]);
  readonly classGroups = this._classGroups.asReadonly();

  private readonly _examTypes = signal<Array<{ id: number; name: string }>>([]);
  readonly examTypes = this._examTypes.asReadonly();

  fetchAll() {
    this._loading.set(true);
    this._error.set(null);

    return this.http.get<Exam[]>(BASE).pipe(
      tap({
        next: (res) => {
          this._exams.set(res ?? []);
          this._loading.set(false);
        },
        error: () => {
          this._error.set('Could not load exams.');
          this._loading.set(false);
        },
      }),
    );
  }

  /** Fetch class groups for the dropdown selector */
  fetchClassGroups() {
    this.http.get<any[]>(`${environment.apiUrl}/class-groups`).subscribe((arr) => {
      this._classGroups.set(
        (arr ?? []).map((g: any) => ({
          id: g.group_id,
          name: g.group_name || 'Group ' + g.group_id,
        })),
      );
    });
  }

  /** Fetch exam types for the dropdown selector */
  fetchExamTypes() {
    this.http.get<any[]>(`${environment.apiUrl}/exam-types`).subscribe((arr) => {
      this._examTypes.set(
        (arr ?? []).map((t: any) => ({
          id: t.exam_type_id ?? t.id,
          name: t.name ?? 'Unknown',
        })),
      );
    });
  }

  getById(id: number): Observable<Exam> {
    return this.http.get<Exam>(`${BASE}/${id}`);
  }

  getByClass(classId: number): Observable<Exam[]> {
    return this.http.get<Exam[]>(`${BASE}/class/${classId}`);
  }

  create(payload: CreateExamPayload): Observable<any> {
    return this.http.post(BASE, payload);
  }

  update(id: number, payload: CreateExamPayload): Observable<any> {
    return this.http.put(`${BASE}/${id}`, payload);
  }

  delete(id: number): Observable<any> {
    return this.http.delete(`${BASE}/${id}`);
  }
}
