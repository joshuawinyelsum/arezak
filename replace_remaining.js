const fs = require("fs");

let f1 = "frontend/app/(app)/settings/appearance/page.tsx";
let c1 = fs.readFileSync(f1, "utf8");
c1 = c1.replace(/bg-orange-50 dark:bg-orange-500\/10/g, "bg-orange-500/10");
c1 = c1.replace(/bg-indigo-50 dark:bg-indigo-500\/10 text-indigo-500 dark:text-indigo-400/g, "bg-indigo-500/10 text-indigo-500");
c1 = c1.replace(/bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300/g, "bg-muted text-muted-foreground");
fs.writeFileSync(f1, c1);

let f2 = "frontend/app/(app)/settings/profile/page.tsx";
let c2 = fs.readFileSync(f2, "utf8");
c2 = c2.replace(/text-red-600 bg-destructive dark:text-red-400/g, "text-destructive-foreground bg-destructive");
c2 = c2.replace(/focus-visible:ring-red-500/g, "focus-visible:ring-destructive-foreground");
fs.writeFileSync(f2, c2);

let f3 = "frontend/components/SocialAuth.tsx";
let c3 = fs.readFileSync(f3, "utf8");
c3 = c3.replace(/hover:bg-slate-50 dark:hover:bg-slate-700/g, "hover:bg-accent");
fs.writeFileSync(f3, c3);
