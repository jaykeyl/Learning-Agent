/* eslint-disable @typescript-eslint/no-misused-promises */
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // --- Crear Roles ---
  const docenteRole = await prisma.role.upsert({
    where: { name: 'docente' },
    update: {},
    create: {
      name: 'docente',
      description: 'Docente que dicta materias',
    },
  });

  const estudianteRole = await prisma.role.upsert({
    where: { name: 'estudiante' },
    update: {},
    create: {
      name: 'estudiante',
      description: 'Estudiante inscrito en materias',
    },
  });

  // --- Hash de contraseñas ---
  const docentePassword = await bcrypt.hash('Docente123!', 10);
  const estudiantePassword = await bcrypt.hash('Estudiante123!', 10);

  // --- Crear/asegurar usuario docente ---
  const docente = await prisma.user.upsert({
    where: { email: 'docente@example.com' },
    update: {
      name: 'Doc',
      lastname: 'Ejemplo',
      isActive: true,
    },
    create: {
      email: 'docente@example.com',
      password: docentePassword,
      isActive: true,
      name: 'Doc',
      lastname: 'Ejemplo',
    },
  });
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: docente.id, roleId: docenteRole.id } },
    update: {},
    create: { userId: docente.id, roleId: docenteRole.id },
  });
  await prisma.teacherProfile.upsert({
    where: { userId: docente.id },
    update: {
      academicUnit: 'Ingeniería de Sistemas',
      title: 'Ing.',
      bio: 'Docente de bases de datos avanzadas',
    },
    create: {
      userId: docente.id,
      academicUnit: 'Ingeniería de Sistemas',
      title: 'Ing.',
      bio: 'Docente de bases de datos avanzadas',
    },
  });

  // --- Crear/asegurar usuario estudiante ---
  const estudiante = await prisma.user.upsert({
    where: { email: 'estudiante@example.com' },
    update: {
      name: 'Patricio',
      lastname: 'Estrella',
      isActive: true,
    },
    create: {
      email: 'estudiante@example.com',
      password: estudiantePassword,
      isActive: true,
      name: 'Patricio',
      lastname: 'Estrella',
    },
  });
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: estudiante.id, roleId: estudianteRole.id } },
    update: {},
    create: { userId: estudiante.id, roleId: estudianteRole.id },
  });
  await prisma.studentProfile.upsert({
    where: { userId: estudiante.id },
    update: {
      code: '2025001',
      career: 'Ingeniería de Sistemas',
      admissionYear: 2025,
    },
    create: {
      userId: estudiante.id,
      code: '2025001',
      career: 'Ingeniería de Sistemas',
      admissionYear: 2025,
    },
  });

  // crear user
  const email = 'admin@example.com';
  const pass = await bcrypt.hash('admin123', 10);
  await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, password: pass, isActive: true, name: 'Patricio', lastname: 'Estrella', },
  });

  // ==============================
  // Docentes y Materias (Cursos)
  // ==============================
  const docenteStdPassword = await bcrypt.hash('Docente123!', 10);

  async function ensureDocenteWithCourses(
    params: {
      email: string;
      name: string;
      lastname: string;
      title?: string;
      academicUnit?: string;
    },
    courseNames: string[],
  ) {
    // Usuario
    const user = await prisma.user.upsert({
      where: { email: params.email },
      update: {
        name: params.name,
        lastname: params.lastname,
        isActive: true,
      },
      create: {
        email: params.email,
        password: docenteStdPassword,
        isActive: true,
        name: params.name,
        lastname: params.lastname,
      },
    });

    // Rol docente
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: user.id, roleId: docenteRole.id } },
      update: {},
      create: { userId: user.id, roleId: docenteRole.id },
    });

    // Perfil docente
    await prisma.teacherProfile.upsert({
      where: { userId: user.id },
      update: {
        title: params.title ?? 'Ing.',
        academicUnit: params.academicUnit ?? 'Ingeniería de Sistemas',
      },
      create: {
        userId: user.id,
        title: params.title ?? 'Ing.',
        academicUnit: params.academicUnit ?? 'Ingeniería de Sistemas',
        bio: undefined,
      },
    });

    // Cursos
    for (const name of courseNames) {
      const exists = await prisma.course.findFirst({ where: { name, teacherId: user.id } });
      if (!exists) {
        await prisma.course.create({ data: { name, teacherId: user.id } });
      }
    }
  }

  // Docente: Paul Wilker Landaeta Flores
  await ensureDocenteWithCourses(
    {
      email: 'paul.landaeta@example.com',
      name: 'Paul Wilker',
      lastname: 'Landaeta Flores',
      title: 'Ing.',
      academicUnit: 'Ingeniería de Sistemas',
    },
    ['Algoritmica', 'Base de Datos'],
  );

  // Docente: Alexis Marechal
  await ensureDocenteWithCourses(
    {
      email: 'alexis.marechal@example.com',
      name: 'Alexis',
      lastname: 'Marechal',
      title: 'Phd.',
      academicUnit: 'Ingeniería de Sistemas',
    },
    ['Automatas', 'Programacion 1'],
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
