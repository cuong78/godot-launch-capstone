package com.godotlaunch.backend.entity;

import com.godotlaunch.backend.entity.enums.ContractStatus;
import com.godotlaunch.backend.entity.enums.ContractType;
import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "contracts")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Contract {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    // 1 game chỉ có đúng 1 hợp đồng — chào lại = sửa trực tiếp row này
    // (rejectionReason ghi lý do/điều khoản mới, không tạo row mới).
    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "game_id", nullable = false, unique = true)
    private Game game;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "seller_id", nullable = false)
    private User seller;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "contract_type", nullable = false, columnDefinition = "contract_type_enum")
    private ContractType contractType;

    @Column(name = "terms_hash", nullable = false, length = 64)
    private String termsHash;

    @Column(name = "pdf_url", nullable = false, columnDefinition = "TEXT")
    private String pdfUrl;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "status", nullable = false, columnDefinition = "contract_status_enum")
    private ContractStatus status = ContractStatus.pending;

    @Column(name = "revenue_split")
    private Short revenueSplit;

    @Column(name = "lump_sum_amount")
    private String lumpSumAmount;

    @Column(name = "seller_representative")
    private String sellerRepresentative;

    @Column(name = "seller_address", columnDefinition = "TEXT")
    private String sellerAddress;

    @Column(name = "seller_tax_code", length = 100)
    private String sellerTaxCode;

    @Column(name = "seller_signature_base64", columnDefinition = "TEXT")
    private String sellerSignatureBase64;

    @Column(name = "rejection_reason", columnDefinition = "TEXT")
    private String rejectionReason;

    @Column(name = "signed_at_seller")
    private Instant signedAtSeller;

    @Column(name = "buyer_signature_base64", columnDefinition = "TEXT")
    private String buyerSignatureBase64;

    @Column(name = "signed_at_buyer")
    private Instant signedAtBuyer;

    @Column(name = "created_at", nullable = false, insertable = false, updatable = false)
    private Instant createdAt;
}