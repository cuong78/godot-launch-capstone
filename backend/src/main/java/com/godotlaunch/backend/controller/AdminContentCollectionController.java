package com.godotlaunch.backend.controller;

import com.godotlaunch.backend.dto.request.ContentCollectionRequest;
import com.godotlaunch.backend.dto.response.*;
import com.godotlaunch.backend.service.ContentCollectionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController @RequestMapping("/api/v1/admin/collections") @RequiredArgsConstructor @PreAuthorize("hasAuthority('ROLE_ADMIN')")
public class AdminContentCollectionController {
    private final ContentCollectionService service;
    @GetMapping public ResponseEntity<ApiResponse<List<ContentCollectionResponse>>> getAll() { return ResponseEntity.ok(ApiResponse.success(service.getAll(), "Collections retrieved successfully")); }
    @PostMapping public ResponseEntity<ApiResponse<ContentCollectionResponse>> create(@Valid @RequestBody ContentCollectionRequest request) { return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(service.create(request), "Collection created successfully")); }
    @PutMapping("/{id}") public ResponseEntity<ApiResponse<ContentCollectionResponse>> update(@PathVariable UUID id, @Valid @RequestBody ContentCollectionRequest request) { return ResponseEntity.ok(ApiResponse.success(service.update(id, request), "Collection updated successfully")); }
    @DeleteMapping("/{id}") public ResponseEntity<ApiResponse<Void>> delete(@PathVariable UUID id) { service.delete(id); return ResponseEntity.ok(ApiResponse.success(null, "Collection deleted successfully")); }
}
