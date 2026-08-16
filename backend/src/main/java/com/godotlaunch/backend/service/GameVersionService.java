package com.godotlaunch.backend.service;

import com.godotlaunch.backend.entity.Game;
import com.godotlaunch.backend.entity.GameVersion;
import com.godotlaunch.backend.entity.SourceSnapshot;

public interface GameVersionService {
    GameVersion activateApprovedUpdate(
            Game game,
            SourceSnapshot approvedSnapshot,
            String versionNumber,
            String changelog
    );
}
