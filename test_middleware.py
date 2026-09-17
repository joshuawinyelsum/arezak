from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.testclient import TestClient

app = FastAPI()

@app.middleware("http")
async def custom_middleware(request: Request, call_next):
    return JSONResponse(status_code=403, content={"detail": "custom"})

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://testserver"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"status": "ok"}

client = TestClient(app)
res = client.options("/", headers={"Origin": "http://testserver", "Access-Control-Request-Method": "GET"})
print("OPTIONS:", res.status_code, res.headers)

res2 = client.get("/", headers={"Origin": "http://testserver"})
print("GET:", res2.status_code, res2.headers)

