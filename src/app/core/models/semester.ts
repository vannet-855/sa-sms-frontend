export interface Semester {
  semester_id: number;
  semester_name: string;
  year_id: number;
  year_label?: string;
}

export interface CreateSemesterPayload {
  semester_name: string;
  year_id: number;
}
