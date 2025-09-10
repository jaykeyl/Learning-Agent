export interface createEnrollmentInterface {
  studentName: string;
  studentLastname: string;
  studentCode: string;
  classId: string;
}

export interface EnrollGroupRow {
  studentName: string;
  studentLastname: string;
  studentCode: string;
  email?: string;
  career?: string;
  campus?: string;
  admissionYear?: number;
  residence?: string;
}

export interface EnrollGroupRequest {
  classId: string;
  studentRows: EnrollGroupRow[];
}

export interface EnrollGroupResponse {
  totalRows: number;
  errorRows: number;
  existingRows: number;
  successRows: number;
}

export interface SoftDeleteSingleEnrollmentDTO {
  studentId: string;
  teacherId: string;
  classId: string;
}
