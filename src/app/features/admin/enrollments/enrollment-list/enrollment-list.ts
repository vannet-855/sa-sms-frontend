import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { SidebarComponent } from '../../../../shared/components/sidebar/sidebar';
import { EnrollmentService } from '../../../../core/services/enrollment';
import { AuthService } from '../../../../core/services/auth';
import { ToastService } from '../../../../core/services/toast';
import { ADMIN_NAV_GROUPS } from '../../../../shared/models/nav';
import type { Enrollment } from '../../../../core/models/enrollment';

@Component({
  selector: 'app-enrollment-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, SidebarComponent],
  templateUrl: './enrollment-list.html',
})
export class EnrollmentListComponent implements OnInit {
  public enrollmentService = inject(EnrollmentService);
  private auth = inject(AuthService);
  private fb = inject(FormBuilder);
  private toast = inject(ToastService);

  readonly navGroups = ADMIN_NAV_GROUPS;

  readonly loading = this.enrollmentService.loading;
  readonly error = this.enrollmentService.error;
  readonly enrollments = this.enrollmentService.enrollments;
  readonly groups = this.enrollmentService.groups;
  readonly classes = this.enrollmentService.classes;

  // Filters
  readonly selectedGroupId = signal<string>('');
  readonly selectedClassId = signal<string>('');

  // Add modal
  readonly showAddModal = signal(false);
  readonly isSubmitting = signal(false);
  enrollmentForm!: FormGroup;

  // Delete modal
  readonly showDeleteModal = signal(false);
  readonly isDeleting = signal(false);
  readonly deleteTarget = signal<{ groupId: number; classId: number; name: string } | null>(null);

  // Students modal
  readonly showStudentsModal = signal(false);
  readonly studentsLoading = signal(false);
  readonly studentsError = signal<string | null>(null);
  readonly studentsList = signal<
    Array<{
      student_id: number;
      student_code: string;
      first_name: string;
      last_name: string;
      gender: string;
      phone: string;
      status: string;
    }>
  >([]);
  readonly studentsModalContext = signal<Enrollment | null>(null);

  // Bulk enrollment preview
  readonly bulkStudents = signal<
    Array<{
      student_id: number;
      student_code: string;
      first_name: string;
      last_name: string;
      gender: string;
      phone: string;
    }>
  >([]);
  readonly bulkStudentsLoading = signal(false);
  readonly bulkStudentsError = signal<string | null>(null);
  readonly bulkGroupName = signal('');
  readonly bulkClassId = signal<number | null>(null);

  readonly sidebarUser = computed(() => {
    const u = this.auth.currentUser();
    return {
      initials: u?.initials ?? 'AD',
      name: u?.full_name ?? 'Admin',
      roleLabel: 'Administrator',
    };
  });

  readonly filteredEnrollments = computed(() => {
    let list = this.enrollments();
    const groupId = this.selectedGroupId();
    const clsId = this.selectedClassId();
    if (groupId) list = list.filter((e) => e.group_id === Number(groupId));
    if (clsId) list = list.filter((e) => e.class_id === Number(clsId));
    return list;
  });

  ngOnInit(): void {
    this.enrollmentService.fetchAll().subscribe();
    this.enrollmentService.fetchGroups();
    this.enrollmentService.fetchClasses();
    this.initForm();
  }

  // --- Filters ---

  setGroupFilter(groupId: string): void {
    this.selectedGroupId.set(groupId);
  }

  setClassFilter(classId: string): void {
    this.selectedClassId.set(classId);
  }

  clearFilters(): void {
    this.selectedGroupId.set('');
    this.selectedClassId.set('');
  }

  // --- Add ---

  initForm(): void {
    this.enrollmentForm = this.fb.group({
      group_id: [null, Validators.required],
      class_id: [null, Validators.required],
    });
  }

  openAddModal(): void {
    this.enrollmentForm.reset();
    this.bulkStudents.set([]);
    this.bulkStudentsError.set(null);
    this.bulkStudentsLoading.set(false);
    this.bulkGroupName.set('');
    this.bulkClassId.set(null);
    this.showAddModal.set(true);
  }

  closeAddModal(): void {
    if (this.isSubmitting()) return;
    this.showAddModal.set(false);
  }

  /** When group is selected, fetch students in that group for preview */
  onGroupSelect(groupIdStr: string): void {
    const groupId = Number(groupIdStr);
    const group = this.groups().find((g) => g.id === groupId);
    this.bulkGroupName.set(group?.name ?? '');
    this.bulkClassId.set(null);
    this.bulkStudents.set([]);
    this.bulkStudentsError.set(null);

    if (!groupId) {
      this.bulkStudents.set([]);
      return;
    }

    // If class is also selected, show preview
    const classId = this.enrollmentForm.get('class_id')?.value;
    if (classId) {
      this.loadBulkPreview(groupId);
    }
  }

  /** When class is selected and group is already selected, show preview */
  onClassSelect(classIdStr: string): void {
    const classId = Number(classIdStr);
    this.bulkClassId.set(classId || null);

    const groupId = this.enrollmentForm.get('group_id')?.value;
    if (groupId && classId) {
      this.loadBulkPreview(Number(groupId));
    } else {
      this.bulkStudents.set([]);
    }
  }

  /** Fetch students in the selected group for preview */
  private loadBulkPreview(groupId: number): void {
    this.bulkStudentsLoading.set(true);
    this.bulkStudentsError.set(null);

    this.enrollmentService.getStudentsInGroup(groupId).subscribe({
      next: (res) => {
        const list = Array.isArray(res) ? res : ((res as any)?.data ?? []);
        this.bulkStudents.set(
          list.map((s: any) => ({
            student_id: s.student_id,
            student_code: s.student_code,
            first_name: s.first_name,
            last_name: s.last_name,
            gender: s.gender,
            phone: s.phone,
          })),
        );
        this.bulkStudentsLoading.set(false);
      },
      error: () => {
        this.bulkStudentsError.set('Could not load students in this group.');
        this.bulkStudentsLoading.set(false);
      },
    });
  }

  /** Submit: bulk enroll all students from the group into the class */
  onSubmitBulkEnrollment(): void {
    if (this.enrollmentForm.invalid) {
      this.enrollmentForm.markAllAsTouched();
      return;
    }

    const groupId = this.enrollmentForm.get('group_id')?.value;
    const classId = this.enrollmentForm.get('class_id')?.value;

    if (!groupId || !classId) return;

    this.isSubmitting.set(true);
    this.enrollmentService.bulkCreate(groupId, classId).subscribe({
      next: (res: any) => {
        this.isSubmitting.set(false);
        this.closeAddModal();
        this.enrollmentService.fetchAll().subscribe();
        this.toast.success(res?.message || 'Group students enrolled into class successfully!');
      },
      error: (err) => {
        this.isSubmitting.set(false);
        const msg = err?.error?.message || 'Error during enrollment. Please check and try again!';
        this.toast.error(msg);
      },
    });
  }

  onSubmitEnrollment(): void {
    if (this.enrollmentForm.invalid) {
      this.enrollmentForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.enrollmentService.create(this.enrollmentForm.value).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.closeAddModal();
        this.enrollmentService.fetchAll().subscribe();
        this.toast.success('Enrollment added successfully!');
      },
      error: () => {
        this.isSubmitting.set(false);
        this.toast.error('Error saving data. Please check and try again!');
      },
    });
  }

  // --- Delete ---

  openDeleteModal(groupId: number, classId: number, name: string): void {
    this.deleteTarget.set({ groupId, classId, name });
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
    this.enrollmentService.bulkDelete(target.groupId, target.classId).subscribe({
      next: () => {
        this.isDeleting.set(false);
        this.closeDeleteModal();
        this.deleteTarget.set(null);
        this.enrollmentService.fetchAll().subscribe();
        this.toast.success('Enrollment deleted successfully!');
      },
      error: () => {
        this.isDeleting.set(false);
        this.toast.error('Cannot delete enrollment. Please try again.');
      },
    });
  }

  // --- Students ---

  openStudentsModal(enrollment: Enrollment): void {
    this.studentsModalContext.set(enrollment);
    this.studentsList.set([]);
    this.studentsError.set(null);
    this.studentsLoading.set(true);
    this.showStudentsModal.set(true);

    this.enrollmentService
      .getStudentsByGroupAndClass(enrollment.group_id, enrollment.class_id)
      .subscribe({
        next: (list) => {
          this.studentsList.set(list);
          this.studentsLoading.set(false);
        },
        error: () => {
          this.studentsError.set('Could not load student list.');
          this.studentsLoading.set(false);
        },
      });
  }

  closeStudentsModal(): void {
    this.showStudentsModal.set(false);
    this.studentsModalContext.set(null);
    this.studentsList.set([]);
    this.studentsError.set(null);
  }

  // --- Helpers ---

  groupLabel(group: { id: number; name: string } | undefined): string {
    return group?.name ?? '';
  }

  classLabel(cls: { id: number; name: string } | undefined): string {
    return cls?.name ?? '';
  }
}
