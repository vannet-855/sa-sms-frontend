import { inject, Injectable, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CreateEnrollmentPayload, Enrollment } from '../models/enrollment';

const BASE = `${environment.apiUrl}/enrollments`;

@Injectable({ providedIn: 'root' })
export class EnrollmentService {
  private http = inject(HttpClient);

  private readonly _enrollments = signal<Enrollment[]>([]);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);

  readonly enrollments = this._enrollments.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  // Dropdown data
  private readonly _groups = signal<Array<{ id: number; name: string }>>([]);
  readonly groups = this._groups.asReadonly();

  private readonly _classes = signal<Array<{ id: number; name: string }>>([]);
  readonly classes = this._classes.asReadonly();

  fetchAll() {
    this._loading.set(true);
    this._error.set(null);

    return this.http.get<Enrollment[]>(BASE).pipe(
      tap({
        next: (res) => {
          this._enrollments.set(res ?? []);
          this._loading.set(false);
        },
        error: () => {
          this._error.set('Could not load enrollments.');
          this._loading.set(false);
        },
      }),
    );
  }

  /** Fetch groups for the dropdown selector */
  fetchGroups() {
    this.http
      .get<Array<{ group_id: number; group_name: string }>>(`${environment.apiUrl}/class-groups`)
      .subscribe((arr) => {
        this._groups.set((arr ?? []).map((g) => ({ id: g.group_id, name: g.group_name })));
      });
  }

  /** Fetch classes for the dropdown selector */
  fetchClasses() {
    const params = new HttpParams().set('limit', '1000');
    this.http
      .get<{ data: any[]; total: number }>(`${environment.apiUrl}/classes`, { params })
      .subscribe((res) => {
        const arr = res?.data ?? [];
        this._classes.set(
          arr.map((c: any) => ({
            id: c.class_id ?? c.id,
            name:
              `${c.course_name || ''} ${c.class_code || ''} ${c.group_name || ''}`.trim() ||
              'Class ' + (c.class_id ?? c.id),
          })),
        );
      });
  }

  getById(id: number): Observable<Enrollment> {
    return this.http.get<Enrollment>(`${BASE}/${id}`);
  }

  getByGroup(groupId: number): Observable<Enrollment[]> {
    return this.http.get<Enrollment[]>(`${BASE}/group/${groupId}`);
  }

  getByClass(classId: number): Observable<Enrollment[]> {
    return this.http.get<Enrollment[]>(`${BASE}/class/${classId}`);
  }

  create(payload: CreateEnrollmentPayload): Observable<any> {
    return this.http.post(BASE, payload);
  }

  update(id: number, payload: CreateEnrollmentPayload): Observable<any> {
    return this.http.put(`${BASE}/${id}`, payload);
  }

  delete(id: number): Observable<any> {
    return this.http.delete(`${BASE}/${id}`);
  }

  getStudentsByGroupAndClass(
    groupId: number,
    classId: number,
  ): Observable<
    {
      student_id: number;
      student_code: string;
      first_name: string;
      last_name: string;
      gender: string;
      phone: string;
      status: string;
      enrollment_id: number;
    }[]
  > {
    return this.http.get<any[]>(`${BASE}/students/${groupId}/${classId}`);
  }

  /** Fetch all students belonging to a group (for preview before bulk enrollment) */
  getStudentsInGroup(groupId: number): Observable<
    {
      student_id: number;
      student_code: string;
      first_name: string;
      last_name: string;
      gender: string;
      phone: string;
      group_name?: string;
    }[]
  > {
    return this.http.get<any[]>(`${environment.apiUrl}/students`, {
      params: { group_id: groupId.toString(), limit: '1000' },
    });
  }

  /** Bulk enroll all students from a group into a class */
  bulkCreate(groupId: number, classId: number): Observable<any> {
    return this.http.post(`${BASE}/bulk`, { group_id: groupId, class_id: classId });
  }

  /** Bulk delete all enrollments for a group+class combination */
  bulkDelete(groupId: number, classId: number): Observable<any> {
    return this.http.delete(`${BASE}/bulk/${groupId}/${classId}`);
  }
}
