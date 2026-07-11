import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { SidebarComponent } from '../../../../shared/components/sidebar/sidebar';
import { TeacherService } from '../../../../core/services/teacher';
import { AuthService } from '../../../../core/services/auth';
import { ToastService } from '../../../../core/services/toast';
import { ADMIN_NAV_GROUPS } from '../../../../shared/models/nav';
import type { Teacher } from '../../../../core/models/teacher';

@Component({
  selector: 'app-teacher-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, SidebarComponent],
  templateUrl: './teacher-list.html',
})
export class TeacherListComponent implements OnInit {
  public teacherService = inject(TeacherService);
  private auth = inject(AuthService);
  private fb = inject(FormBuilder);
  private toast = inject(ToastService);

  readonly navGroups = ADMIN_NAV_GROUPS;

  readonly loading = this.teacherService.loading;
  readonly error = this.teacherService.error;
  readonly teachers = this.teacherService.teachers;

  // Pagination
  readonly page = this.teacherService.page;
  readonly limit = this.teacherService.limit;
  readonly total = this.teacherService.total;

  readonly searchTerm = signal('');

  // Bulk selection
  readonly selectedIds = signal<Set<number>>(new Set());
  readonly isAllSelected = computed(() => {
    const filtered = this.filteredTeachers();
    return filtered.length > 0 && filtered.every((s) => this.selectedIds().has(s.teacher_id));
  });
  readonly selectedCount = computed(() => this.selectedIds().size);

  // Bulk Delete modal
  readonly showBulkDeleteModal = signal(false);
  readonly isBulkDeleting = signal(false);

  // Add Teacher modal
  readonly showAddModal = signal(false);
  readonly isSubmitting = signal(false);
  teacherForm!: FormGroup;

  // Delete Teacher modal
  readonly showDeleteModal = signal(false);
  readonly deleteTarget = signal<{ id: number; name: string } | null>(null);
  readonly isDeleting = signal(false);

  // Update Teacher modal
  readonly showUpdateModal = signal(false);
  readonly isUpdating = signal(false);
  readonly updateTarget = signal<Teacher | null>(null);
  updateForm!: FormGroup;

  readonly sidebarUser = computed(() => {
    const u = this.auth.currentUser();
    return {
      initials: u?.initials ?? 'AD',
      name: u?.full_name ?? 'Admin',
      roleLabel: 'Administrator',
    };
  });

  readonly totalPages = computed(() => Math.ceil(this.total() / this.limit()) || 1);

  readonly filteredTeachers = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    return this.teachers().filter((s) => {
      return (
        !term ||
        s.full_name?.toLowerCase().includes(term) ||
        s.email?.toLowerCase().includes(term) ||
        s.phone?.toLowerCase().includes(term)
      );
    });
  });

  ngOnInit(): void {
    this.teacherService.fetchAll().subscribe();
    this.initForm();
    this.initUpdateForm();
  }

  // --- Filter / Search / Pagination ---

  onSearch(value: string): void {
    this.searchTerm.set(value);
    this.teacherService.fetchAll(1, this.limit(), value).subscribe();
  }

  onPageChange(pageNumber: number): void {
    if (pageNumber >= 1 && pageNumber <= this.totalPages() && !this.loading()) {
      this.teacherService.goToPage(pageNumber, this.searchTerm());
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

  // --- Add Teacher ---

  initForm(): void {
    this.teacherForm = this.fb.group({
      full_name: ['', Validators.required],
      email: ['', Validators.email],
      phone: [''],
    });
  }

  openAddModal(): void {
    this.teacherForm.reset();
    this.showAddModal.set(true);
  }

  closeAddModal(): void {
    if (this.isSubmitting()) return;
    this.showAddModal.set(false);
  }

  onSubmitTeacher(): void {
    if (this.teacherForm.invalid) {
      this.teacherForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);

    this.teacherService.create(this.teacherForm.value).subscribe({
      next: (res: any) => {
        this.isSubmitting.set(false);
        this.closeAddModal();
        this.teacherService.fetchAll().subscribe();
        const msg = res?.email
          ? `Teacher added successfully! Email: ${res.email}, Password: ${res.password}`
          : 'Teacher added successfully!';
        this.toast.success(msg, 8000);
      },
      error: () => {
        this.isSubmitting.set(false);
        this.toast.error('Error saving data. Please check and try again!');
      },
    });
  }

  // --- Update Teacher ---

  initUpdateForm(): void {
    this.updateForm = this.fb.group({
      full_name: ['', Validators.required],
      email: [''],
      phone: [''],
    });
  }

  openUpdateModal(teacher: Teacher): void {
    this.updateTarget.set(teacher);
    this.updateForm.patchValue({
      full_name: teacher.full_name,
      email: teacher.email || '',
      phone: teacher.phone || '',
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

    this.teacherService.update(target.teacher_id, this.updateForm.value).subscribe({
      next: () => {
        this.isUpdating.set(false);
        this.closeUpdateModal();
        this.teacherService.fetchAll().subscribe();
        this.toast.success('Teacher information updated successfully!');
      },
      error: () => {
        this.isUpdating.set(false);
        this.toast.error('Error updating data. Please try again!');
      },
    });
  }

  // --- Delete Teacher ---

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
    this.teacherService.delete(target.id).subscribe({
      next: () => {
        this.isDeleting.set(false);
        this.showDeleteModal.set(false);
        this.deleteTarget.set(null);
        this.teacherService.fetchAll().subscribe();
        this.toast.success(`Deleted teacher "${target.name}" successfully!`);
      },
      error: () => {
        this.isDeleting.set(false);
        this.toast.error('Cannot delete teacher. Please try again.');
      },
    });
  }

  // --- Bulk Selection ---

  toggleSelectAll(): void {
    const filtered = this.filteredTeachers();
    if (this.isAllSelected()) {
      this.selectedIds.set(new Set());
    } else {
      this.selectedIds.set(new Set(filtered.map((s) => s.teacher_id)));
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

  // --- Bulk Delete ---

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
    this.teacherService.bulkDelete(ids).subscribe({
      next: (res) => {
        this.isBulkDeleting.set(false);
        this.showBulkDeleteModal.set(false);
        this.clearSelection();
        this.teacherService.fetchAll().subscribe();
        this.toast.success(res?.message || `Deleted ${ids.length} teacher(s) successfully!`);
      },
      error: () => {
        this.isBulkDeleting.set(false);
        this.toast.error('Cannot delete teacher. Please try again.');
      },
    });
  }
}
