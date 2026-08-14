package com.godotlaunch.backend.service.chat.security;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@Slf4j
public class ChatGuardrailService {

    private static final List<Pattern> INJECTION_PATTERNS = List.of(
            Pattern.compile("(?i)ignore\\s+all\\s+previous\\s+instructions"),
            Pattern.compile("(?i)forget\\s+all\\s+rules"),
            Pattern.compile("(?i)disregard\\s+system\\s+prompt"),
            Pattern.compile("(?i)act\\s+as\\s+administrator"),
            Pattern.compile("(?i)show\\s+system\\s+prompt"),
            Pattern.compile("(?i)drop\\s+table"),
            Pattern.compile("(?i)alter\\s+table"),
            Pattern.compile("(?i)delete\\s+from"),
            Pattern.compile("(?i)select\\s+\\*\\s+from\\s+users")
    );

    private static final Pattern PHONE_PATTERN = Pattern.compile("\\b(0[3|5|7|8|9]\\d{8})\\b");
    private static final Pattern EMAIL_PATTERN = Pattern.compile("\\b([A-Za-z0-9._%+-]+)@([A-Za-z0-9.-]+\\.[A-Za-z]{2,})\\b");
    private static final Pattern ACCOUNT_ID_PATTERN = Pattern.compile("\\b(\\d{4})\\d{4,8}(\\d{3,4})\\b");

    public void validateInputPrompt(String prompt) {
        if (prompt == null || prompt.trim().isEmpty()) {
            return;
        }

        for (Pattern pattern : INJECTION_PATTERNS) {
            if (pattern.matcher(prompt).find()) {
                log.warn("Cảnh báo an ninh: Phát hiện dấu hiệu Prompt Injection / Jailbreak trong câu hỏi: '{}'", prompt);
                throw new SecurityException("Yêu cầu của bạn bị từ chối do vi phạm quy tắc an toàn bảo mật hệ thống.");
            }
        }
    }

    public String anonymizePiiOutput(String text) {
        if (text == null || text.trim().isEmpty()) {
            return text;
        }

        String maskedText = text;

        // Mask Phone Numbers
        Matcher phoneMatcher = PHONE_PATTERN.matcher(maskedText);
        maskedText = phoneMatcher.replaceAll(mr -> {
            String p = mr.group(1);
            return p.substring(0, 4) + "***" + p.substring(p.length() - 3);
        });

        // Mask Emails
        Matcher emailMatcher = EMAIL_PATTERN.matcher(maskedText);
        maskedText = emailMatcher.replaceAll(mr -> {
            String userPart = mr.group(1);
            String domainPart = mr.group(2);
            String maskedUser = userPart.length() > 2 ? userPart.substring(0, 1) + "***" + userPart.substring(userPart.length() - 1) : "***";
            return maskedUser + "@" + domainPart;
        });

        // Mask Bank Accounts / ID Numbers
        Matcher accountMatcher = ACCOUNT_ID_PATTERN.matcher(maskedText);
        maskedText = accountMatcher.replaceAll(mr -> mr.group(1) + "****" + mr.group(2));

        return maskedText;
    }
}
