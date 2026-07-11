import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { SidebarComponent } from '../../../../shared/components/sidebar/sidebar';
import { ScheduleService } from '../../../../core/services/schedule';
import { TimeSlotService } from '../../../../core/services/timeSlot';
import { AcademicYearService } from '../../../../core/services/academic-year';
import { SemesterService } from '../../../../core/services/semester';
import { AuthService } from '../../../../core/services/auth';
import { ToastService } from '../../../../core/services/toast';
import { ADMIN_NAV_GROUPS } from '../../../../shared/models/nav';
import type { Schedule } from '../../../../core/models/schedule';
import type { TimeSlot } from '../../../../core/models/time-slot';
import type { AcademicYear } from '../../../../core/models/academic-year';
import type { Semester } from '../../../../core/models/semester';
import type { TeacherAvailabilityResponse } from '../../../../core/models/teacher-availability';

@Component({
  selector: 'app-schedule-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, SidebarComponent],
  templateUrl: './schedule-list.html',
})
export class ScheduleListComponent implements OnInit {
  public scheduleService = inject(ScheduleService);
  public timeSlotService = inject(TimeSlotService);
  private yearService = inject(AcademicYearService);
  private semesterService = inject(SemesterService);
  private auth = inject(AuthService);
  private fb = inject(FormBuilder);
  private toast = inject(ToastService);

  readonly navGroups = ADMIN_NAV_GROUPS;

  readonly loading = this.scheduleService.loading;
  readonly error = this.scheduleService.error;
  readonly schedules = this.scheduleService.schedules;
  readonly classes = this.scheduleService.classes;
  readonly rooms = this.scheduleService.rooms;
  readonly days = this.scheduleService.DAYS;

  // Real time slots from DB
  readonly dbTimeSlots = this.timeSlotService.items;

  // Academic Year & Semester data
  readonly academicYears = this.yearService.items;
  readonly semesters = this.semesterService.items;

  // Filters
  readonly selectedDay = signal<string>('');
  readonly selectedClassId = signal<string>('');

  // ── Add Modal (cascading form) ──
  readonly showAddModal = signal(false);
  readonly isSubmitting = signal(false);
  scheduleForm!: FormGroup;

  // Cascading state
  readonly selectedYearId = signal<string>('');
  readonly selectedSemesterId = signal<string>('');
  readonly filteredSemesters = computed(() => {
    const yid = this.selectedYearId();
    if (!yid) return [];
    return this.semesters().filter((s) => s.year_id === Number(yid));
  });
  readonly filteredClasses = this.classes;

  // Teacher availability in the add form
  readonly selectedClassTeacherId = signal<number | null>(null);
  readonly selectedClassTeacherName = signal<string>('');
  readonly selectedClassCourseName = signal<string>('');
  readonly teacherAvailabilityStatus = signal<'idle' | 'available' | 'busy' | 'loading'>('idle');
  readonly teacherAvailabilityDetail = signal<string>('');

  // Room availability in the add form
  readonly selectedRoomName = signal<string>('');
  readonly roomAvailabilityStatus = signal<'idle' | 'available' | 'busy' | 'loading'>('idle');

  // Selected time slot
  readonly selectedTimeSlot = signal<TimeSlot | null>(null);

  // ── Edit Modal ──
  readonly showEditModal = signal(false);
  readonly isUpdating = signal(false);
  readonly editTarget = signal<Schedule | null>(null);
  editForm!: FormGroup;

  // ── Delete Modal ──
  readonly showDeleteModal = signal(false);
  readonly isDeleting = signal(false);
  readonly deleteTarget = signal<{ id: number; name: string } | null>(null);

  // ── Teacher Availability Panel ──
  readonly showAvailability = signal(false);
  readonly availabilityDay = signal<string>('');
  readonly availabilityData = signal<TeacherAvailabilityResponse | null>(null);
  readonly availabilityLoading = signal(false);
  readonly availabilityError = signal<string | null>(null);

  readonly sidebarUser = computed(() => {
    const u = this.auth.currentUser();
    return {
      initials: u?.initials ?? 'AD',
      name: u?.full_name ?? 'Admin',
      roleLabel: 'Administrator',
    };
  });

  readonly filteredSchedules = computed(() => {
    let list = this.schedules();
    const day = this.selectedDay();
    const clsId = this.selectedClassId();
    if (day) list = list.filter((s) => s.day_of_week === day);
    if (clsId) list = list.filter((s) => s.class_id === Number(clsId));
    return list;
  });

  ngOnInit(): void {
    this.scheduleService.fetchAll().subscribe();
    this.scheduleService.fetchClasses();
    this.scheduleService.fetchRooms();
    this.timeSlotService.fetchAll().subscribe();
    this.yearService.fetchAll().subscribe();
    this.semesterService.fetchAll().subscribe();
    this.initForm();
    this.initEditForm();
  }

  // ── Filters ──
  setDayFilter(day: string): void {
    this.selectedDay.set(day);
  }

  setClassFilter(classId: string): void {
    this.selectedClassId.set(classId);
  }

  clearFilters(): void {
    this.selectedDay.set('');
    this.selectedClassId.set('');
  }

  // ── Cascading: Year → Semester → Class ──

  onYearChange(yearId: string): void {
    this.selectedYearId.set(yearId);
    this.selectedSemesterId.set('');
    this.scheduleForm.patchValue({ class_id: null });
    this.resetTeacherDisplay();
    this.resetRoomDisplay();
  }

  onSemesterChange(semesterId: string): void {
    this.selectedSemesterId.set(semesterId);
    this.scheduleForm.patchValue({ class_id: null });
    this.scheduleService.fetchClasses(semesterId || undefined, this.selectedYearId() || undefined);
    this.resetTeacherDisplay();
    this.resetRoomDisplay();
  }

  onClassChange(classId: string): void {
    if (!classId) {
      this.resetTeacherDisplay();
      this.resetRoomDisplay();
      return;
    }
    // Extract teacher info from the selected class
    const cls = this.classes().find((c) => c.id === Number(classId));
    if (cls) {
      this.selectedClassTeacherId.set(cls.teacher_id ?? null);
      this.selectedClassTeacherName.set(cls.teacher_name ?? '');
      this.selectedClassCourseName.set(cls.course_name ?? '');
    } else {
      this.resetTeacherDisplay();
    }
    // Re-check teacher availability if day + time are already selected
    this.checkTeacherForCurrentSelection();
    this.checkRoomForCurrentSelection();
  }

  resetTeacherDisplay(): void {
    this.selectedClassTeacherId.set(null);
    this.selectedClassTeacherName.set('');
    this.selectedClassCourseName.set('');
    this.teacherAvailabilityStatus.set('idle');
    this.teacherAvailabilityDetail.set('');
  }

  resetRoomDisplay(): void {
    this.roomAvailabilityStatus.set('idle');
  }

  // ── Time Slot ──
  onTimeSlotChange(_event: Event): void {
    const val = this.scheduleForm.get('time_slot')?.value;
    if (val) {
      try {
        const parsed: TimeSlot = JSON.parse(val);
        this.selectedTimeSlot.set(parsed);
      } catch {
        this.selectedTimeSlot.set(null);
      }
    } else {
      this.selectedTimeSlot.set(null);
    }
    this.checkTeacherForCurrentSelection();
    this.checkRoomForCurrentSelection();
  }

  // ── Teacher Availability Check ──
  checkTeacherForCurrentSelection(): void {
    const teacherId = this.selectedClassTeacherId();
    const day = this.scheduleForm?.get('day_of_week')?.value;
    const slot = this.selectedTimeSlot();

    if (!teacherId || !day || !slot) {
      this.teacherAvailabilityStatus.set('idle');
      this.teacherAvailabilityDetail.set('');
      return;
    }

    this.teacherAvailabilityStatus.set('loading');
    this.scheduleService
      .checkTeacherAvailability(teacherId, day, slot.start_time, slot.end_time)
      .subscribe({
        next: (res) => {
          if (res.is_available) {
            this.teacherAvailabilityStatus.set('available');
            this.teacherAvailabilityDetail.set('✓ Free during this period');
          } else {
            this.teacherAvailabilityStatus.set('busy');
            const conflicts = res.conflicts
              .map((c) => `${c.course_name || 'Class'} @ ${c.start_time}-${c.end_time}`)
              .join(', ');
            this.teacherAvailabilityDetail.set(
              `✗ Has ${res.conflict_count} conflict(s): ${conflicts}`,
            );
          }
        },
        error: () => {
          this.teacherAvailabilityStatus.set('idle');
          this.teacherAvailabilityDetail.set('');
        },
      });
  }

  // ── Room Availability Check ──
  onRoomChange(roomRawName: string): void {
    this.selectedRoomName.set(roomRawName);
    this.checkRoomForCurrentSelection();
  }

  checkRoomForCurrentSelection(): void {
    const roomName = this.selectedRoomName();
    const day = this.scheduleForm?.get('day_of_week')?.value;
    const slot = this.selectedTimeSlot();

    if (!roomName || !day || !slot) {
      this.roomAvailabilityStatus.set('idle');
      return;
    }

    this.roomAvailabilityStatus.set('loading');
    this.scheduleService.getRoomAvailability(day, slot.start_time, slot.end_time).subscribe({
      next: (res) => {
        const found = res.rooms.find((r) => r.room_name === roomName);
        if (!found) {
          this.roomAvailabilityStatus.set('available');
        } else if (found.is_busy) {
          this.roomAvailabilityStatus.set('busy');
        } else {
          this.roomAvailabilityStatus.set('available');
        }
      },
      error: () => {
        this.roomAvailabilityStatus.set('idle');
      },
    });
  }

  // ── Day change triggers availability re-check ──
  onDayChange(): void {
    this.checkTeacherForCurrentSelection();
    this.checkRoomForCurrentSelection();
  }

  // ── Add Modal ──
  initForm(): void {
    this.scheduleForm = this.fb.group({
      year_id: [''],
      semester_id: [''],
      class_id: [null, Validators.required],
      day_of_week: ['', Validators.required],
      time_slot: ['', Validators.required],
      room: [''],
    });
  }

  openAddModal(): void {
    this.scheduleForm.reset();
    this.selectedYearId.set('');
    this.selectedSemesterId.set('');
    this.resetTeacherDisplay();
    this.resetRoomDisplay();
    this.selectedTimeSlot.set(null);
    this.selectedRoomName.set('');
    this.showAddModal.set(true);
  }

  closeAddModal(): void {
    if (this.isSubmitting()) return;
    this.showAddModal.set(false);
  }

  onSubmitSchedule(): void {
    if (this.scheduleForm.invalid) {
      this.scheduleForm.markAllAsTouched();
      return;
    }

    const raw = this.scheduleForm.value;
    let start_time = '';
    let end_time = '';

    // Parse time slot from JSON string
    if (raw.time_slot) {
      try {
        const slot: TimeSlot = JSON.parse(raw.time_slot);
        start_time = slot.start_time;
        end_time = slot.end_time;
      } catch {
        // fallback
        start_time = '';
        end_time = '';
      }
    }

    const payload = {
      class_id: raw.class_id,
      day_of_week: raw.day_of_week,
      start_time,
      end_time,
      room: raw.room || '',
    };

    this.isSubmitting.set(true);
    this.scheduleService.create(payload).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.closeAddModal();
        this.scheduleService.fetchAll().subscribe();
        this.toast.success('Schedule added successfully!');
      },
      error: () => {
        this.isSubmitting.set(false);
        this.toast.error('Error saving data. Please check and try again!');
      },
    });
  }

  // ── Edit Modal ──
  initEditForm(): void {
    this.editForm = this.fb.group({
      class_id: [null, Validators.required],
      day_of_week: ['', Validators.required],
      start_time: ['', Validators.required],
      end_time: ['', Validators.required],
      room: [''],
    });
  }

  openEditModal(schedule: Schedule): void {
    this.editTarget.set(schedule);
    this.editForm.patchValue({
      class_id: schedule.class_id,
      day_of_week: schedule.day_of_week,
      start_time: schedule.start_time,
      end_time: schedule.end_time,
      room: schedule.room || '',
    });
    this.showEditModal.set(true);
  }

  closeEditModal(): void {
    if (this.isUpdating()) return;
    this.showEditModal.set(false);
    this.editTarget.set(null);
  }

  onSubmitEdit(): void {
    if (this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      return;
    }

    const target = this.editTarget();
    if (!target) return;

    this.isUpdating.set(true);
    this.scheduleService.update(target.schedule_id, this.editForm.value).subscribe({
      next: () => {
        this.isUpdating.set(false);
        this.closeEditModal();
        this.scheduleService.fetchAll().subscribe();
        this.toast.success('Schedule updated successfully!');
      },
      error: () => {
        this.isUpdating.set(false);
        this.toast.error('Error updating data. Please try again!');
      },
    });
  }

  // ── Delete Modal ──
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
    this.scheduleService.delete(target.id).subscribe({
      next: () => {
        this.isDeleting.set(false);
        this.closeDeleteModal();
        this.deleteTarget.set(null);
        this.scheduleService.fetchAll().subscribe();
        this.toast.success(`Schedule deleted successfully!`);
      },
      error: () => {
        this.isDeleting.set(false);
        this.toast.error('Cannot delete schedule. Please try again.');
      },
    });
  }

  // ── Teacher Availability Panel ──
  toggleAvailability(day?: string): void {
    const current = this.showAvailability();
    if (current) {
      this.showAvailability.set(false);
      this.availabilityData.set(null);
      return;
    }
    this.showAvailability.set(true);
    if (day) this.availabilityDay.set(day);
    this.loadAvailability();
  }

  loadAvailability(): void {
    this.availabilityLoading.set(true);
    this.availabilityError.set(null);
    this.scheduleService.getTeacherAvailability(this.availabilityDay()).subscribe({
      next: (res) => {
        this.availabilityData.set(res);
        this.availabilityLoading.set(false);
      },
      error: () => {
        this.availabilityError.set('Failed to load teacher availability.');
        this.availabilityLoading.set(false);
      },
    });
  }

  setAvailabilityDay(day: string): void {
    this.availabilityDay.set(day);
    this.loadAvailability();
  }

  // ── Helpers ──
  classLabel(courseName: string | undefined, classCode: string | undefined): string {
    return [courseName, classCode].filter(Boolean).join(' - ');
  }

  dayColor(day: string): string {
    const colors: Record<string, string> = {
      Mon: 'bg-emerald-500/15 text-emerald-400',
      Tue: 'bg-sky-500/15 text-sky-400',
      Wed: 'bg-violet-500/15 text-violet-400',
      Thu: 'bg-amber-500/15 text-amber-400',
      Fri: 'bg-rose-500/15 text-rose-400',
      Sat: 'bg-cyan-500/15 text-cyan-400',
    };
    return colors[day] || 'bg-slate-500/15 text-slate-400';
  }

  timeSlotLabel(slot: TimeSlot): string {
    return `${slot.period_label} (${slot.start_time} - ${slot.end_time})`;
  }
}
