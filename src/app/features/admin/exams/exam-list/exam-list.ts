import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { SidebarComponent } from '../../../../shared/components/sidebar/sidebar';
import { ExamService } from '../../../../core/services/exam';
import { AuthService } from '../../../../core/services/auth';
import { ToastService } from '../../../../core/services/toast';
import { ADMIN_NAV_GROUPS } from '../../../../shared/models/nav';
import type { Exam } from '../../../../core/models/exam';

@Component({
  selector: 'app-exam-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, SidebarComponent],
  templateUrl: './exam-list.html',
})
export class ExamListComponent implements OnInit {
  public examService = inject(ExamService);
  private auth = inject(AuthService);
  private fb = inject(FormBuilder);
  private toast = inject(ToastService);

  readonly navGroups = ADMIN_NAV_GROUPS;

  readonly loading = this.examService.loading;
  readonly error = this.examService.error;
  readonly exams = this.examService.exams;
  readonly classGroups = this.examService.classGroups;
  readonly examTypes = this.examService.examTypes;

  // Filters
  readonly selectedGroupId = signal<string>('');

  // Add modal
  readonly showAddModal = signal(false);
  readonly isSubmitting = signal(false);
  examForm!: FormGroup;

  // Edit modal
  readonly showEditModal = signal(false);
  readonly isUpdating = signal(false);
  readonly editTarget = signal<Exam | null>(null);
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

  readonly filteredExams = computed(() => {
    let list = this.exams();
    const groupId = this.selectedGroupId();
    if (groupId) list = list.filter((e) => e.group_id === Number(groupId));
    return list;
  });

  ngOnInit(): void {
    this.examService.fetchAll().subscribe();
    this.examService.fetchClassGroups();
    this.examService.fetchExamTypes();
    this.initForm();
    this.initEditForm();
  }

  // --- Filters ---

  setGroupFilter(groupId: string): void {
    this.selectedGroupId.set(groupId);
  }

  clearFilters(): void {
    this.selectedGroupId.set('');
  }

  // --- Add ---

  initForm(): void {
    this.examForm = this.fb.group({
      group_id: [null, Validators.required],
      exam_type_id: [null, Validators.required],
      exam_date: ['', Validators.required],
    });
  }

  openAddModal(): void {
    this.examForm.reset();
    this.showAddModal.set(true);
  }

  closeAddModal(): void {
    if (this.isSubmitting()) return;
    this.showAddModal.set(false);
  }

  onSubmitExam(): void {
    if (this.examForm.invalid) {
      this.examForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.examService.create(this.examForm.value).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.closeAddModal();
        this.examService.fetchAll().subscribe();
        this.toast.success('Exam added successfully!');
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
      group_id: [null, Validators.required],
      exam_type_id: [null, Validators.required],
      exam_date: ['', Validators.required],
    });
  }

  openEditModal(exam: Exam): void {
    this.editTarget.set(exam);
    this.editForm.patchValue({
      group_id: exam.group_id,
      exam_type_id: exam.exam_type_id,
      exam_date: exam.exam_date ? exam.exam_date.substring(0, 10) : '',
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
    this.examService.update(target.exam_id, this.editForm.value).subscribe({
      next: () => {
        this.isUpdating.set(false);
        this.closeEditModal();
        this.examService.fetchAll().subscribe();
        this.toast.success('Exam updated successfully!');
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
    this.examService.delete(target.id).subscribe({
      next: () => {
        this.isDeleting.set(false);
        this.closeDeleteModal();
        this.deleteTarget.set(null);
        this.examService.fetchAll().subscribe();
        this.toast.success('Exam deleted successfully!');
      },
      error: () => {
        this.isDeleting.set(false);
        this.toast.error('Cannot delete exam. Please try again.');
      },
    });
  }

  // --- Helpers ---

  typeColor(examTypeName: string): string {
    switch (examTypeName) {
      case 'Midterm':
        return 'bg-sky-500/15 text-sky-400';
      case 'Final':
        return 'bg-violet-500/15 text-violet-400';
      default:
        return 'bg-slate-500/15 text-slate-400';
    }
  }
}
