export interface Enrollment {
  group_id: number;
  class_id: number;

  // Joined fields
  group_name?: string;
  course_name?: string;
  class_code?: string;
  teacher_name?: string;
  student_count?: number;
}

export interface CreateEnrollmentPayload {
  group_id: number;
  class_id: number;
}
