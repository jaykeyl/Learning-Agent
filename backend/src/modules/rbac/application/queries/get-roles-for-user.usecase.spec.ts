import { GetRolesForUserUseCase } from './get-roles-for-user.usecase';
import type { RoleRepositoryPort } from '../../domain/ports/role.repository.port';
import { Role } from '../../domain/entities/role.entity';

describe('GetRolesForUserUseCase', () => {
  function makeRepoMock(overrides: Partial<RoleRepositoryPort> = {}): RoleRepositoryPort {
    return {
      findById: jest.fn(),
      findByName: jest.fn(),
      create: jest.fn(),
      list: jest.fn(),
      attachPermission: jest.fn(),
      listForUser: jest.fn(),
      ...overrides,
    } as unknown as RoleRepositoryPort;
  }

  it('returns roles for the given user', async () => {
    const roles = [new Role('r1', 'docente', null)];
    const repo = makeRepoMock({ listForUser: jest.fn().mockResolvedValue(roles) });
    const usecase = new GetRolesForUserUseCase(repo);

    const result = await usecase.execute({ userId: 'u1' });
    expect(repo.listForUser).toHaveBeenCalledWith('u1');
    expect(result).toEqual(roles);
  });
});

