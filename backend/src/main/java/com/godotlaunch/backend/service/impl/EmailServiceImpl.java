//package com.godotlaunch.backend.service.impl;
//
//import com.godotlaunch.backend.service.EmailService;
//import jakarta.mail.internet.MimeMessage;
//import lombok.extern.slf4j.Slf4j;
//import org.springframework.beans.factory.annotation.Value;
//import org.springframework.mail.javamail.JavaMailSender;
//import org.springframework.mail.javamail.MimeMessageHelper;
//import org.springframework.stereotype.Service;
//
//@Slf4j
//@Service
//public class EmailServiceImpl implements EmailService {
//
//    private final JavaMailSender mailSender;
//
//    @Value("${spring.mail.username:noreply@godotlaunch.com}")
//    private String senderEmail;
//
//    public EmailServiceImpl(JavaMailSender mailSender) {
//        this.mailSender = mailSender;
//    }
//
//    @Override
//    public void sendGameStatusNotification(String to, String gameTitle, String status, String reason) {
//        String subject = "Godot Launch - Update on your project: " + gameTitle;
//
//        boolean isApproved = "APPROVED and PUBLISHED".equalsIgnoreCase(status);
//        String statusColor = isApproved ? "#00dbe7" : "#ff4d4d";
//        String statusText = isApproved ? "PUBLISHED" : "REJECTED";
//
//        String htmlBody = "<div style=\"font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #121418; color: #ffffff; border-radius: 8px; overflow: hidden; border: 1px solid #2a2d35;\">"
//                + "<div style=\"background-color: #1a1d24; padding: 20px; text-align: center; border-bottom: 1px solid #2a2d35;\">"
//                + "  <h1 style=\"margin: 0; color: #ffffff; font-size: 24px; letter-spacing: 2px; text-transform: uppercase;\">GODOT LAUNCH</h1>"
//                + "</div>"
//                + "<div style=\"padding: 30px;\">"
//                + "  <p style=\"font-size: 16px; color: #a0a5b5; line-height: 1.5;\">Hello Developer,</p>"
//                + "  <p style=\"font-size: 16px; color: #a0a5b5; line-height: 1.5;\">The review process for your project <strong>" + gameTitle + "</strong> has been completed.</p>"
//                + "  <div style=\"background-color: rgba(255,255,255,0.05); border-left: 4px solid " + statusColor + "; padding: 15px; margin: 25px 0; border-radius: 4px;\">"
//                + "    <h2 style=\"margin: 0 0 10px 0; font-size: 14px; color: #a0a5b5; text-transform: uppercase; letter-spacing: 1px;\">Status Update</h2>"
//                + "    <p style=\"margin: 0; font-size: 20px; color: " + statusColor + "; font-weight: bold; letter-spacing: 1px;\">" + statusText + "</p>"
//                + "  </div>";
//
//        if (reason != null && !reason.trim().isEmpty()) {
//            htmlBody += "  <div style=\"background-color: #1a1d24; padding: 15px; border-radius: 4px; border: 1px solid #2a2d35; margin-bottom: 25px;\">"
//                     + "    <h3 style=\"margin: 0 0 10px 0; font-size: 14px; color: #a0a5b5; text-transform: uppercase;\">Moderator Notes</h3>"
//                     + "    <p style=\"margin: 0; font-size: 15px; color: #ffffff; line-height: 1.5;\">" + reason + "</p>"
//                     + "  </div>";
//        }
//
//        if (isApproved) {
//            htmlBody += "  <p style=\"font-size: 16px; color: #a0a5b5; line-height: 1.5;\">Congratulations! Your game is now live and available on the Godot Launch store. Players can now download and experience your creation.</p>";
//        } else {
//            htmlBody += "  <p style=\"font-size: 16px; color: #a0a5b5; line-height: 1.5;\">Please address the issues mentioned above and submit a new build for review when ready.</p>";
//        }
//
//        htmlBody += "  <p style=\"font-size: 16px; color: #a0a5b5; line-height: 1.5; margin-top: 30px;\">Thank you,<br/><strong style=\"color: #ffffff;\">The Godot Launch Team</strong></p>"
//                + "</div>"
//                + "<div style=\"background-color: #0d0f12; padding: 15px; text-align: center; font-size: 12px; color: #6b7280;\">"
//                + "  &copy; 2026 Godot Launch. This is an automated message, please do not reply."
//                + "</div>"
//                + "</div>";
//
//        try {
//            MimeMessage message = mailSender.createMimeMessage();
//            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
//
//            helper.setTo(to);
//            helper.setSubject(subject);
//            helper.setText(htmlBody, true); // Set true to enable HTML
//            helper.setFrom(senderEmail);
//
//            mailSender.send(message);
//            log.info("Successfully sent HTML status email to {}", to);
//        } catch (Exception e) {
//            log.warn("Could not send email to {} via SMTP. Falling back to console log. Error: {}", to, e.getMessage());
//            log.info("====== SIMULATED HTML EMAIL ======\nTo: {}\nSubject: {}\n{}\n==================================", to, subject, htmlBody);
//        }
//    }
//}
