import { PrismaClient, Role, Status } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('Admin@123', 10);

  await prisma.user.upsert({
    where: { email: 'admin@ems.com' },
    update: {},
    create: {
      name: 'Super Admin',
      email: 'admin@ems.com',
      phone: '0000000000',
      department: 'Administration',
      designation: 'Super Admin',
      salary: 0,
      joiningDate: new Date(),
      status: Status.ACTIVE,
      role: Role.SUPER_ADMIN,
      managerId: null,
      profileImage: null,
      passwordHash,
      isDeleted: false,
    },
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });