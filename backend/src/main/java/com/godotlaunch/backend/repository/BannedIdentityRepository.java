package com.godotlaunch.backend.repository;

import com.godotlaunch.backend.entity.BannedIdentity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface BannedIdentityRepository extends JpaRepository<BannedIdentity, UUID> {
    boolean existsByKycIdNumber(String kycIdNumber);
    boolean existsByBankAccount(String bankAccount);
}
