package com.godotlaunch.backend.repository;

import com.godotlaunch.backend.dto.projection.ProductSalesRow;
import com.godotlaunch.backend.dto.projection.TransactionWithBalanceRow;
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

    // Running balance (số dư ví SAU từng giao dịch, tại đúng thời điểm giao
    // dịch đó xảy ra) — JPQL không hỗ trợ window function nên phải dùng
    // native SQL. SUM() OVER tính theo created_at TĂNG DẦN (RANGE UNBOUNDED
    // PRECEDING mặc định của Postgres khi ORDER BY trong OVER), rồi kết quả
    // vẫn được sort lại DESC ở ORDER BY ngoài cùng để khớp thứ tự hiển thị
    // hiện có (mới nhất trước). "id" được thêm vào ORDER BY trong OVER() để
    // có thứ tự xác định (deterministic) khi 2 giao dịch trùng created_at.
    @Query(
        value = "SELECT t.id AS id, t.wallet_id AS walletId, t.related_user_id AS relatedUserId, " +
                "u.full_name AS relatedUserFullName, t.game_id AS gameId, g.title AS gameTitle, " +
                "t.amount AS amount, t.type AS type, t.reference_id AS referenceId, t.created_at AS createdAt, " +
                "SUM(t.amount) OVER (PARTITION BY t.wallet_id ORDER BY t.created_at ASC, t.id ASC) AS balanceAfter " +
                "FROM public.transactions t " +
                "JOIN public.wallets w ON w.id = t.wallet_id " +
                "LEFT JOIN public.users u ON u.id = t.related_user_id " +
                "LEFT JOIN public.games g ON g.id = t.game_id " +
                "WHERE w.user_id = :userId " +
                "ORDER BY t.created_at DESC, t.id DESC",
        countQuery = "SELECT COUNT(*) FROM public.transactions t " +
                "JOIN public.wallets w ON w.id = t.wallet_id " +
                "WHERE w.user_id = :userId",
        nativeQuery = true
    )
    Page<TransactionWithBalanceRow> findByWalletUserIdWithBalanceOrderByCreatedAtDesc(
            @Param("userId") UUID userId, Pageable pageable);

    @Query("SELECT COALESCE(SUM(t.amount), 0) FROM Transaction t " +
            "WHERE t.wallet.id = :walletId AND t.type IN :types")
    BigDecimal sumAmountByWalletIdAndTypeIn(@Param("walletId") UUID walletId,
                                            @Param("types") Set<TxnType> types);

    @Query("SELECT COALESCE(SUM(t.amount), 0) FROM Transaction t " +
            "WHERE t.wallet.id = :walletId AND t.type IN :types AND t.amount > 0")
    BigDecimal sumPositiveAmountByWalletIdAndTypeIn(@Param("walletId") UUID walletId,
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
    boolean existsByWalletIdAndTypeAndReferenceId(UUID walletId, TxnType type, String referenceId);
}
