package com.godotlaunch.backend.scheduler;

import com.godotlaunch.backend.entity.Dispute;
import com.godotlaunch.backend.entity.enums.DisputeStatus;
import com.godotlaunch.backend.repository.DisputeRepository;
import com.godotlaunch.backend.service.DisputeService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.List;

/**
 * Cưỡng chế hoàn tiền TH3 (post-payout dispute): seller bị khóa role chờ
 * hoàn tiền qua DisputeServiceImpl.lockSellerForRefund(). Nếu quá
 * refundDeadline mà admin vẫn chưa gọi confirmRefund() (tức seller chưa nạp
 * đủ tiền), tự động ban vĩnh viễn qua BannedIdentity — đây là điểm cuối của
 * "cưỡng chế trong hệ thống"; việc thực sự đòi lại tiền lúc này thuộc trách
 * nhiệm admin đi kiện tụng ngoài đời (KYC/FaceID/agreement làm căn cứ).
 *
 * Không dùng @Scheduled cố định — được SchedulingConfig đăng ký chạy 1
 * lần/ngày tại giờ admin cấu hình (DynamicDailyCronTrigger, giờ VN), đọc lại
 * DB mỗi lần lên lịch nên đổi giờ không cần restart app.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class DisputeRefundEnforcementScheduler {

    private final DisputeRepository disputeRepository;
    private final DisputeService disputeService;

    public void banOverdueUnrefundedSellers() {
        List<Dispute> overdue = disputeRepository
                .findByStatusAndRefundConfirmedAtIsNullAndRefundDeadlineBefore(
                        DisputeStatus.resolved_seller_fault, Instant.now());

        for (Dispute dispute : overdue) {
            try {
                disputeService.banOverdueSeller(dispute.getId());
                log.info("Auto-banned overdue seller for dispute {} (refund deadline passed unconfirmed)",
                        dispute.getId());
            } catch (Exception e) {
                log.error("Failed to auto-ban overdue seller for dispute {}: {}",
                        dispute.getId(), e.getMessage(), e);
            }
        }
    }
}
