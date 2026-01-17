package com.jspcs.pos.service.report;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import jakarta.persistence.EntityManager;
import jakarta.persistence.Query;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class ReportService {

    private final EntityManager entityManager;

    public Map<String, Object> getDailySalesReport(LocalDate date) {
        log.info("Generating daily sales report for date: {}", date);
        
        String sql = """
            SELECT 
                COUNT(*) as total_invoices,
                COALESCE(SUM(grand_total), 0) as total_sales,
                COALESCE(SUM(subtotal), 0) as subtotal_amount,
                COALESCE(SUM(discount_amount), 0) as total_discount,
                COALESCE(SUM(total_tax_amount), 0) as total_tax,
                COALESCE(AVG(grand_total), 0) as average_sale,
                MAX(grand_total) as max_sale,
                MIN(grand_total) as min_sale
            FROM sales_invoices 
            WHERE invoice_date = :date 
            AND is_cancelled = false
            """;
        
        Query query = entityManager.createNativeQuery(sql);
        query.setParameter("date", date);
        
        Object[] result = (Object[]) query.getSingleResult();
        
        Map<String, Object> report = new HashMap<>();
        report.put("date", date);
        report.put("totalInvoices", result[0]);
        report.put("totalSales", result[1]);
        report.put("subtotalAmount", result[2]);
        report.put("totalDiscount", result[3]);
        report.put("totalTax", result[4]);
        report.put("averageSale", result[5]);
        report.put("maxSale", result[6]);
        report.put("minSale", result[7]);
        
        return report;
    }

    public Map<String, Object> getMonthlySalesReport(int year, int month) {
        log.info("Generating monthly sales report for year: {}, month: {}", year, month);
        
        String sql = """
            SELECT 
                COUNT(*) as total_invoices,
                COALESCE(SUM(grand_total), 0) as total_sales,
                COALESCE(SUM(subtotal), 0) as subtotal_amount,
                COALESCE(SUM(discount_amount), 0) as total_discount,
                COALESCE(SUM(total_tax_amount), 0) as total_tax,
                COALESCE(AVG(grand_total), 0) as average_sale,
                MAX(grand_total) as max_sale,
                MIN(grand_total) as min_sale
            FROM sales_invoices 
            WHERE EXTRACT(YEAR FROM invoice_date) = :year 
            AND EXTRACT(MONTH FROM invoice_date) = :month
            AND is_cancelled = false
            """;
        
        Query query = entityManager.createNativeQuery(sql);
        query.setParameter("year", year);
        query.setParameter("month", month);
        
        Object[] result = (Object[]) query.getSingleResult();
        
        Map<String, Object> report = new HashMap<>();
        report.put("year", year);
        report.put("month", month);
        report.put("totalInvoices", result[0]);
        report.put("totalSales", result[1]);
        report.put("subtotalAmount", result[2]);
        report.put("totalDiscount", result[3]);
        report.put("totalTax", result[4]);
        report.put("averageSale", result[5]);
        report.put("maxSale", result[6]);
        report.put("minSale", result[7]);
        
        return report;
    }

    public List<Map<String, Object>> getProductWiseSalesReport(LocalDate startDate, LocalDate endDate, int limit) {
        log.info("Generating product-wise sales report from {} to {}", startDate, endDate);
        
        String sql = """
            SELECT 
                p.id as product_id,
                p.name as product_name,
                p.sku,
                SUM(ii.quantity) as total_quantity,
                COALESCE(SUM(ii.final_amount), 0) as total_revenue,
                COALESCE(SUM(ii.line_total), 0) as gross_revenue,
                COALESCE(SUM(ii.discount_amount), 0) as total_discount,
                COALESCE(SUM(ii.total_tax_amount), 0) as total_tax,
                COUNT(DISTINCT ii.invoice_id) as number_of_invoices,
                COALESCE(AVG(ii.unit_price), 0) as average_price
            FROM invoice_items ii
            JOIN sales_invoices si ON ii.invoice_id = si.id
            JOIN products p ON ii.product_id = p.id
            WHERE si.invoice_date BETWEEN :startDate AND :endDate
            AND si.is_cancelled = false
            GROUP BY p.id, p.name, p.sku
            ORDER BY total_revenue DESC
            LIMIT :limit
            """;
        
        Query query = entityManager.createNativeQuery(sql);
        query.setParameter("startDate", startDate);
        query.setParameter("endDate", endDate);
        query.setParameter("limit", limit);
        
        @SuppressWarnings("unchecked")
        List<Object[]> results = query.getResultList();
        
        List<Map<String, Object>> report = new ArrayList<>();
        for (Object[] row : results) {
            Map<String, Object> item = new HashMap<>();
            item.put("productId", row[0]);
            item.put("productName", row[1]);
            item.put("sku", row[2]);
            item.put("totalQuantity", row[3]);
            item.put("totalRevenue", row[4]);
            item.put("grossRevenue", row[5]);
            item.put("totalDiscount", row[6]);
            item.put("totalTax", row[7]);
            item.put("numberOfInvoices", row[8]);
            item.put("averagePrice", row[9]);
            report.add(item);
        }
        
        return report;
    }

    public Map<String, Object> getGstReport(LocalDate startDate, LocalDate endDate) {
        log.info("Generating GST report from {} to {}", startDate, endDate);
        
        String summarySql = """
            SELECT 
                COALESCE(SUM(taxable_amount), 0) as total_taxable_amount,
                COALESCE(SUM(cgst_amount), 0) as total_cgst,
                COALESCE(SUM(sgst_amount), 0) as total_sgst,
                COALESCE(SUM(igst_amount), 0) as total_igst,
                COALESCE(SUM(total_tax_amount), 0) as total_tax
            FROM gst_tax_details gtd
            JOIN sales_invoices si ON gtd.invoice_id = si.id
            WHERE si.invoice_date BETWEEN :startDate AND :endDate
            AND si.is_cancelled = false
            """;
        
        Query summaryQuery = entityManager.createNativeQuery(summarySql);
        summaryQuery.setParameter("startDate", startDate);
        summaryQuery.setParameter("endDate", endDate);
        
        Object[] summaryResult = (Object[]) summaryQuery.getSingleResult();
        
        String rateWiseSql = """
            SELECT 
                gtd.gst_rate,
                COALESCE(SUM(gtd.taxable_amount), 0) as taxable_amount,
                COALESCE(SUM(gtd.cgst_amount), 0) as cgst_amount,
                COALESCE(SUM(gtd.sgst_amount), 0) as sgst_amount,
                COALESCE(SUM(gtd.igst_amount), 0) as igst_amount,
                COALESCE(SUM(gtd.total_tax_amount), 0) as total_tax_amount,
                COUNT(DISTINCT gtd.invoice_id) as number_of_invoices
            FROM gst_tax_details gtd
            JOIN sales_invoices si ON gtd.invoice_id = si.id
            WHERE si.invoice_date BETWEEN :startDate AND :endDate
            AND si.is_cancelled = false
            GROUP BY gtd.gst_rate
            ORDER BY gtd.gst_rate
            """;
        
        Query rateWiseQuery = entityManager.createNativeQuery(rateWiseSql);
        rateWiseQuery.setParameter("startDate", startDate);
        rateWiseQuery.setParameter("endDate", endDate);
        
        @SuppressWarnings("unchecked")
        List<Object[]> rateWiseResults = rateWiseQuery.getResultList();
        
        Map<String, Object> report = new HashMap<>();
        report.put("startDate", startDate);
        report.put("endDate", endDate);
        report.put("totalTaxableAmount", summaryResult[0]);
        report.put("totalCgst", summaryResult[1]);
        report.put("totalSgst", summaryResult[2]);
        report.put("totalIgst", summaryResult[3]);
        report.put("totalTax", summaryResult[4]);
        
        List<Map<String, Object>> rateWiseData = new ArrayList<>();
        for (Object[] row : rateWiseResults) {
            Map<String, Object> item = new HashMap<>();
            item.put("gstRate", row[0]);
            item.put("taxableAmount", row[1]);
            item.put("cgstAmount", row[2]);
            item.put("sgstAmount", row[3]);
            item.put("igstAmount", row[4]);
            item.put("totalTaxAmount", row[5]);
            item.put("numberOfInvoices", row[6]);
            rateWiseData.add(item);
        }
        report.put("rateWiseData", rateWiseData);
        
        return report;
    }

    public Map<String, Object> getProfitLossReport(LocalDate startDate, LocalDate endDate) {
        log.info("Generating profit & loss report from {} to {}", startDate, endDate);
        
        String revenueSql = """
            SELECT 
                COALESCE(SUM(grand_total), 0) as total_revenue,
                COALESCE(SUM(subtotal), 0) as gross_revenue,
                COALESCE(SUM(discount_amount), 0) as total_discount,
                COALESCE(SUM(total_tax_amount), 0) as total_tax
            FROM sales_invoices 
            WHERE invoice_date BETWEEN :startDate AND :endDate
            AND is_cancelled = false
            """;
        
        Query revenueQuery = entityManager.createNativeQuery(revenueSql);
        revenueQuery.setParameter("startDate", startDate);
        revenueQuery.setParameter("endDate", endDate);
        
        Object[] revenueResult = (Object[]) revenueQuery.getSingleResult();
        
        String costSql = """
            SELECT 
                COALESCE(SUM(ii.quantity * p.cost_price), 0) as total_cost
            FROM invoice_items ii
            JOIN sales_invoices si ON ii.invoice_id = si.id
            JOIN products p ON ii.product_id = p.id
            WHERE si.invoice_date BETWEEN :startDate AND :endDate
            AND si.is_cancelled = false
            AND p.cost_price IS NOT NULL
            """;
        
        Query costQuery = entityManager.createNativeQuery(costSql);
        costQuery.setParameter("startDate", startDate);
        costQuery.setParameter("endDate", endDate);
        
        BigDecimal totalCost = (BigDecimal) costQuery.getSingleResult();
        
        BigDecimal totalRevenue = (BigDecimal) revenueResult[0];
        BigDecimal grossRevenue = (BigDecimal) revenueResult[1];
        BigDecimal totalDiscount = (BigDecimal) revenueResult[2];
        BigDecimal totalTax = (BigDecimal) revenueResult[3];
        
        BigDecimal grossProfit = grossRevenue.subtract(totalCost);
        BigDecimal netProfit = totalRevenue.subtract(totalCost);
        BigDecimal grossProfitMargin = grossRevenue.compareTo(BigDecimal.ZERO) > 0 
            ? grossProfit.divide(grossRevenue, 4, RoundingMode.HALF_UP).multiply(new BigDecimal("100"))
            : BigDecimal.ZERO;
        BigDecimal netProfitMargin = totalRevenue.compareTo(BigDecimal.ZERO) > 0
            ? netProfit.divide(totalRevenue, 4, RoundingMode.HALF_UP).multiply(new BigDecimal("100"))
            : BigDecimal.ZERO;
        
        Map<String, Object> report = new HashMap<>();
        report.put("startDate", startDate);
        report.put("endDate", endDate);
        report.put("totalRevenue", totalRevenue);
        report.put("grossRevenue", grossRevenue);
        report.put("totalDiscount", totalDiscount);
        report.put("totalTax", totalTax);
        report.put("totalCost", totalCost);
        report.put("grossProfit", grossProfit);
        report.put("netProfit", netProfit);
        report.put("grossProfitMargin", grossProfitMargin);
        report.put("netProfitMargin", netProfitMargin);
        
        return report;
    }

    public List<Map<String, Object>> getHourlySalesReport(LocalDate date) {
        log.info("Generating hourly sales report for date: {}", date);
        
        String sql = """
            SELECT 
                EXTRACT(HOUR FROM si.invoice_time) as hour,
                COUNT(*) as number_of_invoices,
                COALESCE(SUM(si.grand_total), 0) as total_sales,
                COALESCE(AVG(si.grand_total), 0) as average_sale
            FROM sales_invoices si
            WHERE si.invoice_date = :date
            AND si.is_cancelled = false
            GROUP BY EXTRACT(HOUR FROM si.invoice_time)
            ORDER BY hour
            """;
        
        Query query = entityManager.createNativeQuery(sql);
        query.setParameter("date", date);
        
        @SuppressWarnings("unchecked")
        List<Object[]> results = query.getResultList();
        
        List<Map<String, Object>> report = new ArrayList<>();
        for (Object[] row : results) {
            Map<String, Object> item = new HashMap<>();
            item.put("hour", row[0]);
            item.put("numberOfInvoices", row[1]);
            item.put("totalSales", row[2]);
            item.put("averageSale", row[3]);
            report.add(item);
        }
        
        return report;
    }
}
