export interface Payment {
  payment_id: number;
  student_id: number;
  payment_scope: 'Semester' | 'Year';
  academic_year_id: number;
  semester_id: number | null;
  amount: number;
  payment_type: 'Tuition' | 'Exam' | 'Library' | 'Other';
  payment_method: 'Cash' | 'ABA' | 'Wing' | 'Card';
  status: 'Pending' | 'Paid' | 'Failed';
  paid_date: string;
  reference_code: string | null;
  note: string | null;

  // Joined fields
  student_name?: string;
  student_code?: string;
  student_phone?: string;
  group_name?: string;
  year_label?: string;
  semester_name?: string;
}

export interface CreatePaymentPayload {
  student_id: number;
  payment_scope: 'Semester' | 'Year';
  academic_year_id: number;
  semester_id?: number | null;
  amount: number;
  payment_type?: string;
  payment_method?: string;
  status?: string;
  paid_date?: string;
  reference_code?: string;
  note?: string;
}
