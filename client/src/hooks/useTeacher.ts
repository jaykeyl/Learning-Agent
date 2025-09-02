import { teacherService } from "../services/teacher.service";
import type { TeacherInfo } from "../interfaces/teacherInterface";
import { useState } from "react";

const useTeacher = () => {
    const [teacherInfo, setTeacherInfo] = useState<TeacherInfo>();

    //Endpoints GET
    const fetchTeacherInfoById = async (teacherId: string) => {
        const res = await teacherService.getTeacherInfoById(teacherId)
        const success = res.code == 200
        if (success) {
            setTeacherInfo(res.data)
        }
        return {
            state: success ? "success" : "error",
            message: success ? "Información del docente recuperada" : res.error
        }
    };

    return {
        teacherInfo,
        fetchTeacherInfoById,
    }
}

export default useTeacher