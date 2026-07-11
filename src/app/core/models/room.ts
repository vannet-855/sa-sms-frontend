export interface Room {
  room_id: number;
  room_name: string;
  room_type: 'Classroom' | 'Lab' | 'Exam' | 'Meeting';
  capacity: number | null;
  building: string | null;
  floor: number | null;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateRoomPayload {
  room_name: string;
  room_type: string;
  capacity?: number;
  building?: string;
  floor?: number;
  description?: string;
}
