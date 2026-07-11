export interface TimeSlot {
  time_slot_id: number;
  shift_id: number;
  period_label: string;
  start_time: string;
  end_time: string;
  shift_name?: string;
}

export interface CreateTimeSlotPayload {
  shift_id: number;
  period_label: string;
  start_time: string;
  end_time: string;
}
