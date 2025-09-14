import { useCallback, useEffect, useRef, useState } from "react"
import type { StudentInfo } from "../interfaces/studentInterface"
import { useUserStore } from "../store/userStore";
import { studentService } from "../services/student.service";

const useStudents = () => {
    const [students, setStudents] = useState<StudentInfo[]>([]);
    const user = useUserStore((s) => s.user);
    const fetchUser = useUserStore((s) => s.fetchUser);

    useEffect(() => {
        const prepareHook = async () => {
            if (!user) {
                await fetchUser();
            }
        }
        prepareHook();
    }, [user]);

    //Endpoints GET
    const loadingRef = useRef<string | null>(null);

    const fetchStudentsByClass = useCallback(async (classId: string) => {
        if (!classId) return { state: "error", message: "classId inválido" } as const;

        if (loadingRef.current === classId) {
            return { state: "success", message: "Petición en curso" } as const;
        }
        loadingRef.current = classId;

        const res = await studentService.getStudentsByClassId(classId);
        const success = res?.code == 200
        if (success) {
            const students = res.data

            students.sort((a: StudentInfo, b: StudentInfo) => {
                const firstLastname = a.lastname.toLowerCase();
                const secondLastname = b.lastname.toLowerCase();

                if (firstLastname < secondLastname) return -1;
                if (firstLastname > secondLastname) return 1;
                return 0;
            })

            setStudents(students);
        }
        loadingRef.current = null;
        return {
            state: success ? "success" : "error",
            message: success ? "Estudiantes recuperados" : res?.error
        }
    }, [])

    return {
        students,
        fetchStudentsByClass,
    }
}

export default useStudents;
