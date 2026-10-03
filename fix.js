const fs = require('fs');
let content = fs.readFileSync('frontend/components/SocialAuth.tsx', 'utf8');
content = content.replace(/window\.google/g, '(window as any).google');
fs.writeFileSync('frontend/components/SocialAuth.tsx', content);
