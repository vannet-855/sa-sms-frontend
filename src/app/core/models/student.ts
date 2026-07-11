export type Gender = 'Male' | 'Female' | 'Other';

/** Matches the backend students table columns exactly */
export interface Student {
  student_id: number;
  student_code: string | null;
  first_name: string;
  last_name: string;
  gender: Gender;
  date_of_birth: string;
  phone: string | null;
  address: string | null;
  guardian_name: string | null;
  guardian_phone: string | null;
  department_id: number | null;
  major_id: number | null;
  degree_level: string; // 'Associate' | 'Bachelor' | 'Master' | 'PhD'
  academic_year: number;
  status: string; // 'Active' | 'Inactive' | 'Graduated' | 'Dropped'
  user_id: number | null;
  group_id: number | null;
}

export type StudentView = Student & {
  full_name: string;
  major_name?: string;
  group_name?: string;
};

/** Backend student list endpoint returns a flat array (no wrapper) */
export type StudentListResponse = Student[];

/** Payload for create/update matches the allowed fields in studentController.update */
export interface CreateStudentPayload {
  first_name: string;
  last_name: string;
  gender: Gender;
  date_of_birth: string;
  student_code?: string;
  phone?: string;
  address?: string;
  guardian_name?: string;
  guardian_phone?: string;
  department_id?: number;
  major_id?: number;
  degree_level?: string;
  academic_year?: number;
  status?: string;
  group_id?: number;
}
