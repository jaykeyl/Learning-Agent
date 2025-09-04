import type { createEnrollmentInterface, EnrollGroupRequest, EnrollGroupResponse, } from "../interfaces/enrollmentInterface";
import { enrollmentService } from "../services/enrollment.service";

const useEnrollment = () => {
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

    return {
        enrollSingleStudent,
        enrollGroupStudents,
    }
}

export default useEnrollment;