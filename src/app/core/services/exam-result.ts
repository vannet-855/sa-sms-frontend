import { inject, Injectable, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CreateExamResultPayload, ExamResult } from '../models/exam-result';

const BASE = `${environment.apiUrl}/exam-results`;

@Injectable({ providedIn: 'root' })
export class ExamResultService {
  private http = inject(HttpClient);

  private readonly _results = signal<ExamResult[]>([]);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);

  readonly results = this._results.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  // Dropdown data
  private readonly _exams = signal<Array<{ id: number; name: string }>>([]);
  readonly exams = this._exams.asReadonly();

  private readonly _classGroups = signal<Array<{ id: number; name: string }>>([]);
  readonly classGroups = this._classGroups.asReadonly();

  private readonly _students = signal<Array<{ id: number; name: string; code: string }>>([]);
  readonly students = this._students.asReadonly();

  // Student search results
  private readonly _studentSearchResults = signal<
    Array<{
      id: number;
      full_name: string;
      student_code: string;
      phone: string;
      group_name: string;
    }>
  >([]);
  readonly studentSearchResults = this._studentSearchResults.asReadonly();

  private readonly _searchingStudents = signal(false);
  readonly searchingStudents = this._searchingStudents.asReadonly();

  fetchAll() {
    this._loading.set(true);
    this._error.set(null);

    return this.http.get<ExamResult[]>(BASE).pipe(
      tap({
        next: (res) => {
          this._results.set(res ?? []);
          this._loading.set(false);
        },
        error: () => {
          this._error.set('Could not load exam results.');
          this._loading.set(false);
        },
      }),
    );
  }

  /** Fetch exams for the dropdown selector */
  fetchExams() {
    this.http
      .get<{ data: any[]; total: number }>(`${environment.apiUrl}/exams`, {
        params: new HttpParams().set('limit', '1000'),
      })
      .subscribe((res) => {
        const arr = Array.isArray(res) ? res : (res?.data ?? []);
        this._exams.set(
          arr.map((e: any) => ({
            id: e.exam_id ?? e.id,
            name: `${e.group_name || 'Group'} — ${e.exam_type_name || ''} (${e.exam_date ? e.exam_date.substring(0, 10) : ''})`.trim(),
          })),
        );
      });
  }

  /** Fetch class groups for the dropdown */
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

  /** Fetch students filtered by group */
  fetchStudentsByGroup(groupId: number) {
    if (!groupId) {
      this._students.set([]);
      return;
    }
    this.http
      .get<{ students?: any[] }>(`${environment.apiUrl}/exam-results/group/${groupId}/students`)
      .subscribe((res) => {
        const arr = Array.isArray(res) ? res : (res?.students ?? []);
        this._students.set(
          arr.map((s: any) => ({
            id: s.student_id ?? s.id,
            name: `${s.first_name ?? ''} ${s.last_name ?? ''}`.trim() || 'Unknown',
            code: s.student_code ?? '',
          })),
        );
      });
  }

  getById(id: number): Observable<ExamResult> {
    return this.http.get<ExamResult>(`${BASE}/${id}`);
  }

  getByStudent(studentId: number): Observable<ExamResult[]> {
    return this.http.get<ExamResult[]>(`${BASE}/student/${studentId}`);
  }

  getByExam(examId: number): Observable<ExamResult[]> {
    return this.http.get<ExamResult[]>(`${BASE}/exam/${examId}`);
  }

  create(payload: CreateExamResultPayload): Observable<any> {
    return this.http.post(BASE, payload);
  }

  /** Bulk create results for all students in a group for a given exam */
  createGroupResults(payload: {
    group_id: number;
    exam_id: number;
    score?: number | null;
  }): Observable<any> {
    return this.http.post(`${BASE}/group`, payload);
  }

  update(id: number, payload: CreateExamResultPayload): Observable<any> {
    return this.http.put(`${BASE}/${id}`, payload);
  }

  /** Search students by name or phone number, optionally filtered by group */
  searchStudents(query: string, groupId?: number | null) {
    if (!query || query.trim().length < 2) {
      this._studentSearchResults.set([]);
      return;
    }
    this._searchingStudents.set(true);
    let params = new HttpParams().set('q', query.trim()).set('limit', '15');
    if (groupId) {
      params = params.set('group_id', groupId.toString());
    }
    this.http.get<any[]>(`${environment.apiUrl}/students/search`, { params }).subscribe({
      next: (res) => {
        this._studentSearchResults.set(res ?? []);
        this._searchingStudents.set(false);
      },
      error: () => {
        this._studentSearchResults.set([]);
        this._searchingStudents.set(false);
      },
    });
  }

  delete(id: number): Observable<any> {
    return this.http.delete(`${BASE}/${id}`);
  }
}
