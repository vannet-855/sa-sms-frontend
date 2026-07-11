export interface Teacher {
  teacher_id: number;
  full_name: string;
  phone: string | null;
  email: string | null;
  user_id: number | null;
}

export interface CreateTeacherPayload {
  full_name: string;
  phone?: string;
  email?: string;
}

export interface TeacherListResponse {
  data: Teacher[];
  total: number;
  page: number;
  limit: number;
}
