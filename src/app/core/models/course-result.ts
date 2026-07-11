export interface CourseResult {
  result_id: number;
  student_id: number;
  course_id: number;
  midterm: number | null;
  final: number | null;
  total: number | null;
  grade: string | null;
  grade_point: number | null;

  // Joined fields
  student_name?: string;
  student_code?: string;
  course_name?: string;
}

export interface CreateCourseResultPayload {
  student_id: number;
  course_id: number;
  midterm?: number | null;
  final?: number | null;
}
