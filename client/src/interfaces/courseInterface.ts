export interface Course {
    id: string;
    name: string;
    teacherId: string;
    isActive?: boolean;
}

export interface CreateCourseDTO {
    name: string
}