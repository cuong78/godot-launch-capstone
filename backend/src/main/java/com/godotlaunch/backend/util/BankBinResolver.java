package com.godotlaunch.backend.util;

import org.springframework.util.StringUtils;

import java.text.Normalizer;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;

/**
 * Map tên ngân hàng (theo danh sách SUPPORTED_BANK_NAMES ở KycController /
 * BANK_OPTIONS ở frontend) sang mã BIN NAPAS 6 chữ số (dùng cho payout PayOS
 * toBin) và mã "code" chuỗi của banklookup.net (dùng cho Account Lookup API,
 * field "bank" trong request — KHÁC bin, xem
 * https://api.banklookup.net/bank/list). Tách ra khỏi
 * WithdrawalRequestServiceImpl để không lặp lại map này ở 2 nơi.
 */
public final class BankBinResolver {

    private static final Map<String, String> BANK_BIN_MAP = createBankBinMap();
    private static final Map<String, String> BANK_LOOKUP_CODE_MAP = createBankLookupCodeMap();

    private BankBinResolver() {
    }

    /** Mã BIN NAPAS 6 chữ số (dùng cho PayOS payout toBin). */
    public static String resolve(String bankName) {
        return lookup(bankName, BANK_BIN_MAP);
    }

    /**
     * Mã "code" chuỗi của banklookup.net (vd "VCB", "MB", "SCB") — dùng cho
     * field "bank" khi gọi Account Lookup API. Đối chiếu trực tiếp từ
     * https://api.banklookup.net/bank/list, KHÔNG đoán — vd Sacombank có
     * code="SCB" trên banklookup.net dù bin 970403 (khác "Ngân hàng Sài Gòn"
     * cũ có code="SGCB", bin 970429 — không nằm trong SUPPORTED_BANK_NAMES).
     */
    public static String resolveLookupCode(String bankName) {
        return lookup(bankName, BANK_LOOKUP_CODE_MAP);
    }

    private static String lookup(String bankName, Map<String, String> map) {
        String normalized = normalizeBankName(bankName);
        for (Map.Entry<String, String> entry : map.entrySet()) {
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

    private static Map<String, String> createBankBinMap() {
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

    private static Map<String, String> createBankLookupCodeMap() {
        Map<String, String> map = new LinkedHashMap<>();
        map.put("VIETCOMBANK", "VCB");
        map.put("BIDV", "BIDV");
        map.put("VIETINBANK", "VTB");
        map.put("AGRIBANK", "VARB");
        map.put("TECHCOMBANK", "TCB");
        map.put("MBBANK", "MB");
        map.put("ACB", "ACB");
        map.put("SACOMBANK", "SCB");
        map.put("VPBANK", "VPB");
        map.put("TPBANK", "TPB");
        map.put("OCB", "OCB");
        map.put("SHB", "SHB");
        map.put("HDBANK", "HDB");
        return map;
    }
}
