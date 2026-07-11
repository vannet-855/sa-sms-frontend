import { inject, Injectable, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CreatePaymentPayload, Payment } from '../models/payment';

const BASE = `${environment.apiUrl}/payments`;

@Injectable({ providedIn: 'root' })
export class PaymentService {
  private http = inject(HttpClient);

  private readonly _payments = signal<Payment[]>([]);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);

  readonly payments = this._payments.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  // Dropdown data
  private readonly _students = signal<Array<{ id: number; name: string; code: string }>>([]);
  readonly students = this._students.asReadonly();

  private readonly _academicYears = signal<Array<{ id: number; name: string }>>([]);
  readonly academicYears = this._academicYears.asReadonly();

  private readonly _semesters = signal<Array<{ id: number; name: string }>>([]);
  readonly semesters = this._semesters.asReadonly();

  fetchAll() {
    this._loading.set(true);
    this._error.set(null);

    return this.http.get<Payment[]>(BASE).pipe(
      tap({
        next: (res) => {
          this._payments.set(res ?? []);
          this._loading.set(false);
        },
        error: () => {
          this._error.set('Could not load payments.');
          this._loading.set(false);
        },
      }),
    );
  }

  /** Lightweight search — returns id, name, phone, code, group */
  searchStudents(query: string) {
    return this.http
      .get<
        Array<{
          id: number;
          full_name: string;
          student_code: string;
          phone: string;
          group_name: string;
        }>
      >(`${environment.apiUrl}/students/search`, {
        params: new HttpParams().set('q', query).set('limit', '20'),
      })
      .pipe(
        tap((arr) => {
          this._students.set(
            arr.map((s) => ({
              id: s.id,
              name: s.full_name,
              code: s.student_code ?? '',
              phone: s.phone ?? '',
              groupName: s.group_name ?? '',
            })),
          );
        }),
      );
  }

  /** Fetch students for dropdown (full list - fallback) */
  fetchStudents() {
    this.http
      .get<{ data: any[]; total: number }>(`${environment.apiUrl}/students`, {
        params: new HttpParams().set('limit', '1000'),
      })
      .subscribe((res) => {
        const arr = res?.data ?? [];
        this._students.set(
          arr.map((s: any) => ({
            id: s.student_id ?? s.id,
            name: `${s.first_name ?? ''} ${s.last_name ?? ''}`.trim() || 'Unknown',
            code: s.student_code ?? '',
            phone: s.phone ?? '',
            groupName: s.group_name ?? '',
          })),
        );
      });
  }

  /** Fetch academic years for dropdown */
  fetchAcademicYears() {
    this.http.get<any[]>(`${environment.apiUrl}/academic-years`).subscribe((arr) => {
      this._academicYears.set(
        (arr ?? []).map((y: any) => ({
          id: y.year_id ?? y.id,
          name: y.year_label ?? y.name ?? 'Unknown',
        })),
      );
    });
  }

  /** Fetch class groups for filter dropdown */
  private readonly _groups = signal<Array<{ id: number; name: string }>>([]);
  readonly groups = this._groups.asReadonly();

  fetchGroups() {
    this.http.get<any[]>(`${environment.apiUrl}/class-groups`).subscribe((arr) => {
      this._groups.set(
        (arr ?? []).map((g: any) => ({
          id: g.group_id ?? g.id,
          name: g.group_name ?? g.name ?? 'Unknown',
        })),
      );
    });
  }

  /** Fetch semesters for dropdown */
  fetchSemesters() {
    this.http.get<any[]>(`${environment.apiUrl}/semesters`).subscribe((arr) => {
      this._semesters.set(
        (arr ?? []).map((s: any) => ({
          id: s.semester_id ?? s.id,
          name: s.semester_name ?? s.name ?? 'Unknown',
        })),
      );
    });
  }

  getById(id: number): Observable<Payment> {
    return this.http.get<Payment>(`${BASE}/${id}`);
  }

  getByStudent(studentId: number): Observable<Payment[]> {
    return this.http.get<Payment[]>(`${BASE}/student/${studentId}`);
  }

  create(payload: CreatePaymentPayload): Observable<any> {
    return this.http.post(BASE, payload);
  }

  update(id: number, payload: CreatePaymentPayload): Observable<any> {
    return this.http.put(`${BASE}/${id}`, payload);
  }

  delete(id: number): Observable<any> {
    return this.http.delete(`${BASE}/${id}`);
  }
}
