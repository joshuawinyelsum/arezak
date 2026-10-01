with open("frontend/components/SocialAuth.tsx", "r", encoding="utf-8") as f:
    c = f.read()

c = c.replace("Google authentication flow failed to initialize.", "Google services unavailable.")

with open("frontend/components/SocialAuth.tsx", "w", encoding="utf-8") as f:
    f.write(c)
