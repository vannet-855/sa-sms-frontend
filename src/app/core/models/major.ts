export interface Major {
  major_id: number;
  department_id: number;
  name: string;

  // Joined fields
  department_name?: string;
}

export interface CreateMajorPayload {
  department_id: number;
  name: string;
}
