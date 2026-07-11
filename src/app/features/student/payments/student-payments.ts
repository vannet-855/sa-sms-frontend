import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, of, tap } from 'rxjs';
import { SidebarComponent } from '../../../shared/components/sidebar/sidebar';
import { AuthService } from '../../../core/services/auth';
import { STUDENT_NAV_GROUPS } from '../../../shared/models/nav';
import { environment } from '../../../../environments/environment';

interface Payment {
  payment_id: number;
  student_id: number;
  amount: number;
  payment_date: string;
  status: string;
  payment_method: string | null;
  receipt_number: string | null;
  fee_type: string | null;
  academic_year_id: number;
  semester_id: number | null;
  year_label: string;
  semester_name: string | null;
  remark: string | null;
}

@Component({
  selector: 'app-student-payments',
  standalone: true,
  imports: [CommonModule, SidebarComponent],
  template: `
    <div class="flex min-h-screen bg-slate-950">
      <app-sidebar
        [navGroups]="STUDENT_NAV_GROUPS"
        [user]="sidebarUser()"
        portalRole="STUDENT PORTAL"
      ></app-sidebar>

      <main class="flex-1 overflow-y-auto p-6">
        <div class="mb-1 text-xs text-slate-600">
          <span>Student</span> / <span class="text-emerald-400">Payment History</span>
        </div>
        <div class="mb-6">
          <h1 class="text-xl font-bold text-white">Payment History</h1>
          <p class="mt-0.5 text-sm text-slate-500">View all your fee payments and their status.</p>
        </div>

        <!-- Summary Cards -->
        @if (summary(); as s) {
          <div class="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div class="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
              <p class="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Total Paid
              </p>
              <p class="mt-1 text-2xl font-bold text-emerald-400">
                \${{ s.paid_amount.toLocaleString() }}
              </p>
            </div>
            <div class="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
              <p class="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Pending
              </p>
              <p class="mt-1 text-2xl font-bold text-amber-400">
                \${{ s.pending_amount.toLocaleString() }}
              </p>
            </div>
            <div class="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
              <p class="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Total</p>
              <p class="mt-1 text-2xl font-bold text-white">
                \${{ s.total_paid.toLocaleString() }}
              </p>
            </div>
          </div>
        }

        @if (loading()) {
          <div
            class="flex h-64 items-center justify-center rounded-xl border border-slate-800 bg-slate-900/40 text-slate-500"
          >
            <i class="fa-solid fa-circle-notch fa-spin mr-2"></i> Loading...
          </div>
        }
        @if (error()) {
          <div
            class="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400"
          >
            <i class="fa-solid fa-circle-exclamation mr-2"></i>{{ error() }}
          </div>
        }

        @if (!loading() && !error()) {
          <div class="rounded-xl border border-slate-800 bg-slate-900/40">
            <div class="max-h-[600px] overflow-auto custom-scrollbar">
              <table class="min-w-full text-left text-sm">
                <thead class="sticky top-0 z-10 bg-slate-900">
                  <tr class="text-[10px] uppercase tracking-wider text-slate-600">
                    <th class="px-4 py-3 font-medium">#</th>
                    <th class="py-3 font-medium">Receipt</th>
                    <th class="py-3 font-medium">Date</th>
                    <th class="py-3 font-medium">Fee Type</th>
                    <th class="py-3 font-medium">Year</th>
                    <th class="py-3 font-medium">Semester</th>
                    <th class="py-3 font-medium">Method</th>
                    <th class="py-3 font-medium text-center">Amount</th>
                    <th class="px-4 py-3 font-medium text-center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  @for (p of payments(); track p.payment_id; let i = $index) {
                    <tr class="border-t border-slate-800/60 hover:bg-slate-800/20">
                      <td class="px-4 py-3 text-slate-500">{{ i + 1 }}</td>
                      <td class="py-3">
                        <span class="font-mono text-[13px] text-slate-400">{{
                          p.receipt_number || '—'
                        }}</span>
                      </td>
                      <td class="py-3 text-slate-300">{{ formatDate(p.payment_date) }}</td>
                      <td class="py-3 text-slate-400">{{ p.fee_type || '—' }}</td>
                      <td class="py-3 text-slate-400">{{ p.year_label || '—' }}</td>
                      <td class="py-3 text-slate-400">{{ p.semester_name || '—' }}</td>
                      <td class="py-3 text-slate-400">{{ p.payment_method || '—' }}</td>
                      <td class="py-3 text-center">
                        <span class="text-sm font-bold text-slate-200"
                          >\${{ p.amount.toLocaleString() }}</span
                        >
                      </td>
                      <td class="px-4 py-3 text-center">
                        <span
                          class="rounded-full px-2.5 py-0.5 text-[11px] font-medium"
                          [class]="statusClass(p.status)"
                        >
                          {{ p.status }}
                        </span>
                      </td>
                    </tr>
                  } @empty {
                    <tr>
                      <td colspan="9" class="px-4 py-16 text-center text-slate-600">
                        <i class="fa-solid fa-credit-card mb-2 block text-lg"></i>No payments found
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
            <div class="border-t border-slate-800/60 px-5 py-3">
              <span class="text-[11px] text-slate-600">{{ payments().length }} payment(s)</span>
            </div>
          </div>
        }
      </main>
    </div>
  `,
})
export class StudentPaymentsComponent implements OnInit {
  readonly STUDENT_NAV_GROUPS = STUDENT_NAV_GROUPS;
  private auth = inject(AuthService);
  private http = inject(HttpClient);

  readonly sidebarUser = computed(() => {
    const u = this.auth.currentUser();
    return { initials: u?.initials ?? 'ST', name: u?.full_name ?? 'Student', roleLabel: 'Student' };
  });

  private readonly _payments = signal<Payment[]>([]);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);
  private readonly _summary = signal<{
    total_paid: number;
    paid_amount: number;
    pending_amount: number;
  } | null>(null);

  readonly payments = this._payments.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly summary = this._summary.asReadonly();

  formatDate(d: string): string {
    if (!d) return '—';
    const date = new Date(d + 'T00:00:00');
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
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

  ngOnInit(): void {
    this._loading.set(true);
    this._error.set(null);

    this.http
      .get<Payment[]>(`${environment.apiUrl}/payments/student/me`)
      .pipe(
        catchError((err) => {
          this._error.set(err.error?.message || 'Failed to load payments.');
          this._loading.set(false);
          return of(null);
        }),
        tap((res) => {
          if (res) {
            this._payments.set(res);
            // Calculate summary from the payments
            const total = res.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
            const paid = res
              .filter((p) => p.status === 'Paid')
              .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
            const pending = res
              .filter((p) => p.status === 'Pending')
              .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
            this._summary.set({ total_paid: total, paid_amount: paid, pending_amount: pending });
          }
          this._loading.set(false);
        }),
      )
      .subscribe();
  }
}
