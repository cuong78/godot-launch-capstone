package com.godotlaunch.backend.controller;

import com.godotlaunch.backend.dto.request.PublishingGuideRequest;
import com.godotlaunch.backend.dto.response.PublishingGuideResponse;
import com.godotlaunch.backend.service.PublishingGuideService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/guides")
@RequiredArgsConstructor
public class PublishingGuideController {

    private final PublishingGuideService publishingGuideService;

    // Public endpoint for Developer Portal to get active guides
    @GetMapping
    public ResponseEntity<List<PublishingGuideResponse>> getActiveGuides() {
        return ResponseEntity.ok(publishingGuideService.getActiveGuides());
    }

    // Admin endpoints
    @GetMapping("/all")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<PublishingGuideResponse>> getAllGuides() {
        return ResponseEntity.ok(publishingGuideService.getAllGuides());
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<PublishingGuideResponse> getGuideById(@PathVariable UUID id) {
        return ResponseEntity.ok(publishingGuideService.getGuideById(id));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<PublishingGuideResponse> createGuide(
            @Valid @RequestBody PublishingGuideRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        PublishingGuideResponse response = publishingGuideService.createGuide(request, userDetails.getUsername());
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<PublishingGuideResponse> updateGuide(
            @PathVariable UUID id,
            @Valid @RequestBody PublishingGuideRequest request) {
        return ResponseEntity.ok(publishingGuideService.updateGuide(id, request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteGuide(@PathVariable UUID id) {
        publishingGuideService.deleteGuide(id);
        return ResponseEntity.noContent().build();
    }
}
