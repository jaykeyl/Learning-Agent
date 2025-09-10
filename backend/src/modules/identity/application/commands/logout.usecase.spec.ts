import { LogoutUseCase } from './logout.usecase';
import { Logger } from '@nestjs/common/services/logger.service';

describe('LogoutUseCase', () => {
  let useCase: LogoutUseCase;
  let sessionRepo: any;

  beforeEach(() => {
    sessionRepo = { findByRefreshToken: jest.fn(), revokeById: jest.fn() };
    useCase = new LogoutUseCase(sessionRepo);

    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
  });

  it('should logout successfully when session exists', async () => {
    sessionRepo.findByRefreshToken.mockResolvedValue({ id: 's1' });
    const result = await useCase.execute({ refreshToken: 'token' });

    expect(sessionRepo.revokeById).toHaveBeenCalledWith('s1');
    expect(result).toEqual({ ok: true });
  });

  it('should succeed even if session does not exist', async () => {
    sessionRepo.findByRefreshToken.mockResolvedValue(null);
    const result = await useCase.execute({ refreshToken: 'token' });

    expect(sessionRepo.revokeById).not.toHaveBeenCalled();
    expect(result).toEqual({ ok: true });
  });
});
