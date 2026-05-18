package com.godotlaunch.backend.repository;

import com.godotlaunch.backend.entity.Transaction;
import com.godotlaunch.backend.entity.enums.TxnType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface TransactionRepository extends JpaRepository<Transaction, UUID> {
    List<Transaction> findByWalletId(UUID walletId);
    List<Transaction> findByType(TxnType type);
}
