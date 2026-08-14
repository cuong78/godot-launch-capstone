package com.godotlaunch.backend.controller;

import com.godotlaunch.backend.dto.response.ApiResponse;
import com.godotlaunch.backend.service.rag.RagIngestionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin/rag")
@RequiredArgsConstructor
@Tag(name = "Admin RAG Management API", description = "Endpoints for managing AI Vector Knowledge Base re-indexing")
public class RagAdminController {

    private final RagIngestionService ragIngestionService;

    @PostMapping("/reindex")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Re-index all documentation files into Vector Database", description = "Triggers full ingestion of markdown docs into pgvector.")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<ApiResponse<String>> reindexDocs() {
        int totalChunks = ragIngestionService.ingestAllDocs();
        return ResponseEntity.ok(ApiResponse.success(
                "Đã hoàn tất nạp lại " + totalChunks + " đoạn tài liệu vào Vector Store thành công.",
                "Nạp lại kiến thức AI thành công."
        ));
    }
}
