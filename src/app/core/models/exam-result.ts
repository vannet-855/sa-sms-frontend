export interface ExamResult {
  result_id: number;
  student_id: number;
  exam_id: number;
  score: number | null;

  // Joined fields
  student_name?: string;
  student_code?: string;
  exam_date?: string;
  exam_type?: string;
  group_name?: string;
}

export interface CreateExamResultPayload {
  student_id: number;
  exam_id: number;
  score?: number | null;
}
