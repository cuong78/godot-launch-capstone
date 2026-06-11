package com.godotlaunch.backend.repository;

import com.godotlaunch.backend.entity.Contract;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ContractRepository extends JpaRepository<Contract, UUID> {
    List<Contract> findBySellerId(UUID sellerId);
    List<Contract> findByGameId(UUID gameId);
}
