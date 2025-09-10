jest.mock('../../../../shared/handler/errors', () => ({
  NotFoundError: class NotFoundError extends Error {},
  ForbiddenError: class ForbiddenError extends Error {},
}));

import { Test, TestingModule } from '@nestjs/testing';
import { GetClassByIdUseCase } from './get-class-by-id.usecase';
import { CLASSES_REPO } from '../../tokens';
import { Classes } from '../../domain/entities/classes.entity';
import { NotFoundError } from '../../../../shared/handler/errors';

describe('GetClassByIdUseCase', () => {
  let useCase: GetClassByIdUseCase;
  let classesRepo: { findById: jest.Mock };

  beforeEach(async () => {
    classesRepo = { findById: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetClassByIdUseCase,
        { provide: CLASSES_REPO, useValue: classesRepo },
      ],
    }).compile();

    useCase = module.get<GetClassByIdUseCase>(GetClassByIdUseCase);
  });

  it('should return class when found and active', async () => {
    const mockClass = { id: '1', isActive: true } as Classes;
    classesRepo.findById.mockResolvedValue(mockClass);

    const result = await useCase.execute('1');
    expect(result).toEqual(mockClass);
    expect(classesRepo.findById).toHaveBeenCalledWith('1');
  });

  it('should return null when class is found but inactive', async () => {
    const mockClass = { id: '2', isActive: false } as Classes;
    classesRepo.findById.mockResolvedValue(mockClass);

    const result = await useCase.execute('2');
    expect(result).toBeNull();
    expect(classesRepo.findById).toHaveBeenCalledWith('2');
  });

  it('should throw NotFoundError when class not found', async () => {
    classesRepo.findById.mockResolvedValue(null);

    await expect(useCase.execute('3')).rejects.toThrow(NotFoundError);
    expect(classesRepo.findById).toHaveBeenCalledWith('3');
  });
});
