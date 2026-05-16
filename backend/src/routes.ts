import { Router, Request, Response, NextFunction } from "express";
import { prisma } from "./db";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { z } from "zod";

export const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || "secret";

// Types
interface AuthRequest extends Request {
  user?: { id: string; email: string };
}

// Middleware
const authenticateToken = (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): void => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }
    req.user = user as { id: string; email: string };
    next();
  });
};

// Schemas
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const noteSchema = z.object({
  title: z.string().min(1),
  content: z.string(),
});

const shareSchema = z.object({
  share_with_email: z.string().email(),
});

// Routes
router.post("/register", async (req, res) => {
  try {
    const { email, password } = registerSchema.parse(req.body);
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      res.status(409).json({ message: "Email already exists" });
      return;
    }
    const password_hash = await bcrypt.hash(password, 10);
    await prisma.user.create({ data: { email, password: password_hash } });
    res.status(201).json({ message: "User created successfully" });
  } catch (error) {
    console.error("Register Error:", error);
    res.status(400).json({ message: "Validation or Server error", error });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = registerSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      res.status(401).json({ message: "Invalid email or password" });
      return;
    }
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, {
      expiresIn: "24h",
    });
    res.status(200).json({ access_token: token });
  } catch (error) {
    res.status(400).json({ message: "Validation error" });
  }
});

router.get(
  "/notes",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.max(
        1,
        Math.min(100, parseInt(req.query.limit as string) || 10),
      );
      const skip = (page - 1) * limit;

      const labelId = req.query.labelId as string | undefined;
      const isTrashed = req.query.trash === "true";

      const whereClause: any = {
        is_trashed: isTrashed,
        OR: [
          { owner_id: userId },
          { shared_with: { some: { user_id: userId } } },
        ],
      };
      if (labelId) {
        whereClause.labels = { some: { id: labelId } };
      }

      const [notes, total] = await Promise.all([
        prisma.note.findMany({
          where: whereClause,
          skip,
          take: limit,
          orderBy: { created_at: "asc" },
          include: { labels: true },
        }),
        prisma.note.count({ where: whereClause }),
      ]);

      res.json({
        data: notes,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  },
);

router.get(
  "/search",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const q = req.query.q as string;

      if (!q || typeof q !== "string" || q.trim() === "") {
        res.status(400).json({ message: "Search query 'q' is required" });
        return;
      }

      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.max(
        1,
        Math.min(100, parseInt(req.query.limit as string) || 10),
      );
      const skip = (page - 1) * limit;

      const isTrashed = req.query.trash === "true";
      const whereClause: any = {
        is_trashed: isTrashed,
        AND: [
          {
            OR: [
              { owner_id: userId },
              { shared_with: { some: { user_id: userId } } },
            ],
          },
          {
            OR: [
              { title: { contains: q, mode: "insensitive" as const } },
              { content: { contains: q, mode: "insensitive" as const } },
            ],
          },
        ],
      };

      const [notes, total] = await Promise.all([
        prisma.note.findMany({
          where: whereClause,
          skip,
          take: limit,
          orderBy: { created_at: "asc" },
          include: { labels: true },
        }),
        prisma.note.count({ where: whereClause }),
      ]);

      res.json({
        data: notes,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  },
);

router.get(
  "/notes/:id",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    const noteId = req.params.id as string;
    const userId = req.user!.id;

    const note = await prisma.note.findFirst({
      where: {
        id: noteId,
        OR: [
          { owner_id: userId },
          { shared_with: { some: { user_id: userId } } },
        ],
      },
    });

    if (!note) {
      res.status(404).json({ message: "Note not found" });
      return;
    }
    res.json(note);
  },
);

router.post(
  "/notes",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      const { title, content } = noteSchema.parse(req.body);
      const userId = req.user!.id;
      const note = await prisma.note.create({
        data: { title, content, owner_id: userId },
      });
      res.status(201).json(note);
    } catch (error) {
      res.status(400).json({ message: "Validation error" });
    }
  },
);

router.put(
  "/notes/:id",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      const { title, content } = noteSchema.parse(req.body);
      const noteId = req.params.id as string;
      const userId = req.user!.id;

      const count = await prisma.note.count({
        where: { id: noteId, owner_id: userId },
      });
      if (count === 0) {
        res.status(403).json({ message: "Forbidden or note not found" });
        return;
      }

      const updated = await prisma.note.update({
        where: { id: noteId },
        data: { title, content },
      });
      res.json(updated);
    } catch (error) {
      res.status(400).json({ message: "Validation error" });
    }
  },
);

router.delete(
  "/notes/:id",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    const noteId = req.params.id as string;
    const userId = req.user!.id;

    const count = await prisma.note.count({
      where: { id: noteId, owner_id: userId },
    });
    if (count === 0) {
      res.status(403).json({ message: "Forbidden or note not found" });
      return;
    }

    if (req.query.permanent === "true") {
      await prisma.note.delete({ where: { id: noteId } });
    } else {
      await prisma.note.update({
        where: { id: noteId },
        data: { is_trashed: true },
      });
    }

    res.status(204).send();
  },
);

router.post(
  "/notes/:id/share",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      const { share_with_email } = shareSchema.parse(req.body);
      const noteId = req.params.id as string;
      const userId = req.user!.id;

      const count = await prisma.note.count({
        where: { id: noteId, owner_id: userId },
      });
      if (count === 0) {
        res.status(403).json({ message: "Forbidden or note not found" });
        return;
      }

      const targetUser = await prisma.user.findUnique({
        where: { email: share_with_email },
      });
      if (!targetUser) {
        res.status(404).json({ message: "User not found" });
        return;
      }

      await prisma.sharedNote.upsert({
        where: { note_id_user_id: { note_id: noteId, user_id: targetUser.id } },
        update: {},
        create: { note_id: noteId, user_id: targetUser.id },
      });

      res.json({ message: "Note shared successfully" });
    } catch (error) {
      res.status(400).json({ message: "Validation error" });
    }
  },
);

// Labels
router.get(
  "/labels",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      const labels = await prisma.label.findMany({
        where: { user_id: req.user!.id },
        orderBy: { name: "asc" },
      });
      res.json(labels);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  },
);

router.post(
  "/labels",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      const { name } = req.body;
      if (!name) {
        res.status(400).json({ message: "Name is required" });
        return;
      }

      const label = await prisma.label.create({
        data: { name, user_id: req.user!.id },
      });
      res.status(201).json(label);
    } catch (error) {
      res.status(400).json({ message: "Label might already exist" });
    }
  },
);

router.post(
  "/notes/:id/labels",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      const noteId = req.params.id as string;
      const { labelId } = req.body;

      const count = await prisma.note.count({
        where: { id: noteId, owner_id: req.user!.id },
      });
      if (count === 0) {
        res.status(403).json({ message: "Forbidden" });
        return;
      }

      await prisma.note.update({
        where: { id: noteId },
        data: {
          labels: {
            connect: { id: labelId },
          },
        },
      });
      res.json({ message: "Label attached" });
    } catch (error) {
      res.status(400).json({ message: "Error attaching label" });
    }
  },
);

router.delete(
  "/notes/:id/labels/:labelId",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      const noteId = req.params.id as string;
      const labelId = req.params.labelId as string;

      const count = await prisma.note.count({
        where: { id: noteId, owner_id: req.user!.id },
      });
      if (count === 0) {
        res.status(403).json({ message: "Forbidden" });
        return;
      }

      await prisma.note.update({
        where: { id: noteId },
        data: {
          labels: {
            disconnect: { id: labelId },
          },
        },
      });
      res.json({ message: "Label detached" });
    } catch (error) {
      res.status(400).json({ message: "Error detaching label" });
    }
  },
);

router.get("/about", (req, res) => {
  res.json({
    name: "Backend Developer",
    email: "developer@example.com",
    "my features": {
      sharing: "Allows sharing notes between users.",
      jwt: "Used for stateless authentication.",
    },
  });
});

router.get("/openapi.json", (req, res) => {
  res.json({
    openapi: "3.0.0",
    info: {
      title: "Notes API",
      version: "1.0.0",
    },
    // Truncated for brevity...
    paths: {},
  });
});
