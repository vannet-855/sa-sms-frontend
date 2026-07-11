export interface Class {
  class_id: number;
  class_code: string | null;
  course_id: number;
  teacher_id: number;
  group_id: number;
  shift_id: number | null;
  semester_id: number | null;
  year_id: number | null;

  // Joined fields
  course_code?: string;
  course_name?: string;
  teacher_name?: string;
  group_name?: string;
  shift_name?: string;
  semester_name?: string;
  year_label?: string;

  // Additional fields used in templates
  room?: string;
  schedule?: string;
  max_students?: number;
  start_date?: string;
  end_date?: string;
  status?: string;
}

export interface CreateClassPayload {
  class_code?: string;
  course_id: number;
  teacher_id: number;
  group_id: number;
  shift_id?: number;
  semester_id?: number;
  year_id?: number;
  room?: string;
  schedule?: string;
  max_students?: number;
  start_date?: string;
  end_date?: string;
  status?: string;
}

export interface ClassListResponse {
  data: Class[];
  total: number;
  page: number;
  limit: number;
}
