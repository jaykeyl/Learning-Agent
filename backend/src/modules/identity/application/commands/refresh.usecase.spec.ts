import { RefreshUseCase } from './refresh.usecase';
import { Logger } from '@nestjs/common/services/logger.service';

describe('RefreshUseCase', () => {
  let useCase: RefreshUseCase;
  let sessionRepo: any;
  let tokenService: any;

  beforeEach(() => {
    sessionRepo = { findByRefreshToken: jest.fn(), revokeById: jest.fn(), createSession: jest.fn() };
    tokenService = { verifyRefresh: jest.fn(), signAccess: jest.fn(), signRefresh: jest.fn() };

    useCase = new RefreshUseCase(sessionRepo, tokenService);

    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
  });

  it('should refresh tokens successfully', async () => {
    const payload = { sub: 'u1', email: 'test@test.com' };
    tokenService.verifyRefresh.mockReturnValue(payload);
    sessionRepo.findByRefreshToken.mockResolvedValue({ id: 's1', userId: 'u1', expiresAt: new Date(Date.now() + 10000) });
    tokenService.signAccess.mockReturnValue('new-access');
    tokenService.signRefresh.mockReturnValue('new-refresh');

    const result = await useCase.execute({ refreshToken: 'old-refresh' });

    expect(sessionRepo.revokeById).toHaveBeenCalledWith('s1');
    expect(sessionRepo.createSession).toHaveBeenCalled();
    expect(result).toEqual({ accessToken: 'new-access', refreshToken: 'new-refresh' });
  });

  it('should throw error if session invalid', async () => {
    const payload = { sub: 'u1', email: 'test@test.com' };
    tokenService.verifyRefresh.mockReturnValue(payload);
    sessionRepo.findByRefreshToken.mockResolvedValue(null);

    await expect(useCase.execute({ refreshToken: 'bad' }))
      .rejects.toThrow('Invalid session');
  });
});
