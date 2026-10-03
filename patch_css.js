const fs = require("fs");
let content = fs.readFileSync("frontend/app/globals.css", "utf8");

content = content.replace(
  /--accent-foreground: #0f172a; \/\* slate-900 \*\//,
  `--accent-foreground: #0f172a; /* slate-900 */
    
    --destructive: #fee2e2;
    --destructive-foreground: #dc2626;
    
    --success: #dcfce7;
    --success-foreground: #15803d;`
);

content = content.replace(
  /--accent-foreground: #f8fafc;/,
  `--accent-foreground: #f8fafc;
    
    --destructive: rgba(127, 29, 29, 0.2);
    --destructive-foreground: #f87171;
    
    --success: rgba(20, 83, 45, 0.2);
    --success-foreground: #4ade80;`
);

fs.writeFileSync("frontend/app/globals.css", content);
