package com.jspcs.pos.controller.report;

import com.jspcs.pos.service.report.ReportService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/reports")
@RequiredArgsConstructor
@Slf4j
public class ReportController {

    private final ReportService reportService;

    @GetMapping("/sales/daily")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    public ResponseEntity<Map<String, Object>> getDailyReport(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        log.info("Getting daily sales report for date: {}", date);
        return ResponseEntity.ok(reportService.getDailySalesReport(date));
    }

    @GetMapping("/sales/monthly")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    public ResponseEntity<Map<String, Object>> getMonthlyReport(
            @RequestParam int year,
            @RequestParam int month) {
        log.info("Getting monthly sales report for year: {}, month: {}", year, month);
        return ResponseEntity.ok(reportService.getMonthlySalesReport(year, month));
    }

    @GetMapping("/sales/product-wise")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    public ResponseEntity<List<Map<String, Object>>> getProductWiseReport(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(defaultValue = "50") int limit) {
        log.info("Getting product-wise sales report from {} to {}", startDate, endDate);
        return ResponseEntity.ok(reportService.getProductWiseSalesReport(startDate, endDate, limit));
    }

    @GetMapping("/gst")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    public ResponseEntity<Map<String, Object>> getGstReport(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        log.info("Getting GST report from {} to {}", startDate, endDate);
        return ResponseEntity.ok(reportService.getGstReport(startDate, endDate));
    }

    @GetMapping("/profit-loss")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    public ResponseEntity<Map<String, Object>> getProfitLossReport(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        log.info("Getting profit & loss report from {} to {}", startDate, endDate);
        return ResponseEntity.ok(reportService.getProfitLossReport(startDate, endDate));
    }

    @GetMapping("/sales/hourly")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    public ResponseEntity<List<Map<String, Object>>> getHourlySalesReport(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        log.info("Getting hourly sales report for date: {}", date);
        return ResponseEntity.ok(reportService.getHourlySalesReport(date));
    }
}
