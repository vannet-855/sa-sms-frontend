import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import {
  catchError,
  debounceTime,
  distinctUntilChanged,
  Observable,
  of,
  Subject,
  switchMap,
} from 'rxjs';
import { SidebarComponent } from '../../../../shared/components/sidebar/sidebar';
import { AttendanceService } from '../../../../core/services/attendance';
import { AuthService } from '../../../../core/services/auth';
import { PaymentService } from '../../../../core/services/payment';
import { ToastService } from '../../../../core/services/toast';
import { ADMIN_NAV_GROUPS } from '../../../../shared/models/nav';
import type { Attendance, AttendanceStatus } from '../../../../core/models/attendance';

@Component({
  selector: 'app-attendance-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, SidebarComponent],
  templateUrl: './attendance-list.html',
})
export class AttendanceListComponent implements OnInit {
  public attendanceService = inject(AttendanceService);
  private paymentService = inject(PaymentService);
  private auth = inject(AuthService);
  private fb = inject(FormBuilder);
  private toast = inject(ToastService);

  readonly navGroups = ADMIN_NAV_GROUPS;

  readonly loading = this.attendanceService.loading;
  readonly error = this.attendanceService.error;
  readonly records = this.attendanceService.records;
  readonly schedules = this.attendanceService.schedules;

  // Pagination
  readonly page = this.attendanceService.page;
  readonly limit = this.attendanceService.limit;
  readonly total = this.attendanceService.total;

  readonly searchTerm = signal('');
  readonly selectedScheduleId = signal<string>('');
  readonly selectedStatus = signal<string>('');
  readonly dateFrom = signal('');
  readonly dateTo = signal('');

  // Bulk selection
  readonly selectedIds = signal<Set<number>>(new Set());
  readonly isAllSelected = computed(() => {
    const filtered = this.filteredRecords();
    return filtered.length > 0 && filtered.every((r) => this.selectedIds().has(r.attendance_id));
  });
  readonly selectedCount = computed(() => this.selectedIds().size);

  // Bulk Delete modal
  readonly showBulkDeleteModal = signal(false);
  readonly isBulkDeleting = signal(false);

  // Delete modal
  readonly showDeleteModal = signal(false);
  readonly deleteTarget = signal<{ id: number; name: string } | null>(null);
  readonly isDeleting = signal(false);

  // Update modal
  readonly showUpdateModal = signal(false);
  readonly isUpdating = signal(false);
  readonly updateTarget = signal<Attendance | null>(null);
  updateForm!: FormGroup;

  // Take Attendance modal (bulk)
  readonly showTakeAttendanceModal = signal(false);
  readonly isSubmittingAttendance = signal(false);
  takeAttendanceForm!: FormGroup;
  readonly attendanceStudents = signal<
    Array<{
      student_id: number;
      student_full_name: string;
      student_code: string;
      status: AttendanceStatus;
      remark: string;
    }>
  >([]);

  // ─── Create Attendance (single record with student search) ───
  readonly showCreateModal = signal(false);
  readonly isCreating = signal(false);
  createForm!: FormGroup;

  // Student search in create modal — local + API
  readonly createSearchResults = signal<
    Array<{ id: number; name: string; code: string; phone: string; groupName: string }>
  >([]);
  readonly selectedCreateStudentId = signal<number | null>(null);
  readonly selectedCreateStudentName = signal<string | null>(null);
  private createSearchSubject = new Subject<string>();
  private readonly localStudents = signal<
    Array<{ id: number; name: string; code: string; phone: string; groupName: string }>
  >([]);

  readonly sidebarUser = computed(() => {
    const u = this.auth.currentUser();
    return {
      initials: u?.initials ?? 'AD',
      name: u?.full_name ?? 'Admin',
      roleLabel: 'Administrator',
    };
  });

  readonly totalPages = computed(() => Math.ceil(this.total() / this.limit()) || 1);

  readonly filteredRecords = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    if (!term) return this.records();
    return this.records().filter((r) => {
      return (
        r.student_full_name?.toLowerCase()?.includes(term) ||
        r.student_code?.toLowerCase()?.includes(term) ||
        r.course_name?.toLowerCase()?.includes(term)
      );
    });
  });

  readonly statusOptions: AttendanceStatus[] = ['Present', 'Absent', 'Late', 'Permission'];

  ngOnInit(): void {
    this.attendanceService.fetchAll().subscribe();
    this.attendanceService.fetchSchedules().subscribe();
    this.initUpdateForm();
    this.initTakeAttendanceForm();
    this.initCreateForm();

    // Load students locally (used by create modal search fallback)
    this.paymentService.fetchStudents();

    // Create modal: search local students immediately, then try API for more
    this.createSearchSubject.pipe(debounceTime(200), distinctUntilChanged()).subscribe((q) => {
      const trimmed = q.trim();
      if (!trimmed) {
        this.createSearchResults.set([]);
        return;
      }

      const ql = trimmed.toLowerCase();
      const local = this.paymentService.students().filter((s: any) => {
        const name = (s.name || '').toLowerCase();
        const code = (s.code || '').toLowerCase();
        const phone = ((s as any).phone || '').toLowerCase();
        const group = ((s as any).groupName || '').toLowerCase();
        return name.includes(ql) || code.includes(ql) || phone.includes(ql) || group.includes(ql);
      });

      // Show local results immediately
      if (local.length > 0) {
        this.createSearchResults.set(
          local.map((s: any) => ({
            id: s.id,
            name: s.name || 'Unknown',
            code: s.code ?? '',
            phone: (s as any).phone ?? '',
            groupName: (s as any).groupName ?? '',
          })),
        );
      } else {
        // No local match — try API
        this.paymentService.searchStudents(trimmed).subscribe({
          next: (apiResults) => {
            if (apiResults && apiResults.length > 0) {
              this.createSearchResults.set(
                apiResults.map((r: any) => ({
                  id: r.id,
                  name: r.full_name || r.name || 'Unknown',
                  code: r.student_code ?? r.code ?? '',
                  phone: r.phone ?? '',
                  groupName: r.group_name ?? r.groupName ?? '',
                })),
              );
            }
          },
        });
      }
    });
  }

  // ─── Filter / Search / Pagination ───

  onSearch(value: string): void {
    this.searchTerm.set(value);
    this.attendanceService
      .fetchAll(
        1,
        this.limit(),
        value,
        this.selectedScheduleId(),
        this.selectedStatus(),
        this.dateFrom(),
        this.dateTo(),
      )
      .subscribe();
  }

  setScheduleFilter(scheduleId: string): void {
    this.selectedScheduleId.set(scheduleId);
    this.attendanceService
      .fetchAll(
        1,
        this.limit(),
        this.searchTerm(),
        scheduleId,
        this.selectedStatus(),
        this.dateFrom(),
        this.dateTo(),
      )
      .subscribe();
  }

  setStatusFilter(status: string): void {
    this.selectedStatus.set(status);
    this.attendanceService
      .fetchAll(
        1,
        this.limit(),
        this.searchTerm(),
        this.selectedScheduleId(),
        status,
        this.dateFrom(),
        this.dateTo(),
      )
      .subscribe();
  }

  setDateFrom(date: string): void {
    this.dateFrom.set(date);
    this.attendanceService
      .fetchAll(
        1,
        this.limit(),
        this.searchTerm(),
        this.selectedScheduleId(),
        this.selectedStatus(),
        date,
        this.dateTo(),
      )
      .subscribe();
  }

  setDateTo(date: string): void {
    this.dateTo.set(date);
    this.attendanceService
      .fetchAll(
        1,
        this.limit(),
        this.searchTerm(),
        this.selectedScheduleId(),
        this.selectedStatus(),
        this.dateFrom(),
        date,
      )
      .subscribe();
  }

  onPageChange(pageNumber: number): void {
    if (pageNumber >= 1 && pageNumber <= this.totalPages() && !this.loading()) {
      this.attendanceService.goToPage(
        pageNumber,
        this.searchTerm(),
        this.selectedScheduleId(),
        this.selectedStatus(),
        this.dateFrom(),
        this.dateTo(),
      );
    }
  }

  initials(fullName: string): string {
    return fullName
      ?.split(' ')
      .map((p: string) => p[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }

  // ─── Create (with student search) ───

  initCreateForm(): void {
    this.createForm = this.fb.group({
      student_id: [null, Validators.required],
      schedule_id: [null, Validators.required],
      attendance_date: ['', Validators.required],
      status: ['Present', Validators.required],
      remark: [''],
    });
  }

  openCreateModal(): void {
    this.createForm.reset({ status: 'Present', remark: '' });
    this.selectedCreateStudentId.set(null);
    this.selectedCreateStudentName.set(null);
    this.createSearchResults.set([]);
    this.showCreateModal.set(true);
  }

  closeCreateModal(): void {
    if (this.isCreating()) return;
    this.showCreateModal.set(false);
    this.selectedCreateStudentId.set(null);
    this.selectedCreateStudentName.set(null);
    this.createSearchResults.set([]);
  }

  onCreateStudentSearch(value: string): void {
    this.createSearchSubject.next(value);
  }

  selectCreateStudent(id: number, name: string): void {
    this.selectedCreateStudentId.set(id);
    this.selectedCreateStudentName.set(name);
    this.createForm.patchValue({ student_id: id });
    this.createSearchResults.set([]);
  }

  onSubmitCreate(): void {
    if (this.createForm.invalid) {
      this.createForm.markAllAsTouched();
      return;
    }

    this.isCreating.set(true);

    const payload = {
      ...this.createForm.value,
      created_by: this.auth.currentUser()?.user_id || null,
    };

    this.attendanceService.create(payload).subscribe({
      next: () => {
        this.isCreating.set(false);
        this.closeCreateModal();
        this.attendanceService
          .fetchAll(
            1,
            this.limit(),
            this.searchTerm(),
            this.selectedScheduleId(),
            this.selectedStatus(),
            this.dateFrom(),
            this.dateTo(),
          )
          .subscribe();
        this.toast.success('Attendance record created successfully!');
      },
      error: (err) => {
        this.isCreating.set(false);
        this.toast.error(err?.error?.message || 'Could not create attendance record.');
      },
    });
  }

  // ─── Update ───

  initUpdateForm(): void {
    this.updateForm = this.fb.group({
      schedule_id: [null, Validators.required],
      student_id: [null, Validators.required],
      attendance_date: ['', Validators.required],
      status: ['Present', Validators.required],
      remark: [''],
    });
  }

  openUpdateModal(record: Attendance): void {
    this.updateTarget.set(record);
    this.updateForm.patchValue({
      schedule_id: record.schedule_id,
      student_id: record.student_id,
      attendance_date: record.attendance_date ? record.attendance_date.substring(0, 10) : '',
      status: record.status,
      remark: record.remark || '',
    });
    this.showUpdateModal.set(true);
  }

  closeUpdateModal(): void {
    if (this.isUpdating()) return;
    this.showUpdateModal.set(false);
    this.updateTarget.set(null);
  }

  onSubmitUpdate(): void {
    if (this.updateForm.invalid) {
      this.updateForm.markAllAsTouched();
      return;
    }

    const target = this.updateTarget();
    if (!target) return;

    this.isUpdating.set(true);

    this.attendanceService.update(target.attendance_id, this.updateForm.value).subscribe({
      next: () => {
        this.isUpdating.set(false);
        this.closeUpdateModal();
        this.attendanceService
          .fetchAll(
            1,
            this.limit(),
            this.searchTerm(),
            this.selectedScheduleId(),
            this.selectedStatus(),
            this.dateFrom(),
            this.dateTo(),
          )
          .subscribe();
        this.toast.success('Attendance record updated successfully!');
      },
      error: () => {
        this.isUpdating.set(false);
        this.toast.error('Could not update attendance record.');
      },
    });
  }

  // ─── Delete ───

  openDeleteModal(id: number, name: string): void {
    this.deleteTarget.set({ id, name });
    this.showDeleteModal.set(true);
  }

  closeDeleteModal(): void {
    if (this.isDeleting()) return;
    this.showDeleteModal.set(false);
    this.deleteTarget.set(null);
  }

  confirmDelete(): void {
    const target = this.deleteTarget();
    if (!target) return;

    this.isDeleting.set(true);
    this.attendanceService.delete(target.id).subscribe({
      next: () => {
        this.isDeleting.set(false);
        this.showDeleteModal.set(false);
        this.deleteTarget.set(null);
        this.attendanceService
          .fetchAll(
            1,
            this.limit(),
            this.searchTerm(),
            this.selectedScheduleId(),
            this.selectedStatus(),
            this.dateFrom(),
            this.dateTo(),
          )
          .subscribe();
        this.toast.success(`Attendance record deleted!`);
      },
      error: () => {
        this.isDeleting.set(false);
        this.toast.error('Could not delete record.');
      },
    });
  }

  // ─── Bulk Selection ───

  toggleSelectAll(): void {
    const filtered = this.filteredRecords();
    if (this.isAllSelected()) {
      this.selectedIds.set(new Set());
    } else {
      this.selectedIds.set(new Set(filtered.map((r) => r.attendance_id)));
    }
  }

  toggleSelect(id: number): void {
    const set = new Set(this.selectedIds());
    if (set.has(id)) {
      set.delete(id);
    } else {
      set.add(id);
    }
    this.selectedIds.set(set);
  }

  clearSelection(): void {
    this.selectedIds.set(new Set());
  }

  // ─── Bulk Delete ───

  openBulkDeleteModal(): void {
    this.showBulkDeleteModal.set(true);
  }

  closeBulkDeleteModal(): void {
    if (this.isBulkDeleting()) return;
    this.showBulkDeleteModal.set(false);
  }

  confirmBulkDelete(): void {
    const ids = Array.from(this.selectedIds());
    if (ids.length === 0) return;

    this.isBulkDeleting.set(true);
    this.attendanceService.bulkDelete(ids).subscribe({
      next: (res) => {
        this.isBulkDeleting.set(false);
        this.showBulkDeleteModal.set(false);
        this.clearSelection();
        this.attendanceService
          .fetchAll(
            1,
            this.limit(),
            this.searchTerm(),
            this.selectedScheduleId(),
            this.selectedStatus(),
            this.dateFrom(),
            this.dateTo(),
          )
          .subscribe();
        this.toast.success(res?.message || `Deleted ${ids.length} record(s)!`);
      },
      error: () => {
        this.isBulkDeleting.set(false);
        this.toast.error('Could not delete records.');
      },
    });
  }

  // ─── Take Attendance (Bulk) ───

  initTakeAttendanceForm(): void {
    this.takeAttendanceForm = this.fb.group({
      schedule_id: [null, Validators.required],
      attendance_date: ['', Validators.required],
      default_status: ['Present'],
    });
  }

  openTakeAttendanceModal(): void {
    this.takeAttendanceForm.reset({ default_status: 'Present' });
    this.attendanceStudents.set([]);
    this.showTakeAttendanceModal.set(true);
  }

  closeTakeAttendanceModal(): void {
    if (this.isSubmittingAttendance()) return;
    this.showTakeAttendanceModal.set(false);
    this.attendanceStudents.set([]);
  }

  /** Fetch students enrolled in the selected schedule and pre-fill status form */
  onScheduleSelected(): void {
    const scheduleId = this.takeAttendanceForm.get('schedule_id')?.value;
    const date = this.takeAttendanceForm.get('attendance_date')?.value;

    if (!scheduleId || !date) return;

    // First try fetching existing attendance records for this schedule+date
    this.attendanceService.getByScheduleAndDate(scheduleId, date).subscribe({
      next: (existingRecords) => {
        if (existingRecords.length > 0) {
          // Existing records found — load them for editing
          this.attendanceStudents.set(
            existingRecords.map((r) => ({
              student_id: r.student_id,
              student_full_name: r.student_full_name || '',
              student_code: r.student_code || '',
              status: r.status,
              remark: r.remark || '',
            })),
          );
        } else {
          // No records yet — clear list; user clicks "Load Enrolled Students" to populate
          this.attendanceStudents.set([]);
        }
      },
    });
  }

  /** Load enrolled students from the schedule's class (when no attendance exists yet) */
  loadEnrolledStudents(): void {
    const scheduleId = this.takeAttendanceForm.get('schedule_id')?.value;
    if (!scheduleId) {
      this.toast.warning('Please select a schedule first.');
      return;
    }

    this.attendanceService.fetchEnrolledStudents(scheduleId).subscribe({
      next: (students) => {
        const defaultStatus = this.takeAttendanceForm.get('default_status')?.value || 'Present';
        this.attendanceStudents.set(
          students.map((s: any) => ({
            student_id: s.student_id,
            student_full_name: s.student_full_name || '',
            student_code: s.student_code || '',
            status: defaultStatus as AttendanceStatus,
            remark: '',
          })),
        );
        this.toast.success(`Loaded ${students.length} enrolled student(s).`);
      },
      error: () => {
        this.toast.error('Could not load enrolled students.');
      },
    });
  }

  /** Set all students to the same status */
  setAllStatus(status: AttendanceStatus): void {
    this.attendanceStudents.update((students) => students.map((s) => ({ ...s, status })));
  }

  /** Remove a student from the attendance list */
  removeAttendanceStudent(index: number): void {
    this.attendanceStudents.update((students) => students.filter((_, i) => i !== index));
  }

  /** Submit all attendance records */
  onSubmitAttendance(): void {
    if (this.takeAttendanceForm.invalid) {
      this.takeAttendanceForm.markAllAsTouched();
      return;
    }

    if (this.attendanceStudents().length === 0) {
      this.toast.warning('No students in the list. Please fetch students first.');
      return;
    }

    const { schedule_id, attendance_date } = this.takeAttendanceForm.value;
    const createdBy = this.auth.currentUser()?.user_id || null;

    const records = this.attendanceStudents().map((s) => ({
      schedule_id,
      student_id: s.student_id,
      attendance_date,
      status: s.status,
      remark: s.remark || undefined,
      created_by: createdBy,
    }));

    this.isSubmittingAttendance.set(true);

    this.attendanceService.bulkUpsert(records).subscribe({
      next: (res) => {
        this.isSubmittingAttendance.set(false);
        this.closeTakeAttendanceModal();
        this.attendanceService
          .fetchAll(
            1,
            this.limit(),
            this.searchTerm(),
            this.selectedScheduleId(),
            this.selectedStatus(),
            this.dateFrom(),
            this.dateTo(),
          )
          .subscribe();
        this.toast.success(res?.message || 'Attendance saved successfully!');
      },
      error: () => {
        this.isSubmittingAttendance.set(false);
        this.toast.error('Could not save attendance records.');
      },
    });
  }

  statusClass(status: string): string {
    switch (status) {
      case 'Present':
        return 'bg-emerald-500/15 text-emerald-400';
      case 'Absent':
        return 'bg-red-500/15 text-red-400';
      case 'Late':
        return 'bg-amber-500/15 text-amber-400';
      case 'Permission':
        return 'bg-sky-500/15 text-sky-400';
      default:
        return 'bg-slate-500/15 text-slate-400';
    }
  }
}
