import { GetMeUseCase } from './get-me.usecase';
import { Logger } from '@nestjs/common/services/logger.service';
import { NotFoundException } from '@nestjs/common';

describe('GetMeUseCase', () => {
  let useCase: GetMeUseCase;
  let userRepo: any;
  let authz: any;

  beforeEach(() => {
    userRepo = { findById: jest.fn() };
    authz = { getRolesForUser: jest.fn() };
    useCase = new GetMeUseCase(userRepo, authz);

    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
  });

  it('should return user info with roles', async () => {
    const user = { id: 'u1', email: 'test@test.com', name: 'John', lastname: 'Doe' };
    const roles = ['admin', 'user'];
    userRepo.findById.mockResolvedValue(user);
    authz.getRolesForUser.mockResolvedValue(roles);

    const result = await useCase.execute({ userId: 'u1' });

    expect(result).toEqual({ id: 'u1', email: 'test@test.com', name: 'John', lastname: 'Doe', roles });
  });

  it('should throw NotFoundException if user does not exist', async () => {
    userRepo.findById.mockResolvedValue(null);
    await expect(useCase.execute({ userId: 'u1' }))
      .rejects.toBeInstanceOf(NotFoundException);
  });
});
