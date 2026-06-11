package com.godotlaunch.backend.dto.response;

import com.godotlaunch.backend.entity.enums.ContractStatus;
import com.godotlaunch.backend.entity.enums.ContractType;
import lombok.Builder;
import lombok.Data;
import java.time.Instant;
import java.util.UUID;

@Data
@Builder
public class ContractResponse {
    private UUID id;
    private UUID gameId;
    private String gameTitle;
    private UUID sellerId;
    private String sellerName;
    private String sellerEmail;
    private UUID buyerId;
    private ContractType contractType;
    private String termsHash;
    private String pdfUrl;
    private ContractStatus status;
    private Short revenueSplit;
    private String lumpSumAmount;
    private String disputeResolutionClause;
    private String additionalTerms;
    private String buyerRepresentative;
    private String buyerPosition;
    private String sellerRepresentative;
    private String sellerAddress;
    private String sellerTaxCode;
    private Instant signedAtSeller;
    private Instant signedAtBuyer;
    private String sellerSignatureBase64;
    private String buyerSignatureBase64;
    private String rejectionReason;
    private Instant createdAt;
}
