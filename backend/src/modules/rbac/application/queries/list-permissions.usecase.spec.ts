import { ListPermissionsUseCase } from './list-permissions.usecase';
import type { PermissionRepositoryPort } from '../../domain/ports/permission.repository.port';
import { Permission } from '../../domain/entities/permission.entity';

describe('ListPermissionsUseCase', () => {
  function makeRepoMock(overrides: Partial<PermissionRepositoryPort> = {}): PermissionRepositoryPort {
    return {
      findById: jest.fn(),
      findByActionResource: jest.fn(),
      create: jest.fn(),
      list: jest.fn(),
      ...overrides,
    } as unknown as PermissionRepositoryPort;
  }

  it('returns permissions from repository', async () => {
    const perms = [
      new Permission('p1', 'read', 'document', null),
      new Permission('p2', 'write', 'document', null),
    ];
    const repo = makeRepoMock({ list: jest.fn().mockResolvedValue(perms) });
    const usecase = new ListPermissionsUseCase(repo);

    const result = await usecase.execute();
    expect(repo.list).toHaveBeenCalled();
    expect(result).toEqual(perms);
  });
});

