package com.godotlaunch.backend.repository;

import com.godotlaunch.backend.dto.projection.ProductSalesRow;
import com.godotlaunch.backend.entity.Transaction;
import com.godotlaunch.backend.entity.enums.TxnType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

@Repository
public interface TransactionRepository extends JpaRepository<Transaction, UUID> {
    List<Transaction> findByWalletIdOrderByCreatedAtDesc(UUID walletId);
    Page<Transaction> findByWalletUserIdOrderByCreatedAtDesc(UUID userId, Pageable pageable);

    @Query("SELECT COALESCE(SUM(t.amount), 0) FROM Transaction t " +
            "WHERE t.wallet.id = :walletId AND t.type IN :types")
    BigDecimal sumAmountByWalletIdAndTypeIn(@Param("walletId") UUID walletId,
                                            @Param("types") Set<TxnType> types);

    @Query("SELECT COUNT(t) FROM Transaction t WHERE t.wallet.id = :walletId AND t.type = :type")
    long countByWalletIdAndType(@Param("walletId") UUID walletId, @Param("type") TxnType type);

    @Query("SELECT new com.godotlaunch.backend.dto.projection.ProductSalesRow(" +
            "t.asset.id, t.asset.title, t.asset.thumbnailUrl, COUNT(t), COALESCE(SUM(t.amount), 0)) " +
            "FROM Transaction t WHERE t.wallet.id = :walletId AND t.type = :type AND t.asset IS NOT NULL " +
            "GROUP BY t.asset.id, t.asset.title, t.asset.thumbnailUrl")
    List<ProductSalesRow> sumAssetSalesByWalletIdAndType(@Param("walletId") UUID walletId, @Param("type") TxnType type);

    @Query("SELECT new com.godotlaunch.backend.dto.projection.ProductSalesRow(" +
            "t.game.id, t.game.title, t.game.thumbnailUrl, COUNT(t), COALESCE(SUM(t.amount), 0)) " +
            "FROM Transaction t WHERE t.wallet.id = :walletId AND t.type = :type AND t.game IS NOT NULL " +
            "GROUP BY t.game.id, t.game.title, t.game.thumbnailUrl")
    List<ProductSalesRow> sumGameSalesByWalletIdAndType(@Param("walletId") UUID walletId, @Param("type") TxnType type);

    Optional<Transaction> findByOrderIdAndPaymentIsNotNull(UUID orderId);
    boolean existsByOrderId(UUID orderId);
    Optional<Transaction> findByPaymentId(UUID paymentId);
}
