import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth';
import { mapBackendRoleToUserRole, UserRole } from '../models/auth';

const ROLE_HOME: Record<UserRole, string> = {
  administrator: '/admin/dashboard',
  teacher: '/teacher/dashboard',
  student: '/student/dashboard',
};

/**
 * Guard that redirects to login if unauthenticated.
 * Can optionally require a specific role.
 */
export function authGuard(requiredRole?: UserRole): CanActivateFn {
  return () => {
    const auth = inject(AuthService);
    const router = inject(Router);

    if (!auth.isAuthenticated()) {
      return router.parseUrl('/login');
    }

    if (requiredRole) {
      const user = auth.currentUser();
      const role = user ? mapBackendRoleToUserRole(user.role_name) : null;
      if (role !== requiredRole) {
        // Redirect to the user's actual home
        return router.parseUrl(ROLE_HOME[role ?? 'administrator']);
      }
    }

    return true;
  };
}

/**
 * Guard that redirects authenticated users AWAY from the login page
 * to their role-specific dashboard.
 */
export const loginGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isAuthenticated()) {
    const user = auth.currentUser();
    const role = user ? mapBackendRoleToUserRole(user.role_name) : 'administrator';
    return router.parseUrl(ROLE_HOME[role]);
  }

  return true;
};
