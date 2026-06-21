package com.godotlaunch.backend.controller;

import com.godotlaunch.backend.config.FaceServiceClient;
import com.godotlaunch.backend.constant.ErrorCode;
import com.godotlaunch.backend.dto.request.FaceVerifyRequest;
import com.godotlaunch.backend.dto.response.ApiResponse;
import com.godotlaunch.backend.entity.User;
import com.godotlaunch.backend.exception.AppException;
import com.godotlaunch.backend.repository.UserRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.Map;

@RestController
@RequestMapping("/api/developer")
@RequiredArgsConstructor
@Tag(name = "Developer KYC API", description = "Face verification for Tier 1 KYC — required before first marketplace publish")
public class FaceVerifyController {

    private final FaceServiceClient faceServiceClient;
    private final UserRepository userRepository;

    @GetMapping("/face-verify/status")
    @PreAuthorize("hasAnyRole('DEVELOPER', 'ADMIN')")
    @Operation(summary = "Get face verification status", description = "Returns whether the current developer has completed face verification.")
    public ResponseEntity<ApiResponse<Map<String, Boolean>>> getFaceVerifyStatus(Principal principal) {
        User user = userRepository.findByEmail(principal.getName())
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
        return ResponseEntity.ok(ApiResponse.success(
                Map.of("faceVerified", user.isFaceVerified()),
                "Face verification status retrieved"
        ));
    }

    @PostMapping("/face-verify")
    @PreAuthorize("hasAnyRole('DEVELOPER', 'ADMIN')")
    @Operation(
        summary = "Submit face for verification",
        description = "Checks face is not duplicate, registers embedding, sets face_verified = true. One-time only."
    )
    public ResponseEntity<ApiResponse<Map<String, Boolean>>> verifyFace(
            @Valid @RequestBody FaceVerifyRequest request,
            Principal principal) {

        User user = userRepository.findByEmail(principal.getName())
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        if (user.isFaceVerified()) {
            return ResponseEntity.ok(ApiResponse.success(
                    Map.of("faceVerified", true),
                    "Khuôn mặt đã được xác thực trước đó."
            ));
        }

        // Check duplicate
        try {
            boolean isDuplicate = faceServiceClient.isDuplicateFace(request.getFaceImageBase64());
            if (isDuplicate) {
                throw new AppException(ErrorCode.FACE_DUPLICATE);
            }
        } catch (AppException ae) {
            throw ae;
        } catch (FaceServiceClient.FaceServiceException fse) {
            throw new AppException(ErrorCode.FACE_NOT_DETECTED);
        }

        // Register embedding
        faceServiceClient.registerFace(user.getId(), request.getFaceImageBase64());

        // Mark verified
        user.setFaceVerified(true);
        userRepository.save(user);

        return ResponseEntity.ok(ApiResponse.success(
                Map.of("faceVerified", true),
                "Xác thực khuôn mặt thành công."
        ));
    }
}
