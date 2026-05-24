package com.godotlaunch.backend.dto.request;

import com.godotlaunch.backend.entity.enums.ContractType;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import java.util.UUID;

@Data
public class ContractRequest {
    @NotNull
    private UUID gameId;

    @NotNull
    private ContractType contractType;

    private Short revenueSplit;

    private String lumpSumAmount;

    private String disputeResolutionClause;

    private String additionalTerms;

    private String buyerRepresentative;

    private String buyerPosition;

    private String sellerRepresentative;

    private String sellerAddress;

    private String sellerTaxCode;
}
