package com.godotlaunch.backend.controller;

import com.godotlaunch.backend.constant.ErrorCode;
import com.godotlaunch.backend.dto.request.KycConfirmRequest;
import com.godotlaunch.backend.dto.request.KycOcrRequest;
import com.godotlaunch.backend.dto.response.ApiResponse;
import com.godotlaunch.backend.dto.response.KycOcrResponse;
import com.godotlaunch.backend.dto.response.KycStatusResponse;
import com.godotlaunch.backend.entity.Role;
import com.godotlaunch.backend.entity.User;
import com.godotlaunch.backend.exception.AppException;
import com.godotlaunch.backend.repository.RoleRepository;
import com.godotlaunch.backend.repository.UserRepository;
import com.godotlaunch.backend.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;

import java.security.Principal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.Map;

import com.godotlaunch.backend.service.SeaweedFsService;
import com.godotlaunch.backend.util.ByteArrayMultipartFile;

@RestController
@RequestMapping("/api/developer/kyc")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Developer KYC API", description = "Tier 2 KYC — OCR giấy tờ tùy thân trước khi ký hợp đồng lần đầu")
public class KycController {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final AuthService authService;
    private final StorageRouter storageRouter;
    private final RestTemplate restTemplate = new RestTemplate();

    @Value("${app.face-service.url:http://localhost:8001}")
    private String faceServiceUrl;

    @GetMapping("/status")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Lấy trạng thái KYC của developer hiện tại")
    public ResponseEntity<ApiResponse<KycStatusResponse>> getKycStatus(Principal principal) {
        User user = findUser(principal);
        requireGithubLinkedOrDeveloper(user);
        return ResponseEntity.ok(ApiResponse.success(toStatusResponse(user), "KYC status retrieved"));
    }

    @PostMapping("/ocr")
    @PreAuthorize("isAuthenticated()")
    @Operation(
        summary = "OCR giấy tờ tùy thân",
        description = "Gửi ảnh CCCD/Passport sang Python service để trích xuất thông tin. Chưa lưu DB — cần gọi /confirm sau."
    )
    public ResponseEntity<ApiResponse<KycOcrResponse>> ocrDocument(
            @Valid @RequestBody KycOcrRequest request,
            Principal principal) {

        requireGithubLinkedOrDeveloper(findUser(principal));

        try {
            String url = faceServiceUrl + "/ocr/document";
            Map<String, String> body = Map.of(
                "imageBase64", request.getImageBase64(),
                "documentType", request.getDocumentType()
            );

            ResponseEntity<Map<String, Object>> response = restTemplate.exchange(
                url, HttpMethod.POST,
                new HttpEntity<>(body),
                new ParameterizedTypeReference<Map<String, Object>>() {}
            );

            Map<String, Object> data = response.getBody();
            if (data == null) throw new AppException(ErrorCode.INTERNAL_SERVER_ERROR);

            KycOcrResponse ocrResponse = KycOcrResponse.builder()
                .documentType((String) data.get("documentType"))
                .idNumber((String) data.get("idNumber"))
                .fullName((String) data.get("fullName"))
                .dateOfBirth((String) data.get("dateOfBirth"))
                .address((String) data.get("address"))
                .build();

            return ResponseEntity.ok(ApiResponse.success(ocrResponse, "OCR thành công. Vui lòng kiểm tra và xác nhận thông tin."));

        } catch (HttpClientErrorException e) {
            String detail = extractDetail(e.getResponseBodyAsString());
            return ResponseEntity.badRequest().body(ApiResponse.error(400, detail));
        } catch (AppException ae) {
            throw ae;
        } catch (Exception e) {
            log.error("OCR service error", e);
            throw new AppException(ErrorCode.INTERNAL_SERVER_ERROR);
        }
    }

    @PostMapping("/confirm")
    @PreAuthorize("isAuthenticated()")
    @Operation(
        summary = "Xác nhận và lưu thông tin KYC",
        description = "Developer xem lại thông tin OCR, có thể chỉnh sửa, rồi bấm xác nhận. Lưu vào DB và set kyc_verified = true. Chỉ thực hiện được 1 lần."
    )
    public ResponseEntity<ApiResponse<KycStatusResponse>> confirmKyc(
            @Valid @RequestBody KycConfirmRequest request,
            Principal principal) {

        User user = findUser(principal);
        requireGithubLinkedOrDeveloper(user);

        if (user.isKycVerified()) {
            return ResponseEntity.ok(ApiResponse.success(toStatusResponse(user), "KYC đã được xác thực trước đó."));
        }

        // Upload images if provided
        if (request.getFrontImageBase64() != null && !request.getFrontImageBase64().isBlank()) {
            try {
                byte[] bytes = java.util.Base64.getDecoder().decode(cleanBase64(request.getFrontImageBase64()));
                ByteArrayMultipartFile file = new ByteArrayMultipartFile(bytes, "front", "kyc_front_" + user.getId() + ".jpg", "image/jpeg");
                String frontUrl = seaweedFsService.uploadFile(file, "kyc");
                user.setKycFrontImageUrl(frontUrl);
            } catch (Exception e) {
                log.error("Failed to upload KYC front image", e);
            }
        }
        if (request.getBackImageBase64() != null && !request.getBackImageBase64().isBlank()) {
            try {
                byte[] bytes = java.util.Base64.getDecoder().decode(cleanBase64(request.getBackImageBase64()));
                ByteArrayMultipartFile file = new ByteArrayMultipartFile(bytes, "back", "kyc_back_" + user.getId() + ".jpg", "image/jpeg");
                String backUrl = seaweedFsService.uploadFile(file, "kyc");
                user.setKycBackImageUrl(backUrl);
            } catch (Exception e) {
                log.error("Failed to upload KYC back image", e);
            }
        }

        user.setKycDocumentType(request.getDocumentType());
        user.setKycFullName(request.getFullName());
        user.setKycIdNumber(request.getIdNumber());
        user.setKycAddress(request.getAddress());

        if (request.getDateOfBirth() != null && !request.getDateOfBirth().isBlank()) {
            user.setKycDateOfBirth(parseDob(request.getDateOfBirth()));
        }

        user.setKycVerified(true);
        user.setKycVerifiedAt(Instant.now());

        // Đủ cả 3 điều kiện (GitHub linked + Face verified + KYC verified) -> nâng role.
        boolean justUpgraded = false;
        if (user.getGithubId() != null && user.isFaceVerified()
                && !"developer".equalsIgnoreCase(user.getRole().getName())
                && !"admin".equalsIgnoreCase(user.getRole().getName())) {
            Role developerRole = roleRepository.findByName("developer")
                    .orElseThrow(() -> new AppException(ErrorCode.ROLE_NOT_FOUND));
            user.setRole(developerRole);
            justUpgraded = true;
        }

        userRepository.save(user);

        String newToken = justUpgraded ? authService.refreshSession(user) : null;
        return ResponseEntity.ok(ApiResponse.success(toStatusResponse(user, newToken), "Xác thực KYC thành công."));
    }

    private String cleanBase64(String base64) {
        if (base64 != null && base64.contains(",")) {
            return base64.split(",")[1];
        }
        return base64;
    }

    private User findUser(Principal principal) {
        // Fetch kèm role trong cùng query — tránh LazyInitializationException khi đọc
        // user.getRole() sau đó (open-in-view=false nên session đóng ngay sau khi trả về).
        return userRepository.findWithRoleByEmail(principal.getName())
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
    }

    private KycStatusResponse toStatusResponse(User user) {
        return toStatusResponse(user, null);
    }

    private KycStatusResponse toStatusResponse(User user, String token) {
        return KycStatusResponse.builder()
                .kycVerified(user.isKycVerified())
                .documentType(user.getKycDocumentType())
                .fullName(user.getKycFullName())
                .idNumber(user.getKycIdNumber())
                .dateOfBirth(user.getKycDateOfBirth())
                .address(user.getKycAddress())
                .kycVerifiedAt(user.getKycVerifiedAt())
                .kycFrontImageUrl(user.getKycFrontImageUrl())
                .kycBackImageUrl(user.getKycBackImageUrl())
                .token(token)
                .build();
    }

    private LocalDate parseDob(String dob) {
        // Thử DD/MM/YYYY trước, fallback YYYY-MM-DD
        for (String pattern : new String[]{"dd/MM/yyyy", "yyyy-MM-dd", "dd-MM-yyyy"}) {
            try {
                return LocalDate.parse(dob, DateTimeFormatter.ofPattern(pattern));
            } catch (DateTimeParseException ignored) {}
        }
        return null;
    }

    private String extractDetail(String body) {
        try {
            if (body != null && body.contains("\"detail\":\"")) {
                int start = body.indexOf("\"detail\":\"") + 10;
                int end = body.indexOf("\"", start);
                if (start > 9 && end > start) return body.substring(start, end);
            }
        } catch (Exception ignored) {}
        return "Không thể đọc thông tin từ ảnh. Vui lòng chụp rõ hơn và thử lại.";
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
