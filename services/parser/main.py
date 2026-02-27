from fastapi import FastAPI, UploadFile, File

app = FastAPI(title="MyFreeCeeVee Parser", version="0.1.0")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/analyze-pdf")
async def analyze_pdf(file: UploadFile = File(...)) -> dict:
    content = await file.read()
    return {
        "filename": file.filename,
        "bytes": len(content),
        "message": "Parser scaffold ready. Layout decomposition to be implemented."
    }


@app.post("/draft-template")
async def draft_template(file: UploadFile = File(...)) -> dict:
    content = await file.read()
    return {
        "filename": file.filename,
        "bytes": len(content),
        "template_id": "draft-template",
        "confidence": 0.0,
        "message": "Template drafting scaffold ready."
    }
