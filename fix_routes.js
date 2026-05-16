const fs = require('fs');

let content = fs.readFileSync('/Users/mayankdoholiya/DEV/Fi-money/backend/src/routes.ts', 'utf8');

content = content.replace(
  \`    if (!name) res.status(400).json({ message: "Name is required" });\n    return;\`,
  \`    if (!name) { res.status(400).json({ message: "Name is required" }); return; }\`
);

content = content.replace(
  \`    if (count === 0) res.status(403).json({ message: "Forbidden" });\n    return;\`,
  \`    if (count === 0) { res.status(403).json({ message: "Forbidden" }); return; }\`
);

fs.writeFileSync('/Users/mayankdoholiya/DEV/Fi-money/backend/src/routes.ts', content);
