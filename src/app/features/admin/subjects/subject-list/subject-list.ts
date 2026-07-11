import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { SidebarComponent } from '../../../../shared/components/sidebar/sidebar';
import { CourseService } from '../../../../core/services/course';
import { AuthService } from '../../../../core/services/auth';
import { ToastService } from '../../../../core/services/toast';
import { ADMIN_NAV_GROUPS } from '../../../../shared/models/nav';
import type { Course } from '../../../../core/models/course';

@Component({
  selector: 'app-subject-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, SidebarComponent],
  templateUrl: './subject-list.html',
})
export class SubjectListComponent implements OnInit {
  public courseService = inject(CourseService);
  private auth = inject(AuthService);
  private fb = inject(FormBuilder);
  private toast = inject(ToastService);

  readonly navGroups = ADMIN_NAV_GROUPS;

  readonly loading = this.courseService.loading;
  readonly error = this.courseService.error;
  readonly courses = this.courseService.courses;
  readonly majors = this.courseService.majors;

  // Pagination
  readonly page = this.courseService.page;
  readonly limit = this.courseService.limit;
  readonly total = this.courseService.total;

  readonly searchTerm = signal('');
  readonly selectedMajorId = signal<string>('');

  // Bulk selection
  readonly selectedIds = signal<Set<number>>(new Set());
  readonly isAllSelected = computed(() => {
    const filtered = this.filteredCourses();
    return filtered.length > 0 && filtered.every((c) => this.selectedIds().has(c.course_id));
  });
  readonly selectedCount = computed(() => this.selectedIds().size);

  // Bulk Delete modal
  readonly showBulkDeleteModal = signal(false);
  readonly isBulkDeleting = signal(false);

  // Add Subject modal
  readonly showAddModal = signal(false);
  readonly isSubmitting = signal(false);
  subjectForm!: FormGroup;

  // Delete Subject modal
  readonly showDeleteModal = signal(false);
  readonly deleteTarget = signal<{ id: number; name: string } | null>(null);
  readonly isDeleting = signal(false);

  // Update Subject modal
  readonly showUpdateModal = signal(false);
  readonly isUpdating = signal(false);
  readonly updateTarget = signal<Course | null>(null);
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

  readonly filteredCourses = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    return this.courses().filter((c) => {
      return (
        !term ||
        c.course_name?.toLowerCase().includes(term) ||
        c.course_code?.toLowerCase().includes(term)
      );
    });
  });

  ngOnInit(): void {
    this.courseService.fetchAll().subscribe();
    this.courseService.fetchDepartments();
    this.initForm();
    this.initUpdateForm();
  }

  onSearch(value: string): void {
    this.searchTerm.set(value);
    this.courseService.fetchAll(1, this.limit(), value, this.selectedMajorId()).subscribe();
  }

  setMajorFilter(majorId: string): void {
    this.selectedMajorId.set(majorId);
    this.courseService.fetchAll(1, this.limit(), this.searchTerm(), majorId).subscribe();
  }

  onPageChange(pageNumber: number): void {
    if (pageNumber >= 1 && pageNumber <= this.totalPages() && !this.loading()) {
      this.courseService.goToPage(pageNumber, this.searchTerm(), this.selectedMajorId());
    }
  }

  // --- Add ---

  initForm(): void {
    this.subjectForm = this.fb.group({
      course_code: ['', Validators.required],
      course_name: ['', Validators.required],
      credit: [null],
      major_id: [null],
      description: [''],
      status: ['Active'],
      midterm_max: [null],
      final_max: [null],
    });
  }

  openAddModal(): void {
    this.subjectForm.reset({ status: 'Active' });
    this.showAddModal.set(true);
  }

  closeAddModal(): void {
    if (this.isSubmitting()) return;
    this.showAddModal.set(false);
  }

  onSubmitSubject(): void {
    if (this.subjectForm.invalid) {
      this.subjectForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);

    this.courseService.create(this.subjectForm.value).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.closeAddModal();
        this.courseService.fetchAll().subscribe();
        this.toast.success('Course added successfully!');
      },
      error: () => {
        this.isSubmitting.set(false);
        this.toast.error('Error saving data. Please check and try again!');
      },
    });
  }

  // --- Update ---

  initUpdateForm(): void {
    this.updateForm = this.fb.group({
      course_code: ['', Validators.required],
      course_name: ['', Validators.required],
      credit: [null],
      major_id: [null],
      description: [''],
      status: ['Active'],
      midterm_max: [null],
      final_max: [null],
    });
  }

  openUpdateModal(course: Course): void {
    this.updateTarget.set(course);
    this.updateForm.patchValue({
      course_code: course.course_code,
      course_name: course.course_name,
      credit: course.credit,
      major_id: course.major_id,
      description: course.description || '',
      status: course.status || 'Active',
      midterm_max: course.midterm_max,
      final_max: course.final_max,
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

    this.courseService.update(target.course_id, this.updateForm.value).subscribe({
      next: () => {
        this.isUpdating.set(false);
        this.closeUpdateModal();
        this.courseService.fetchAll().subscribe();
        this.toast.success('Course updated successfully!');
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
    this.courseService.delete(target.id).subscribe({
      next: () => {
        this.isDeleting.set(false);
        this.showDeleteModal.set(false);
        this.deleteTarget.set(null);
        this.courseService.fetchAll().subscribe();
        this.toast.success(`Deleted course "${target.name}" successfully!`);
      },
      error: () => {
        this.isDeleting.set(false);
        this.toast.error('Cannot delete course. Please try again.');
      },
    });
  }

  // --- Bulk Selection ---

  toggleSelectAll(): void {
    const filtered = this.filteredCourses();
    if (this.isAllSelected()) {
      this.selectedIds.set(new Set());
    } else {
      this.selectedIds.set(new Set(filtered.map((c) => c.course_id)));
    }
  }

  toggleSelect(id: number): void {
    const set = new Set(this.selectedIds());
    if (set.has(id)) set.delete(id);
    else set.add(id);
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
    this.courseService.bulkDelete(ids).subscribe({
      next: (res) => {
        this.isBulkDeleting.set(false);
        this.showBulkDeleteModal.set(false);
        this.clearSelection();
        this.courseService.fetchAll().subscribe();
        this.toast.success(res?.message || `Deleted ${ids.length} course(s) successfully!`);
      },
      error: () => {
        this.isBulkDeleting.set(false);
        this.toast.error('Cannot delete course. Please try again.');
      },
    });
  }

  statusClass(status: string): string {
    switch (status) {
      case 'Active':
        return 'bg-emerald-500/15 text-emerald-400';
      case 'Inactive':
        return 'bg-slate-500/15 text-slate-400';
      default:
        return 'bg-slate-500/15 text-slate-400';
    }
  }
}
