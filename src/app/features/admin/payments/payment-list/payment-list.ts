import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { debounceTime, distinctUntilChanged, Subject, switchMap } from 'rxjs';
import { SidebarComponent } from '../../../../shared/components/sidebar/sidebar';
import { PaymentService } from '../../../../core/services/payment';
import { AuthService } from '../../../../core/services/auth';
import { ToastService } from '../../../../core/services/toast';
import { ADMIN_NAV_GROUPS } from '../../../../shared/models/nav';
import type { Payment } from '../../../../core/models/payment';

interface StudentEntry {
  id: number;
  name: string;
  code: string;
  phone: string;
  groupName: string;
  payments: Payment[];
  totalPaid: number;
  paymentCount: number;
  hasPaid: boolean;
}

@Component({
  selector: 'app-payment-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, SidebarComponent],
  templateUrl: './payment-list.html',
})
export class PaymentListComponent implements OnInit {
  public paymentService = inject(PaymentService);
  private auth = inject(AuthService);
  private fb = inject(FormBuilder);
  private toast = inject(ToastService);

  readonly navGroups = ADMIN_NAV_GROUPS;

  readonly loading = this.paymentService.loading;
  readonly error = this.paymentService.error;
  readonly payments = this.paymentService.payments;
  readonly allStudents = this.paymentService.students;
  readonly academicYears = this.paymentService.academicYears;
  readonly semesters = this.paymentService.semesters;
  readonly groups = this.paymentService.groups;

  readonly paymentTypes = ['Tuition', 'Exam', 'Library', 'Other'];
  readonly paymentMethods = ['Cash', 'ABA', 'Wing', 'Card'];
  readonly paymentScopes = ['Semester', 'Year'];
  readonly statusOptions = ['Pending', 'Paid', 'Failed'];

  // ── Search & Filters (main view) ──

  readonly searchQuery = signal('');
  private searchSubject = new Subject<string>();
  readonly selectedGroupId = signal<string>('');

  // ── All students with merged payment info ──

  readonly studentEntries = computed<StudentEntry[]>(() => {
    const allP = this.payments();
    return this.allStudents().map((s) => {
      const stuPayments = allP.filter((p) => p.student_id === s.id);
      return {
        id: s.id,
        name: s.name,
        code: s.code,
        phone: (s as any).phone ?? '',
        groupName: (s as any).groupName ?? '',
        payments: stuPayments,
        totalPaid: stuPayments.reduce((sum, p) => sum + Number(p.amount), 0),
        paymentCount: stuPayments.length,
        hasPaid: stuPayments.some((p) => p.status === 'Paid'),
      };
    });
  });

  readonly filteredStudents = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    const gid = this.selectedGroupId();
    return this.studentEntries().filter((s) => {
      if (gid && s.groupName !== this.groups().find((g) => g.id === Number(gid))?.name)
        return false;
      if (!q) return true;
      return (
        s.name.toLowerCase().includes(q) ||
        s.code.toLowerCase().includes(q) ||
        s.phone.toLowerCase().includes(q) ||
        s.groupName.toLowerCase().includes(q)
      );
    });
  });

  readonly totalAllPaid = computed(() =>
    this.filteredStudents().reduce((sum, s) => sum + s.totalPaid, 0),
  );

  // ── Add payment modal ──

  readonly showAddModal = signal(false);
  readonly isSubmitting = signal(false);
  paymentForm!: FormGroup;

  // Add-modal student search
  readonly addSearchResults = signal<
    Array<{ id: number; name: string; code: string; phone: string; groupName: string }>
  >([]);
  readonly selectedAddStudentId = signal<number | null>(null);
  readonly selectedAddStudentName = signal<string | null>(null);
  private addSearchSubject = new Subject<string>();

  // ── Edit payment modal ──

  readonly showEditModal = signal(false);
  readonly isUpdating = signal(false);
  readonly editTarget = signal<Payment | null>(null);
  editForm!: FormGroup;

  // ── Delete payment modal ──

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
    this.paymentService.fetchAll().subscribe();
    this.paymentService.fetchStudents();
    this.paymentService.fetchAcademicYears();
    this.paymentService.fetchSemesters();
    this.paymentService.fetchGroups();
    this.initForm();
    this.initEditForm();

    // Main search debounce
    this.searchSubject
      .pipe(debounceTime(200), distinctUntilChanged())
      .subscribe((q) => this.searchQuery.set(q));

    // Add-modal student search debounce
    this.addSearchSubject
      .pipe(
        debounceTime(250),
        distinctUntilChanged(),
        switchMap((q) => {
          if (!q.trim()) {
            this.addSearchResults.set([]);
            return [];
          }
          return this.paymentService.searchStudents(q);
        }),
      )
      .subscribe((results) => {
        this.addSearchResults.set(
          results.map((r: any) => ({
            id: r.id,
            name: r.full_name || r.name || 'Unknown',
            code: r.student_code ?? r.code ?? '',
            phone: r.phone ?? '',
            groupName: r.group_name ?? r.groupName ?? '',
          })),
        );
      });
  }

  // ── Main search ──

  setGroupFilter(groupId: string): void {
    this.selectedGroupId.set(groupId);
  }

  onSearchInput(value: string): void {
    this.searchSubject.next(value);
  }

  // ── Add modal student search ──

  onAddStudentSearch(value: string): void {
    this.addSearchSubject.next(value);
  }

  selectStudentForAdd(id: number, name: string): void {
    this.selectedAddStudentId.set(id);
    this.selectedAddStudentName.set(name);
    this.paymentForm.patchValue({ student_id: id });
    this.addSearchResults.set([]);
  }

  // ── Add Payment ──

  initForm(): void {
    this.paymentForm = this.fb.group({
      student_id: [null, Validators.required],
      payment_scope: ['Semester', Validators.required],
      academic_year_id: [null, Validators.required],
      semester_id: [null],
      amount: [null, [Validators.required, Validators.min(0)]],
      payment_type: ['Tuition'],
      payment_method: ['Cash'],
      status: ['Paid'],
      paid_date: [new Date().toISOString().substring(0, 10)],
      reference_code: [''],
      note: [''],
    });
  }

  openAddForStudent(student: StudentEntry): void {
    this.selectedAddStudentId.set(student.id);
    this.selectedAddStudentName.set(student.name);
    this.paymentForm.reset({
      payment_scope: 'Semester',
      payment_type: 'Tuition',
      payment_method: 'Cash',
      status: 'Paid',
      paid_date: new Date().toISOString().substring(0, 10),
    });
    this.paymentForm.patchValue({ student_id: student.id });
    this.addSearchResults.set([]);
    this.showAddModal.set(true);
  }

  openAddModal(): void {
    this.selectedAddStudentId.set(null);
    this.selectedAddStudentName.set(null);
    this.paymentForm.reset({
      payment_scope: 'Semester',
      payment_type: 'Tuition',
      payment_method: 'Cash',
      status: 'Paid',
      paid_date: new Date().toISOString().substring(0, 10),
    });
    this.addSearchResults.set([]);
    this.showAddModal.set(true);
  }

  closeAddModal(): void {
    if (this.isSubmitting()) return;
    this.showAddModal.set(false);
    this.selectedAddStudentId.set(null);
    this.selectedAddStudentName.set(null);
    this.addSearchResults.set([]);
  }

  onSubmitPayment(): void {
    if (this.paymentForm.invalid) {
      this.paymentForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.paymentService.create(this.paymentForm.value).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.closeAddModal();
        this.paymentService.fetchAll().subscribe();
        this.paymentService.fetchStudents();
        this.toast.success('Payment added successfully!');
      },
      error: () => {
        this.isSubmitting.set(false);
        this.toast.error('Error saving data. Please check and try again!');
      },
    });
  }

  // ── Edit Payment ──

  initEditForm(): void {
    this.editForm = this.fb.group({
      student_id: [null, Validators.required],
      payment_scope: ['Semester', Validators.required],
      academic_year_id: [null, Validators.required],
      semester_id: [null],
      amount: [null, [Validators.required, Validators.min(0)]],
      payment_type: ['Tuition'],
      payment_method: ['Cash'],
      status: ['Paid'],
      paid_date: [''],
      reference_code: [''],
      note: [''],
    });
  }

  openEditModal(payment: Payment): void {
    this.editTarget.set(payment);
    this.editForm.patchValue({
      student_id: payment.student_id,
      payment_scope: payment.payment_scope,
      academic_year_id: payment.academic_year_id,
      semester_id: payment.semester_id,
      amount: payment.amount,
      payment_type: payment.payment_type,
      payment_method: payment.payment_method,
      status: payment.status,
      paid_date: payment.paid_date ? payment.paid_date.substring(0, 10) : '',
      reference_code: payment.reference_code || '',
      note: payment.note || '',
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
    this.paymentService.update(target.payment_id, this.editForm.value).subscribe({
      next: () => {
        this.isUpdating.set(false);
        this.closeEditModal();
        this.paymentService.fetchAll().subscribe();
        this.toast.success('Payment updated successfully!');
      },
      error: () => {
        this.isUpdating.set(false);
        this.toast.error('Error updating data. Please try again!');
      },
    });
  }

  // ── Delete Payment ──

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
    this.paymentService.delete(target.id).subscribe({
      next: () => {
        this.isDeleting.set(false);
        this.closeDeleteModal();
        this.deleteTarget.set(null);
        this.paymentService.fetchAll().subscribe();
        this.toast.success('Payment deleted successfully!');
      },
      error: () => {
        this.isDeleting.set(false);
        this.toast.error('Cannot delete payment. Please try again.');
      },
    });
  }

  // ── Helpers ──

  initials(fullName: string): string {
    return fullName
      ?.split(' ')
      .map((p: string) => p[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }

  statusClass(status: string): string {
    switch (status) {
      case 'Paid':
        return 'bg-emerald-500/15 text-emerald-400';
      case 'Pending':
        return 'bg-amber-500/15 text-amber-400';
      case 'Failed':
        return 'bg-red-500/15 text-red-400';
      default:
        return 'bg-slate-500/15 text-slate-400';
    }
  }

  paymentStatusClass(hasPaid: boolean, count: number): string {
    if (count === 0) return 'bg-slate-500/15 text-slate-400';
    if (hasPaid) return 'bg-emerald-500/15 text-emerald-400';
    return 'bg-amber-500/15 text-amber-400';
  }

  paymentStatusLabel(hasPaid: boolean, count: number): string {
    if (count === 0) return 'Unpaid';
    if (hasPaid) return 'Paid';
    return 'Pending';
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  }
}
