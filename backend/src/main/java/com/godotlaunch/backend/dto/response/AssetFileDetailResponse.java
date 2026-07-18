package com.godotlaunch.backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.UUID;

/** Chi tiết 1 Asset khi drill-down — thumbnail + file chính của nó. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AssetFileDetailResponse {
    private UUID id;
    private String title;
    private String status;
    private String sellerName;
    private List<UploadedFileResponse> files; // thumbnail (1, nếu có) + file chính (1, nếu có)
}
