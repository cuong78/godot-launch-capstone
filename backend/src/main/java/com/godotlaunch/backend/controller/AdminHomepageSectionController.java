package com.godotlaunch.backend.controller;

import com.godotlaunch.backend.dto.request.*;
import com.godotlaunch.backend.dto.response.*;
import com.godotlaunch.backend.service.HomepageSectionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController @RequestMapping("/api/v1/admin/homepage-sections") @RequiredArgsConstructor @PreAuthorize("hasAuthority('ROLE_ADMIN')")
public class AdminHomepageSectionController {
    private final HomepageSectionService service;
    @GetMapping public ResponseEntity<ApiResponse<List<HomepageSectionResponse>>> getAll() { return ResponseEntity.ok(ApiResponse.success(service.getAll(), "Homepage sections retrieved successfully")); }
    @PostMapping public ResponseEntity<ApiResponse<HomepageSectionResponse>> create(@Valid @RequestBody HomepageSectionRequest request) { return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(service.create(request), "Homepage section created successfully")); }
    @PutMapping("/{id}") public ResponseEntity<ApiResponse<HomepageSectionResponse>> update(@PathVariable UUID id, @Valid @RequestBody UpdateHomepageSectionRequest request) { return ResponseEntity.ok(ApiResponse.success(service.update(id, request), "Homepage section updated successfully")); }
    @DeleteMapping("/{id}") public ResponseEntity<ApiResponse<Void>> delete(@PathVariable UUID id) { service.delete(id); return ResponseEntity.ok(ApiResponse.success(null, "Homepage section deleted successfully")); }
}
