with open("frontend/app/(onboarding)/verify-phone/page.tsx", "r", encoding="utf-8") as f:
    c = f.read()

c = c.replace(
    "if (status === \"unauthenticated\") {\n      router.push(\"/login\");\n    } else if (status === \"authenticated\") {\n      router.push(\"/\");\n    }",
    "if (status === \"unauthenticated\") {\n      router.push(\"/login\");\n    } else if (status === \"authenticated\") {\n      router.push(\"/\");\n    } else if (status === \"onboarding\" && user?.phone_verified) {\n      router.push(\"/setup-handle\");\n    }"
)

with open("frontend/app/(onboarding)/verify-phone/page.tsx", "w", encoding="utf-8") as f:
    f.write(c)
