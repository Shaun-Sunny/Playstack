import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TreeNode {
  id: string;
  name: string;
  email: string;
  phone: string;
  department: string;
  designation: string;
  role: string;
  status: string;
  profileImage: string | null;
  children: TreeNode[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Recursively build the organisation tree. */
async function buildTree(): Promise<TreeNode[]> {
  // Fetch all non-deleted users
  const users = await prisma.user.findMany({
    where: { isDeleted: false },
  });

  // Build a map: id -> TreeNode (initially with empty children)
  const nodeMap = new Map<string, TreeNode>();

  for (const u of users) {
    nodeMap.set(u.id, {
      id: u.id,
      name: u.name,
      email: u.email,
      phone: u.phone,
      department: u.department,
      designation: u.designation,
      role: u.role,
      status: u.status,
      profileImage: u.profileImage,
      children: [],
    });
  }

  // Attach each node to its parent, collecting roots (no manager / manager not found)
  const roots: TreeNode[] = [];

  for (const u of users) {
    const node = nodeMap.get(u.id)!;
    if (u.managerId && nodeMap.has(u.managerId)) {
      nodeMap.get(u.managerId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

// ---------------------------------------------------------------------------
// GET /tree — nested organisation tree
// ---------------------------------------------------------------------------

router.get(
  '/tree',
  requireAuth,
  async (_req: Request, res: Response): Promise<void> => {
    try {
      const tree = await buildTree();
      res.json(tree);
    } catch (error) {
      console.error('Organisation tree error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  },
);

export default router;
