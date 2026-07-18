package com.godotlaunch.backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.UUID;

/** Chi tiết 1 Game khi drill-down — thumbnail + toàn bộ SourceSnapshot của nó. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GameFileDetailResponse {
    private UUID id;
    private String title;
    private String publishingType;
    private String status;
    private String creatorName;
    private List<UploadedFileResponse> files; // thumbnail (1, nếu có) + source snapshots (N)
}
