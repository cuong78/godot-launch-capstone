package com.godotlaunch.backend.service.impl;

import com.godotlaunch.backend.service.EmailService;
import jakarta.mail.internet.MimeMessage;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

@Slf4j
@Service
public class EmailServiceImpl implements EmailService {

    private final JavaMailSender mailSender;

    @Value("${spring.mail.username:noreply@godotlaunch.com}")
    private String senderEmail;

    public EmailServiceImpl(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    @Override
    public void sendGameStatusNotification(String to, String gameTitle, String status, String reason) {
        String subject = "Godot Launch - Update on your project: " + gameTitle;

        boolean isApproved = status != null && status.toUpperCase().contains("APPROVED");
        String statusColor = isApproved ? "#00dbe7" : "#ff4d4d";
        String statusText = status;

        String htmlBody = "<div style=\"font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #121418; color: #ffffff; border-radius: 8px; overflow: hidden; border: 1px solid #2a2d35;\">"
                + "<div style=\"background-color: #1a1d24; padding: 20px; text-align: center; border-bottom: 1px solid #2a2d35;\">"
                + "  <h1 style=\"margin: 0; color: #ffffff; font-size: 24px; letter-spacing: 2px; text-transform: uppercase;\">GODOT LAUNCH</h1>"
                + "</div>"
                + "<div style=\"padding: 30px;\">"
                + "  <p style=\"font-size: 16px; color: #a0a5b5; line-height: 1.5;\">Hello Developer,</p>"
                + "  <p style=\"font-size: 16px; color: #a0a5b5; line-height: 1.5;\">The review process for your project <strong>" + gameTitle + "</strong> has been completed.</p>"
                + "  <div style=\"background-color: rgba(255,255,255,0.05); border-left: 4px solid " + statusColor + "; padding: 15px; margin: 25px 0; border-radius: 4px;\">"
                + "    <h2 style=\"margin: 0 0 10px 0; font-size: 14px; color: #a0a5b5; text-transform: uppercase; letter-spacing: 1px;\">Status Update</h2>"
                + "    <p style=\"margin: 0; font-size: 20px; color: " + statusColor + "; font-weight: bold; letter-spacing: 1px;\">" + statusText + "</p>"
                + "  </div>";

        if (reason != null && !reason.trim().isEmpty()) {
            htmlBody += "  <div style=\"background-color: #1a1d24; padding: 15px; border-radius: 4px; border: 1px solid #2a2d35; margin-bottom: 25px;\">"
                     + "    <h3 style=\"margin: 0 0 10px 0; font-size: 14px; color: #a0a5b5; text-transform: uppercase;\">Moderator Notes</h3>"
                     + "    <p style=\"margin: 0; font-size: 15px; color: #ffffff; line-height: 1.5;\">" + reason + "</p>"
                     + "  </div>";
        }

        if (isApproved) {
            if (status.toUpperCase().contains("CONTRACT")) {
                htmlBody += "  <p style=\"font-size: 16px; color: #a0a5b5; line-height: 1.5;\">Your game has been approved by the admin. A publishing contract has been proposed. Please visit your developer dashboard to review and sign the contract.</p>";
            } else {
                htmlBody += "  <p style=\"font-size: 16px; color: #a0a5b5; line-height: 1.5;\">Congratulations! Your game is now live and available on the Godot Launch store. Players can now download and experience your creation.</p>";
            }
        } else {
            htmlBody += "  <p style=\"font-size: 16px; color: #a0a5b5; line-height: 1.5;\">Please address the issues mentioned above and submit a new build for review when ready.</p>";
        }

        htmlBody += "  <p style=\"font-size: 16px; color: #a0a5b5; line-height: 1.5; margin-top: 30px;\">Thank you,<br/><strong style=\"color: #ffffff;\">The Godot Launch Team</strong></p>"
                + "</div>"
                + "<div style=\"background-color: #0d0f12; padding: 15px; text-align: center; font-size: 12px; color: #6b7280;\">"
                + "  &copy; 2026 Godot Launch. This is an automated message, please do not reply."
                + "</div>"
                + "</div>";

        sendEmail(to, subject, htmlBody);
    }

    @Override
    public void sendAssetStatusNotification(String to, String itemTitle, String status, String reason) {
        String subject = "Godot Launch - Update on your marketplace asset: " + itemTitle;

        boolean isApproved = status != null && status.toUpperCase().contains("APPROVED");
        String statusColor = isApproved ? "#10b981" : "#ef4444";
        String statusText = status;

        String htmlBody = "<div style=\"font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #121418; color: #ffffff; border-radius: 8px; overflow: hidden; border: 1px solid #2a2d35;\">"
                + "<div style=\"background-color: #1a1d24; padding: 20px; text-align: center; border-bottom: 1px solid #2a2d35;\">"
                + "  <h1 style=\"margin: 0; color: #ffffff; font-size: 24px; letter-spacing: 2px; text-transform: uppercase;\">GODOT LAUNCH MARKETPLACE</h1>"
                + "</div>"
                + "<div style=\"padding: 30px;\">"
                + "  <p style=\"font-size: 16px; color: #a0a5b5; line-height: 1.5;\">Hello Developer,</p>"
                + "  <p style=\"font-size: 16px; color: #a0a5b5; line-height: 1.5;\">The review process for your marketplace asset <strong>" + itemTitle + "</strong> has been completed.</p>"
                + "  <div style=\"background-color: rgba(255,255,255,0.05); border-left: 4px solid " + statusColor + "; padding: 15px; margin: 25px 0; border-radius: 4px;\">"
                + "    <h2 style=\"margin: 0 0 10px 0; font-size: 14px; color: #a0a5b5; text-transform: uppercase; letter-spacing: 1px;\">Status Update</h2>"
                + "    <p style=\"margin: 0; font-size: 20px; color: " + statusColor + "; font-weight: bold; letter-spacing: 1px;\">" + statusText + "</p>"
                + "  </div>";

        if (reason != null && !reason.trim().isEmpty()) {
            htmlBody += "  <div style=\"background-color: #1a1d24; padding: 15px; border-radius: 4px; border: 1px solid #2a2d35; margin-bottom: 25px;\">"
                     + "    <h3 style=\"margin: 0 0 10px 0; font-size: 14px; color: #a0a5b5; text-transform: uppercase;\">Reviewer Notes</h3>"
                     + "    <p style=\"margin: 0; font-size: 15px; color: #ffffff; line-height: 1.5;\">" + reason + "</p>"
                     + "  </div>";
        }

        if (isApproved) {
            htmlBody += "  <p style=\"font-size: 16px; color: #a0a5b5; line-height: 1.5;\">Congratulations! Your asset has been approved and is now active on the creator marketplace catalog. Developers can now view, purchase, and download it.</p>";
        } else {
            htmlBody += "  <p style=\"font-size: 16px; color: #a0a5b5; line-height: 1.5;\">Unfortunately, your asset has been rejected. Please review the notes above, address the issues, and submit a new package.</p>";
        }

        htmlBody += "  <p style=\"font-size: 16px; color: #a0a5b5; line-height: 1.5; margin-top: 30px;\">Thank you,<br/><strong style=\"color: #ffffff;\">The Godot Launch Team</strong></p>"
                + "</div>"
                + "<div style=\"background-color: #0d0f12; padding: 15px; text-align: center; font-size: 12px; color: #6b7280;\">"
                + "  &copy; 2026 Godot Launch. This is an automated message, please do not reply."
                + "</div>"
                + "</div>";

        sendEmail(to, subject, htmlBody);
    }

    @Override
    public void sendOtpEmail(String to, String otp) {
        String subject = "Godot Launch - Password Reset Verification Code";

        String htmlBody = "<div style=\"font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #121418; color: #ffffff; border-radius: 8px; overflow: hidden; border: 1px solid #2a2d35;\">"
                + "<div style=\"background-color: #1a1d24; padding: 20px; text-align: center; border-bottom: 1px solid #2a2d35;\">"
                + "  <h1 style=\"margin: 0; color: #ffffff; font-size: 24px; letter-spacing: 2px; text-transform: uppercase;\">GODOT LAUNCH</h1>"
                + "</div>"
                + "<div style=\"padding: 30px;\">"
                + "  <p style=\"font-size: 16px; color: #a0a5b5; line-height: 1.5;\">Hello,</p>"
                + "  <p style=\"font-size: 16px; color: #a0a5b5; line-height: 1.5;\">We received a request to reset your password. Use the following One-Time Password (OTP) verification code to complete the request. This code is valid for <strong>10 minutes</strong>.</p>"
                + "  <div style=\"background-color: rgba(255, 255, 255, 0.03); border: 1px solid #2a2d35; padding: 20px; margin: 25px 0; border-radius: 6px; text-align: center;\">"
                + "    <h2 style=\"margin: 0 0 10px 0; font-size: 12px; color: #a0a5b5; text-transform: uppercase; letter-spacing: 1px;\">Your OTP Code</h2>"
                + "    <p style=\"margin: 0; font-size: 32px; color: #f59e0b; font-weight: bold; letter-spacing: 4px; font-family: monospace;\">" + otp + "</p>"
                + "  </div>"
                + "  <p style=\"font-size: 14px; color: #ef4444; line-height: 1.5;\">If you did not request a password reset, please ignore this email or secure your account.</p>"
                + "  <p style=\"font-size: 16px; color: #a0a5b5; line-height: 1.5; margin-top: 30px;\">Thank you,<br/><strong style=\"color: #ffffff;\">The Godot Launch Team</strong></p>"
                + "</div>"
                + "<div style=\"background-color: #0d0f12; padding: 15px; text-align: center; font-size: 12px; color: #6b7280;\">"
                + "  &copy; 2026 Godot Launch. This is an automated message, please do not reply."
                + "</div>"
                + "</div>";

        sendEmail(to, subject, htmlBody);
    }

    @Override
    public void sendSignupOtpEmail(String to, String otp) {
        String subject = "Godot Launch - Email Verification Code";

        String htmlBody = "<div style=\"font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #121418; color: #ffffff; border-radius: 8px; overflow: hidden; border: 1px solid #2a2d35;\">"
                + "<div style=\"background-color: #1a1d24; padding: 20px; text-align: center; border-bottom: 1px solid #2a2d35;\">"
                + "  <h1 style=\"margin: 0; color: #ffffff; font-size: 24px; letter-spacing: 2px; text-transform: uppercase;\">GODOT LAUNCH</h1>"
                + "</div>"
                + "<div style=\"padding: 30px;\">"
                + "  <p style=\"font-size: 16px; color: #a0a5b5; line-height: 1.5;\">Hello,</p>"
                + "  <p style=\"font-size: 16px; color: #a0a5b5; line-height: 1.5;\">We received a request to create a new account using this email address. Use the following One-Time Password (OTP) verification code to complete your registration. This code is valid for <strong>10 minutes</strong>.</p>"
                + "  <div style=\"background-color: rgba(255, 255, 255, 0.03); border: 1px solid #2a2d35; padding: 20px; margin: 25px 0; border-radius: 6px; text-align: center;\">"
                + "    <h2 style=\"margin: 0 0 10px 0; font-size: 12px; color: #a0a5b5; text-transform: uppercase; letter-spacing: 1px;\">Your OTP Code</h2>"
                + "    <p style=\"margin: 0; font-size: 32px; color: #f59e0b; font-weight: bold; letter-spacing: 4px; font-family: monospace;\">" + otp + "</p>"
                + "  </div>"
                + "  <p style=\"font-size: 14px; color: #ef4444; line-height: 1.5;\">If you did not request this verification, please ignore this email.</p>"
                + "  <p style=\"font-size: 16px; color: #a0a5b5; line-height: 1.5; margin-top: 30px;\">Thank you,<br/><strong style=\"color: #ffffff;\">The Godot Launch Team</strong></p>"
                + "</div>"
                + "<div style=\"background-color: #0d0f12; padding: 15px; text-align: center; font-size: 12px; color: #6b7280;\">"
                + "  &copy; 2026 Godot Launch. This is an automated message, please do not reply."
                + "</div>"
                + "</div>";

        sendEmail(to, subject, htmlBody);
    }

    @Override
    public void sendBankSetupOtpEmail(String to, String otp, String bankName, String maskedAccount) {
        String subject = "Godot Launch - Bank Account Verification Code";

        String htmlBody = "<div style=\"font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #121418; color: #ffffff; border-radius: 8px; overflow: hidden; border: 1px solid #2a2d35;\">"
                + "<div style=\"background-color: #1a1d24; padding: 20px; text-align: center; border-bottom: 1px solid #2a2d35;\">"
                + "  <h1 style=\"margin: 0; color: #ffffff; font-size: 24px; letter-spacing: 2px; text-transform: uppercase;\">GODOT LAUNCH</h1>"
                + "</div>"
                + "<div style=\"padding: 30px;\">"
                + "  <p style=\"font-size: 16px; color: #a0a5b5; line-height: 1.5;\">Hello,</p>"
                + "  <p style=\"font-size: 16px; color: #a0a5b5; line-height: 1.5;\">We received a request to link a payout bank account to your developer profile: <strong style=\"color: #ffffff;\">" + bankName + " •••• " + maskedAccount + "</strong>. Use the following One-Time Password (OTP) verification code to confirm. This code is valid for <strong>10 minutes</strong>.</p>"
                + "  <div style=\"background-color: rgba(255, 255, 255, 0.03); border: 1px solid #2a2d35; padding: 20px; margin: 25px 0; border-radius: 6px; text-align: center;\">"
                + "    <h2 style=\"margin: 0 0 10px 0; font-size: 12px; color: #a0a5b5; text-transform: uppercase; letter-spacing: 1px;\">Your OTP Code</h2>"
                + "    <p style=\"margin: 0; font-size: 32px; color: #f59e0b; font-weight: bold; letter-spacing: 4px; font-family: monospace;\">" + otp + "</p>"
                + "  </div>"
                + "  <p style=\"font-size: 14px; color: #ef4444; line-height: 1.5;\">If you did not request this, please ignore this email and secure your account — this bank account will NOT be linked without the correct code.</p>"
                + "  <p style=\"font-size: 16px; color: #a0a5b5; line-height: 1.5; margin-top: 30px;\">Thank you,<br/><strong style=\"color: #ffffff;\">The Godot Launch Team</strong></p>"
                + "</div>"
                + "<div style=\"background-color: #0d0f12; padding: 15px; text-align: center; font-size: 12px; color: #6b7280;\">"
                + "  &copy; 2026 Godot Launch. This is an automated message, please do not reply."
                + "</div>"
                + "</div>";

        sendEmail(to, subject, htmlBody);
    }

    @org.springframework.scheduling.annotation.Async
    @Override
    public void sendNotificationEmail(String to, String subject, String messageBody) {
        String htmlBody = "<div style=\"font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #121418; color: #ffffff; border-radius: 8px; overflow: hidden; border: 1px solid #2a2d35;\">"
                + "<div style=\"background-color: #1a1d24; padding: 20px; text-align: center; border-bottom: 1px solid #2a2d35;\">"
                + "  <h1 style=\"margin: 0; color: #ffffff; font-size: 24px; letter-spacing: 2px; text-transform: uppercase;\">GODOT LAUNCH</h1>"
                + "</div>"
                + "<div style=\"padding: 30px;\">"
                + "  <p style=\"font-size: 16px; color: #a0a5b5; line-height: 1.5;\">Hello,</p>"
                + "  <p style=\"font-size: 16px; color: #ffffff; line-height: 1.5;\">" + messageBody + "</p>"
                + "  <p style=\"font-size: 16px; color: #a0a5b5; line-height: 1.5; margin-top: 30px;\">Thank you,<br/><strong style=\"color: #ffffff;\">The Godot Launch Team</strong></p>"
                + "</div>"
                + "<div style=\"background-color: #0d0f12; padding: 15px; text-align: center; font-size: 12px; color: #6b7280;\">"
                + "  &copy; 2026 Godot Launch. This is an automated message, please do not reply."
                + "</div>"
                + "</div>";

        sendEmail(to, subject, htmlBody);
    }

    private void sendEmail(String to, String subject, String htmlBody) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(htmlBody, true);
            helper.setFrom(senderEmail);

            mailSender.send(message);
            log.info("Successfully sent HTML email to {}", to);
        } catch (Exception e) {
            log.warn("Could not send email to {} via SMTP. Falling back to console log. Error: {}", to, e.getMessage());
            log.info("====== SIMULATED HTML EMAIL ======\nTo: {}\nSubject: {}\n{}\n==================================", to, subject, htmlBody);
        }
    }
}
