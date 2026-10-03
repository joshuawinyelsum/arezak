const fs = require("fs");
const file = "frontend/contexts/AuthContext.tsx";
let code = fs.readFileSync(file, "utf8");
code = code.replace(
  "setStatus(userData.status);",
  "setStatus(userData.status || \"authenticated\");"
);
fs.writeFileSync(file, code);
