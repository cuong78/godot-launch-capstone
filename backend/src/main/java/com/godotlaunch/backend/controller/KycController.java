package com.godotlaunch.backend.controller;

import com.godotlaunch.backend.constant.ErrorCode;
import com.godotlaunch.backend.dto.request.BankOtpConfirmRequest;
import com.godotlaunch.backend.dto.request.BankSetupRequest;
import com.godotlaunch.backend.dto.request.KycConfirmRequest;
import com.godotlaunch.backend.dto.request.KycOcrRequest;
import com.godotlaunch.backend.dto.response.ApiResponse;
import com.godotlaunch.backend.dto.response.KycOcrResponse;
import com.godotlaunch.backend.dto.response.KycStatusResponse;
import com.godotlaunch.backend.entity.Role;
import com.godotlaunch.backend.entity.User;
import com.godotlaunch.backend.exception.AppException;
import com.godotlaunch.backend.repository.BannedIdentityRepository;
import com.godotlaunch.backend.repository.RoleRepository;
import com.godotlaunch.backend.repository.UserRepository;
import com.godotlaunch.backend.config.VietQrLookupClient;
import com.godotlaunch.backend.service.AuthService;
import com.godotlaunch.backend.service.EmailService;
import com.godotlaunch.backend.service.OtpService;
import com.godotlaunch.backend.util.BankBinResolver;
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
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;

import java.security.Principal;
import java.text.Normalizer;
import java.time.Instant;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

import com.godotlaunch.backend.service.SeaweedFsService;
import com.godotlaunch.backend.util.ByteArrayMultipartFile;

@RestController
@RequestMapping("/api/developer/kyc")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Developer KYC API", description = "Tier 2 KYC — OCR giấy tờ tùy thân trước khi ký hợp đồng lần đầu")
public class KycController {

    private static final Set<String> SUPPORTED_BANK_NAMES = Set.of(
            "Vietcombank", "BIDV", "VietinBank", "Agribank", "Techcombank",
            "MBBank", "ACB", "Sacombank", "VPBank", "TPBank", "OCB", "SHB", "HDBank"
    );
    private static final String BANK_OTP_PURPOSE = "bank-setup";

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final BannedIdentityRepository bannedIdentityRepository;
    private final AuthService authService;
    private final SeaweedFsService seaweedFsService;
    private final OtpService otpService;
    private final EmailService emailService;
    private final VietQrLookupClient vietQrLookupClient;
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

        // Chặn danh tính giấy tờ đã bị cấm trước các kiểm tra trùng thông thường.
        String normalizedIdNumber = request.getIdNumber().trim();
        if (bannedIdentityRepository.existsByKycIdNumber(normalizedIdNumber)) {
            throw new AppException(ErrorCode.IDENTITY_BANNED);
        }

        // Chặn 2 tài khoản khác nhau cùng verify 1 CCCD/Passport — mỗi giấy tờ
        // chỉ được gắn với đúng 1 user trong hệ thống. Chuẩn hóa (trim) trước khi
        // so sánh để tránh né bằng khoảng trắng thừa.
        if (userRepository.existsByKycIdNumberAndIdNot(normalizedIdNumber, user.getId())) {
            throw new AppException(ErrorCode.KYC_ID_NUMBER_DUPLICATE);
        }

        // Chặn re-upload ẢNH CCCD/Passport CŨ (của người khác, đã từng KYC
        // trước đó) kèm sửa tay idNumber để bypass check ở trên — check text
        // không nhìn vào ảnh thật. So bằng CLIP embedding (ảnh↔ảnh), tách biệt
        // hoàn toàn khỏi check idNumber. Gọi TRƯỚC khi upload lên storage để
        // không lưu ảnh rác nếu bị chặn.
        if (request.getFrontImageBase64() != null && !request.getFrontImageBase64().isBlank()) {
            checkKycImageDuplicate(user.getId().toString(), "front", request.getFrontImageBase64());
        }
        if (request.getBackImageBase64() != null && !request.getBackImageBase64().isBlank()) {
            checkKycImageDuplicate(user.getId().toString(), "back", request.getBackImageBase64());
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
        user.setKycIdNumber(normalizedIdNumber);
        user.setKycAddress(request.getAddress());

        if (request.getDateOfBirth() != null && !request.getDateOfBirth().isBlank()) {
            user.setKycDateOfBirth(parseDob(request.getDateOfBirth()));
        }

        user.setKycVerified(true);
        user.setKycVerifiedAt(Instant.now());
        userRepository.save(user);
        return ResponseEntity.ok(ApiResponse.success(toStatusResponse(user), "Xác thực KYC thành công."));
    }

    @PostMapping("/bank/lookup-account")
    @PreAuthorize("isAuthenticated()")
    @Operation(
        summary = "Tra cứu tên chủ tài khoản thật từ ngân hàng (VietQR)",
        description = "Gọi khi user vừa nhập xong ngân hàng + số tài khoản, để hiển thị/tự điền tên chủ tài khoản trước khi submit. " +
                "Best-effort: trả accountName=null nếu dịch vụ tra cứu chưa cấu hình, ngân hàng chưa hỗ trợ, hoặc STK không hợp lệ — " +
                "KHÔNG chặn luồng, người dùng vẫn có thể tự nhập tay tên chủ tài khoản."
    )
    public ResponseEntity<ApiResponse<Map<String, String>>> lookupBankAccount(
            @RequestBody Map<String, String> request,
            Principal principal) {

        findUser(principal); // chỉ để chắc chắn đây là user hợp lệ đã đăng nhập, không cần dùng tiếp

        String bankName = request.get("bankName");
        String bankAccount = request.get("bankAccount");
        if (!StringUtils.hasText(bankName) || !StringUtils.hasText(bankAccount)
                || !bankAccount.trim().matches("\\d{6,19}")) {
            return ResponseEntity.ok(ApiResponse.success(nullAccountNameResult(), "Thông tin chưa đủ để tra cứu."));
        }

        String bin = BankBinResolver.resolve(bankName.trim());
        if (!StringUtils.hasText(bin)) {
            return ResponseEntity.ok(ApiResponse.success(nullAccountNameResult(), "Ngân hàng chưa được hỗ trợ tra cứu tự động."));
        }

        return vietQrLookupClient.lookupAccountName(bin, bankAccount.trim())
                .map(accountName -> ResponseEntity.ok(
                        ApiResponse.success(Map.of("accountName", accountName), "Tra cứu thành công.")))
                .orElseGet(() -> ResponseEntity.ok(
                        ApiResponse.success(nullAccountNameResult(), "Không tra cứu được — vui lòng tự nhập tên chủ tài khoản.")));
    }

    private Map<String, String> nullAccountNameResult() {
        Map<String, String> result = new java.util.HashMap<>();
        result.put("accountName", null);
        return result;
    }

    @PostMapping("/bank/request-otp")
    @PreAuthorize("isAuthenticated()")
    @Operation(
        summary = "Bước 1: Validate thông tin ngân hàng và gửi mã OTP xác nhận qua email",
        description = "Chưa lưu DB. Gửi OTP 6 số tới email tài khoản, hiệu lực 10 phút. Gọi /bank/confirm với đúng OTP để hoàn tất."
    )
    public ResponseEntity<ApiResponse<Void>> requestBankOtp(
            @Valid @RequestBody BankSetupRequest request,
            Principal principal) {

        User user = findUser(principal);
        validateBankSetupEligibility(user, request.getBankName(), request.getBankAccount(), request.getBankAccountHolder());

        String otp = otpService.generateOtp(BANK_OTP_PURPOSE, user.getEmail());
        emailService.sendBankSetupOtpEmail(
                user.getEmail(), otp, request.getBankName().trim(), maskAccountNumber(request.getBankAccount().trim()));

        return ResponseEntity.ok(ApiResponse.success(null,
                "Mã OTP đã được gửi tới email của bạn. Vui lòng kiểm tra hộp thư."));
    }

    @PostMapping("/bank/confirm")
    @PreAuthorize("isAuthenticated()")
    @Operation(
        summary = "Bước 2: Xác nhận OTP và lưu thông tin ngân hàng",
        description = "Bước cuối của become-developer. Chỉ lưu một lần; tên chủ tài khoản phải khớp tên KYC; yêu cầu đúng OTP còn hiệu lực từ /bank/request-otp."
    )
    public ResponseEntity<ApiResponse<KycStatusResponse>> confirmBankOtp(
            @Valid @RequestBody BankOtpConfirmRequest request,
            Principal principal) {

        User user = findUser(principal);
        validateBankSetupEligibility(user, request.getBankName(), request.getBankAccount(), request.getBankAccountHolder());

        if (!otpService.validateOtp(BANK_OTP_PURPOSE, user.getEmail(), request.getOtp())) {
            throw new AppException(ErrorCode.BANK_OTP_INVALID);
        }
        otpService.invalidateOtp(BANK_OTP_PURPOSE, user.getEmail());

        user.setBankName(request.getBankName().trim());
        user.setBankAccount(request.getBankAccount().trim());
        user.setBankAccountHolder(request.getBankAccountHolder().trim());

        // Chỉ hoàn tất nâng role sau bước payout hợp lệ, không nâng ở bước KYC.
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
        return ResponseEntity.ok(ApiResponse.success(
                toStatusResponse(user, newToken),
                "Thiết lập thông tin ngân hàng thành công."
        ));
    }

    // Dùng chung cho cả 2 bước (request-otp/confirm) — mỗi request HTTP độc lập,
    // không tin dữ liệu đã "chốt" từ bước trước nên validate lại đầy đủ mỗi lần.
    private void validateBankSetupEligibility(User user, String bankName, String bankAccount, String bankAccountHolder) {
        requireGithubLinkedOrDeveloper(user);

        if (!user.isKycVerified() || !StringUtils.hasText(user.getKycFullName())) {
            throw new AppException(ErrorCode.KYC_VERIFY_REQUIRED);
        }

        // Không cho endpoint onboarding trở thành đường sửa ngân hàng sau khi đã lưu.
        if (StringUtils.hasText(user.getBankName())
                || StringUtils.hasText(user.getBankAccount())
                || StringUtils.hasText(user.getBankAccountHolder())) {
            throw new AppException(ErrorCode.BANK_INFO_ALREADY_SET);
        }

        if (!StringUtils.hasText(bankName) || !StringUtils.hasText(bankAccount) || !StringUtils.hasText(bankAccountHolder)) {
            throw new AppException(ErrorCode.BANK_INFO_REQUIRED);
        }

        String normalizedBankName = bankName.trim();
        String normalizedBankAccount = bankAccount.trim();
        String normalizedHolder = bankAccountHolder.trim();

        if (!SUPPORTED_BANK_NAMES.contains(normalizedBankName)) {
            throw new AppException(ErrorCode.BANK_NAME_INVALID);
        }
        if (!normalizedBankAccount.matches("\\d{6,30}")) {
            throw new AppException(ErrorCode.BANK_ACCOUNT_INVALID);
        }
        if (!normalizeNameForCompare(user.getKycFullName()).equals(normalizeNameForCompare(normalizedHolder))) {
            throw new AppException(ErrorCode.BANK_NAME_MISMATCH);
        }

        // Lớp bảo vệ BỔ SUNG (không thay thế check ở trên): nếu VietQR lookup khả
        // dụng, đối chiếu THÊM với tên chủ tài khoản THẬT do ngân hàng trả về —
        // chặn trường hợp user gõ đúng tên trùng KYC nhưng STK thực chất KHÔNG
        // phải của họ (vd mượn/đánh cắp STK người khác trùng tên). Fail-soft: nếu
        // lookup không khả dụng/lỗi, không chặn — vẫn dựa vào check tên tự nhập.
        String bin = BankBinResolver.resolve(normalizedBankName);
        if (StringUtils.hasText(bin)) {
            vietQrLookupClient.lookupAccountName(bin, normalizedBankAccount).ifPresent(realAccountName -> {
                if (!normalizeNameForCompare(realAccountName).equals(normalizeNameForCompare(normalizedHolder))) {
                    throw new AppException(ErrorCode.BANK_NAME_MISMATCH);
                }
            });
        }

        if (bannedIdentityRepository.existsByBankAccount(normalizedBankAccount)) {
            throw new AppException(ErrorCode.IDENTITY_BANNED);
        }
        if (userRepository.existsByBankAccountAndIdNot(normalizedBankAccount, user.getId())) {
            throw new AppException(ErrorCode.BANK_ACCOUNT_DUPLICATE);
        }
    }

    private String maskAccountNumber(String accountNumber) {
        if (accountNumber == null || accountNumber.length() <= 4) {
            return accountNumber;
        }
        return accountNumber.substring(accountNumber.length() - 4);
    }

    private String cleanBase64(String base64) {
        if (base64 != null && base64.contains(",")) {
            return base64.split(",")[1];
        }
        return base64;
    }

    // Gọi Python /kyc/check-image — tính CLIP embedding ảnh CCCD/Passport,
    // chặn nếu trùng ảnh của user khác (gộp check + save trong 1 lần gọi).
    private void checkKycImageDuplicate(String userId, String imageSide, String imageBase64) {
        try {
            String url = faceServiceUrl + "/kyc/check-image";
            Map<String, String> body = Map.of(
                "userId", userId,
                "imageSide", imageSide,
                "imageBase64", imageBase64
            );

            ResponseEntity<Map<String, Object>> response = restTemplate.exchange(
                url, HttpMethod.POST,
                new HttpEntity<>(body),
                new ParameterizedTypeReference<Map<String, Object>>() {}
            );

            Map<String, Object> data = response.getBody();
            if (data != null && Boolean.TRUE.equals(data.get("isDuplicate"))) {
                throw new AppException(ErrorCode.KYC_IMAGE_DUPLICATE);
            }
        } catch (AppException ae) {
            throw ae;
        } catch (Exception e) {
            // Fail-soft: lỗi kết nối/service KYC image check không được chặn
            // đứng luồng KYC chính (idNumber check vẫn là lớp bảo vệ chính).
            log.error("KYC image duplicate check failed (fail-soft, not blocking): {}", e.getMessage());
        }
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
                .bankName(user.getBankName())
                .bankAccount(user.getBankAccount())
                .bankAccountHolder(user.getBankAccountHolder())
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

    private String normalizeNameForCompare(String name) {
        String normalized = Normalizer.normalize(name == null ? "" : name, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .replace('Đ', 'D')
                .replace('đ', 'd');
        return normalized.toUpperCase(Locale.ROOT).replaceAll("[^A-Z0-9]", "");
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
