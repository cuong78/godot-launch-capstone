package com.godotlaunch.backend.repository;

import com.godotlaunch.backend.entity.Contract;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.UUID;

@Repository
public interface ContractRepository extends JpaRepository<Contract, UUID> {
    List<Contract> findBySellerId(UUID sellerId);
    List<Contract> findByGameId(UUID gameId);

    @Query("SELECT c FROM Contract c WHERE c.pdfUrl IS NOT NULL AND c.pdfUrl <> '' " +
           "AND (:search IS NULL OR :search = '' OR " +
           "LOWER(c.pdfUrl) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(c.game.title) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(c.seller.fullName) LIKE LOWER(CONCAT('%', :search, '%')))")
    Page<Contract> searchContracts(@Param("search") String search, Pageable pageable);
}
