with open("frontend/components/auth/AuthGuard.tsx", "r", encoding="utf-8") as f:
    c = f.read()

c = c.replace("const { status } = useAuth();", "const { user, status } = useAuth();")
c = c.replace("} else if (status === \"onboarding\") {\n      router.push(\"/verify-phone\");\n    }", "} else if (status === \"onboarding\") {\n      if (user?.phone_verified) {\n        router.push(\"/setup-handle\");\n      } else {\n        router.push(\"/verify-phone\");\n      }\n    }")
c = c.replace("}, [status, router]);", "}, [status, router, user?.phone_verified]);")

with open("frontend/components/auth/AuthGuard.tsx", "w", encoding="utf-8") as f:
    f.write(c)
