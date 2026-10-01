with open("frontend/app/(app)/settings/profile/page.tsx", "r", encoding="utf-8") as f:
    c = f.read()

c = c.replace("import { apiFetch } from \"@/lib/api\";", "import { apiFetch, ApiError } from \"@/lib/api\";")
c = c.replace("if (err.message?.includes(\"404\")) {", "if (err instanceof ApiError && err.status === 404) {")
c = c.replace("if (err.message?.includes(\"409\")) {", "if (err instanceof ApiError && err.status === 409) {")
c = c.replace("if (err.message?.includes(\"501\")) {", "if (err instanceof ApiError && err.status === 501) {")

with open("frontend/app/(app)/settings/profile/page.tsx", "w", encoding="utf-8") as f:
    f.write(c)

with open("frontend/app/(onboarding)/setup-handle/page.tsx", "r", encoding="utf-8") as f:
    c2 = f.read()

c2 = c2.replace("import { apiFetch } from \"@/lib/api\";", "import { apiFetch, ApiError } from \"@/lib/api\";")
c2 = c2.replace("if (err.message?.includes(\"404\")) {", "if (err instanceof ApiError && err.status === 404) {")
c2 = c2.replace("if (err.message?.includes(\"409\")) {", "if (err instanceof ApiError && err.status === 409) {")

with open("frontend/app/(onboarding)/setup-handle/page.tsx", "w", encoding="utf-8") as f:
    f.write(c2)
