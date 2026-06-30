package com.godotlaunch.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.util.UUID;

@Data
public class CreateDisputeRequest {
    // Game bị tố (dispute chỉ cho game)
    private UUID gameId;

    @NotBlank(message = "Lý do tố cáo là bắt buộc")
    private String reason;

    // Repo của B (reporter) làm bằng chứng tác giả gốc
    private String evidenceRepoUrl;
    private String evidenceNote;
}
