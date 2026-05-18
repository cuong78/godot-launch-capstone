package com.godotlaunch.backend.repository;

import com.godotlaunch.backend.entity.Contract;
import com.godotlaunch.backend.entity.enums.ContractStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ContractRepository extends JpaRepository<Contract, UUID> {
    List<Contract> findByGameId(UUID gameId);
    List<Contract> findBySellerId(UUID sellerId);
    List<Contract> findByBuyerId(UUID buyerId);
    List<Contract> findByStatus(ContractStatus status);
}
