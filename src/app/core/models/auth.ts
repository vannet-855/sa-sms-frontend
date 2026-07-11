export type UserRole = 'administrator' | 'teacher' | 'student';

export interface LoginRequest {
  email: string;
  password: string;
  role: UserRole;
  rememberMe: boolean;
}

/** Maps the backend role_name (Admin/Teacher/Student) to frontend UserRole */
export function mapBackendRoleToUserRole(roleName: string): UserRole {
  switch (roleName) {
    case 'Admin':
      return 'administrator';
    case 'Teacher':
      return 'teacher';
    case 'Student':
      return 'student';
    default:
      return 'administrator';
  }
}

/** Matches the actual backend /api/auth/login response:
 *  { token, user: { user_id, email, role_name, ... } }
 */
export interface AuthUser {
  user_id: number;
  email: string;
  role_name: string; // "Admin" | "Teacher" | "Student"
  full_name: string; // constructed in the service from first_name + last_name
  initials: string; // constructed in the service from full_name
}

export interface LoginResponse {
  token: string;
  user: {
    user_id: number;
    email: string;
    role_name: string;
    first_name?: string;
    last_name?: string;
    full_name?: string;
    [key: string]: unknown;
  };
}
