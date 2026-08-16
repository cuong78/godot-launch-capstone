package com.godotlaunch.backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * Kết quả kiểm tra quyền truy cập repo bằng chứng (evidenceRepoUrl) trước
 * khi cho phép submit dispute. access = "PUBLIC" | "PRIVATE_GRANTED" (đã
 * đọc được ngay) | "PRIVATE_NO_ACCESS" (cần mời bot). botUsername chỉ có
 * giá trị khi access = PRIVATE_NO_ACCESS, để frontend hiển thị
 * BotInviteModal (repoInviteUrl tự build ở frontend từ repoUrl, giống
 * pattern đã dùng ở UploadPage.tsx — không cần backend trả).
 */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EvidenceRepoAccessResponse {
    private String access;
    private String botUsername;
}
