import apiClient from "../api/apiClient";
import type { createEnrollmentInterface, EnrollGroupRequest, } from "../interfaces/enrollmentInterface";

export const enrollmentService = {
  //Endpoints POST
  async enrollStudentInClass(enrollData: createEnrollmentInterface) {
    try {
      const response = await apiClient.post(`/academic/enrollments/single-student`, enrollData);
      return response.data;
    } catch (error) {
      console.error("Failed to enroll student in class", error);
      throw error;
    }
  },

  async enrollGroupStudents(payload: EnrollGroupRequest) {
    try {
      const response = await apiClient.post('/academic/enrollments/group-students', payload);
      return response.data
    } catch (error) {
      console.error("Failed to enroll group of students", error);
      throw error;
    }
  },
};