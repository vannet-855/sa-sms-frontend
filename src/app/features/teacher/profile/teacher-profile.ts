import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { catchError, of, tap } from 'rxjs';
import { SidebarComponent } from '../../../shared/components/sidebar/sidebar';
import { AuthService } from '../../../core/services/auth';
import { ToastService } from '../../../core/services/toast';
import { TEACHER_NAV_GROUPS } from '../../../shared/models/nav';
import { environment } from '../../../../environments/environment';

interface TeacherProfile {
  teacher_id: number;
  user_id: number;
  full_name: string;
  phone: string | null;
  email: string | null;
  password: string | null;
  department_id: number | null;
  department_name: string | null;
}

@Component({
  selector: 'app-teacher-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent],
  template: `
    <div class="flex min-h-screen bg-slate-950">
      <app-sidebar
        [navGroups]="TEACHER_NAV_GROUPS"
        [user]="sidebarUser()"
        portalRole="TEACHER PORTAL"
      >
      </app-sidebar>

      <main class="flex-1 overflow-y-auto p-6">
        <div class="mb-1 text-xs text-slate-600">
          <span>Teacher</span> / <span class="text-emerald-400">My Profile</span>
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
                  class="flex h-24 w-24 items-center justify-center rounded-full bg-sky-600 text-3xl font-bold text-white"
                >
                  {{ initials(p.full_name) }}
                </div>
              </div>

              <h2 class="text-lg font-semibold text-white">{{ p.full_name }}</h2>
              <div class="mt-1 text-xs text-slate-500">
                <span class="rounded-full bg-sky-500/15 px-3 py-1 font-medium text-sky-400">
                  Teacher
                </span>
              </div>
              @if (p.department_name) {
                <p class="mt-3 text-sm text-slate-400">{{ p.department_name }}</p>
              }
              <hr class="my-4 border-slate-800" />
              <div class="text-left text-sm text-slate-400">
                <p class="mb-2">
                  <i class="fa-solid fa-envelope mr-2 w-5 text-slate-600"></i>
                  {{ p.email || '—' }}
                </p>
                <p class="mb-2">
                  <i class="fa-solid fa-phone mr-2 w-5 text-slate-600"></i>
                  {{ p.phone || '—' }}
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
                    <label class="mb-1 block text-xs font-medium text-slate-400">
                      Full Name <span class="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      [(ngModel)]="editName"
                      name="full_name"
                      required
                      class="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-200 outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label class="mb-1 block text-xs font-medium text-slate-400"> Email </label>
                    <input
                      type="email"
                      [value]="p.email || ''"
                      disabled
                      class="w-full cursor-not-allowed rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-2 text-sm text-slate-500 outline-none"
                    />
                    <p class="mt-0.5 text-[10px] text-slate-600">Email cannot be changed.</p>
                  </div>
                  <div>
                    <label class="mb-1 block text-xs font-medium text-slate-400"> Phone </label>
                    <input
                      type="text"
                      [(ngModel)]="editPhone"
                      name="phone"
                      class="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-200 outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label class="mb-1 block text-xs font-medium text-slate-400">
                      Department
                    </label>
                    <input
                      type="text"
                      [value]="p.department_name || '—'"
                      disabled
                      class="w-full cursor-not-allowed rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-2 text-sm text-slate-500 outline-none"
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

        @if (!loading() && !profile() && !error()) {
          <div
            class="flex h-48 items-center justify-center rounded-xl border border-slate-800 bg-slate-900/40 text-slate-600"
          >
            <div class="text-center">
              <i class="fa-solid fa-user-slash mb-2 block text-2xl"></i>
              <p class="text-sm">Could not load profile.</p>
            </div>
          </div>
        }
      </main>
    </div>
  `,
})
export class TeacherProfileComponent implements OnInit {
  readonly TEACHER_NAV_GROUPS = TEACHER_NAV_GROUPS;

  private auth = inject(AuthService);
  private http = inject(HttpClient);
  private toast = inject(ToastService);

  readonly sidebarUser = computed(() => {
    const u = this.auth.currentUser();
    return {
      initials: u?.initials ?? 'TC',
      name: u?.full_name ?? 'Teacher',
      roleLabel: 'Teacher',
    };
  });

  private readonly _profile = signal<TeacherProfile | null>(null);
  private readonly _loading = signal(false);
  private readonly _saving = signal(false);
  private readonly _error = signal<string | null>(null);

  readonly profile = this._profile.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly saving = this._saving.asReadonly();
  readonly error = this._error.asReadonly();

  editName = '';
  editPhone = '';
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

  initials(name: string): string {
    return (
      name
        ?.split(' ')
        .map((p) => p[0])
        .slice(0, 2)
        .join('')
        .toUpperCase() || 'TC'
    );
  }

  ngOnInit(): void {
    this.fetchProfile();
  }

  private fetchProfile(): void {
    this._loading.set(true);
    this._error.set(null);

    this.http
      .get<TeacherProfile>(`${environment.apiUrl}/teachers/profile`)
      .pipe(
        catchError((err) => {
          this._error.set(err.error?.message || 'Failed to load profile.');
          this._loading.set(false);
          return of(null);
        }),
        tap((res) => {
          if (res) {
            this._profile.set(res);
            this.editName = res.full_name || '';
            this.editPhone = res.phone || '';
          }
          this._loading.set(false);
        }),
      )
      .subscribe();
  }

  resetForm(): void {
    const p = this._profile();
    if (p) {
      this.editName = p.full_name || '';
      this.editPhone = p.phone || '';
    }
  }

  saveProfile(): void {
    if (!this.editName.trim()) return;

    this._saving.set(true);
    this._error.set(null);

    const body: Record<string, any> = {
      full_name: this.editName.trim(),
      phone: this.editPhone.trim() || null,
    };

    if (this.editPassword.trim()) {
      body['password'] = this.editPassword.trim();
    }

    this.http
      .put<{ message: string; teacher: TeacherProfile }>(
        `${environment.apiUrl}/teachers/profile`,
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
            this._profile.set(res.teacher);
            this.editPassword = '';
            this.toast.success('Profile updated successfully!');
          }
          this._saving.set(false);
        }),
      )
      .subscribe();
  }
}
