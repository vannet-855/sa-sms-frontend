import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { SidebarComponent } from '../../../../shared/components/sidebar/sidebar';
import { ShiftService } from '../../../../core/services/shift';
import { AuthService } from '../../../../core/services/auth';
import { ToastService } from '../../../../core/services/toast';
import { ADMIN_NAV_GROUPS } from '../../../../shared/models/nav';
import type { Shift } from '../../../../core/models/shift';

@Component({
  selector: 'app-shift-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, SidebarComponent],
  templateUrl: './shift-list.html',
})
export class ShiftListComponent implements OnInit {
  public shiftService = inject(ShiftService);
  private auth = inject(AuthService);
  private fb = inject(FormBuilder);
  private toast = inject(ToastService);

  readonly navGroups = ADMIN_NAV_GROUPS;

  readonly loading = this.shiftService.loading;
  readonly error = this.shiftService.error;
  readonly shifts = this.shiftService.shifts;

  readonly shiftNames = ['Morning', 'Afternoon', 'Evening'];

  // Add modal
  readonly showAddModal = signal(false);
  readonly isSubmitting = signal(false);
  shiftForm!: FormGroup;

  // Edit modal
  readonly showEditModal = signal(false);
  readonly isUpdating = signal(false);
  readonly editTarget = signal<Shift | null>(null);
  editForm!: FormGroup;

  // Delete modal
  readonly showDeleteModal = signal(false);
  readonly isDeleting = signal(false);
  readonly deleteTarget = signal<{ id: number; name: string } | null>(null);

  readonly sidebarUser = computed(() => {
    const u = this.auth.currentUser();
    return {
      initials: u?.initials ?? 'AD',
      name: u?.full_name ?? 'Admin',
      roleLabel: 'Administrator',
    };
  });

  ngOnInit(): void {
    this.shiftService.fetchAll().subscribe();
    this.initForm();
    this.initEditForm();
  }

  /** Format time to HH:MM for input[type=time] */
  private toTimeInput(time: string | null | undefined): string {
    if (!time) return '';
    return time.substring(0, 5);
  }

  // --- Add ---

  initForm(): void {
    this.shiftForm = this.fb.group({
      shift_name: ['Morning', Validators.required],
    });
  }

  openAddModal(): void {
    this.shiftForm.reset({ shift_name: 'Morning' });
    this.showAddModal.set(true);
  }

  closeAddModal(): void {
    if (this.isSubmitting()) return;
    this.showAddModal.set(false);
  }

  onSubmitShift(): void {
    if (this.shiftForm.invalid) {
      this.shiftForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.shiftService.create(this.shiftForm.value).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.closeAddModal();
        this.shiftService.fetchAll().subscribe();
        this.toast.success('Shift added successfully!');
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
      shift_name: ['Morning', Validators.required],
      start_time: ['', Validators.required],
      end_time: ['', Validators.required],
    });
  }

  openEditModal(shift: Shift): void {
    this.editTarget.set(shift);
    this.editForm.patchValue({
      shift_name: shift.shift_name,
      start_time: this.toTimeInput(shift.start_time),
      end_time: this.toTimeInput(shift.end_time),
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
    this.shiftService.update(target.shift_id, this.editForm.value).subscribe({
      next: () => {
        this.isUpdating.set(false);
        this.closeEditModal();
        this.shiftService.fetchAll().subscribe();
        this.toast.success('Shift updated successfully!');
      },
      error: () => {
        this.isUpdating.set(false);
        this.toast.error('Error updating data. Please try again!');
      },
    });
  }

  // --- Delete ---

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
    this.shiftService.delete(target.id).subscribe({
      next: () => {
        this.isDeleting.set(false);
        this.closeDeleteModal();
        this.deleteTarget.set(null);
        this.shiftService.fetchAll().subscribe();
        this.toast.success('Shift deleted successfully!');
      },
      error: () => {
        this.isDeleting.set(false);
        this.toast.error('Cannot delete shift. Please try again.');
      },
    });
  }
}
