package com.godotlaunch.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;
import org.springframework.web.multipart.MultipartFile;

@Getter
@Setter
public class UploadReceiptRequest {

    @NotBlank(message = "Payer name is required.")
    private String payerName;

    @NotBlank(message = "Payer bank is required.")
    private String payerBank;

    @NotBlank(message = "Transfer reference is required.")
    private String transferReference;

    private MultipartFile receiptFile;
}
