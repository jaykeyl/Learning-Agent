import { ListStudentsUseCase } from './list-student.usecase';
import { STUDENT_REPO } from '../../tokens';


describe('ListStudentsUseCase', () => {
  it('should return list of students', async () => {
    const mockRepo = { list: jest.fn().mockResolvedValue([{ id: 's1' }]) };
    const useCase = new ListStudentsUseCase(mockRepo as any);
    const result = await useCase.execute();
    expect(result).toEqual([{ id: 's1' }]);
  });
});
