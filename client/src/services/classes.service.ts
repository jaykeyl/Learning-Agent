import apiClient from "../api/apiClient";
import type { Clase, CreateClassDTO } from "../interfaces/claseInterface";

export const classService = {
  //Endpoints GET
  async getClases() {
    try {
      const response = await apiClient.get("/academic/classes/");
      return response.data;
    } catch (error) {
      console.error("Failed to fetch clases", error);
      throw error;
    }
  },

  async getClassById(id: string) {
    try {
      const response = await apiClient.get(`/academic/classes/${id}`);
      return response.data;
    } catch (error) {
      console.error("Failed to fetch clase", error);
      throw error;
    }
  },

  async getClassesByStudentId(id: string) {
    try {
      const response = await apiClient.get(`/academic/classes/by-student/${id}`);
      return response.data;
    } catch (error) {
      console.error("Failed to fetch classes", error);
      throw error;
    }
  },

  async getClassesByCourseId(id: string) {
    try {
      const response = await apiClient.get(`/academic/classes/by-course/${id}`);
      return response.data;
    } catch (error) {
      console.error("Failed to fetch course", error);
      throw error;
    }
  },
  
  //Endpoints POST
  async createClass(newClass: CreateClassDTO) {
    try {
      const response = await apiClient.post("/academic/classes", newClass);
      return response.data;
    } catch (error) {
      console.error("Failed to fetch clases by course", error);
      throw error;
    }
  },

  //Endpoints PUT
  async updateClass(id: string, claseData: Partial<Clase>) {
    try {
      const response = await apiClient.put(`/academic/classes/${id}`, claseData);
      return response.data;
    } catch (error) {
      console.error("Failed to update clase", error);
      throw error;
    }
  },

  async softDeleteClase(id: string, teacherId: string) {
    try {
      const response = await apiClient.put(`/academic/classes/remove/${id}`, { teacherId });
      return response.data
    } catch (error) {
      console.error("Failed to soft-delete clase", error);
      throw error;
    }
  },
};
