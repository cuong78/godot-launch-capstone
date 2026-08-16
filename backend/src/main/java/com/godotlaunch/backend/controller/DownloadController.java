package com.godotlaunch.backend.controller;

import com.godotlaunch.backend.service.DownloadService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.util.StringUtils;

import java.nio.charset.StandardCharsets;
import java.security.Principal;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/downloads")
@RequiredArgsConstructor
@Tag(name = "Download API", description = "Protected marketplace source-code downloads")
public class DownloadController {

    private final DownloadService downloadService;

    @GetMapping("/{purchaseId}")
    @PreAuthorize("hasAnyRole('CUSTOMER', 'DEVELOPER')")
    @Operation(summary = "Download purchased marketplace source code")
    public ResponseEntity<InputStreamResource> downloadPurchase(
            @PathVariable UUID purchaseId,
            Principal principal,
            HttpServletRequest request) {
        DownloadService.DownloadResource download = downloadService.downloadPurchase(
                purchaseId,
                principal.getName(),
                resolveClientIp(request),
                request.getHeader(HttpHeaders.USER_AGENT)
        );

        ResponseEntity.BodyBuilder response = ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .header(
                        HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.attachment()
                                .filename(download.fileName(), StandardCharsets.UTF_8)
                                .build()
                                .toString()
                );
        if (download.gameVersionId() != null) {
            response.header("X-Game-Version-Id", download.gameVersionId().toString());
        }
        if (StringUtils.hasText(download.gameVersionNumber())) {
            response.header("X-Game-Version", download.gameVersionNumber());
        }
        return response.body(new InputStreamResource(download.inputStream()));
    }

    private String resolveClientIp(HttpServletRequest request) {
        String forwardedFor = request.getHeader("X-Forwarded-For");
        if (StringUtils.hasText(forwardedFor)) {
            return forwardedFor.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
