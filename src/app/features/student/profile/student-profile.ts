import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { catchError, of, tap } from 'rxjs';
import { SidebarComponent } from '../../../shared/components/sidebar/sidebar';
import { AuthService } from '../../../core/services/auth';
import { ToastService } from '../../../core/services/toast';
import { STUDENT_NAV_GROUPS } from '../../../shared/models/nav';
import { environment } from '../../../../environments/environment';

interface StudentProfile {
  student_id: number;
  user_id: number;
  first_name: string;
  last_name: string;
  gender: string;
  date_of_birth: string;
  phone: string | null;
  address: string | null;
  guardian_name: string | null;
  guardian_phone: string | null;
  email: string | null;
  password: string | null;
  student_code: string | null;
  degree_level: string;
  status: string;
  major_name: string | null;
  department_name: string | null;
  group_name: string | null;
}

@Component({
  selector: 'app-student-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent],
  template: `
    <div class="flex min-h-screen bg-slate-950">
      <app-sidebar
        [navGroups]="STUDENT_NAV_GROUPS"
        [user]="sidebarUser()"
        portalRole="STUDENT PORTAL"
      ></app-sidebar>

      <main class="flex-1 overflow-y-auto p-6">
        <div class="mb-1 text-xs text-slate-600">
          <span>Student</span> / <span class="text-emerald-400">My Profile</span>
        </div>
        <div class="mb-6">
          <h1 class="text-xl font-bold text-white">My Profile</h1>
          <p class="mt-0.5 text-sm text-slate-500">View and edit your personal information.</p>
        </div>

        @if (loading()) {
          <div
            class="flex h-40 items-center justify-center rounded-xl border border-slate-800 bg-slate-900/40 text-slate-500"
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

        @if (!loading() && profile(); as p) {
          <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <!-- Info Card -->
            <div class="rounded-xl border border-slate-800 bg-slate-900/40 p-6 text-center">
              <div class="flex items-center justify-center mx-auto mb-4">
                <div
                  class="flex h-24 w-24 items-center justify-center rounded-full bg-emerald-600 text-3xl font-bold text-white"
                >
                  {{ initials(p.first_name, p.last_name) }}
                </div>
              </div>
              <h2 class="text-lg font-semibold text-white">{{ p.first_name }} {{ p.last_name }}</h2>
              <div class="mt-1 text-xs text-slate-500">
                <span
                  class="rounded-full bg-emerald-500/15 px-3 py-1 font-medium text-emerald-400"
                  >{{ p.degree_level || 'Student' }}</span
                >
              </div>
              @if (p.group_name) {
                <p class="mt-2 text-sm text-slate-400">Group: {{ p.group_name }}</p>
              }
              @if (p.major_name) {
                <p class="mt-1 text-sm text-slate-400">Major: {{ p.major_name }}</p>
              }
              <hr class="my-4 border-slate-800" />
              <div class="text-left text-sm text-slate-400">
                <p class="mb-2">
                  <i class="fa-solid fa-envelope mr-2 w-5 text-slate-600"></i>{{ p.email || '—' }}
                </p>
                <p class="mb-2">
                  <i class="fa-solid fa-phone mr-2 w-5 text-slate-600"></i>{{ p.phone || '—' }}
                </p>
                <p class="mb-2">
                  <i class="fa-solid fa-id-card mr-2 w-5 text-slate-600"></i
                  >{{ p.student_code || '—' }}
                </p>
                <p class="mb-2">
                  <i class="fa-solid fa-venus-mars mr-2 w-5 text-slate-600"></i
                  >{{ p.gender || '—' }}
                </p>
                <p>
                  <i class="fa-solid fa-lock mr-2 w-5 text-slate-600"></i>
                  <span class="font-mono tracking-wider">{{ maskPassword(p.password) }}</span>
                  <button
                    type="button"
                    (click)="togglePasswordVisible()"
                    class="ml-2 text-[11px] hover:text-emerald-400"
                  >
                    <i
                      class="fa-solid"
                      [class.fa-eye]="!passwordVisible()"
                      [class.fa-eye-slash]="passwordVisible()"
                    ></i>
                  </button>
                </p>
              </div>
            </div>

            <!-- Edit Profile Form -->
            <div class="rounded-xl border border-slate-800 bg-slate-900/40 p-6 lg:col-span-2">
              <h3 class="mb-4 text-sm font-semibold text-slate-300">
                <i class="fa-solid fa-pen mr-2 text-emerald-400"></i>Edit Information
              </h3>

              <form (ngSubmit)="saveProfile()">
                <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label class="mb-1 block text-xs font-medium text-slate-400"
                      >First Name <span class="text-rose-500">*</span></label
                    >
                    <input
                      type="text"
                      [(ngModel)]="editFirstName"
                      name="first_name"
                      required
                      class="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-200 outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label class="mb-1 block text-xs font-medium text-slate-400"
                      >Last Name <span class="text-rose-500">*</span></label
                    >
                    <input
                      type="text"
                      [(ngModel)]="editLastName"
                      name="last_name"
                      required
                      class="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-200 outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label class="mb-1 block text-xs font-medium text-slate-400">Phone</label>
                    <input
                      type="text"
                      [(ngModel)]="editPhone"
                      name="phone"
                      class="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-200 outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label class="mb-1 block text-xs font-medium text-slate-400">Address</label>
                    <input
                      type="text"
                      [(ngModel)]="editAddress"
                      name="address"
                      class="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-200 outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label class="mb-1 block text-xs font-medium text-slate-400"
                      >Guardian Name</label
                    >
                    <input
                      type="text"
                      [(ngModel)]="editGuardianName"
                      name="guardian_name"
                      class="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-200 outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label class="mb-1 block text-xs font-medium text-slate-400"
                      >Guardian Phone</label
                    >
                    <input
                      type="text"
                      [(ngModel)]="editGuardianPhone"
                      name="guardian_phone"
                      class="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-200 outline-none focus:border-emerald-500"
                    />
                  </div>
                  <hr class="border-slate-800 md:col-span-2 my-2" />
                  <div class="md:col-span-2">
                    <label class="mb-1 block text-xs font-medium text-slate-400">
                      <i class="fa-solid fa-lock mr-1 text-emerald-400"></i> Change Password
                    </label>
                    <p class="mb-2 text-[10px] text-slate-600">
                      Leave blank to keep your current password.
                    </p>
                    <input
                      type="text"
                      [(ngModel)]="editPassword"
                      name="password"
                      placeholder="New password"
                      class="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-200 outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div class="mt-6 flex justify-end gap-3 border-t border-slate-800 pt-4">
                  <button
                    type="button"
                    (click)="resetForm()"
                    class="rounded-lg border border-slate-700 px-4 py-2 text-xs font-medium text-slate-400 hover:border-slate-600"
                  >
                    Reset
                  </button>
                  <button
                    type="submit"
                    [disabled]="saving()"
                    class="flex items-center gap-2 rounded-lg bg-emerald-500 px-5 py-2 text-xs font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-40"
                  >
                    @if (saving()) {
                      <i class="fa-solid fa-circle-notch fa-spin"></i> Saving...
                    } @else {
                      <i class="fa-solid fa-floppy-disk"></i> Save Changes
                    }
                  </button>
                </div>
              </form>
            </div>
          </div>
        }
      </main>
    </div>
  `,
})
export class StudentProfileComponent implements OnInit {
  readonly STUDENT_NAV_GROUPS = STUDENT_NAV_GROUPS;
  private auth = inject(AuthService);
  private http = inject(HttpClient);
  private toast = inject(ToastService);

  readonly sidebarUser = computed(() => {
    const u = this.auth.currentUser();
    return { initials: u?.initials ?? 'ST', name: u?.full_name ?? 'Student', roleLabel: 'Student' };
  });

  private readonly _profile = signal<StudentProfile | null>(null);
  private readonly _loading = signal(false);
  private readonly _saving = signal(false);
  private readonly _error = signal<string | null>(null);

  readonly profile = this._profile.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly saving = this._saving.asReadonly();
  readonly error = this._error.asReadonly();

  editFirstName = '';
  editLastName = '';
  editPhone = '';
  editAddress = '';
  editGuardianName = '';
  editGuardianPhone = '';
  editPassword = '';

  readonly passwordVisible = signal(false);

  togglePasswordVisible(): void {
    this.passwordVisible.update((v) => !v);
  }

  maskPassword(pw: string | null): string {
    if (!pw) return '⋯';
    if (this.passwordVisible()) return pw;
    return '•'.repeat(Math.min(pw.length, 12));
  }

  initials(fn: string, ln: string): string {
    return ((fn?.[0] || '') + (ln?.[0] || '')).toUpperCase() || 'ST';
  }

  ngOnInit(): void {
    this.fetchProfile();
  }

  private fetchProfile(): void {
    this._loading.set(true);
    this._error.set(null);
    this.http
      .get<StudentProfile>(`${environment.apiUrl}/students/profile`)
      .pipe(
        catchError((err) => {
          this._error.set(err.error?.message || 'Failed to load profile.');
          this._loading.set(false);
          return of(null);
        }),
        tap((res) => {
          if (res) {
            this._profile.set(res);
            this.editFirstName = res.first_name || '';
            this.editLastName = res.last_name || '';
            this.editPhone = res.phone || '';
            this.editAddress = res.address || '';
            this.editGuardianName = res.guardian_name || '';
            this.editGuardianPhone = res.guardian_phone || '';
          }
          this._loading.set(false);
        }),
      )
      .subscribe();
  }

  resetForm(): void {
    const p = this._profile();
    if (p) {
      this.editFirstName = p.first_name || '';
      this.editLastName = p.last_name || '';
      this.editPhone = p.phone || '';
      this.editAddress = p.address || '';
      this.editGuardianName = p.guardian_name || '';
      this.editGuardianPhone = p.guardian_phone || '';
    }
  }

  saveProfile(): void {
    if (!this.editFirstName.trim() || !this.editLastName.trim()) return;
    this._saving.set(true);
    this._error.set(null);

    const body: Record<string, any> = {
      first_name: this.editFirstName.trim(),
      last_name: this.editLastName.trim(),
      phone: this.editPhone.trim() || null,
      address: this.editAddress.trim() || null,
      guardian_name: this.editGuardianName.trim() || null,
      guardian_phone: this.editGuardianPhone.trim() || null,
    };
    if (this.editPassword.trim()) body['password'] = this.editPassword.trim();

    this.http
      .put<{ message: string; student: StudentProfile }>(
        `${environment.apiUrl}/students/profile`,
        body,
      )
      .pipe(
        catchError((err) => {
          this._error.set(err.error?.message || 'Failed to save profile.');
          this._saving.set(false);
          return of(null);
        }),
        tap((res) => {
          if (res) {
            this._profile.set(res.student);
            this.editPassword = '';
            this.toast.success('Profile updated successfully!');
          }
          this._saving.set(false);
        }),
      )
      .subscribe();
  }
}
