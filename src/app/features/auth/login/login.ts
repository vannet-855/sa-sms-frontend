import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth';
import { UserRole } from '../../../core/models/auth';

interface RoleOption {
  value: UserRole;
  label: string;
  activeClasses: string;
  idleClasses: string;
}

const ROLE_HOME: Record<UserRole, string> = {
  administrator: '/admin/dashboard',
  teacher: '/teacher/dashboard',
  student: '/student/dashboard',
};

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login.html',
})
export class LoginComponent {
  readonly roles: RoleOption[] = [
    {
      value: 'administrator',
      label: 'Administrator',
      activeClasses: 'bg-emerald-500/15 border-emerald-400 text-emerald-300',
      idleClasses: 'border-emerald-800/60 text-emerald-400/80 hover:border-emerald-500',
    },
    {
      value: 'teacher',
      label: 'Teacher',
      activeClasses: 'bg-sky-500/15 border-sky-400 text-sky-300',
      idleClasses: 'border-sky-800/60 text-sky-400/80 hover:border-sky-500',
    },
    {
      value: 'student',
      label: 'Student',
      activeClasses: 'bg-amber-500/15 border-amber-400 text-amber-300',
      idleClasses: 'border-amber-800/60 text-amber-400/80 hover:border-amber-500',
    },
  ];

  readonly selectedRole = signal<UserRole>('administrator');
  readonly showPassword = signal(false);
  private fb = inject(FormBuilder);
  readonly form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    rememberMe: [true],
  });

  get loading() {
    return this.auth.loading;
  }

  get errorMessage() {
    return this.auth.errorMessage;
  }

  constructor(
    private auth: AuthService,
    private router: Router,
  ) {}

  selectRole(role: UserRole): void {
    this.selectedRole.set(role);
  }

  togglePasswordVisibility(): void {
    this.showPassword.update((v) => !v);
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { email, password, rememberMe } = this.form.getRawValue();

    this.auth
      .login({
        email: email!,
        password: password!,
        role: this.selectedRole(),
        rememberMe: !!rememberMe,
      })
      .subscribe({
        next: () => this.router.navigateByUrl(ROLE_HOME[this.selectedRole()]),
      });
  }
}
