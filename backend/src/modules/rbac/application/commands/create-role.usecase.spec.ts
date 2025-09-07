import { CreateRoleUseCase } from './create-role.usecase';
import type { RoleRepositoryPort } from '../../domain/ports/role.repository.port';
import { Role } from '../../domain/entities/role.entity';

describe('CreateRoleUseCase', () => {
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

  it('creates a role when name is unique', async () => {
    const repo = makeRepoMock({
      findByName: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockImplementation(async (name: string, description?: string | null) => new Role('r1', name, description ?? null)),
    });
    const usecase = new CreateRoleUseCase(repo);
    const result = await usecase.execute({ name: 'docente', description: 'Teacher role' });

    expect(repo.findByName).toHaveBeenCalledWith('docente');
    expect(repo.create).toHaveBeenCalledWith('docente', 'Teacher role');
    expect(result).toEqual(new Role('r1', 'docente', 'Teacher role'));
  });

  it('throws if role name already exists', async () => {
    const existing = new Role('r0', 'docente', 'existing');
    const repo = makeRepoMock({
      findByName: jest.fn().mockResolvedValue(existing),
    });
    const usecase = new CreateRoleUseCase(repo);

    await expect(usecase.execute({ name: 'docente' })).rejects.toThrow('Role name already exists');
    expect(repo.findByName).toHaveBeenCalledWith('docente');
  });
});

