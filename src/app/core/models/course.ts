export interface Course {
  course_id: number;
  course_code: string;
  course_name: string;
  credit: number | null;
  major_id: number | null;
  description: string | null;
  status: string;
  midterm_max: number | null;
  final_max: number | null;

  // Joined fields
  major_name?: string;
}

export interface CreateCoursePayload {
  course_code: string;
  course_name: string;
  credit?: number;
  major_id?: number;
  description?: string;
  status?: string;
  midterm_max?: number | null;
  final_max?: number | null;
}

export interface CourseListResponse {
  data: Course[];
  total: number;
  page: number;
  limit: number;
}
