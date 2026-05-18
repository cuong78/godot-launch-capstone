package com.godotlaunch.backend.entity.enums;

public enum AuditAction {
    game_submitted,
    game_approved,
    game_rejected,
    game_published,
    game_community_enabled,
    game_updated,
    user_banned,
    user_unbanned,
    user_role_changed,
    contract_created,
    contract_signed,
    contract_cancelled,
    transaction_completed,
    transaction_failed,
    withdrawal_approved,
    withdrawal_rejected,
    marketplace_item_removed,
    review_removed,
    chat_removed,
    ai_report_generated,
    security_alert
}
