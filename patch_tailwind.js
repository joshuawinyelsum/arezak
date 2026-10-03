const fs = require("fs");
let content = fs.readFileSync("frontend/tailwind.config.ts", "utf8");

content = content.replace(
  /accent: \{\s*DEFAULT: "var\(--accent\)",\s*foreground: "var\(--accent-foreground\)",\s*\},/,
  `accent: {
          DEFAULT: "var(--accent)",
          foreground: "var(--accent-foreground)",
        },
        destructive: {
          DEFAULT: "var(--destructive)",
          foreground: "var(--destructive-foreground)",
        },
        success: {
          DEFAULT: "var(--success)",
          foreground: "var(--success-foreground)",
        },`
);

fs.writeFileSync("frontend/tailwind.config.ts", content);
