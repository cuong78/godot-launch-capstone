package com.godotlaunch.backend.util;

import org.springframework.util.StringUtils;

import java.text.Normalizer;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;

/**
 * Map tên ngân hàng (theo danh sách SUPPORTED_BANK_NAMES ở KycController /
 * BANK_OPTIONS ở frontend) sang mã BIN NAPAS 6 chữ số — dùng chung cho payout
 * (PayOS toBin) và VietQR Account Lookup (bin). Tách ra khỏi
 * WithdrawalRequestServiceImpl để không lặp lại map này ở 2 nơi.
 */
public final class BankBinResolver {

    private static final Map<String, String> BANK_CODE_MAP = createBankCodeMap();

    private BankBinResolver() {
    }

    public static String resolve(String bankName) {
        String normalized = normalizeBankName(bankName);
        for (Map.Entry<String, String> entry : BANK_CODE_MAP.entrySet()) {
            if (normalized.contains(entry.getKey())) {
                return entry.getValue();
            }
        }
        return null;
    }

    private static String normalizeBankName(String bankName) {
        String normalized = Normalizer.normalize(bankName == null ? "" : bankName, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "");
        return normalized.toUpperCase(Locale.ROOT).replaceAll("[^A-Z0-9]", "");
    }

    private static Map<String, String> createBankCodeMap() {
        Map<String, String> map = new LinkedHashMap<>();
        map.put("VIETCOMBANK", "970436");
        map.put("VCB", "970436");
        map.put("BIDV", "970418");
        map.put("VIETINBANK", "970415");
        map.put("AGRIBANK", "970405");
        map.put("TECHCOMBANK", "970407");
        map.put("MBBANK", "970422");
        map.put("MB", "970422");
        map.put("ACB", "970416");
        map.put("SACOMBANK", "970403");
        map.put("VPBANK", "970432");
        map.put("TPBANK", "970423");
        map.put("OCB", "970448");
        map.put("SHB", "970443");
        map.put("HDBANK", "970437");
        return map;
    }
}
