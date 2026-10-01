with open("frontend/contexts/AuthContext.tsx", "r", encoding="utf-8") as f:
    c = f.read()

c = c.replace(
    "socialLogin: (provider: string, token: string) => Promise<void>;",
    "socialLogin: (provider: string, token: string, extraData?: any) => Promise<void>;"
)

if "const prevStatus = status;" not in c:
    c = c.replace(
        "const socialLogin = async (provider: string, token: string) => {\n    setStatus(\"loading\");\n    try {\n      await apiFetch(\"/auth/social\", {\n        method: \"POST\",\n        body: JSON.stringify({ provider, token }),\n      });\n      await refreshUser();\n    } catch (error) {\n      setStatus(\"unauthenticated\");\n      throw error;\n    }\n  };",
        "const socialLogin = async (provider: string, token: string, extraData: any = {}) => {\n    const prevStatus = status;\n    setStatus(\"loading\");\n    try {\n      await apiFetch(\"/auth/social\", {\n        method: \"POST\",\n        body: JSON.stringify({ provider, token, ...extraData }),\n      });\n      await refreshUser();\n    } catch (error) {\n      setStatus(prevStatus);\n      throw error;\n    }\n  };"
    )

with open("frontend/contexts/AuthContext.tsx", "w", encoding="utf-8") as f:
    f.write(c)
