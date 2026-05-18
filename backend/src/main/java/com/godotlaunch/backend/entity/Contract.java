package com.godotlaunch.backend.entity;

import com.godotlaunch.backend.entity.enums.ContractStatus;
import com.godotlaunch.backend.entity.enums.ContractType;
import jakarta.persistence.*;
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

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "game_id", nullable = false)
    private Game game;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "seller_id", nullable = false)
    private User seller;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "buyer_id")
    private User buyer;

    @Enumerated(EnumType.STRING)
    @Column(name = "contract_type", nullable = false, columnDefinition = "contract_type_enum")
    private ContractType contractType;

    @Column(name = "terms_hash", nullable = false, length = 64)
    private String termsHash;

    @Column(name = "pdf_url", nullable = false, columnDefinition = "TEXT")
    private String pdfUrl;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, columnDefinition = "contract_status_enum")
    private ContractStatus status = ContractStatus.pending;

    @Column(name = "revenue_split")
    private Short revenueSplit;

    @Column(name = "signed_at_seller")
    private Instant signedAtSeller;

    @Column(name = "signed_at_buyer")
    private Instant signedAtBuyer;

    @Column(name = "created_at", nullable = false, insertable = false, updatable = false)
    private Instant createdAt;
}
