import os
from dotenv import load_dotenv

# Load .env TRƯỚC khi import google.cloud — SDK đọc credentials lúc import
load_dotenv()

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional
from face_service import extract_embedding
from db import (
    find_duplicate_face, save_face_embedding, delete_face_embedding,
    find_duplicate_kyc_image, save_kyc_image_embedding,
    find_banned_face, ban_face_embedding,
)
from ocr_service import ocr_document, extract_text_from_image
import source_service
import frame_extractor
import clip_service
import nsfw_service
import code_analyzer
import text_analyzer
import base64 as _b64
import requests as _requests

app = FastAPI(title="GodotLaunch Face Service", version="1.0.0")

THRESHOLD = float(os.getenv("FACE_SIMILARITY_THRESHOLD", "0.5"))
# CLIP cosine distance cho ảnh CCCD — ngưỡng chặt hơn face (ảnh giấy tờ ít
# biến thiên hơn khuôn mặt thật, re-upload cùng ảnh cho ra distance rất nhỏ).
KYC_IMAGE_THRESHOLD = float(os.getenv("KYC_IMAGE_SIMILARITY_THRESHOLD", "0.1"))


class FaceCheckRequest(BaseModel):
    imageBase64: str


class FaceRegisterRequest(BaseModel):
    userId: str
    imageBase64: str


class FaceCheckResponse(BaseModel):
    isDuplicate: bool
    isBanned: bool = False
    message: str


class FaceRegisterResponse(BaseModel):
    success: bool
    message: str


class FaceBanRequest(BaseModel):
    reason: str


class OcrRequest(BaseModel):
    imageBase64: str
    documentType: str  # 'cccd' | 'passport'


class OcrResponse(BaseModel):
    documentType: str
    idNumber: Optional[str] = None
    fullName: Optional[str] = None
    dateOfBirth: Optional[str] = None
    address: Optional[str] = None


class KycImageCheckRequest(BaseModel):
    userId: str
    imageSide: str  # 'front' | 'back'
    imageBase64: str


class KycImageCheckResponse(BaseModel):
    isDuplicate: bool
    duplicateUserId: Optional[str] = None
    message: str


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


class AiReviewRequest(BaseModel):
    # Loại nội dung: 'code' (game/marketplace source từ repo) | 'asset' (chỉ media)
    contentType: str = "code"
    repoUrl: Optional[str] = None       # với code: clone để analyze (bỏ qua nếu asset)
    token: Optional[str] = None
    branch: Optional[str] = None
    title: str = ""
    description: str = ""
    category: Optional[str] = None
    videoUrl: Optional[str] = None      # video intro → cắt frame
    screenshotUrls: list[str] = []      # ảnh đã upload (URL) → tải về quét
    frameCount: int = 8
    tags: list[str] = []                # danh sách tags được chọn bởi developer


class AiReviewResponse(BaseModel):
    codeQualityScore: Optional[int] = None
    mediaMatchScore: Optional[int] = None
    descriptionMatchScore: Optional[int] = None
    tagsMatchScore: Optional[int] = None
    nsfwFlag: bool = False
    overallRecommendation: str = "review"   # 'approve' | 'review' | 'reject'
    # khuyến nghị giá (chỉ có với code + DeepSeek bật)
    suggestedPrice: Optional[float] = None
    suggestedRevenueSplit: Optional[int] = None
    pricingRationale: Optional[str] = None
    flags: list = []                         # [{type, severity, detail, evidenceIndex?}]
    raw: dict = {}                           # output thô từng module (debug/admin)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/face/check", response_model=FaceCheckResponse)
def check_face(req: FaceCheckRequest):
    """
    Kiểm tra xem khuôn mặt đã tồn tại trong DB chưa, và có trùng với danh
    tính đã bị cấm (banned_identities) không. Gọi trước khi tạo user.
    Không lưu gì vào DB.
    """
    embedding = extract_embedding(req.imageBase64)

    if embedding is None:
        raise HTTPException(
            status_code=422,
            detail="Không tìm thấy khuôn mặt rõ ràng trong ảnh. Vui lòng chụp lại với ánh sáng tốt hơn và nhìn thẳng vào camera."
        )

    is_banned = find_banned_face(embedding, THRESHOLD)
    if is_banned:
        return FaceCheckResponse(
            isDuplicate=True,
            isBanned=True,
            message="Danh tính này đã bị cấm khỏi nền tảng."
        )

    is_dup = find_duplicate_face(embedding, THRESHOLD)
    return FaceCheckResponse(
        isDuplicate=is_dup,
        isBanned=False,
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


@app.post("/face/ban/{user_id}", response_model=FaceRegisterResponse)
def ban_face(user_id: str, req: FaceBanRequest):
    """
    Copy face embedding hiện có của user sang banned_identities (nếu có) —
    gọi bởi Spring Boot khi resolve dispute (ban seller/reporter). Embedding
    gốc trong `embeddings` KHÔNG bị xóa (giữ để đối chiếu lịch sử/audit).
    """
    copied = ban_face_embedding(user_id, req.reason)
    return FaceRegisterResponse(
        success=True,
        message="Face embedding banned." if copied else "User has no registered face embedding; ban recorded without face vector."
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


@app.post("/kyc/check-image", response_model=KycImageCheckResponse)
def check_kyc_image(req: KycImageCheckRequest):
    """
    Chống bypass KYC: re-upload ảnh CCCD/Passport CŨ (của người khác, đã
    từng KYC trước đó) kèm sửa tay idNumber trên form — check trùng text
    không bắt được vì không nhìn vào ảnh thật. Tính CLIP embedding (512-dim,
    tái dùng model đã self-host cho media-match), so cosine similarity với
    toàn bộ ảnh CÙNG SIDE đã có, loại trừ chính user này.

    Nếu KHÔNG trùng → lưu embedding luôn (gộp check + save trong 1 lần gọi,
    Java chỉ cần gọi 1 lần trong confirmKyc). Nếu trùng → KHÔNG lưu, trả 409.
    """
    if req.imageSide not in ("front", "back"):
        raise HTTPException(status_code=400, detail="imageSide phải là 'front' hoặc 'back'.")

    embedding = clip_service.encode_image(req.imageBase64)
    if embedding is None:
        raise HTTPException(
            status_code=422,
            detail="Không thể trích xuất đặc trưng ảnh. Vui lòng chụp/tải lại ảnh rõ hơn."
        )

    duplicate_user_id = find_duplicate_kyc_image(req.userId, req.imageSide, embedding, KYC_IMAGE_THRESHOLD)
    if duplicate_user_id:
        return KycImageCheckResponse(
            isDuplicate=True,
            duplicateUserId=duplicate_user_id,
            message="Ảnh giấy tờ này đã được sử dụng để xác thực bởi một tài khoản khác."
        )

    save_kyc_image_embedding(req.userId, req.imageSide, embedding)
    return KycImageCheckResponse(isDuplicate=False, message="OK")


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


def _url_to_b64(url: str) -> Optional[str]:
    """Tải ảnh từ URL → base64. None nếu lỗi (fail-soft, không crash review)."""
    try:
        # Thử tải trực tiếp trước (phù hợp khi chạy local không qua Docker)
        r = _requests.get(url, timeout=15)
        r.raise_for_status()
        if len(r.content) > 15 * 1024 * 1024:  # bỏ ảnh > 15MB
            return None
        return _b64.b64encode(r.content).decode("ascii")
    except Exception:
        # Nếu lỗi và URL chứa localhost/127.0.0.1, thử thay bằng host.docker.internal (phù hợp khi chạy trong Docker)
        try:
            fallback_url = url
            if "localhost" in url:
                fallback_url = url.replace("localhost", "host.docker.internal")
            elif "127.0.0.1" in url:
                fallback_url = url.replace("127.0.0.1", "host.docker.internal")
            
            if fallback_url != url:
                r = _requests.get(fallback_url, timeout=15)
                r.raise_for_status()
                if len(r.content) > 15 * 1024 * 1024:
                    return None
                return _b64.b64encode(r.content).decode("ascii")
        except Exception:
            pass
        return None


@app.post("/ai/review", response_model=AiReviewResponse)
def ai_review(req: AiReviewRequest):
    """
    Orchestrator AI review (multimodal): tạo report ĐỀ XUẤT cho admin.
      - CODE: clone repo → rule-based + DeepSeek (chất lượng + mô tả đối chiếu code)
      - MEDIA (cả code & asset): cắt frame video + screenshots → CLIP match + NSFW
    AI KHÔNG quyết định cuối — admin xem điểm + flags + bằng chứng rồi quyết định.
    Mọi module fail-soft: lỗi 1 phần → vẫn trả các phần còn lại.
    """
    flags = []
    raw = {}
    code_quality = None
    description_match = None
    tags_match_score = None
    suggested_price = None
    revenue_split = None
    pricing_rationale = None

    # ── 1. Thu thập ảnh: frame video + screenshots ──
    images_b64: list[str] = []
    frame_count = 0
    if req.videoUrl:
        frames = frame_extractor.extract_frames(req.videoUrl, req.frameCount)
        frame_count = len(frames)
        images_b64.extend(frames)
        raw["frames"] = {"count": frame_count}
    for url in (req.screenshotUrls or []):
        b = _url_to_b64(url)
        if b:
            images_b64.append(b)
    raw["imageCount"] = len(images_b64)

    # ── 2. Code analyzer (chỉ CODE từ repo) ──
    if req.contentType == "code" and req.repoUrl:
        tmp_dir = None
        try:
            cloned = source_service.clone_repo(req.repoUrl, req.token, req.branch)
            tmp_dir = cloned["tmpDir"]
            code_res = code_analyzer.analyze(tmp_dir, req.title, req.description)
            raw["code"] = code_res
            code_quality = code_res.get("codeQualityScore")
            description_match = code_res.get("descriptionMatchScore")
            suggested_price = code_res.get("suggestedPrice")
            revenue_split = code_res.get("suggestedRevenueSplit")
            pricing_rationale = code_res.get("pricingRationale")
            rule_res = code_res.get("rule", {})
            for s in rule_res.get("secrets", []):
                flags.append({"type": "secret_hardcoded", "severity": "high",
                              "detail": f"Secret nghi ngờ trong {s['file']} ({s['type']})"})
            if not rule_res.get("hasLicense"):
                flags.append({"type": "missing_license", "severity": "low",
                              "detail": "Missing LICENSE file in repository."})
            if not rule_res.get("hasReadme"):
                flags.append({"type": "missing_readme", "severity": "low",
                              "detail": "Missing README.md file in repository."})
            if rule_res.get("hasUnwantedCache"):
                flags.append({"type": "unwanted_cache_pushed", "severity": "medium",
                              "detail": "Godot build cache (.godot/ or .import/) found in repo. Exclude them in .gitignore."})
            ds = code_res.get("deepseek") or {}
            for issue in ds.get("issues", []):
                flags.append({"type": "code_" + str(issue.get("type", "issue")),
                              "severity": issue.get("severity", "low"),
                              "detail": issue.get("detail", "")})
            if ds.get("skipped"):
                raw["deepseekSkipped"] = ds.get("reason")
        except Exception as e:
            raw["codeError"] = str(e)[:200]
        finally:
            source_service.cleanup(tmp_dir)

    # ── 2a. Text analyzer (Kiểm duyệt ngôn từ nhạy cảm trong Tên và Mô tả) ──
    try:
        text_res = text_analyzer.analyze(req.title, req.description, req.tags)
        raw["text"] = text_res
        tags_match_score = text_res.get("tagsMatchScore")
        for issue in text_res.get("issues", []):
            is_tag_issue = issue.get("field") == "tags"
            prefix = "Tag không khớp nội dung" if is_tag_issue else "Văn bản nhạy cảm"
            flags.append({
                "type": "text_" + str(issue.get("type", "issue")),
                "severity": issue.get("severity", "medium"),
                "detail": f"{prefix}: {issue.get('detail')}"
            })
    except Exception as e:
        raw["textError"] = str(e)[:200]

    # ── 3. CLIP media-match ──
    clip_res = clip_service.match(
        images_b64, [req.title, req.description, req.category or ""])
    raw["clip"] = clip_res
    media_match = clip_res.get("score")
    if media_match is not None and media_match < 35:
        flags.append({"type": "media_mismatch", "severity": "medium",
                      "detail": f"Ảnh/video khớp mô tả thấp (CLIP score={media_match})"})

    # ── 4. NSFW scan ──
    nsfw_res = nsfw_service.scan(images_b64)
    raw["nsfw"] = nsfw_res
    nsfw_flag = bool(nsfw_res.get("flagged"))
    for idx in nsfw_res.get("flaggedIndexes", []):
        flags.append({"type": "nsfw", "severity": "high",
                      "detail": f"Ảnh #{idx} vượt ngưỡng NSFW "
                                f"({nsfw_res.get('maxNsfwScore')})",
                      "evidenceIndex": idx})

    # ── 4a. OCR Text Moderation on Images & Video Frames ──
    ocr_flags_count = 0
    try:
        from text_analyzer import _SENSITIVE_KEYWORDS
        # Quét tối đa 8 hình ảnh (bao gồm cả screenshots và video frames) để tránh quá tải API
        sampled_images = images_b64[:8]
        for idx, img_b64 in enumerate(sampled_images):
            try:
                detected_text = extract_text_from_image(img_b64)
                if detected_text:
                    detected_lower = detected_text.lower()
                    matched_kws = [kw for kw in _SENSITIVE_KEYWORDS if kw in detected_lower]
                    if matched_kws:
                        flags.append({
                            "type": "media_ocr_sensitive",
                            "severity": "high",
                            "detail": f"Phát hiện ngôn từ nhạy cảm viết trong hình ảnh/video #{idx}: {', '.join(matched_kws[:3])}",
                            "evidenceIndex": idx
                        })
                        ocr_flags_count += 1
            except Exception:
                pass
        raw["ocr_media_scan"] = {"scanned_count": len(sampled_images), "flags_found": ocr_flags_count}
    except Exception as e:
        raw["ocr_media_scan_error"] = str(e)[:200]

    # ── 5. Tổng hợp đề xuất ──
    recommendation = _recommend(code_quality, media_match, description_match, nsfw_flag, flags)

    return AiReviewResponse(
        codeQualityScore=code_quality,
        mediaMatchScore=media_match,
        descriptionMatchScore=description_match,
        tagsMatchScore=tags_match_score,
        nsfwFlag=nsfw_flag,
        overallRecommendation=recommendation,
        suggestedPrice=suggested_price,
        suggestedRevenueSplit=revenue_split,
        pricingRationale=pricing_rationale,
        flags=flags,
        raw=raw,
    )


def _recommend(code_q, media, desc, nsfw_flag, flags) -> str:
    """
    Đề xuất tổng (KHÔNG phải phán quyết). Admin luôn quyết định cuối.
      - reject: NSFW vi phạm, hoặc secret high, hoặc điểm rất thấp
      - approve: tất cả điểm cao + không flag nghiêm trọng
      - review: còn lại (mặc định — cần người xem)
    """
    has_high = any(f.get("severity") == "high" for f in flags)
    if nsfw_flag or has_high:
        return "reject"

    scores = [s for s in (code_q, media, desc) if s is not None]
    if scores and all(s >= 70 for s in scores) and not flags:
        return "approve"
    if scores and any(s < 30 for s in scores):
        return "reject"
    return "review"


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8001, reload=True)
