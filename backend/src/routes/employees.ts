import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { PrismaClient, Role, Status } from '@prisma/client';
import { z } from 'zod';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// Zod schemas
// ---------------------------------------------------------------------------

const createEmployeeSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email format'),
  phone: z
    .string()
    .regex(/^\+?[\d\s\-()]{7,20}$/, 'Invalid phone number format'),
  department: z.string().min(1, 'Department is required'),
  designation: z.string().min(1, 'Designation is required'),
  salary: z.number().positive('Salary must be greater than 0'),
  joiningDate: z.string().refine(
    (val) => !isNaN(Date.parse(val)),
    'Invalid date format',
  ),
  status: z.nativeEnum(Status),
  role: z.nativeEnum(Role),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  managerId: z.string().uuid().optional().nullable(),
  profileImage: z.string().url().optional().nullable(),
});

const updateEmployeeSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email('Invalid email format').optional(),
  phone: z
    .string()
    .regex(/^\+?[\d\s\-()]{7,20}$/, 'Invalid phone number format')
    .optional(),
  department: z.string().min(1).optional(),
  designation: z.string().min(1).optional(),
  salary: z.number().positive('Salary must be greater than 0').optional(),
  joiningDate: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), 'Invalid date format')
    .optional(),
  status: z.nativeEnum(Status).optional(),
  role: z.nativeEnum(Role).optional(),
  managerId: z.string().uuid().optional().nullable(),
  profileImage: z.string().url().optional().nullable(),
});

const setManagerSchema = z.object({
  managerId: z.string().uuid('Invalid manager ID format'),
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Fields an EMPLOYEE user may update on themselves. */
const EMPLOYEE_SELF_UPDATE_FIELDS = new Set(['phone', 'profileImage']);

/** Remove passwordHash from a user object. */
function excludePassword<T extends { passwordHash: string }>(
  user: T,
): Omit<T, 'passwordHash'> {
  const { passwordHash: _, ...rest } = user;
  return rest;
}

/** Build Prisma `where` clause from query-string filters. */
function buildWhereClause(query: Record<string, unknown>) {
  const where: Record<string, unknown> = { isDeleted: false };

  if (query.search) {
    const search = String(query.search);
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
    ];
  }

  if (query.department) {
    where.department = String(query.department);
  }

  if (query.role) {
    where.role = query.role as string;
  }

  if (query.status) {
    where.status = query.status as string;
  }

  return where;
}

/** Walk up the manager chain and return true if targetId appears. */
async function hasCircularManager(
  employeeId: string,
  proposedManagerId: string,
): Promise<boolean> {
  let currentId: string | null = proposedManagerId;
  const visited = new Set<string>();

  while (currentId) {
    if (currentId === employeeId) return true;
    if (visited.has(currentId)) return true; // cycle detected in existing data

    visited.add(currentId);

    const managerRecord: { managerId: string | null } | null = await prisma.user.findUnique({
      where: { id: currentId },
      select: { managerId: true },
    });

    currentId = managerRecord?.managerId ?? null;
  }

  return false;
}

// ---------------------------------------------------------------------------
// GET / — paginated list
// ---------------------------------------------------------------------------

router.get(
  '/',
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const page = Math.max(1, parseInt(String(req.query.page ?? '1'), 10));
      const limit = Math.min(
        100,
        Math.max(1, parseInt(String(req.query.limit ?? '10'), 10)),
      );
      const skip = (page - 1) * limit;

      const sortBy = req.query.sortBy === 'name' ? 'name' : 'joiningDate';
      const order: 'asc' | 'desc' = sortBy === 'name' ? 'asc' : 'desc';

      const where = buildWhereClause(req.query as Record<string, unknown>);

      const [employees, total] = await Promise.all([
        prisma.user.findMany({
          where,
          skip,
          take: limit,
          orderBy: { [sortBy]: order },
        }),
        prisma.user.count({ where }),
      ]);

      res.json({
        data: employees.map(excludePassword),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      console.error('List employees error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  },
);

// ---------------------------------------------------------------------------
// POST / — create employee
// ---------------------------------------------------------------------------

router.post(
  '/',
  requireAuth,
  requireRole('SUPER_ADMIN', 'HR'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const parsed = createEmployeeSchema.safeParse(req.body);

      if (!parsed.success) {
        res.status(400).json({
          message: 'Validation failed',
          errors: parsed.error.flatten().fieldErrors,
        });
        return;
      }

      const {
        password,
        joiningDate,
        managerId,
        profileImage,
        ...rest
      } = parsed.data;

      const passwordHash = await bcrypt.hash(password, 10);

      // Check if email already exists
      const existing = await prisma.user.findUnique({
        where: { email: rest.email },
      });
      if (existing) {
        res.status(409).json({ message: 'Email already in use' });
        return;
      }

      const user = await prisma.user.create({
        data: {
          ...rest,
          passwordHash,
          joiningDate: new Date(joiningDate),
          managerId: managerId ?? null,
          profileImage: profileImage ?? null,
        },
      });

      res.status(201).json(excludePassword(user));
    } catch (error) {
      console.error('Create employee error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  },
);

// ---------------------------------------------------------------------------
// GET /:id — single employee
// ---------------------------------------------------------------------------

router.get(
  '/:id',
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const id = req.params.id as string;
      const user = await prisma.user.findUnique({
        where: { id },
      });

      if (!user || user.isDeleted) {
        res.status(404).json({ message: 'Employee not found' });
        return;
      }

      res.json(excludePassword(user));
    } catch (error) {
      console.error('Get employee error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  },
);

// ---------------------------------------------------------------------------
// PUT /:id — update employee
// ---------------------------------------------------------------------------

router.put(
  '/:id',
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const id = req.params.id as string;

      // EMPLOYEE can ONLY update their own profile, and only phone/profileImage.
      if (req.user!.role === 'EMPLOYEE') {
        if (req.user!.id !== id) {
          res.status(403).json({ message: 'Access denied' });
          return;
        }
        const requestedFields = Object.keys(req.body);
        const forbidden = requestedFields.filter(
          (f) => !EMPLOYEE_SELF_UPDATE_FIELDS.has(f),
        );
        if (forbidden.length > 0) {
          res.status(403).json({
            message: 'Employees can only update phone and profileImage',
            forbiddenFields: forbidden,
          });
          return;
        }
      }

      const parsed = updateEmployeeSchema.safeParse(req.body);

      if (!parsed.success) {
        res.status(400).json({
          message: 'Validation failed',
          errors: parsed.error.flatten().fieldErrors,
        });
        return;
      }

      const { joiningDate, managerId, profileImage, ...rest } = parsed.data;

      // HR may not set role=SUPER_ADMIN
      if (
        req.user!.role === 'HR' &&
        rest.role &&
        rest.role === 'SUPER_ADMIN'
      ) {
        res.status(400).json({
          message: 'HR cannot assign SUPER_ADMIN role',
        });
        return;
      }



      const user = await prisma.user.update({
        where: { id },
        data: {
          ...rest,
          ...(joiningDate !== undefined
            ? { joiningDate: new Date(joiningDate) }
            : {}),
          ...(managerId !== undefined ? { managerId: managerId ?? null } : {}),
          ...(profileImage !== undefined
            ? { profileImage: profileImage ?? null }
            : {}),
        },
      });

      res.json(excludePassword(user));
    } catch (error: unknown) {
      if (
        error instanceof Error &&
        'code' in error &&
        (error as Record<string, unknown>).code === 'P2025'
      ) {
        res.status(404).json({ message: 'Employee not found' });
        return;
      }
      console.error('Update employee error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  },
);

// ---------------------------------------------------------------------------
// DELETE /:id — soft delete
// ---------------------------------------------------------------------------

router.delete(
  '/:id',
  requireAuth,
  requireRole('SUPER_ADMIN'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const id = req.params.id as string;
      await prisma.user.update({
        where: { id },
        data: { isDeleted: true },
      });

      res.json({ message: 'Employee deleted successfully' });
    } catch (error: unknown) {
      if (
        error instanceof Error &&
        'code' in error &&
        (error as Record<string, unknown>).code === 'P2025'
      ) {
        res.status(404).json({ message: 'Employee not found' });
        return;
      }
      console.error('Delete employee error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  },
);

// ---------------------------------------------------------------------------
// PATCH /:id/manager — set manager with circular-detection
// ---------------------------------------------------------------------------

router.patch(
  '/:id/manager',
  requireAuth,
  requireRole('SUPER_ADMIN', 'HR'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const parsed = setManagerSchema.safeParse(req.body);

      if (!parsed.success) {
        res.status(400).json({
          message: 'Validation failed',
          errors: parsed.error.flatten().fieldErrors,
        });
        return;
      }

      const id = req.params.id as string;
      const { managerId } = parsed.data;

      // Prevent self-referencing
      if (managerId === id) {
        res.status(400).json({
          message: 'An employee cannot be their own manager',
        });
        return;
      }

      // Verify the employee exists
      const employee = await prisma.user.findUnique({
        where: { id },
      });
      if (!employee || employee.isDeleted) {
        res.status(404).json({ message: 'Employee not found' });
        return;
      }

      // Verify the proposed manager exists
      const proposedManager = await prisma.user.findUnique({
        where: { id: managerId },
      });
      if (!proposedManager || proposedManager.isDeleted) {
        res.status(404).json({ message: 'Proposed manager not found' });
        return;
      }

      // Walk up the manager chain to detect circular reporting
      const circular = await hasCircularManager(id, managerId);
      if (circular) {
        res.status(400).json({
          message: 'Circular reporting not allowed',
        });
        return;
      }

      const updated = await prisma.user.update({
        where: { id },
        data: { managerId },
      });

      res.json(excludePassword(updated));
    } catch (error: unknown) {
      if (
        error instanceof Error &&
        'code' in error &&
        (error as Record<string, unknown>).code === 'P2025'
      ) {
        res.status(404).json({ message: 'Employee not found' });
        return;
      }
      console.error('Set manager error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  },
);

// ---------------------------------------------------------------------------
// GET /:id/reportees — direct reports
// ---------------------------------------------------------------------------

router.get(
  '/:id/reportees',
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const id = req.params.id as string;
      const reportees = await prisma.user.findMany({
        where: {
          managerId: id,
          isDeleted: false,
        },
      });

      res.json(reportees.map(excludePassword));
    } catch (error) {
      console.error('List reportees error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  },
);

export default router;
