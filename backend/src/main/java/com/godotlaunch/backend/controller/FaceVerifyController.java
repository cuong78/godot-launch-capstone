package com.godotlaunch.backend.controller;

import com.godotlaunch.backend.config.FaceServiceClient;
import com.godotlaunch.backend.constant.ErrorCode;
import com.godotlaunch.backend.dto.request.FaceVerifyRequest;
import com.godotlaunch.backend.dto.response.ApiResponse;
import com.godotlaunch.backend.dto.response.FaceChallengeResponse;
import com.godotlaunch.backend.entity.User;
import com.godotlaunch.backend.exception.AppException;
import com.godotlaunch.backend.repository.UserRepository;
import com.godotlaunch.backend.service.FaceChallengeService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.Map;
import java.util.List;

@RestController
@RequestMapping("/api/developer")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Developer KYC API", description = "Face verification for Tier 1 KYC — required before first marketplace publish")
public class FaceVerifyController {

    private final FaceServiceClient faceServiceClient;
    private final UserRepository userRepository;
    private final FaceChallengeService faceChallengeService;

    @GetMapping("/face-verify/status")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get face verification status", description = "Returns whether the current developer has completed face verification.")
    public ResponseEntity<ApiResponse<Map<String, Boolean>>> getFaceVerifyStatus(Principal principal) {
        // Fetch kèm role trong cùng query — tránh LazyInitializationException khi đọc
        // user.getRole() sau đó (open-in-view=false nên session đóng ngay sau khi trả về).
        User user = userRepository.findWithRoleByEmail(principal.getName())
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
        return ResponseEntity.ok(ApiResponse.success(
                Map.of("faceVerified", user.isFaceVerified()),
                "Face verification status retrieved"
        ));
    }

    @PostMapping("/face-verify/challenge")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Create a single-use randomized face liveness challenge")
    public ResponseEntity<ApiResponse<FaceChallengeResponse>> createChallenge(Principal principal) {
        User user = userRepository.findWithRoleByEmail(principal.getName())
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
        requireGithubLinkedOrDeveloper(user);
        FaceChallengeResponse challenge = faceChallengeService.create(user.getId());
        return ResponseEntity.ok(ApiResponse.success(challenge, "Face challenge created"));
    }

    @PostMapping("/face-verify")
    @PreAuthorize("isAuthenticated()")
    @Operation(
        summary = "Submit face for verification",
        description = "Checks face is not duplicate, registers embedding, sets face_verified = true. One-time only."
    )
    public ResponseEntity<ApiResponse<Map<String, Boolean>>> verifyFace(
            @Valid @RequestBody FaceVerifyRequest request,
            Principal principal) {

        // Fetch kèm role trong cùng query — tránh LazyInitializationException khi đọc
        // user.getRole() sau đó (open-in-view=false nên session đóng ngay sau khi trả về).
        User user = userRepository.findWithRoleByEmail(principal.getName())
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
        requireGithubLinkedOrDeveloper(user);

        if (user.isFaceVerified()) {
            return ResponseEntity.ok(ApiResponse.success(
                    Map.of("faceVerified", true),
                    "Khuôn mặt đã được xác thực trước đó."
            ));
        }

        List<String> actions = request.getFrames().stream()
                .map(FaceVerifyRequest.Frame::getAction).toList();
        faceChallengeService.consume(user.getId(), request.getChallengeId(), actions);

        List<Map<String, Object>> frames = request.getFrames().stream()
                .map(frame -> Map.<String, Object>of(
                        "action", frame.getAction(),
                        "imageBase64", frame.getImageBase64(),
                        "capturedAt", frame.getCapturedAt()))
                .toList();

        try {
            FaceServiceClient.FaceLivenessResult result = faceServiceClient.verifyLiveness(
                    user.getId(), request.getChallengeId(), frames);
            if (result.isBanned()) {
                throw new AppException(ErrorCode.IDENTITY_BANNED);
            }
            if (result.isDuplicate()) {
                throw new AppException(ErrorCode.FACE_DUPLICATE);
            }
            if (!result.success()) {
                throw new AppException(ErrorCode.FACE_LIVENESS_FAILED);
            }
        } catch (AppException ae) {
            throw ae;
        } catch (FaceServiceClient.FaceServiceUnavailableException unavailable) {
            throw new AppException(ErrorCode.FACE_SERVICE_UNAVAILABLE);
        } catch (FaceServiceClient.FaceServiceException fse) {
            String detail = fse.getMessage();
            log.warn("Liveness verification rejected user {}: {}", user.getId(), detail);
            throw new AppException(
                    ErrorCode.FACE_LIVENESS_FAILED,
                    detail == null || detail.isBlank()
                            ? ErrorCode.FACE_LIVENESS_FAILED.getMessage()
                            : detail
            );
        }

        // Mark verified
        user.setFaceVerified(true);
        userRepository.save(user);

        return ResponseEntity.ok(ApiResponse.success(
                Map.of("faceVerified", true),
                "Xác thực khuôn mặt thành công."
        ));
    }

    // Điều kiện gọi API: đã link GitHub (đang trong luồng become-developer),
    // hoặc đã là developer/admin từ trước (không đòi hỏi role=developer sẵn có nữa).
    private void requireGithubLinkedOrDeveloper(User user) {
        boolean eligible = user.getGithubId() != null
                || "developer".equalsIgnoreCase(user.getRole().getName())
                || "admin".equalsIgnoreCase(user.getRole().getName());
        if (!eligible) {
            throw new AppException(ErrorCode.GITHUB_NOT_LINKED);
        }
    }
}
