import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CreateSchedulePayload, Schedule } from '../models/schedule';
import {
  TeacherAvailabilityResponse,
  CheckTeacherResponse,
  RoomAvailabilityResponse,
} from '../models/teacher-availability';

const BASE = `${environment.apiUrl}/schedules`;

/** Predefined school periods */
export interface TimeSlot {
  label: string;
  start_time: string;
  end_time: string;
}

@Injectable({ providedIn: 'root' })
export class ScheduleService {
  private http = inject(HttpClient);

  private readonly _schedules = signal<Schedule[]>([]);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);

  readonly schedules = this._schedules.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  // Dropdown data
  private readonly _classes = signal<
    Array<{
      id: number;
      name: string;
      teacher_id?: number;
      course_name?: string;
      teacher_name?: string;
    }>
  >([]);
  readonly classes = this._classes.asReadonly();

  private readonly _rooms = signal<Array<{ id: number; name: string; raw_name: string }>>([]);
  readonly rooms = this._rooms.asReadonly();

  readonly DAYS: string[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  readonly TIME_SLOTS: TimeSlot[] = [
    { label: 'Period 1 (07:00 - 08:00)', start_time: '07:00', end_time: '08:00' },
    { label: 'Period 2 (08:00 - 09:00)', start_time: '08:00', end_time: '09:00' },
    { label: 'Period 3 (09:00 - 10:00)', start_time: '09:00', end_time: '10:00' },
    { label: 'Period 4 (10:00 - 11:00)', start_time: '10:00', end_time: '11:00' },
    { label: 'Period 5 (11:00 - 12:00)', start_time: '11:00', end_time: '12:00' },
    { label: 'Period 6 (13:00 - 14:00)', start_time: '13:00', end_time: '14:00' },
    { label: 'Period 7 (14:00 - 15:00)', start_time: '14:00', end_time: '15:00' },
    { label: 'Period 8 (15:00 - 16:00)', start_time: '15:00', end_time: '16:00' },
    { label: 'Period 9 (16:00 - 17:00)', start_time: '16:00', end_time: '17:00' },
  ];

  fetchAll() {
    this._loading.set(true);
    this._error.set(null);

    return this.http.get<Schedule[]>(BASE).pipe(
      tap({
        next: (res) => {
          this._schedules.set(res ?? []);
          this._loading.set(false);
        },
        error: () => {
          this._error.set('Could not load schedules.');
          this._loading.set(false);
        },
      }),
    );
  }

  /** Fetch classes for the dropdown selector, optionally filtered */
  fetchClasses(semesterId?: string, yearId?: string) {
    const params: any = { limit: '1000' };
    if (semesterId) params.semester_id = semesterId;
    if (yearId) params.year_id = yearId;

    this.http
      .get<{ data: any[]; total: number }>(`${environment.apiUrl}/classes`, { params })
      .subscribe((res) => {
        const arr = res?.data ?? [];
        this._classes.set(
          arr.map((c: any) => ({
            id: c.class_id ?? c.id,
            name:
              [
                c.course_name || '',
                c.group_name ? `· ${c.group_name}` : '',
                `(${c.class_code || ''})`,
              ]
                .filter(Boolean)
                .join(' ')
                .trim() || 'Class ' + (c.class_id ?? c.id),
            teacher_id: c.teacher_id,
            course_name: c.course_name,
            teacher_name: c.teacher_name,
          })),
        );
      });
  }

  /** Fetch rooms for the dropdown selector */
  fetchRooms() {
    this.http.get<any[]>(`${environment.apiUrl}/rooms`).subscribe((res) => {
      const arr = res ?? [];
      this._rooms.set(
        arr.map((r: any) => ({
          id: r.room_id ?? r.id,
          raw_name: r.room_name,
          name:
            r.room_name +
            (r.building ? ` · ${r.building}${r.floor ? ` F${r.floor}` : ''}` : '') +
            (r.capacity ? ` (${r.capacity} seats)` : ''),
        })),
      );
    });
  }

  getByClass(classId: number): Observable<Schedule[]> {
    return this.http.get<Schedule[]>(`${BASE}/class/${classId}`);
  }

  getByDay(day: string): Observable<Schedule[]> {
    return this.http.get<Schedule[]>(`${BASE}/day/${day}`);
  }

  getById(id: number): Observable<Schedule> {
    return this.http.get<Schedule>(`${BASE}/${id}`);
  }

  create(payload: CreateSchedulePayload): Observable<any> {
    return this.http.post(BASE, payload);
  }

  update(id: number, payload: CreateSchedulePayload): Observable<any> {
    return this.http.put(`${BASE}/${id}`, payload);
  }

  delete(id: number): Observable<any> {
    return this.http.delete(`${BASE}/${id}`);
  }

  // ── Teacher Availability ──
  getTeacherAvailability(
    day: string,
    startTime?: string,
    endTime?: string,
  ): Observable<TeacherAvailabilityResponse> {
    let params = new URLSearchParams();
    params.set('day', day);
    if (startTime) params.set('start_time', startTime);
    if (endTime) params.set('end_time', endTime);
    return this.http.get<TeacherAvailabilityResponse>(
      `${BASE}/teacher-availability?${params.toString()}`,
    );
  }

  /** Check if a specific teacher is free in a time window */
  checkTeacherAvailability(
    teacherId: number,
    day: string,
    startTime?: string,
    endTime?: string,
  ): Observable<CheckTeacherResponse> {
    let params = new URLSearchParams();
    params.set('teacher_id', String(teacherId));
    params.set('day', day);
    if (startTime) params.set('start_time', startTime);
    if (endTime) params.set('end_time', endTime);
    return this.http.get<CheckTeacherResponse>(`${BASE}/check-teacher?${params.toString()}`);
  }

  // ── Room Availability ──
  getRoomAvailability(
    day: string,
    startTime?: string,
    endTime?: string,
  ): Observable<RoomAvailabilityResponse> {
    let params = new URLSearchParams();
    params.set('day', day);
    if (startTime) params.set('start_time', startTime);
    if (endTime) params.set('end_time', endTime);
    return this.http.get<RoomAvailabilityResponse>(
      `${environment.apiUrl}/rooms/availability?${params.toString()}`,
    );
  }
}
