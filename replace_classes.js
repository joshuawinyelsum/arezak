const fs = require("fs");
const path = require("path");

function walkSync(dir, filelist = []) {
  fs.readdirSync(dir).forEach(file => {
    filelist = fs.statSync(path.join(dir, file)).isDirectory()
      ? walkSync(path.join(dir, file), filelist)
      : filelist.concat(path.join(dir, file));
  });
  return filelist;
}

const files = walkSync("frontend/app").concat(walkSync("frontend/components"));
const tsxFiles = files.filter(f => f.endsWith(".tsx") || f.endsWith(".ts"));

tsxFiles.forEach(file => {
  let content = fs.readFileSync(file, "utf8");
  let changed = false;

  const replacements = [
    [/bg-red-50 text-red-600 dark:bg-red-900\/20 dark:text-red-400/g, 'bg-destructive text-destructive-foreground'],
    [/bg-red-50 dark:bg-red-900\/20 text-red-600 dark:text-red-400/g, 'bg-destructive text-destructive-foreground'],
    [/text-red-600 dark:text-red-400/g, 'text-destructive-foreground'],
    [/bg-red-50 dark:bg-red-900\/10/g, 'bg-destructive'],
    [/bg-red-50 dark:bg-red-900\/20/g, 'bg-destructive'],
    [/bg-red-50 dark:bg-red-500\/10/g, 'bg-destructive'],
    [/bg-red-50 dark:bg-red-500\/20/g, 'bg-destructive'],
    [/hover:bg-red-50 dark:hover:bg-red-500\/10/g, 'hover:bg-destructive'],
    [/hover:bg-red-100 dark:hover:bg-red-900\/20/g, 'hover:bg-destructive/80'],
    [/focus-visible:bg-red-50 dark:focus-visible:bg-red-500\/10/g, 'focus-visible:bg-destructive'],
    [/border-red-200 dark:border-red-900\/30/g, 'border-destructive-foreground/20'],
    
    [/bg-green-50 text-green-700 dark:bg-green-900\/20 dark:text-green-400/g, 'bg-success text-success-foreground'],
    [/bg-green-50 dark:bg-green-900\/20 text-green-700 dark:text-green-400/g, 'bg-success text-success-foreground'],
    [/text-green-600 dark:text-green-400/g, 'text-success-foreground'],
    
    [/bg-orange-50 dark:bg-orange-500\/10 text-orange-500/g, 'bg-orange-500/10 text-orange-500'],
    [/bg-indigo-50 dark:bg-indigo-500\/10 text-indigo-500 dark:text-indigo-400/g, 'bg-indigo-500/10 text-indigo-500'],
    [/bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300/g, 'bg-muted text-muted-foreground'],
    
    [/border-slate-200 dark:border-slate-700/g, 'border-border'],
    [/bg-slate-50 dark:bg-slate-900/g, 'bg-background'],
    [/text-slate-900 dark:text-slate-100/g, 'text-foreground'],
    [/text-slate-700 dark:text-slate-200/g, 'text-foreground'],
    [/bg-white dark:bg-slate-800/g, 'bg-card'],
    [/text-slate-400 dark:text-slate-500/g, 'text-muted-foreground'],
    [/dark:shadow-none/g, ''],
  ];

  for (const [regex, replacement] of replacements) {
    if (regex.test(content)) {
      content = content.replace(regex, replacement);
      changed = true;
    }
  }

  if (changed) {
    fs.writeFileSync(file, content);
  }
});
