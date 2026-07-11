export interface Exam {
  exam_id: number;
  group_id: number;
  exam_type_id: number;
  exam_date: string;

  // Joined fields
  exam_type_name?: string;
  group_name?: string;
  class_code?: string;
}

export interface CreateExamPayload {
  group_id: number;
  exam_type_id: number;
  exam_date: string;
}
