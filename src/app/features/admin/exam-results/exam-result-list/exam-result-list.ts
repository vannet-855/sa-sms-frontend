import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { SidebarComponent } from '../../../../shared/components/sidebar/sidebar';
import { ExamResultService } from '../../../../core/services/exam-result';
import { AuthService } from '../../../../core/services/auth';
import { ToastService } from '../../../../core/services/toast';
import { ADMIN_NAV_GROUPS } from '../../../../shared/models/nav';
import type { ExamResult } from '../../../../core/models/exam-result';

@Component({
  selector: 'app-exam-result-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, SidebarComponent],
  templateUrl: './exam-result-list.html',
})
export class ExamResultListComponent implements OnInit {
  public examResultService = inject(ExamResultService);
  private auth = inject(AuthService);
  private fb = inject(FormBuilder);
  private toast = inject(ToastService);

  readonly navGroups = ADMIN_NAV_GROUPS;

  readonly loading = this.examResultService.loading;
  readonly error = this.examResultService.error;
  readonly results = this.examResultService.results;
  readonly exams = this.examResultService.exams;
  readonly classGroups = this.examResultService.classGroups;
  readonly students = this.examResultService.students;

  // Filters
  readonly selectedExamId = signal<string>('');

  // Student search
  readonly studentSearchResults = this.examResultService.studentSearchResults;
  readonly searchingStudents = this.examResultService.searchingStudents;
  readonly selectedStudent = signal<{ id: number; full_name: string; student_code: string } | null>(
    null,
  );
  readonly searchQuery = signal('');

  // Add modal
  readonly showAddModal = signal(false);
  readonly isSubmitting = signal(false);
  resultForm!: FormGroup;

  // Edit modal
  readonly showEditModal = signal(false);
  readonly isUpdating = signal(false);
  readonly editTarget = signal<ExamResult | null>(null);
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
    const examId = this.selectedExamId();
    if (examId) list = list.filter((r) => r.exam_id === Number(examId));
    return list;
  });

  ngOnInit(): void {
    this.examResultService.fetchAll().subscribe();
    this.examResultService.fetchExams();
    this.examResultService.fetchClassGroups();
    this.initForm();
    this.initEditForm();
  }

  // --- Filters ---

  setExamFilter(examId: string): void {
    this.selectedExamId.set(examId);
  }

  clearFilters(): void {
    this.selectedExamId.set('');
  }

  // --- Add (Single student) ---

  initForm(): void {
    this.resultForm = this.fb.group({
      group_id: [null, Validators.required],
      student_id: [null, Validators.required],
      exam_id: [null, Validators.required],
      score: [null, [Validators.min(0), Validators.max(100)]],
    });
  }

  onGroupChange(): void {
    this.clearStudent();
    this.examResultService.searchStudents('');
  }

  onSearchStudent(event: Event): void {
    const query = (event.target as HTMLInputElement).value;
    this.searchQuery.set(query);
    const groupId = this.resultForm.get('group_id')?.value;
    this.examResultService.searchStudents(query, groupId);
  }

  selectStudent(student: { id: number; full_name: string; student_code: string }): void {
    this.selectedStudent.set(student);
    this.resultForm.patchValue({ student_id: student.id });
    this.examResultService.searchStudents(''); // clear results
  }

  clearStudent(): void {
    this.selectedStudent.set(null);
    this.searchQuery.set('');
    this.resultForm.patchValue({ student_id: null });
  }

  openAddModal(): void {
    this.resultForm.reset();
    this.selectedStudent.set(null);
    this.searchQuery.set('');
    this.examResultService.searchStudents('');
    this.showAddModal.set(true);
  }

  closeAddModal(): void {
    if (this.isSubmitting()) return;
    this.showAddModal.set(false);
    this.selectedStudent.set(null);
    this.searchQuery.set('');
  }

  onSubmitResult(): void {
    if (this.resultForm.invalid) {
      this.resultForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    const { group_id, ...payload } = this.resultForm.value;
    this.examResultService.create(payload).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.closeAddModal();
        this.examResultService.fetchAll().subscribe();
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
      exam_id: [null, Validators.required],
      score: [null, [Validators.min(0), Validators.max(100)]],
    });
  }

  openEditModal(result: ExamResult): void {
    this.editTarget.set(result);
    this.editForm.patchValue({
      student_id: result.student_id,
      exam_id: result.exam_id,
      score: result.score,
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
    this.examResultService.update(target.result_id, this.editForm.value).subscribe({
      next: () => {
        this.isUpdating.set(false);
        this.closeEditModal();
        this.examResultService.fetchAll().subscribe();
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
    this.examResultService.delete(target.id).subscribe({
      next: () => {
        this.isDeleting.set(false);
        this.closeDeleteModal();
        this.deleteTarget.set(null);
        this.examResultService.fetchAll().subscribe();
        this.toast.success('Exam result deleted successfully!');
      },
      error: () => {
        this.isDeleting.set(false);
        this.toast.error('Cannot delete exam result. Please try again.');
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
}
