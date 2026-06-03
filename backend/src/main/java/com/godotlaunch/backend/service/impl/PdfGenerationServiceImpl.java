//package com.godotlaunch.backend.service.impl;
//
//import com.godotlaunch.backend.service.PdfGenerationService;
//import com.openhtmltopdf.pdfboxout.PdfRendererBuilder;
//import org.springframework.stereotype.Service;
//import org.thymeleaf.TemplateEngine;
//import org.thymeleaf.context.Context;
//
//import java.io.ByteArrayOutputStream;
//import java.util.Map;
//
//@Service
//public class PdfGenerationServiceImpl implements PdfGenerationService {
//
//    private final TemplateEngine templateEngine;
//
//    public PdfGenerationServiceImpl(TemplateEngine templateEngine) {
//        this.templateEngine = templateEngine;
//    }
//
//    @Override
//    public byte[] generatePdfFromHtml(String templateName, Map<String, Object> variables) {
//        Context context = new Context();
//        context.setVariables(variables);
//        String htmlContent = templateEngine.process(templateName, context);
//
//        // Robustly escape any raw '&' characters that aren't part of an existing XML/HTML entity
//        if (htmlContent != null) {
//            htmlContent = htmlContent.replaceAll("&(?!(amp|lt|gt|quot|apos|#[0-9]+|#x[0-9a-fA-F]+);)", "&amp;");
//        }
//
//        try (ByteArrayOutputStream os = new ByteArrayOutputStream()) {
//            PdfRendererBuilder builder = new PdfRendererBuilder();
//            builder.useFastMode();
//
//            // Register Times New Roman Regular & Bold fonts from resources for pristine Vietnamese rendering
//            builder.useFont(() -> PdfGenerationServiceImpl.class.getResourceAsStream("/fonts/times.ttf"),
//                            "Times New Roman",
//                            400,
//                            com.openhtmltopdf.outputdevice.helper.BaseRendererBuilder.FontStyle.NORMAL,
//                            true);
//            builder.useFont(() -> PdfGenerationServiceImpl.class.getResourceAsStream("/fonts/timesbd.ttf"),
//                            "Times New Roman",
//                            700,
//                            com.openhtmltopdf.outputdevice.helper.BaseRendererBuilder.FontStyle.NORMAL,
//                            true);
//
//            builder.withHtmlContent(htmlContent, "classpath:/templates/");
//            builder.toStream(os);
//            builder.run();
//            return os.toByteArray();
//        } catch (Exception e) {
//            throw new RuntimeException("Failed to generate PDF", e);
//        }
//    }
//}
