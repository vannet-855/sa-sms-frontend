export interface SystemUser {
  user_id: number;
  email: string;
  role_id: number;
  role_name: string;
  ref_id: number | null;
  created_at: string;
}

export interface CreateSystemUserPayload {
  email: string;
  password: string;
  role_id: number;
  ref_id?: number;
}
