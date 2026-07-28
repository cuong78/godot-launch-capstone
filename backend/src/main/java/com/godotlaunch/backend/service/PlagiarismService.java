package com.godotlaunch.backend.service;

import java.util.UUID;

public interface PlagiarismService {
    void reviewSnapshot(UUID gameId, UUID snapshotId);
}
