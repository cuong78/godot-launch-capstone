package com.godotlaunch.backend.dto.response;

import com.godotlaunch.backend.entity.enums.TxnStatus;
import com.godotlaunch.backend.entity.enums.TxnType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TransactionResponse {
    private UUID id;
    private UUID walletId;
    private UUID relatedUserId;
    private String relatedUserFullName;
    private UUID gameId;
    private String gameTitle;
    private BigDecimal amount;
    private BigDecimal platformCommission;
    private BigDecimal netAmount;
    private TxnType type;
    private TxnStatus status;
    private String referenceId;
    private Instant createdAt;
}
