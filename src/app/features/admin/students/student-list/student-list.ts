import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { SidebarComponent } from '../../../../shared/components/sidebar/sidebar';
import { StudentService } from '../../../../core/services/student';
import { AuthService } from '../../../../core/services/auth';
import { ToastService } from '../../../../core/services/toast';
import { ADMIN_NAV_GROUPS } from '../../../../shared/models/nav';
import type { Student, StudentView } from '../../../../core/models/student';

@Component({
  selector: 'app-student-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, SidebarComponent],
  templateUrl: './student-list.html',
})
export class StudentListComponent implements OnInit {
  public studentService = inject(StudentService);
  private auth = inject(AuthService);
  private fb = inject(FormBuilder);
  private toast = inject(ToastService);

  readonly navGroups = ADMIN_NAV_GROUPS;

  readonly loading = this.studentService.loading;
  readonly error = this.studentService.error;
  readonly students = this.studentService.students;
  readonly majors = this.studentService.majors;
  readonly groups = this.studentService.groups;

  // Pagination
  readonly page = this.studentService.page;
  readonly limit = this.studentService.limit;
  readonly total = this.studentService.total;

  readonly searchTerm = signal('');
  readonly selectedMajorId = signal<string>('');
  readonly selectedGroupId = signal<string>('');

  // Bulk selection
  readonly selectedIds = signal<Set<number>>(new Set());
  readonly isAllSelected = computed(() => {
    const filtered = this.filteredStudents();
    return filtered.length > 0 && filtered.every((s) => this.selectedIds().has(s.student_id));
  });
  readonly selectedCount = computed(() => this.selectedIds().size);

  // Bulk Delete modal
  readonly showBulkDeleteModal = signal(false);
  readonly isBulkDeleting = signal(false);

  // Add Student modal
  readonly showAddModal = signal(false);
  readonly isSubmitting = signal(false);
  studentForm!: FormGroup;

  // Delete Student modal
  readonly showDeleteModal = signal(false);
  readonly deleteTarget = signal<{ id: number; name: string } | null>(null);
  readonly isDeleting = signal(false);

  // Update Student modal
  readonly showUpdateModal = signal(false);
  readonly isUpdating = signal(false);
  readonly updateTarget = signal<Student | null>(null);
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

  /** full_name from first_name + last_name; also passthrough optional JOIN fields */
  readonly studentsView = computed(() =>
    this.students().map(
      (s) =>
        ({
          ...s,
          full_name: [s.first_name, s.last_name].filter(Boolean).join(' '),
          major_name: (s as StudentView).major_name,
          group_name: (s as StudentView).group_name,
        }) as StudentView,
    ),
  );

  readonly filteredStudents = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    return this.studentsView().filter((s) => {
      return (
        !term ||
        s.full_name?.toLowerCase().includes(term) ||
        s.student_code?.toLowerCase().includes(term)
      );
    });
  });

  ngOnInit(): void {
    this.studentService.fetchAll().subscribe();
    this.studentService.fetchMajors().subscribe();
    this.studentService.fetchGroups().subscribe();
    this.initForm();
    this.initUpdateForm();
  }

  // --- Filter / Search / Pagination ---

  onSearch(value: string): void {
    this.searchTerm.set(value);
    this.studentService
      .fetchAll(1, this.limit(), value, this.selectedMajorId(), this.selectedGroupId())
      .subscribe();
  }

  setMajorFilter(majorId: string): void {
    this.selectedMajorId.set(majorId);
    this.studentService
      .fetchAll(1, this.limit(), this.searchTerm(), majorId, this.selectedGroupId())
      .subscribe();
  }

  setGroupFilter(groupId: string): void {
    this.selectedGroupId.set(groupId);
    this.studentService
      .fetchAll(1, this.limit(), this.searchTerm(), this.selectedMajorId(), groupId)
      .subscribe();
  }

  onPageChange(pageNumber: number): void {
    if (pageNumber >= 1 && pageNumber <= this.totalPages() && !this.loading()) {
      this.studentService.goToPage(
        pageNumber,
        this.searchTerm(),
        this.selectedMajorId(),
        this.selectedGroupId(),
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

  updateTargetName(): string {
    const t = this.updateTarget();
    if (!t) return '';
    return `${t.first_name} ${t.last_name}`;
  }

  // --- Add Student ---

  initForm(): void {
    this.studentForm = this.fb.group({
      student_code: [''],
      first_name: ['', Validators.required],
      last_name: ['', Validators.required],
      gender: ['', Validators.required],
      date_of_birth: ['', Validators.required],
      phone: [''],
      address: [''],
      guardian_name: [''],
      guardian_phone: [''],
      department_id: [null],
      major_id: [null],
      group_id: [null],
      degree_level: ['Bachelor', Validators.required],
      academic_year: [1],
    });
  }

  openAddModal(): void {
    this.studentForm.reset({ degree_level: 'Bachelor', academic_year: 1 });
    this.showAddModal.set(true);
  }

  closeAddModal(): void {
    if (this.isSubmitting()) return;
    this.showAddModal.set(false);
  }

  onSubmitStudent(): void {
    if (this.studentForm.invalid) {
      this.studentForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);

    this.studentService.create(this.studentForm.value).subscribe({
      next: (res: any) => {
        this.isSubmitting.set(false);
        this.closeAddModal();
        this.studentService.fetchAll().subscribe();
        const msg = res?.email
          ? `Student added successfully! Email: ${res.email}, Password: ${res.password}`
          : 'Student added successfully!';
        this.toast.success(msg, 8000);
      },
      error: () => {
        this.isSubmitting.set(false);
        this.toast.error('Error saving data. Please check and try again!');
      },
    });
  }

  // --- Update Student ---

  initUpdateForm(): void {
    this.updateForm = this.fb.group({
      student_code: [''],
      first_name: ['', Validators.required],
      last_name: ['', Validators.required],
      gender: ['', Validators.required],
      date_of_birth: ['', Validators.required],
      phone: [''],
      address: [''],
      guardian_name: [''],
      guardian_phone: [''],
      department_id: [null],
      major_id: [null],
      group_id: [null],
      degree_level: ['Bachelor'],
      academic_year: [1],
      status: ['Active'],
    });
  }

  openUpdateModal(student: Student): void {
    this.updateTarget.set(student);
    // Format date to YYYY-MM-DD for <input type="date">
    const dob = student.date_of_birth ? student.date_of_birth.substring(0, 10) : '';
    this.updateForm.patchValue({
      student_code: student.student_code,
      first_name: student.first_name,
      last_name: student.last_name,
      gender: student.gender,
      date_of_birth: dob,
      phone: student.phone || '',
      address: student.address || '',
      guardian_name: student.guardian_name || '',
      guardian_phone: student.guardian_phone || '',
      department_id: student.department_id,
      major_id: student.major_id,
      group_id: student.group_id,
      degree_level: student.degree_level || 'Bachelor',
      academic_year: student.academic_year || 1,
      status: student.status || 'Active',
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

    this.studentService.update(target.student_id, this.updateForm.value).subscribe({
      next: () => {
        this.isUpdating.set(false);
        this.closeUpdateModal();
        this.studentService.fetchAll().subscribe();
        this.toast.success('Student information updated successfully!');
      },
      error: () => {
        this.isUpdating.set(false);
        this.toast.error('Error updating data. Please try again!');
      },
    });
  }

  // --- Delete Student ---

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
    this.studentService.delete(target.id).subscribe({
      next: () => {
        this.isDeleting.set(false);
        this.showDeleteModal.set(false);
        this.deleteTarget.set(null);
        this.studentService.fetchAll().subscribe();
        this.toast.success(`Deleted student "${target.name}" successfully!`);
      },
      error: () => {
        this.isDeleting.set(false);
        this.toast.error('Cannot delete student. Please try again.');
      },
    });
  }

  // --- Bulk Selection ---

  toggleSelectAll(): void {
    const filtered = this.filteredStudents();
    if (this.isAllSelected()) {
      this.selectedIds.set(new Set());
    } else {
      this.selectedIds.set(new Set(filtered.map((s) => s.student_id)));
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
    this.studentService.bulkDelete(ids).subscribe({
      next: (res) => {
        this.isBulkDeleting.set(false);
        this.showBulkDeleteModal.set(false);
        this.clearSelection();
        this.studentService.fetchAll().subscribe();
        this.toast.success(res?.message || `Deleted ${ids.length} student(s) successfully!`);
      },
      error: () => {
        this.isBulkDeleting.set(false);
        this.toast.error('Cannot delete student. Please try again.');
      },
    });
  }

  statusClass(status: string): string {
    switch (status) {
      case 'Active':
        return 'bg-emerald-500/15 text-emerald-400';
      case 'Inactive':
        return 'bg-slate-500/15 text-slate-400';
      case 'Graduated':
        return 'bg-sky-500/15 text-sky-400';
      case 'Dropped':
        return 'bg-red-500/15 text-red-400';
      default:
        return 'bg-slate-500/15 text-slate-400';
    }
  }
}
