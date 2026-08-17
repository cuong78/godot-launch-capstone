package com.godotlaunch.backend.dto.request;

import com.godotlaunch.backend.entity.enums.PublishingType;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Data
public class CreateGameRequest {
    @NotBlank(message = "Title is required")
    private String title;

    private String description;

    private BigDecimal priceProposed;

    /** Developer đề xuất % doanh thu mong muốn (co_publishing) — chỉ tham khảo, admin sửa lại khi soạn Contract. */
    @Min(0)
    @Max(100)
    private Short revenueSplitProposed;

    private UUID categoryId;

    private PublishingType publishingType;

    // Repo-based submit: link repo GitHub (thay cho upload game.zip)
    private String githubRepoUrl;

    private String githubBranch;

    // Tags do developer chọn (nhiều-nhiều, giống marketplace item)
    private List<UUID> tagIds;
}
