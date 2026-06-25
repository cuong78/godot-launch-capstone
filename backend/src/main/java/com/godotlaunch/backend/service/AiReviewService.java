package com.godotlaunch.backend.service;

import java.util.UUID;

/**
 * AI review multimodal — tạo report ĐỀ XUẤT cho admin (code quality, media match, NSFW,
 * mô tả đúng sự thật). Chạy async sau khi snapshot sạch, trước khi admin review.
 * AI KHÔNG quyết định cuối — chỉ chấm điểm + flag + bằng chứng để admin quyết.
 */
public interface AiReviewService {

    /** Kích hoạt AI review cho game (async, không chặn luồng submit). */
    void reviewGameAsync(UUID gameId);

    /** Kích hoạt AI review cho marketplace item (async). */
    void reviewMarketplaceItemAsync(UUID itemId);
}
