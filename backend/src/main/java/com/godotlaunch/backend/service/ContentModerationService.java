//package com.godotlaunch.backend.service;
//
//import java.util.UUID;
//
///**
// * Auto-moderation: quét NSFW bất đồng bộ sau khi developer upload media.
// * AI chỉ FLAG — admin quyết định approve/remove/warn. Fail-soft toàn bộ.
// */
//public interface ContentModerationService {
//
//    /** Quét ảnh/video vừa upload (async, không chặn response). */
//    void scanMediaAsync(String mediaUrl, String mediaType, String ownerType, UUID ownerId, String ownerName);
//}
