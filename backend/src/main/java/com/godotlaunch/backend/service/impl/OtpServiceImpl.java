package com.godotlaunch.backend.service.impl;

import com.godotlaunch.backend.service.OtpService;
import org.springframework.stereotype.Service;
import java.time.LocalDateTime;
import java.util.Random;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class OtpServiceImpl implements OtpService {

    private static final int OTP_EXPIRY_MINUTES = 10;
    private final ConcurrentHashMap<String, OtpData> otpCache = new ConcurrentHashMap<>();
    private final Random random = new Random();

    @Override
    public String generateOtp(String email) {
        String otp = String.format("%06d", random.nextInt(1000000));
        LocalDateTime expiryTime = LocalDateTime.now().plusMinutes(OTP_EXPIRY_MINUTES);
        otpCache.put(email, new OtpData(otp, expiryTime));
        return otp;
    }

    @Override
    public boolean validateOtp(String email, String otp) {
        OtpData otpData = otpCache.get(email);
        if (otpData == null) {
            return false;
        }
        if (otpData.isExpired()) {
            otpCache.remove(email);
            return false;
        }
        return otpData.getOtp().equals(otp);
    }

    @Override
    public void invalidateOtp(String email) {
        otpCache.remove(email);
    }

    private static class OtpData {
        private final String otp;
        private final LocalDateTime expiryTime;

        public OtpData(String otp, LocalDateTime expiryTime) {
            this.otp = otp;
            this.expiryTime = expiryTime;
        }

        public String getOtp() {
            return otp;
        }

        public boolean isExpired() {
            return LocalDateTime.now().isAfter(expiryTime);
        }
    }
}
