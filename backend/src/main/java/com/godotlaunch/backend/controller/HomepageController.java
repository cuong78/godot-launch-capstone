package com.godotlaunch.backend.controller;

import com.godotlaunch.backend.dto.response.*;
import com.godotlaunch.backend.service.HomepageService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController @RequestMapping("/api/v1/homepage") @RequiredArgsConstructor
public class HomepageController {
    private final HomepageService homepageService;
    @GetMapping public ResponseEntity<ApiResponse<HomepageResponse>> getHomepage() {
        return ResponseEntity.ok(ApiResponse.success(homepageService.getHomepage(), "Homepage content retrieved successfully"));
    }
}
