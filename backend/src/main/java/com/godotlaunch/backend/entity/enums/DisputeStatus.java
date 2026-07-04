package com.godotlaunch.backend.entity.enums;

/**
 * Trạng thái xử lý tranh chấp bản quyền — cây quyết định TH1/2/3 admin phán xử.
 */
public enum DisputeStatus {
    open,                      // vừa tạo, chờ admin điều tra (game bị auto-suspend)
    resolved_seller_fault,     // TH3: seller (A) đạo nhái thật — hoàn tiền + có thể ban A
    resolved_reporter_fault,   // TH2: reporter (B) vu cáo — khôi phục game, đếm spam B
    resolved_inconclusive      // TH1: không đủ căn cứ kết luận — khôi phục game, không phạt ai
}
