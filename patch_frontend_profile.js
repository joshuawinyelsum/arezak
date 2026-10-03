const fs = require("fs");
let content = fs.readFileSync("frontend/app/(app)/settings/profile/page.tsx", "utf8");

content = content.replace(
  /if \(handle !== user\?\.handle\) \{\s*await apiFetch\("\/identity\/handle", \{\s*method: "PATCH",\s*body: JSON\.stringify\(\{ handle \}\),\s*\}\);\s*\}\s*await apiFetch\("\/identity\/profile", \{\s*method: "PATCH",\s*body: JSON\.stringify\(\{ first_name: firstName, last_name: lastName \}\),\s*\}\);/,
  `await apiFetch("/identity/profile", {
        method: "PATCH",
        body: JSON.stringify({ 
          first_name: firstName, 
          last_name: lastName,
          ...(handle !== user?.handle ? { handle } : {})
        }),
      });`
);

fs.writeFileSync("frontend/app/(app)/settings/profile/page.tsx", content);
