export interface Department {
  department_id: number;
  faculty_id: number;
  name: string;

  // Joined fields
  faculty_name?: string;
}

export interface CreateDepartmentPayload {
  faculty_id: number;
  name: string;
}
