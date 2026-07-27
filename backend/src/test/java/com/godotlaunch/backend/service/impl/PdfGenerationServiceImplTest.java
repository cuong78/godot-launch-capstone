package com.godotlaunch.backend.service.impl;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;

import java.util.HashMap;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PdfGenerationServiceImplTest {

    @Mock
    private TemplateEngine templateEngine;

    @InjectMocks
    private PdfGenerationServiceImpl service;

    @Test
    void generatePdfFromHtml_ShouldReturnPdfBytes_WhenHtmlIsValid() {
        String templateName = "dummy-template";
        HashMap<String, Object> variables = new HashMap<>();
        variables.put("key", "value");

        when(templateEngine.process(eq(templateName), any(Context.class)))
                .thenReturn("<html><body><h1>Hello World</h1></body></html>");

        byte[] pdfBytes = service.generatePdfFromHtml(templateName, variables);

        assertThat(pdfBytes).isNotEmpty();
    }

    @Test
    void generatePdfFromHtml_ShouldThrowException_WhenHtmlContentIsNull() {
        String templateName = "dummy-template";
        when(templateEngine.process(eq(templateName), any(Context.class)))
                .thenReturn(null);

        assertThatThrownBy(() -> service.generatePdfFromHtml(templateName, new HashMap<>()))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Failed to generate PDF");
    }
}
