// MOCKEAR ERRORES ANTES DE IMPORTAR EL USE CASE
jest.mock('../../../../shared/handler/errors', () => ({
  NotFoundError: class NotFoundError extends Error {},
  ForbiddenError: class ForbiddenError extends Error {},
}));

import { LoginUseCase } from './login.usecase';
import { NotFoundError, ForbiddenError } from '../../../../shared/handler/errors';
import { Logger } from '@nestjs/common/services/logger.service';

describe('LoginUseCase', () => {
  let useCase: LoginUseCase;
  let userRepo: any;
  let hasher: any;
  let tokenService: any;
  let sessionRepo: any;

  beforeEach(() => {
    userRepo = { findByEmail: jest.fn() };
    hasher = { compare: jest.fn() };
    tokenService = { signAccess: jest.fn(), signRefresh: jest.fn() };
    sessionRepo = { revokeAll: jest.fn(), createSession: jest.fn() };

    useCase = new LoginUseCase(userRepo, hasher, tokenService, sessionRepo);

    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
  });

  it('should login successfully with correct credentials', async () => {
    const user = { id: 'u1', email: 'test@test.com', passwordHash: 'hash', isActive: true };
    userRepo.findByEmail.mockResolvedValue(user);
    hasher.compare.mockResolvedValue(true);
    tokenService.signAccess.mockReturnValue('access-token');
    tokenService.signRefresh.mockReturnValue('refresh-token');
    sessionRepo.createSession.mockResolvedValue({ id: 's1' });

    const result = await useCase.execute({ email: 'test@test.com', password: '1234' });

    expect(result.accessToken).toBe('access-token');
    expect(result.refreshToken).toBe('refresh-token');
    expect(sessionRepo.revokeAll).toHaveBeenCalledWith('u1');
    expect(sessionRepo.createSession).toHaveBeenCalled();
  });

  it('should throw error for invalid email', async () => {
    userRepo.findByEmail.mockResolvedValue(null);
    await expect(useCase.execute({ email: 'bad@test.com', password: '1234' }))
      .rejects.toThrow('Invalid credentials');
  });

  it('should throw error for wrong password', async () => {
    const user = { id: 'u1', email: 'test@test.com', passwordHash: 'hash', isActive: true };
    userRepo.findByEmail.mockResolvedValue(user);
    hasher.compare.mockResolvedValue(false);

    await expect(useCase.execute({ email: 'test@test.com', password: 'wrong' }))
      .rejects.toThrow('Invalid credentials');
  });
});
