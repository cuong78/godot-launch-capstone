package com.godotlaunch.backend.repository;

import com.godotlaunch.backend.entity.UserIpLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface UserIpLogRepository extends JpaRepository<UserIpLog, UUID> {
}
