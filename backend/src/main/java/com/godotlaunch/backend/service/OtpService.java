package com.godotlaunch.backend.service;

public interface OtpService {
    String generateOtp(String email);
    boolean validateOtp(String email, String otp);
    void invalidateOtp(String email);

    /**
     * Namespaced theo "purpose" (vd "bank-setup") để nhiều luồng OTP độc lập
     * (signup, forgot-password, bank-setup...) không đè lên nhau khi cùng
     * xảy ra cho cùng 1 email — key thực tế là "{purpose}:{email}".
     */
    String generateOtp(String purpose, String email);
    boolean validateOtp(String purpose, String email, String otp);
    void invalidateOtp(String purpose, String email);
}
