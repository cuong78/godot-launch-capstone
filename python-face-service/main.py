import os
from dotenv import load_dotenv

# Load .env TRƯỚC khi import google.cloud — SDK đọc credentials lúc import
load_dotenv()

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional
from face_service import extract_embedding
from db import find_duplicate_face, save_face_embedding, delete_face_embedding
from ocr_service import ocr_document
import source_service

app = FastAPI(title="GodotLaunch Face Service", version="1.0.0")

THRESHOLD = float(os.getenv("FACE_SIMILARITY_THRESHOLD", "0.5"))


class FaceCheckRequest(BaseModel):
    imageBase64: str


class FaceRegisterRequest(BaseModel):
    userId: str
    imageBase64: str


class FaceCheckResponse(BaseModel):
    isDuplicate: bool
    message: str


class FaceRegisterResponse(BaseModel):
    success: bool
    message: str


class OcrRequest(BaseModel):
    imageBase64: str
    documentType: str  # 'cccd' | 'passport'


class OcrResponse(BaseModel):
    documentType: str
    idNumber: Optional[str] = None
    fullName: Optional[str] = None
    dateOfBirth: Optional[str] = None
    address: Optional[str] = None


class SourceProcessRequest(BaseModel):
    repoUrl: str
    token: Optional[str] = None       # OAuth token developer (private repo)
    branch: Optional[str] = None


class SourceProcessResponse(BaseModel):
    clean: bool                       # virus scan sạch?
    scanned: bool                     # ClamAV có chạy được không
    commitSha: str
    bundleHash: str
    fileCount: int
    isGodotProject: bool              # project.godot ở root VÀ có .gd/.tscn
    hasProjectGodot: bool = False     # có project.godot ở root
    hasGodotSource: bool = False      # có file .gd/.tscn
    infected: list = []
    secrets: list = []
    fileHashes: dict = {}
    bundleBase64: Optional[str] = None  # zip source (base64) — backend upload storage


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/face/check", response_model=FaceCheckResponse)
def check_face(req: FaceCheckRequest):
    """
    Kiểm tra xem khuôn mặt đã tồn tại trong DB chưa.
    Gọi trước khi tạo user. Không lưu gì vào DB.
    """
    embedding = extract_embedding(req.imageBase64)

    if embedding is None:
        raise HTTPException(
            status_code=422,
            detail="Không tìm thấy khuôn mặt rõ ràng trong ảnh. Vui lòng chụp lại với ánh sáng tốt hơn và nhìn thẳng vào camera."
        )

    is_dup = find_duplicate_face(embedding, THRESHOLD)
    return FaceCheckResponse(
        isDuplicate=is_dup,
        message="Khuôn mặt đã được đăng ký với tài khoản khác." if is_dup else "OK"
    )


@app.post("/face/register", response_model=FaceRegisterResponse)
def register_face(req: FaceRegisterRequest):
    """
    Lưu face embedding sau khi user đã được tạo thành công.
    """
    embedding = extract_embedding(req.imageBase64)

    if embedding is None:
        raise HTTPException(
            status_code=422,
            detail="Không thể trích xuất đặc trưng khuôn mặt từ ảnh."
        )

    save_face_embedding(req.userId, embedding)
    return FaceRegisterResponse(success=True, message="Face registered successfully.")


@app.delete("/face/{user_id}", response_model=FaceRegisterResponse)
def delete_face(user_id: str):
    """
    Xóa face embedding khi user bị xóa hoặc yêu cầu xóa dữ liệu (GDPR).
    """
    deleted = delete_face_embedding(user_id)
    return FaceRegisterResponse(
        success=deleted > 0,
        message=f"Deleted {deleted} embedding(s)."
    )


@app.post("/ocr/document", response_model=OcrResponse)
def ocr_id_document(req: OcrRequest):
    """
    OCR giấy tờ tùy thân: CCCD hoặc Passport.
    Trả về thông tin đã parse: idNumber, fullName, dateOfBirth, address.
    Không lưu gì vào DB — chỉ extract và trả về để Spring Boot lưu sau khi user confirm.
    """
    if req.documentType not in ("cccd", "passport"):
        raise HTTPException(status_code=400, detail="documentType phải là 'cccd' hoặc 'passport'.")

    try:
        result = ocr_document(req.imageBase64, req.documentType)
        return OcrResponse(**result)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi OCR: {str(e)}")


@app.post("/source/process", response_model=SourceProcessResponse)
def process_source(req: SourceProcessRequest):
    """
    Orchestrator cho luồng publish code repo-based:
      clone repo → virus scan → snapshot (commit SHA + hash) → secret scan → cleanup.
    Trả về kết quả gộp để Spring Boot lưu snapshot + quyết định trạng thái.
    """
    tmp_dir = None
    try:
        cloned = source_service.clone_repo(req.repoUrl, req.token, req.branch)
        tmp_dir = cloned["tmpDir"]

        virus = source_service.scan_virus(tmp_dir)
        snap = source_service.snapshot(tmp_dir)
        secrets = source_service.scan_secrets(tmp_dir)

        # Chỉ bundle khi sạch + là Godot project (không lưu repo bẩn/non-Godot)
        bundle = None
        if virus["clean"] and snap["isGodotProject"]:
            bundle = source_service.bundle_source(tmp_dir)

        return SourceProcessResponse(
            clean=virus["clean"],
            scanned=virus["scanned"],
            commitSha=snap["commitSha"],
            bundleHash=snap["bundleHash"],
            fileCount=snap["fileCount"],
            isGodotProject=snap["isGodotProject"],
            hasProjectGodot=snap["hasProjectGodot"],
            hasGodotSource=snap["hasGodotSource"],
            infected=virus["infected"],
            secrets=secrets,
            fileHashes=snap["fileHashes"],
            bundleBase64=bundle,
        )
    except ValueError as e:
        # URL không hợp lệ / không phải github
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        # Clone fail / repo quá lớn
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi xử lý source: {str(e)}")
    finally:
        source_service.cleanup(tmp_dir)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8001, reload=True)
