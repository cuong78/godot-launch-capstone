package com.godotlaunch.backend.dto.response;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Getter;
import lombok.Setter;

import java.util.List;
import java.util.Map;

/**
 * Kết quả Python /source/process trả về sau khi clone + scan + snapshot repo.
 * @JsonProperty cần cho các field boolean prefix "is"/"has" — Jackson suy property name
 * bỏ prefix từ getter Lombok, không khớp JSON key của Python.
 */
@Getter
@Setter
public class SourceProcessResult {
    private boolean clean;            // virus scan sạch
    private boolean scanned;          // ClamAV có chạy không
    private String commitSha;
    private String bundleHash;
    private int fileCount;

    @JsonProperty("isGodotProject")
    private boolean isGodotProject;   // project.godot ở root VÀ có .gd/.tscn

    @JsonProperty("hasProjectGodot")
    private boolean hasProjectGodot;  // có project.godot ở root

    @JsonProperty("hasGodotSource")
    private boolean hasGodotSource;   // có file .gd/.tscn

    private List<Map<String, Object>> infected;
    private List<Map<String, Object>> secrets;
    private Map<String, String> fileHashes;
    private String bundleBase64;   // zip source (base64) — upload lên storage làm source_bundle
}
