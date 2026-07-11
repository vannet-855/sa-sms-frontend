import { Injectable, computed, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthUser, LoginRequest, UserRole, mapBackendRoleToUserRole } from '../models/auth';

const TOKEN_KEY = 'edutrack_token';
const USER_KEY = 'edutrack_user';

interface BackendLoginUser {
  user_id: number;
  email: string;
  role_name: string;
  first_name?: string;
  last_name?: string;
  [key: string]: unknown;
}

interface BackendLoginResponse {
  token: string;
  user: BackendLoginUser;
}

/** Maps backend role_name → frontend route prefix */
const ROLE_HOME: Record<UserRole, string> = {
  administrator: '/admin/dashboard',
  teacher: '/teacher/dashboard',
  student: '/student/dashboard',
};

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly _currentUser = signal<AuthUser | null>(this.readStoredUser());
  private readonly _loading = signal(false);
  private readonly _errorMessage = signal<string | null>(null);

  readonly currentUser = this._currentUser.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly errorMessage = this._errorMessage.asReadonly();
  readonly isAuthenticated = computed(() => !!this._currentUser());

  constructor(private http: HttpClient) {}

  login(payload: LoginRequest): Observable<BackendLoginResponse> {
    this._loading.set(true);
    this._errorMessage.set(null);

    const body = { email: payload.email, password: payload.password };

    return this.http.post<BackendLoginResponse>(`${environment.apiUrl}/auth/login`, body).pipe(
      tap({
        next: (res) => {
          const rawUser = res.user;
          // Construct full_name: prefer backend's full_name, then first+last, then fallback
          const fullName =
            (rawUser['full_name'] as string | undefined) ||
            [rawUser.first_name ?? '', rawUser.last_name ?? ''].filter(Boolean).join(' ') ||
            'User';

          const initials = fullName
            .split(' ')
            .map((p) => p[0])
            .slice(0, 2)
            .join('')
            .toUpperCase();

          const mappedUser: AuthUser = {
            user_id: rawUser.user_id,
            email: rawUser.email,
            role_name: rawUser.role_name,
            full_name: fullName,
            initials,
          };

          this._currentUser.set(mappedUser);
          this.persistSession(res.token, mappedUser, payload.rememberMe);
          this._loading.set(false);
        },
        error: (err) => {
          this._errorMessage.set(
            err?.error?.message ??
              'Login failed. Please check your email/password and try again.',
          );
          this._loading.set(false);
        },
      }),
    );
  }

  /** Returns the redirect route based on the current user's backend role */
  getHomeRoute(): string {
    const user = this._currentUser();
    if (!user) return '/login';
    const role = mapBackendRoleToUserRole(user.role_name);
    return ROLE_HOME[role];
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
    this._currentUser.set(null);
  }

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY) ?? sessionStorage.getItem(TOKEN_KEY);
  }

  private persistSession(token: string, user: AuthUser, rememberMe: boolean): void {
    const store = rememberMe ? localStorage : sessionStorage;
    store.setItem(TOKEN_KEY, token);
    store.setItem(USER_KEY, JSON.stringify(user));
  }

  private readStoredUser(): AuthUser | null {
    const raw = localStorage.getItem(USER_KEY) ?? sessionStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  }
}
