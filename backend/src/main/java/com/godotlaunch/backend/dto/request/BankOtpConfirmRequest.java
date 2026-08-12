package com.godotlaunch.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

/**
 * Bước 2 của thiết lập ngân hàng: gửi lại đúng thông tin đã dùng ở
 * /bank/request-otp kèm mã OTP nhận qua email để xác nhận và lưu thật.
 * Validate lại toàn bộ field ngân hàng (không tin dữ liệu đã "chốt" từ
 * bước trước vì đây là request HTTP độc lập, có thể bị sửa giữa chừng).
 */
@Getter
@Setter
public class BankOtpConfirmRequest {

    @NotBlank(message = "Bank name is required.")
    @Size(max = 200, message = "Bank name cannot exceed 200 characters.")
    private String bankName;

    @NotBlank(message = "Bank account is required.")
    @Pattern(regexp = "\\d{6,30}", message = "Bank account must contain 6 to 30 digits.")
    private String bankAccount;

    @NotBlank(message = "Bank account holder is required.")
    @Size(max = 200, message = "Bank account holder cannot exceed 200 characters.")
    private String bankAccountHolder;

    @NotBlank(message = "OTP is required.")
    @Pattern(regexp = "\\d{6}", message = "OTP must be 6 digits.")
    private String otp;
}
