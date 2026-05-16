const fs = require('fs');
let code = fs.readFileSync('/Users/mayankdoholiya/DEV/Fi-money/backend/src/routes.ts', 'utf8');

code = code.replace(
\`router.delete(
  "/notes/:id",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    const noteId = req.params.id;
    const userId = req.user!.id;

    const count = await prisma.note.count({
      where: { id: noteId, owner_id: userId },
    });
    if (count === 0) { res.status(403).json({ message: "Forbidden" }); return; }

    await prisma.note.update({ where: { id: noteId }, data: { is_trashed: true } });
    res.status(204).send();
  },
);\`, \`router.delete(
  "/notes/:id",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    const noteId = req.params.id;
    const userId = req.user!.id;

    const count = await prisma.note.count({
      where: { id: noteId, owner_id: userId },
    });
    if (count === 0) { res.status(403).json({ message: "Forbidden" }); return; }

    if (req.query.permanent === 'true') {
      await prisma.note.delete({ where: { id: noteId } });
    } else {
      await prisma.note.update({ where: { id: noteId }, data: { is_trashed: true } });
    }
    res.status(204).send();
  },
);\`);

fs.writeFileSync('/Users/mayankdoholiya/DEV/Fi-money/backend/src/routes.ts', code);
