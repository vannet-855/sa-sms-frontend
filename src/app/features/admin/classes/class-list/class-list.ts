import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { SidebarComponent } from '../../../../shared/components/sidebar/sidebar';
import { ClassService } from '../../../../core/services/class';
import { AuthService } from '../../../../core/services/auth';
import { ToastService } from '../../../../core/services/toast';
import { ADMIN_NAV_GROUPS } from '../../../../shared/models/nav';
import type { Class } from '../../../../core/models/class';

@Component({
  selector: 'app-class-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, SidebarComponent],
  templateUrl: './class-list.html',
})
export class ClassListComponent implements OnInit {
  public classService = inject(ClassService);
  private auth = inject(AuthService);
  private fb = inject(FormBuilder);
  private toast = inject(ToastService);

  readonly navGroups = ADMIN_NAV_GROUPS;

  readonly loading = this.classService.loading;
  readonly error = this.classService.error;
  readonly classes = this.classService.classes;

  // Dropdown data
  readonly courses = this.classService.courses;
  readonly teachers = this.classService.teachers;
  readonly groups = this.classService.groups;
  readonly shifts = this.classService.shifts;
  readonly semesters = this.classService.semesters;
  readonly years = this.classService.years;

  // Pagination
  readonly page = this.classService.page;
  readonly limit = this.classService.limit;
  readonly total = this.classService.total;

  readonly searchTerm = signal('');
  readonly selectedCourseId = signal<string>('');
  readonly selectedTeacherId = signal<string>('');

  // Bulk selection
  readonly selectedIds = signal<Set<number>>(new Set());
  readonly isAllSelected = computed(() => {
    const filtered = this.filteredClasses();
    return filtered.length > 0 && filtered.every((c) => this.selectedIds().has(c.class_id));
  });
  readonly selectedCount = computed(() => this.selectedIds().size);

  // Bulk Delete modal
  readonly showBulkDeleteModal = signal(false);
  readonly isBulkDeleting = signal(false);

  // Add Class modal
  readonly showAddModal = signal(false);
  readonly isSubmitting = signal(false);
  classForm!: FormGroup;

  // Delete Class modal
  readonly showDeleteModal = signal(false);
  readonly deleteTarget = signal<{ id: number; name: string } | null>(null);
  readonly isDeleting = signal(false);

  // Update Class modal
  readonly showUpdateModal = signal(false);
  readonly isUpdating = signal(false);
  readonly updateTarget = signal<Class | null>(null);
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

  readonly filteredClasses = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    return this.classes().filter((c) => {
      return (
        !term ||
        c.course_name?.toLowerCase().includes(term) ||
        c.teacher_name?.toLowerCase().includes(term) ||
        c.group_name?.toLowerCase().includes(term) ||
        c.class_code?.toLowerCase().includes(term)
      );
    });
  });

  readonly classLabel = computed(() => {
    const c = this.updateTarget();
    if (!c) return '';
    return [c.class_code, c.course_name, c.group_name].filter(Boolean).join(' - ');
  });

  ngOnInit(): void {
    this.classService.fetchAll().subscribe();
    this.classService.fetchDropdownData();
    this.initForm();
    this.initUpdateForm();
  }

  // --- Filter / Search / Pagination ---

  onSearch(value: string): void {
    this.searchTerm.set(value);
    this.classService
      .fetchAll(1, this.limit(), value, this.selectedCourseId(), this.selectedTeacherId())
      .subscribe();
  }

  setCourseFilter(courseId: string): void {
    this.selectedCourseId.set(courseId);
    this.classService
      .fetchAll(1, this.limit(), this.searchTerm(), courseId, this.selectedTeacherId())
      .subscribe();
  }

  setTeacherFilter(teacherId: string): void {
    this.selectedTeacherId.set(teacherId);
    this.classService
      .fetchAll(1, this.limit(), this.searchTerm(), this.selectedCourseId(), teacherId)
      .subscribe();
  }

  onPageChange(pageNumber: number): void {
    if (pageNumber >= 1 && pageNumber <= this.totalPages() && !this.loading()) {
      this.classService.goToPage(
        pageNumber,
        this.searchTerm(),
        this.selectedCourseId(),
        this.selectedTeacherId(),
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

  // --- Add Class ---

  initForm(): void {
    this.classForm = this.fb.group({
      class_code: [''],
      course_id: [null, Validators.required],
      teacher_id: [null, Validators.required],
      group_id: [null, Validators.required],
      shift_id: [null],
      semester_id: [null],
      year_id: [null],
      status: ['Active'],
    });
  }

  openAddModal(): void {
    this.classForm.reset();
    this.showAddModal.set(true);
  }

  closeAddModal(): void {
    if (this.isSubmitting()) return;
    this.showAddModal.set(false);
  }

  onSubmitClass(): void {
    if (this.classForm.invalid) {
      this.classForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);

    this.classService.create(this.classForm.value).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.closeAddModal();
        this.classService.fetchAll().subscribe();
        this.toast.success('Class added successfully!');
      },
      error: () => {
        this.isSubmitting.set(false);
        this.toast.error('Error saving data. Please check and try again!');
      },
    });
  }

  // --- Update Class ---

  initUpdateForm(): void {
    this.updateForm = this.fb.group({
      class_code: [''],
      course_id: [null, Validators.required],
      teacher_id: [null, Validators.required],
      group_id: [null, Validators.required],
      shift_id: [null],
      semester_id: [null],
      year_id: [null],
      room: [''],
      schedule: [''],
      max_students: [null],
      start_date: [''],
      end_date: [''],
      status: ['Active'],
    });
  }

  openUpdateModal(cls: Class): void {
    this.updateTarget.set(cls);
    this.updateForm.patchValue({
      class_code: cls.class_code || '',
      course_id: cls.course_id,
      teacher_id: cls.teacher_id,
      group_id: cls.group_id,
      shift_id: cls.shift_id,
      semester_id: cls.semester_id,
      year_id: cls.year_id,
      room: cls.room || '',
      schedule: cls.schedule || '',
      max_students: cls.max_students || null,
      start_date: cls.start_date || '',
      end_date: cls.end_date || '',
      status: cls.status || 'Active',
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

    const raw = this.updateForm.value;

    // Convert empty strings to null for nullable fields so MySQL doesn't reject them
    const nullableFields: (keyof typeof raw)[] = [
      'shift_id',
      'semester_id',
      'year_id',
      'room',
      'schedule',
      'class_code',
      'start_date',
      'end_date',
      'max_students',
    ];
    for (const key of nullableFields) {
      if (raw[key] === '' || raw[key] === null || raw[key] === undefined) {
        raw[key] = null;
      }
    }

    this.classService.update(target.class_id, raw).subscribe({
      next: () => {
        this.isUpdating.set(false);
        this.closeUpdateModal();
        this.classService.fetchAll().subscribe();
        this.toast.success('Class information updated successfully!');
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
    this.classService.delete(target.id).subscribe({
      next: () => {
        this.isDeleting.set(false);
        this.showDeleteModal.set(false);
        this.deleteTarget.set(null);
        this.classService.fetchAll().subscribe();
        this.toast.success(`Deleted class "${target.name}" successfully!`);
      },
      error: () => {
        this.isDeleting.set(false);
        this.toast.error('Cannot delete class. Please try again.');
      },
    });
  }

  // --- Bulk Selection ---

  toggleSelectAll(): void {
    const filtered = this.filteredClasses();
    if (this.isAllSelected()) {
      this.selectedIds.set(new Set());
    } else {
      this.selectedIds.set(new Set(filtered.map((c) => c.class_id)));
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
    this.classService.bulkDelete(ids).subscribe({
      next: (res) => {
        this.isBulkDeleting.set(false);
        this.showBulkDeleteModal.set(false);
        this.clearSelection();
        this.classService.fetchAll().subscribe();
        this.toast.success(res?.message || `Deleted ${ids.length} classes successfully!`);
      },
      error: () => {
        this.isBulkDeleting.set(false);
        this.toast.error('Cannot delete class. Please try again.');
      },
    });
  }

  statusClass(status: string | undefined | null): string {
    switch (status) {
      case 'Active':
        return 'bg-emerald-500/15 text-emerald-400';
      case 'Inactive':
        return 'bg-slate-500/15 text-slate-400';
      case 'Completed':
        return 'bg-sky-500/15 text-sky-400';
      case 'Cancelled':
        return 'bg-red-500/15 text-red-400';
      default:
        return 'bg-slate-500/15 text-slate-400';
    }
  }
}
