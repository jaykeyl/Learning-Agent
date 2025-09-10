import { AttachPermissionUseCase } from './attach-permission.usecase';
import type { RoleRepositoryPort } from '../../domain/ports/role.repository.port';
import type { PermissionRepositoryPort } from '../../domain/ports/permission.repository.port';
import { Role } from '../../domain/entities/role.entity';
import { Permission } from '../../domain/entities/permission.entity';

describe('AttachPermissionUseCase', () => {
  function makeRoleRepoMock(overrides: Partial<RoleRepositoryPort> = {}): RoleRepositoryPort {
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

  function makePermRepoMock(overrides: Partial<PermissionRepositoryPort> = {}): PermissionRepositoryPort {
    return {
      findById: jest.fn(),
      findByActionResource: jest.fn(),
      create: jest.fn(),
      list: jest.fn(),
      ...overrides,
    } as unknown as PermissionRepositoryPort;
  }

  it('attaches permission when role and permission exist', async () => {
    const roleRepo = makeRoleRepoMock({
      findById: jest.fn().mockResolvedValue(new Role('r1', 'docente', null)),
      attachPermission: jest.fn().mockResolvedValue(undefined),
    });
    const permRepo = makePermRepoMock({
      findById: jest.fn().mockResolvedValue(new Permission('p1', 'read', 'document', null)),
    });
    const usecase = new AttachPermissionUseCase(roleRepo, permRepo);
    const output = await usecase.execute({ roleId: 'r1', permissionId: 'p1' });

    expect(roleRepo.findById).toHaveBeenCalledWith('r1');
    expect(permRepo.findById).toHaveBeenCalledWith('p1');
    expect(roleRepo.attachPermission).toHaveBeenCalledWith('r1', 'p1');
    expect(output).toEqual({ ok: true });
  });

  it('throws if role not found', async () => {
    const roleRepo = makeRoleRepoMock({ findById: jest.fn().mockResolvedValue(null) });
    const permRepo = makePermRepoMock({ findById: jest.fn().mockResolvedValue(new Permission('p1', 'read', 'document', null)) });
    const usecase = new AttachPermissionUseCase(roleRepo, permRepo);

    await expect(usecase.execute({ roleId: 'r-missing', permissionId: 'p1' })).rejects.toThrow('Role not found');
    expect(roleRepo.findById).toHaveBeenCalledWith('r-missing');
  });

  it('throws if permission not found', async () => {
    const roleRepo = makeRoleRepoMock({ findById: jest.fn().mockResolvedValue(new Role('r1', 'docente', null)) });
    const permRepo = makePermRepoMock({ findById: jest.fn().mockResolvedValue(null) });
    const usecase = new AttachPermissionUseCase(roleRepo, permRepo);

    await expect(usecase.execute({ roleId: 'r1', permissionId: 'p-missing' })).rejects.toThrow('Permission not found');
    expect(permRepo.findById).toHaveBeenCalledWith('p-missing');
  });
});

