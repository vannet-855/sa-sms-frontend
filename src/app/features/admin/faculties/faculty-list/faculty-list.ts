import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { SidebarComponent } from '../../../../shared/components/sidebar/sidebar';
import { FacultyService } from '../../../../core/services/faculty';
import { AuthService } from '../../../../core/services/auth';
import { ToastService } from '../../../../core/services/toast';
import { ADMIN_NAV_GROUPS } from '../../../../shared/models/nav';
import type { Faculty } from '../../../../core/models/faculty';

@Component({
  selector: 'app-faculty-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, SidebarComponent],
  templateUrl: './faculty-list.html',
})
export class FacultyListComponent implements OnInit {
  public facultyService = inject(FacultyService);
  private auth = inject(AuthService);
  private fb = inject(FormBuilder);
  private toast = inject(ToastService);

  readonly navGroups = ADMIN_NAV_GROUPS;

  readonly loading = this.facultyService.loading;
  readonly error = this.facultyService.error;
  readonly faculties = this.facultyService.faculties;

  // Add modal
  readonly showAddModal = signal(false);
  readonly isSubmitting = signal(false);
  facultyForm!: FormGroup;

  // Edit modal
  readonly showEditModal = signal(false);
  readonly isUpdating = signal(false);
  readonly editTarget = signal<Faculty | null>(null);
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
    this.facultyService.fetchAll().subscribe();
    this.initForm();
    this.initEditForm();
  }

  // --- Add ---

  initForm(): void {
    this.facultyForm = this.fb.group({
      faculty_name: ['', Validators.required],
    });
  }

  openAddModal(): void {
    this.facultyForm.reset();
    this.showAddModal.set(true);
  }

  closeAddModal(): void {
    if (this.isSubmitting()) return;
    this.showAddModal.set(false);
  }

  onSubmitFaculty(): void {
    if (this.facultyForm.invalid) {
      this.facultyForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.facultyService.create(this.facultyForm.value).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.closeAddModal();
        this.facultyService.fetchAll().subscribe();
        this.toast.success('Faculty added successfully!');
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
      faculty_name: ['', Validators.required],
    });
  }

  openEditModal(faculty: Faculty): void {
    this.editTarget.set(faculty);
    this.editForm.patchValue({
      faculty_name: faculty.faculty_name,
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
    this.facultyService.update(target.faculty_id, this.editForm.value).subscribe({
      next: () => {
        this.isUpdating.set(false);
        this.closeEditModal();
        this.facultyService.fetchAll().subscribe();
        this.toast.success('Faculty updated successfully!');
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
    this.facultyService.delete(target.id).subscribe({
      next: () => {
        this.isDeleting.set(false);
        this.closeDeleteModal();
        this.deleteTarget.set(null);
        this.facultyService.fetchAll().subscribe();
        this.toast.success('Faculty deleted successfully!');
      },
      error: () => {
        this.isDeleting.set(false);
        this.toast.error('Cannot delete faculty. Please try again.');
      },
    });
  }
}
