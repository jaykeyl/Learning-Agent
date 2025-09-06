import { useEffect } from "react";
import type { createEnrollmentInterface, EnrollGroupRequest, EnrollGroupResponse, SoftDeleteSingleEnrollmentDTO, } from "../interfaces/enrollmentInterface";
import { enrollmentService } from "../services/enrollment.service";
import { useUserStore } from "../store/userStore"


const useEnrollment = () => {
    const user = useUserStore((s) => s.user);
    const fetchUser = useUserStore((s) => s.fetchUser);

    useEffect(() => {
        const prepareHook = async () => {
            if (!user) {
                await fetchUser();
            }
        };
        prepareHook();
    }, [user]);

    //Endpoints POST
    const enrollSingleStudent = async (enrollData: createEnrollmentInterface) => {
        const res = await enrollmentService.enrollStudentInClass(enrollData);
        const success = res?.code == 201
        return {
            state: success ? "success" : "error",
            message: success ? "Estudiante inscrito correctamente" : res?.error
        };
    }

    const enrollGroupStudents = async (payload: EnrollGroupRequest) => {
        const res = await enrollmentService.enrollGroupStudents(payload);
        const success = res?.code == 201

        if (success) {
            const data: EnrollGroupResponse = res.data;
            return {
                state: "success",
                message: "Solicitud procesada correctamente",
                data
            }
        } else {
            return {
                state: "error",
                message: res?.error,
                data: {
                    totalRows: 0,
                    errorRows: 0,
                    existingRows: 0,
                    successRows: 0
                }
            }
        }
    }

    //Endpoints PUT
    const softDeleteSingleEnrollment = async (classInfo: Omit<SoftDeleteSingleEnrollmentDTO, "teacherId">) => {
        if (!user) return {
            state: "error",
            message: "No se ha podido cargar la información del usuario"
        };
        const classId = classInfo.classId;
        const enrollData = {
            teacherId: user.id,
            studentId: classInfo.studentId
        }
        const res = await enrollmentService.softDeleteSingleEnrollment(classId, enrollData);
        const success = res?.code == 201
        return {
            state: success ? "success" : "error",
            message: success ? "Estudiante eliminado correctamente" : res?.error
        };
    }

    return {
        enrollSingleStudent,
        enrollGroupStudents,
        softDeleteSingleEnrollment,
    }
}

export default useEnrollment;