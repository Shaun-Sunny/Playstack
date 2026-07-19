import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// GET /stats — dashboard statistics
// ---------------------------------------------------------------------------

router.get(
  '/stats',
  requireAuth,
  async (_req: Request, res: Response): Promise<void> => {
    try {
      const [
        totalEmployees,
        activeEmployees,
        inactiveEmployees,
        departmentAgg,
      ] = await Promise.all([
        prisma.user.count({ where: { isDeleted: false } }),
        prisma.user.count({
          where: { isDeleted: false, status: 'ACTIVE' },
        }),
        prisma.user.count({
          where: { isDeleted: false, status: 'INACTIVE' },
        }),
        prisma.user.groupBy({
          by: ['department'],
          where: { isDeleted: false },
          _count: { id: true },
        }),
      ]);

      res.json({
        totalEmployees,
        activeEmployees,
        inactiveEmployees,
        departmentCount: departmentAgg.length,
        departments: departmentAgg.map((d) => ({
          department: d.department,
          count: d._count.id,
        })),
      });
    } catch (error) {
      console.error('Dashboard stats error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  },
);

export default router;
