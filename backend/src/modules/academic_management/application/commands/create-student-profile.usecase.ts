import { Inject, Injectable, Logger } from '@nestjs/common';
import { USER_REPO, STUDENT_REPO, ROLE_REPO, HASHER } from '../../tokens';
import type { StudentRepositoryPort } from '../../domain/ports/student.repository.ports';
import type { UserRepositoryPort } from 'src/modules/identity/domain/ports/user.repository.port';
import type { RoleRepositoryPort } from 'src/modules/rbac/domain/ports/role.repository.port';
import { BcryptHasher } from 'src/modules/identity/infrastructure/crypto/bcrypt.hasher';
import { InternalServerError } from 'src/shared/handler/errors';
import { Student } from '../../domain/entities/student.entity';

@Injectable()
export class CreateStudentProfileUseCase {
  private readonly logger = new Logger(CreateStudentProfileUseCase.name)
  private readonly studentRoleName = 'estudiante'

  constructor(
    @Inject(USER_REPO) private readonly userRepo: UserRepositoryPort,
    @Inject(STUDENT_REPO) private readonly studentRepo: StudentRepositoryPort,
    @Inject(ROLE_REPO) private readonly roleRepo: RoleRepositoryPort,
    @Inject(HASHER) private readonly hasher: BcryptHasher,
  ) { }

  async execute(input: { studentName: string, studentLastname: string, studentCode: string }): Promise<Student> {
    const studentRole = await this.roleRepo.findByName(this.studentRoleName)
    const studentRoleId = studentRole?.id
    if (!studentRole || !studentRoleId) {
      this.logger.error(`Error fetching RoleId by name ${this.studentRoleName}`)
      throw new InternalServerError("Ha ocurrido un error intentando crear un nuevo perfil para el estudiante");
    }

    const password = `${this.fixedString(input.studentLastname + input.studentCode)}UPB2025`
    const hash = await this.hasher.hash(password)

    const email = `${this.fixedString(input.studentName + input.studentLastname + input.studentCode)}@upb.edu`

    const newUser = await this.userRepo.create(
      input.studentName,
      input.studentLastname,
      email,
      hash,
      true,
      studentRoleId
    );

    if (!newUser) {
      this.logger.error("Error creating new user")
      throw new InternalServerError("Ha ocurrido un error intentando crear un nuevo perfil para el estudiante.");
    }

    const newStudent = await this.studentRepo.create(
      newUser.id, 
      input.studentCode
    );

    if (!newStudent) {
      this.logger.error("Error creating new student")
      throw new InternalServerError("Ha ocurrido un error creando la cuenta del estudiante");
    }
    return newStudent;
  }

  fixedString(s: string): string {
    return s.trim().toLowerCase().replace(/\s+/g, '');
  }
}
