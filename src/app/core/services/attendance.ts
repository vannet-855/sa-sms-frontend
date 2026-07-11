import { inject, Injectable, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import type {
  Attendance,
  AttendanceListResponse,
  AttendanceStats,
  BulkUpsertRecord,
  CreateAttendancePayload,
} from '../models/attendance';

const BASE = `${environment.apiUrl}/attendance`;

@Injectable({ providedIn: 'root' })
export class AttendanceService {
  private http = inject(HttpClient);

  private readonly _records = signal<Attendance[]>([]);
  private readonly _total = signal(0);
  private readonly _page = signal(1);
  private readonly _limit = signal(10);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);

  readonly records = this._records.asReadonly();
  readonly total = this._total.asReadonly();
  readonly page = this._page.asReadonly();
  readonly limit = this._limit.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  // Schedules dropdown
  private readonly _schedules = signal<
    Array<{ id: number; name: string; course_name: string; class_code: string }>
  >([]);
  readonly schedules = this._schedules.asReadonly();

  fetchAll(
    page = 1,
    limit = 10,
    search = '',
    scheduleId = '',
    status = '',
    dateFrom = '',
    dateTo = '',
  ) {
    this._loading.set(true);
    this._error.set(null);

    let params = new HttpParams().set('page', page.toString()).set('limit', limit.toString());

    if (search.trim()) params = params.set('search', search.trim());
    if (scheduleId) params = params.set('schedule_id', scheduleId);
    if (status) params = params.set('status', status);
    if (dateFrom) params = params.set('date_from', dateFrom);
    if (dateTo) params = params.set('date_to', dateTo);

    return this.http.get<AttendanceListResponse>(BASE, { params }).pipe(
      tap({
        next: (res) => {
          this._records.set(res.data ?? []);
          this._total.set(res.total ?? 0);
          this._page.set(res.page ?? page);
          this._limit.set(res.limit ?? limit);
          this._loading.set(false);
        },
        error: () => {
          this._error.set('Could not load attendance records.');
          this._loading.set(false);
        },
      }),
    );
  }

  /** Fetch schedules for filter dropdown */
  fetchSchedules() {
    return this.http.get<any[]>(`${environment.apiUrl}/schedules`).pipe(
      tap((arr) => {
        this._schedules.set(
          (arr ?? []).map((s) => ({
            id: s.schedule_id ?? s.id,
            name: `${s.day_of_week ?? ''} ${s.start_time ?? ''}-${s.end_time ?? ''}`.trim(),
            course_name: s.course_name ?? '',
            class_code: s.class_code ?? '',
          })),
        );
      }),
    );
  }

  goToPage(
    pageNumber: number,
    search = '',
    scheduleId = '',
    status = '',
    dateFrom = '',
    dateTo = '',
  ) {
    this.fetchAll(
      pageNumber,
      this._limit(),
      search,
      scheduleId,
      status,
      dateFrom,
      dateTo,
    ).subscribe();
  }

  /** Get attendance for a specific schedule + date (for taking attendance) */
  getByScheduleAndDate(scheduleId: number, date: string): Observable<Attendance[]> {
    return this.http.get<Attendance[]>(`${BASE}/schedule/${scheduleId}/date/${date}`);
  }

  /** Get enrolled students for a schedule's class (for taking attendance when no records exist yet) */
  fetchEnrolledStudents(scheduleId: number): Observable<any[]> {
    return this.http.get<any[]>(`${BASE}/schedule/${scheduleId}/students`);
  }

  /** Get attendance for a specific date */
  getByDate(date: string): Observable<Attendance[]> {
    return this.http.get<Attendance[]>(`${BASE}/date/${date}`);
  }

  /** Get attendance records for a specific student */
  getByStudent(studentId: number): Observable<Attendance[]> {
    return this.http.get<Attendance[]>(`${BASE}/student/${studentId}`);
  }

  /** Get attendance stats for a specific student */
  getStudentStats(studentId: number): Observable<AttendanceStats> {
    return this.http.get<AttendanceStats>(`${BASE}/stats/student/${studentId}`);
  }

  getById(id: number): Observable<Attendance> {
    return this.http.get<Attendance>(`${BASE}/${id}`);
  }

  create(payload: CreateAttendancePayload): Observable<any> {
    return this.http.post(BASE, payload);
  }

  /** Bulk upsert — attendance taking */
  bulkUpsert(records: BulkUpsertRecord[]): Observable<any> {
    return this.http.post(`${BASE}/bulk`, { records });
  }

  update(id: number, payload: Partial<CreateAttendancePayload>): Observable<any> {
    return this.http.put(`${BASE}/${id}`, payload);
  }

  delete(id: number): Observable<any> {
    return this.http.delete(`${BASE}/${id}`);
  }

  bulkDelete(ids: number[]): Observable<any> {
    return this.http.post(`${BASE}/bulk-delete`, { ids });
  }
}
