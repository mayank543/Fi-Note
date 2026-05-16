const fs = require('fs');

let content = fs.readFileSync('/Users/mayankdoholiya/DEV/Fi-money/backend/src/routes.ts', 'utf8');

// Update /notes GET to filter by is_trashed and label
content = content.replace(
  `      const whereClause = {\n        OR: [\n          { owner_id: userId },\n          { shared_with: { some: { user_id: userId } } },\n        ],\n      };`,
  `      const labelId = req.query.labelId as string | undefined;
      const isTrashed = req.query.trash === 'true';
      
      const whereClause: any = {
        is_trashed: isTrashed,
        OR: [
          { owner_id: userId },
          { shared_with: { some: { user_id: userId } } },
        ],
      };
      if (labelId) {
        whereClause.labels = { some: { id: labelId } };
      }`
);

// Update /notes GET payload to include labels mapping
content = content.replace(
  `        prisma.note.findMany({\n          where: whereClause,\n          skip,\n          take: limit,\n          orderBy: { created_at: "asc" },\n        }),`,
  `        prisma.note.findMany({
          where: whereClause,
          skip,
          take: limit,
          orderBy: { created_at: "asc" },
          include: { labels: true }
        }),`
);

// Update /search GET to filter by is_trashed
content = content.replace(
  `      const whereClause = {\n        AND: [\n          {\n            OR: [\n              { owner_id: userId },\n              { shared_with: { some: { user_id: userId } } },\n            ],\n          },`,
  `      const isTrashed = req.query.trash === 'true';
      const whereClause: any = {
        is_trashed: isTrashed,
        AND: [
          {
            OR: [
              { owner_id: userId },
              { shared_with: { some: { user_id: userId } } },
            ],
          },`
);
content = content.replace(
  `        prisma.note.findMany({\n          where: whereClause,\n          skip,\n          take: limit,\n          orderBy: { created_at: "asc" },\n        }),`,
  `        prisma.note.findMany({
          where: whereClause,
          skip,
          take: limit,
          orderBy: { created_at: "asc" },
          include: { labels: true }
        }),`
);

// Update DELETE /notes/:id to soft delete
content = content.replace(
  `    await prisma.note.delete({ where: { id: noteId } });\n    res.status(204).send();`,
  `    await prisma.note.update({ where: { id: noteId }, data: { is_trashed: true } });
    res.status(204).send();`
);

// Add Labels endpoints
const labelsEndpoints = `

// Labels
router.get("/labels", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const labels = await prisma.label.findMany({
      where: { user_id: req.user!.id },
      orderBy: { name: 'asc' }
    });
    res.json(labels);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/labels", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { name } = req.body;
    if (!name) return { res: res.status(400).json({ message: "Name is required" }) };
    
    const label = await prisma.label.create({
      data: { name, user_id: req.user!.id }
    });
    res.status(201).json(label);
  } catch (error) {
    res.status(400).json({ message: "Label might already exist" });
  }
});

router.post("/notes/:id/labels", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const noteId = req.params.id;
    const { labelId } = req.body;
    
    const count = await prisma.note.count({
      where: { id: noteId, owner_id: req.user!.id },
    });
    if (count === 0) return { res: res.status(403).json({ message: "Forbidden" }) };

    await prisma.note.update({
      where: { id: noteId },
      data: {
        labels: {
          connect: { id: labelId }
        }
      }
    });
    res.json({ message: "Label attached" });
  } catch (error) {
    res.status(400).json({ message: "Error attaching label" });
  }
});

router.delete("/notes/:id/labels/:labelId", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id: noteId, labelId } = req.params;
    
    const count = await prisma.note.count({
      where: { id: noteId, owner_id: req.user!.id },
    });
    if (count === 0) return { res: res.status(403).json({ message: "Forbidden" }) };

    await prisma.note.update({
      where: { id: noteId },
      data: {
        labels: {
          disconnect: { id: labelId }
        }
      }
    });
    res.json({ message: "Label detached" });
  } catch (error) {
    res.status(400).json({ message: "Error detaching label" });
  }
});
`;

content = content.replace(`router.get("/about"`, labelsEndpoints + `\nrouter.get("/about"`);

fs.writeFileSync('/Users/mayankdoholiya/DEV/Fi-money/backend/src/routes.ts', content);
