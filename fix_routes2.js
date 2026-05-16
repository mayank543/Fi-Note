const fs = require('fs');

let content = fs.readFileSync('/Users/mayankdoholiya/DEV/Fi-money/backend/src/routes.ts', 'utf8');
content = content.replaceAll(
  'if (count === 0) res.status(403).json({ message: "Forbidden" });\n    return;',
  'if (count === 0) { res.status(403).json({ message: "Forbidden" }); return; }'
);
content = content.replaceAll(
  'if (count === 0) return { res: res.status(403).json({ message: "Forbidden" }) };',
  'if (count === 0) { res.status(403).json({ message: "Forbidden" }); return; }'
);
fs.writeFileSync('/Users/mayankdoholiya/DEV/Fi-money/backend/src/routes.ts', content);
