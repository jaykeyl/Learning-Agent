export class CourseIndexNodeDto {
    id!: string;
    title!: string;
    level!: number;
    children?: CourseIndexNodeDto[];
}

export class CourseIndexResponseDto {
    nodes!: CourseIndexNodeDto[];
}
