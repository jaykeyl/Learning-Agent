import { ListRolesUseCase } from './list-roles.usecase';
import type { RoleRepositoryPort } from '../../domain/ports/role.repository.port';
import { Role } from '../../domain/entities/role.entity';

describe('ListRolesUseCase', () => {
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

  it('returns roles from repository', async () => {
    const roles = [new Role('r1', 'docente', null), new Role('r2', 'estudiante', null)];
    const repo = makeRepoMock({ list: jest.fn().mockResolvedValue(roles) });
    const usecase = new ListRolesUseCase(repo);

    const result = await usecase.execute();
    expect(repo.list).toHaveBeenCalled();
    expect(result).toEqual(roles);
  });
});

