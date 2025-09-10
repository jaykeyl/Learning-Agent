import { CreatePermissionUseCase } from './create-permission.usecase';
import type { PermissionRepositoryPort } from '../../domain/ports/permission.repository.port';
import { Permission } from '../../domain/entities/permission.entity';

describe('CreatePermissionUseCase', () => {
  function makeRepoMock(overrides: Partial<PermissionRepositoryPort> = {}): PermissionRepositoryPort {
    return {
      findById: jest.fn(),
      findByActionResource: jest.fn(),
      create: jest.fn(),
      list: jest.fn(),
      ...overrides,
    } as unknown as PermissionRepositoryPort;
  }

  it('creates a permission when not existing', async () => {
    const repo = makeRepoMock({
      findByActionResource: jest.fn().mockResolvedValue(null),
      create: jest
        .fn()
        .mockImplementation(async (action: string, resource: string, description?: string | null) => new Permission('p1', action, resource, description ?? null)),
    });
    const usecase = new CreatePermissionUseCase(repo);
    const result = await usecase.execute({ action: 'read', resource: 'document', description: 'read documents' });

    expect(repo.findByActionResource).toHaveBeenCalledWith('read', 'document');
    expect(repo.create).toHaveBeenCalledWith('read', 'document', 'read documents');
    expect(result).toEqual(new Permission('p1', 'read', 'document', 'read documents'));
  });

  it('throws if permission already exists', async () => {
    const existing = new Permission('p0', 'read', 'document', 'existing');
    const repo = makeRepoMock({
      findByActionResource: jest.fn().mockResolvedValue(existing),
    });
    const usecase = new CreatePermissionUseCase(repo);

    await expect(usecase.execute({ action: 'read', resource: 'document' })).rejects.toThrow('Permission already exists');
    expect(repo.findByActionResource).toHaveBeenCalledWith('read', 'document');
  });
});

