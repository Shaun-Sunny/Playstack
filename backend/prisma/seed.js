"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma = new client_1.PrismaClient();
async function main() {
    const passwordHash = await bcryptjs_1.default.hash('Admin@123', 10);
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
            status: client_1.Status.ACTIVE,
            role: client_1.Role.SUPER_ADMIN,
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
