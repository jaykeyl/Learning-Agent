import { Enrollment } from "../entities/enrollment.entity";
export interface EnrollmentRepositoryPort {
    findByStudentId(studentId: string): Promise<Enrollment[]>;
    findByClassId(classId: string): Promise<Enrollment[]>;
    create(
        studentId: string,
        classId: string,
    ): Promise<Enrollment>;
    list(): Promise<Enrollment[]>;
    softDelete(
        studentId: string,    
        classId: string
    ): Promise<Enrollment>;
    enableEnrollment(
        studentId: string,
        classId: string
    ): Promise<Enrollment>;
    findByStudentAndClass(
        studentId: string, 
        classId: string
    ): Promise<Enrollment | null>
}