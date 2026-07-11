import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { SidebarComponent } from '../../../../shared/components/sidebar/sidebar';
import { CourseResultService } from '../../../../core/services/course-result';
import { AuthService } from '../../../../core/services/auth';
import { ToastService } from '../../../../core/services/toast';
import { ADMIN_NAV_GROUPS } from '../../../../shared/models/nav';
import type { CourseResult } from '../../../../core/models/course-result';

@Component({
  selector: 'app-course-result-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, SidebarComponent],
  templateUrl: './course-result-list.html',
})
export class CourseResultListComponent implements OnInit {
  public courseResultService = inject(CourseResultService);
  private auth = inject(AuthService);
  private fb = inject(FormBuilder);
  private toast = inject(ToastService);

  readonly navGroups = ADMIN_NAV_GROUPS;

  readonly loading = this.courseResultService.loading;
  readonly error = this.courseResultService.error;
  readonly results = this.courseResultService.results;
  readonly students = this.courseResultService.students;
  readonly courses = this.courseResultService.courses;

  // Filters
  readonly selectedCourseId = signal<string>('');

  // Add modal
  readonly showAddModal = signal(false);
  readonly isSubmitting = signal(false);
  resultForm!: FormGroup;

  // Edit modal
  readonly showEditModal = signal(false);
  readonly isUpdating = signal(false);
  readonly editTarget = signal<CourseResult | null>(null);
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

  readonly filteredResults = computed(() => {
    let list = this.results();
    const courseId = this.selectedCourseId();
    if (courseId) list = list.filter((r) => r.course_id === Number(courseId));
    return list;
  });

  ngOnInit(): void {
    this.courseResultService.fetchAll().subscribe();
    this.courseResultService.fetchStudents();
    this.courseResultService.fetchCourses();
    this.initForm();
    this.initEditForm();
  }

  // --- Filters ---

  setCourseFilter(courseId: string): void {
    this.selectedCourseId.set(courseId);
  }

  clearFilters(): void {
    this.selectedCourseId.set('');
  }

  // --- Add ---

  initForm(): void {
    this.resultForm = this.fb.group({
      student_id: [null, Validators.required],
      course_id: [null, Validators.required],
      midterm: [null, [Validators.min(0), Validators.max(100)]],
      final: [null, [Validators.min(0), Validators.max(100)]],
    });
  }

  openAddModal(): void {
    this.resultForm.reset();
    this.showAddModal.set(true);
  }

  closeAddModal(): void {
    if (this.isSubmitting()) return;
    this.showAddModal.set(false);
  }

  onSubmitResult(): void {
    if (this.resultForm.invalid) {
      this.resultForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.courseResultService.create(this.resultForm.value).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.closeAddModal();
        this.courseResultService.fetchAll().subscribe();
        this.toast.success('Exam result added successfully!');
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
      student_id: [null, Validators.required],
      course_id: [null, Validators.required],
      midterm: [null, [Validators.min(0), Validators.max(100)]],
      final: [null, [Validators.min(0), Validators.max(100)]],
    });
  }

  openEditModal(result: CourseResult): void {
    this.editTarget.set(result);
    this.editForm.patchValue({
      student_id: result.student_id,
      course_id: result.course_id,
      midterm: result.midterm,
      final: result.final,
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
    this.courseResultService.update(target.result_id, this.editForm.value).subscribe({
      next: () => {
        this.isUpdating.set(false);
        this.closeEditModal();
        this.courseResultService.fetchAll().subscribe();
        this.toast.success('Exam result updated successfully!');
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
    this.courseResultService.delete(target.id).subscribe({
      next: () => {
        this.isDeleting.set(false);
        this.closeDeleteModal();
        this.deleteTarget.set(null);
        this.courseResultService.fetchAll().subscribe();
        this.toast.success('Course result deleted successfully!');
      },
      error: () => {
        this.isDeleting.set(false);
        this.toast.error('Cannot delete result. Please try again.');
      },
    });
  }

  // --- Helpers ---

  initials(fullName: string): string {
    return fullName
      ?.split(' ')
      .map((p: string) => p[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }

  gradeColor(grade: string | null | undefined): string {
    switch (grade) {
      case 'A':
        return 'bg-emerald-500/15 text-emerald-400';
      case 'B':
        return 'bg-sky-500/15 text-sky-400';
      case 'C':
        return 'bg-amber-500/15 text-amber-400';
      case 'D':
        return 'bg-orange-500/15 text-orange-400';
      case 'F':
        return 'bg-red-500/15 text-red-400';
      default:
        return 'bg-slate-500/15 text-slate-400';
    }
  }
}
