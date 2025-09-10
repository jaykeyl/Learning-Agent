import { Test, TestingModule } from '@nestjs/testing';
import { ListClassesUseCase } from './list-classes.usecase';
import { CLASSES_REPO } from '../../tokens';

describe('ListClassesUseCase', () => {
  it('should return list of classes', async () => {
    const mockRepo = { list: jest.fn().mockResolvedValue([{ id: 'c1' }]) };
    const useCase = new ListClassesUseCase(mockRepo as any);
    const result = await useCase.execute();
    expect(result).toEqual([{ id: 'c1' }]);
  });
});

