<<<<<<< HEAD
import { Injectable, computed, signal } from '@angular/core';
=======
import { Injectable, computed, signal, Inject, PLATFORM_ID, NgZone } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
>>>>>>> 867e5c2a (Update ID Number in Table)
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthUser, LoginRequest, UserRole, mapBackendRoleToUserRole } from '../models/auth';

const TOKEN_KEY = 'edutrack_token';
const USER_KEY = 'edutrack_user';

<<<<<<< HEAD
=======
function getTokenExpiry(token: string): number | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = parts[1];
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    const parsed = JSON.parse(decoded);
    return parsed.exp ? parsed.exp * 1000 : null;
  } catch {
    return null;
  }
}

function isTokenExpired(token: string): boolean {
  const expiry = getTokenExpiry(token);
  if (!expiry) return true;
  return Date.now() >= expiry;
}

>>>>>>> 867e5c2a (Update ID Number in Table)
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
<<<<<<< HEAD
=======
  private logoutTimer?: any;
>>>>>>> 867e5c2a (Update ID Number in Table)

  readonly currentUser = this._currentUser.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly errorMessage = this._errorMessage.asReadonly();
  readonly isAuthenticated = computed(() => !!this._currentUser());

<<<<<<< HEAD
  constructor(private http: HttpClient) {}
=======
  constructor(
    private http: HttpClient,
    private router: Router,
    private ngZone: NgZone,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    const token = this.getToken();
    if (token) {
      this.setAutoLogoutTimer(token);
    }
  }
>>>>>>> 867e5c2a (Update ID Number in Table)

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
<<<<<<< HEAD
=======
          this.setAutoLogoutTimer(res.token);
>>>>>>> 867e5c2a (Update ID Number in Table)
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
<<<<<<< HEAD
=======
    if (this.logoutTimer) {
      clearTimeout(this.logoutTimer);
      this.logoutTimer = undefined;
    }
>>>>>>> 867e5c2a (Update ID Number in Table)
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
    this._currentUser.set(null);
  }

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY) ?? sessionStorage.getItem(TOKEN_KEY);
  }

<<<<<<< HEAD
=======
  private setAutoLogoutTimer(token: string): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    if (this.logoutTimer) {
      clearTimeout(this.logoutTimer);
    }

    const expiry = getTokenExpiry(token);
    if (!expiry) {
      return;
    }

    const delay = expiry - Date.now();
    if (delay <= 0) {
      this.logout();
      this.router.navigate(['/login']);
      return;
    }

    this.ngZone.runOutsideAngular(() => {
      this.logoutTimer = setTimeout(() => {
        this.ngZone.run(() => {
          this.logout();
          this.router.navigate(['/login']);
        });
      }, delay);
    });
  }

>>>>>>> 867e5c2a (Update ID Number in Table)
  private persistSession(token: string, user: AuthUser, rememberMe: boolean): void {
    const store = rememberMe ? localStorage : sessionStorage;
    store.setItem(TOKEN_KEY, token);
    store.setItem(USER_KEY, JSON.stringify(user));
  }

  private readStoredUser(): AuthUser | null {
<<<<<<< HEAD
=======
    const token = localStorage.getItem(TOKEN_KEY) ?? sessionStorage.getItem(TOKEN_KEY);
    if (!token || isTokenExpired(token)) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      sessionStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(USER_KEY);
      return null;
    }
>>>>>>> 867e5c2a (Update ID Number in Table)
    const raw = localStorage.getItem(USER_KEY) ?? sessionStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  }
}
