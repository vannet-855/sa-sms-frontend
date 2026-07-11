import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { SidebarComponent } from '../../../../shared/components/sidebar/sidebar';
import { UserService } from '../../../../core/services/user';
import { AuthService } from '../../../../core/services/auth';
import { ToastService } from '../../../../core/services/toast';
import { ADMIN_NAV_GROUPS } from '../../../../shared/models/nav';
import type { SystemUser } from '../../../../core/models/user';

interface RoleOption {
  id: number;
  name: string;
}

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, SidebarComponent],
  templateUrl: './user-list.html',
})
export class UserListComponent implements OnInit {
  public service = inject(UserService);
  private auth = inject(AuthService);
  private fb = inject(FormBuilder);
  private toast = inject(ToastService);

  readonly navGroups = ADMIN_NAV_GROUPS;

  readonly loading = this.service.loading;
  readonly error = this.service.error;
  readonly items = this.service.items;

  readonly roles: RoleOption[] = [
    { id: 1, name: 'Admin' },
    { id: 2, name: 'Teacher' },
    { id: 3, name: 'Student' },
  ];

  // Password visibility
  readonly showPassword = signal(false);
  readonly showEditPassword = signal(false);

  // Add modal
  readonly showAddModal = signal(false);
  readonly isSubmitting = signal(false);
  addForm!: FormGroup;

  // Edit modal
  readonly showEditModal = signal(false);
  readonly isUpdating = signal(false);
  readonly editTarget = signal<SystemUser | null>(null);
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
    this.service.fetchAll().subscribe();
    this.initForm();
    this.initEditForm();
  }

  // --- Add ---

  initForm(): void {
    this.addForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      role_id: [null, Validators.required],
    });
  }

  openAddModal(): void {
    this.addForm.reset();
    this.showAddModal.set(true);
  }

  closeAddModal(): void {
    if (this.isSubmitting()) return;
    this.showAddModal.set(false);
  }

  onSubmit(): void {
    if (this.addForm.invalid) {
      this.addForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.service.create(this.addForm.value).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.closeAddModal();
        this.service.fetchAll().subscribe();
        this.toast.success('User added successfully!');
      },
      error: () => {
        this.isSubmitting.set(false);
        this.toast.error('Error saving data. Please check and try again!');
      },
    });
  }

  // --- Edit (only email & role, password optional) ---

  initEditForm(): void {
    this.editForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      role_id: [null, Validators.required],
      password: [''],
    });
  }

  openEditModal(item: SystemUser): void {
    this.editTarget.set(item);
    this.editForm.patchValue({
      email: item.email,
      role_id: item.role_id,
      password: '',
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

    const formVal = this.editForm.value;
    const payload: Record<string, unknown> = {
      email: formVal.email,
      role_id: formVal.role_id,
    };

    // Only send password if the user entered a new one
    if (formVal.password) {
      payload['password'] = formVal.password;
    }

    this.isUpdating.set(true);
    this.service.update(target.user_id, payload).subscribe({
      next: () => {
        this.isUpdating.set(false);
        this.closeEditModal();
        this.service.fetchAll().subscribe();
        this.toast.success('User updated successfully!');
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
    this.service.delete(target.id).subscribe({
      next: () => {
        this.isDeleting.set(false);
        this.closeDeleteModal();
        this.deleteTarget.set(null);
        this.service.fetchAll().subscribe();
        this.toast.success('User deleted successfully!');
      },
      error: () => {
        this.isDeleting.set(false);
        this.toast.error('Cannot delete user. Please try again.');
      },
    });
  }

  getRoleName(roleId: number | string): string {
    const id = typeof roleId === 'string' ? Number(roleId) : roleId;
    return this.roles.find((r) => r.id === id)?.name ?? `Role ${id}`;
  }
}
