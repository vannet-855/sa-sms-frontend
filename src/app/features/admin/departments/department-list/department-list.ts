import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { SidebarComponent } from '../../../../shared/components/sidebar/sidebar';
import { DepartmentService } from '../../../../core/services/department';
import { AuthService } from '../../../../core/services/auth';
import { ToastService } from '../../../../core/services/toast';
import { ADMIN_NAV_GROUPS } from '../../../../shared/models/nav';
import type { Department } from '../../../../core/models/department';

@Component({
  selector: 'app-department-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, SidebarComponent],
  templateUrl: './department-list.html',
})
export class DepartmentListComponent implements OnInit {
  public departmentService = inject(DepartmentService);
  private auth = inject(AuthService);
  private fb = inject(FormBuilder);
  private toast = inject(ToastService);

  readonly navGroups = ADMIN_NAV_GROUPS;

  readonly loading = this.departmentService.loading;
  readonly error = this.departmentService.error;
  readonly departments = this.departmentService.departments;
  readonly faculties = this.departmentService.faculties;

  // Add modal
  readonly showAddModal = signal(false);
  readonly isSubmitting = signal(false);
  departmentForm!: FormGroup;

  // Edit modal
  readonly showEditModal = signal(false);
  readonly isUpdating = signal(false);
  readonly editTarget = signal<Department | null>(null);
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
    this.departmentService.fetchAll().subscribe();
    this.departmentService.fetchFaculties();
    this.initForm();
    this.initEditForm();
  }

  // --- Add ---

  initForm(): void {
    this.departmentForm = this.fb.group({
      faculty_id: [null, Validators.required],
      name: ['', Validators.required],
    });
  }

  openAddModal(): void {
    this.departmentForm.reset();
    this.showAddModal.set(true);
  }

  closeAddModal(): void {
    if (this.isSubmitting()) return;
    this.showAddModal.set(false);
  }

  onSubmitDepartment(): void {
    if (this.departmentForm.invalid) {
      this.departmentForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.departmentService.create(this.departmentForm.value).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.closeAddModal();
        this.departmentService.fetchAll().subscribe();
        this.toast.success('Department added successfully!');
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
      faculty_id: [null, Validators.required],
      name: ['', Validators.required],
    });
  }

  openEditModal(department: Department): void {
    this.editTarget.set(department);
    this.editForm.patchValue({
      faculty_id: department.faculty_id,
      name: department.name,
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
    this.departmentService.update(target.department_id, this.editForm.value).subscribe({
      next: () => {
        this.isUpdating.set(false);
        this.closeEditModal();
        this.departmentService.fetchAll().subscribe();
        this.toast.success('Department updated successfully!');
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
    this.departmentService.delete(target.id).subscribe({
      next: () => {
        this.isDeleting.set(false);
        this.closeDeleteModal();
        this.deleteTarget.set(null);
        this.departmentService.fetchAll().subscribe();
        this.toast.success('Department deleted successfully!');
      },
      error: () => {
        this.isDeleting.set(false);
        this.toast.error('Cannot delete department. Please try again.');
      },
    });
  }
}
