import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { SidebarComponent } from '../../../../shared/components/sidebar/sidebar';
import { TimeSlotService } from '../../../../core/services/timeSlot';
import { ShiftService } from '../../../../core/services/shift';
import { AuthService } from '../../../../core/services/auth';
import { ToastService } from '../../../../core/services/toast';
import { ADMIN_NAV_GROUPS } from '../../../../shared/models/nav';
import type { TimeSlot } from '../../../../core/models/time-slot';
import type { Shift } from '../../../../core/models/shift';

@Component({
  selector: 'app-time-slot-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, SidebarComponent],
  templateUrl: './time-slot-list.html',
})
export class TimeSlotListComponent implements OnInit {
  private timeSlotService = inject(TimeSlotService);
  private shiftService = inject(ShiftService);
  private auth = inject(AuthService);
  private fb = inject(FormBuilder);
  private toast = inject(ToastService);

  readonly navGroups = ADMIN_NAV_GROUPS;

  readonly loading = this.timeSlotService.loading;
  readonly error = this.timeSlotService.error;
  readonly timeSlots = this.timeSlotService.items;

  shifts: Shift[] = [];

  // Add modal
  readonly showAddModal = signal(false);
  readonly isSubmitting = signal(false);
  timeSlotForm!: FormGroup;

  // Edit modal
  readonly showEditModal = signal(false);
  readonly isUpdating = signal(false);
  readonly editTarget = signal<TimeSlot | null>(null);
  editForm!: FormGroup;

  // Delete modal
  readonly showDeleteModal = signal(false);
  readonly isDeleting = signal(false);
  readonly deleteTarget = signal<{ id: number; label: string } | null>(null);

  readonly sidebarUser = computed(() => {
    const u = this.auth.currentUser();
    return {
      initials: u?.initials ?? 'AD',
      name: u?.full_name ?? 'Admin',
      roleLabel: 'Administrator',
    };
  });

  ngOnInit(): void {
    this.timeSlotService.fetchAll().subscribe();
    this.shiftService.fetchAll().subscribe({
      next: (res) => {
        this.shifts = Array.isArray(res) ? res : [];
      },
    });
    this.initForm();
    this.initEditForm();
  }

  getShiftName(shiftId: number): string {
    const shift = this.shifts.find((s) => s.shift_id === shiftId);
    return shift?.shift_name ?? `Shift #${shiftId}`;
  }

  private toTimeInput(time: string | null | undefined): string {
    if (!time) return '';
    return time.substring(0, 5);
  }

  // --- Add ---

  initForm(): void {
    this.timeSlotForm = this.fb.group({
      shift_id: ['', Validators.required],
      period_label: ['', Validators.required],
      start_time: ['', Validators.required],
      end_time: ['', Validators.required],
    });
  }

  openAddModal(): void {
    this.timeSlotForm.reset({ shift_id: '', period_label: '', start_time: '', end_time: '' });
    this.showAddModal.set(true);
  }

  closeAddModal(): void {
    if (this.isSubmitting()) return;
    this.showAddModal.set(false);
  }

  onSubmitTimeSlot(): void {
    if (this.timeSlotForm.invalid) {
      this.timeSlotForm.markAllAsTouched();
      return;
    }

    const payload = {
      ...this.timeSlotForm.value,
      shift_id: Number(this.timeSlotForm.value.shift_id),
    };

    this.isSubmitting.set(true);
    this.timeSlotService.create(payload).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.closeAddModal();
        this.timeSlotService.fetchAll().subscribe();
        this.toast.success('Time slot added successfully!');
      },
      error: () => {
        this.isSubmitting.set(false);
        this.toast.error('Error saving data. Please check and try again!');
      },
    });
  }

  // --- Edit ---

  initEditForm(): void {
    this.editForm = this.fb.group({
      shift_id: ['', Validators.required],
      period_label: ['', Validators.required],
      start_time: ['', Validators.required],
      end_time: ['', Validators.required],
    });
  }

  openEditModal(ts: TimeSlot): void {
    this.editTarget.set(ts);
    this.editForm.patchValue({
      shift_id: ts.shift_id,
      period_label: ts.period_label,
      start_time: this.toTimeInput(ts.start_time),
      end_time: this.toTimeInput(ts.end_time),
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

    const payload = {
      ...this.editForm.value,
      shift_id: Number(this.editForm.value.shift_id),
    };

    this.isUpdating.set(true);
    this.timeSlotService.update(target.time_slot_id, payload).subscribe({
      next: () => {
        this.isUpdating.set(false);
        this.closeEditModal();
        this.timeSlotService.fetchAll().subscribe();
        this.toast.success('Time slot updated successfully!');
      },
      error: () => {
        this.isUpdating.set(false);
        this.toast.error('Error updating data. Please try again!');
      },
    });
  }

  // --- Delete ---

  openDeleteModal(id: number, label: string): void {
    this.deleteTarget.set({ id, label });
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
    this.timeSlotService.delete(target.id).subscribe({
      next: () => {
        this.isDeleting.set(false);
        this.closeDeleteModal();
        this.timeSlotService.fetchAll().subscribe();
        this.toast.success('Time slot deleted successfully!');
      },
      error: () => {
        this.isDeleting.set(false);
        this.toast.error('Cannot delete time slot. Please try again.');
      },
    });
  }
}
