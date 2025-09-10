import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AUTHZ_PORT, USER_REPO } from '../../tokens';
import type { UserRepositoryPort } from '../../domain/ports/user.repository.port';
import type { AuthorizationPort } from '../../domain/ports/authorization.port';

@Injectable()
export class GetMeUseCase {
  constructor(
    @Inject(USER_REPO) private readonly users: UserRepositoryPort,
    @Inject(AUTHZ_PORT) private readonly authz: AuthorizationPort,
  ) {}

  async execute(input: { userId: string }) {
    const user = await this.users.findById(input.userId);
    if (!user) throw new NotFoundException();
    const roles = await this.authz.getRolesForUser(user.id);

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      lastname: user.lastname,
      roles,
    };
  }
}
