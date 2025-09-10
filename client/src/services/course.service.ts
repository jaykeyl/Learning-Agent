import apiClient from "../api/apiClient";
import type { Course } from "../interfaces/courseInterface";

export const courseService = {
  //Endpoints GET
  async getCourseById(courseId: string) {
    try {
      const response = await apiClient.get(`/academic/course/${courseId}`);
      return response.data;
    } catch (error) {
      console.error("Failed to get course by id", error);
      throw error;
    }
  },

  async getCourseByTeacher(teacherId: string) {
    try {
      const response = await apiClient.get(`/academic/course/by-teacher/${teacherId}`);
      return response.data;
    } catch (error) {
      console.error("Failed to get courses", error);
      throw error;
    }
  },
  
  //Endpoints POST
  async createCourse(course: Omit<Course, "id">) {
    try {
      const response = await apiClient.post("/academic/course/", course);
      return response.data;
    } catch (error) {
      console.error("Failed to create course", error);
      throw error;
    }
  },  
};
