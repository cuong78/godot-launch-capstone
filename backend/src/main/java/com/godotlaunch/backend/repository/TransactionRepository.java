package com.godotlaunch.backend.repository;

import com.godotlaunch.backend.entity.Transaction;
import com.godotlaunch.backend.entity.enums.TxnStatus;
import com.godotlaunch.backend.entity.enums.TxnType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import java.math.BigDecimal;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Repository
public interface TransactionRepository extends JpaRepository<Transaction, UUID> {
    List<Transaction> findByWalletIdOrderByCreatedAtDesc(UUID walletId);
    Page<Transaction> findByWalletUserIdOrderByCreatedAtDesc(UUID userId, Pageable pageable);

    @Query("SELECT COALESCE(SUM(t.netAmount), 0) FROM Transaction t " +
            "WHERE t.wallet.id = :walletId AND t.type IN :types AND t.status = :status")
    BigDecimal sumNetAmountByWalletIdAndTypeInAndStatus(@Param("walletId") UUID walletId,
                                                        @Param("types") Set<TxnType> types,
                                                        @Param("status") TxnStatus status);
}
