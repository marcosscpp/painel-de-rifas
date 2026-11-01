package br.com.winclub.controller;

import br.com.winclub.service.ReportService;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Map;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin")
public class ReportController {
  private final ReportService reports;

  public ReportController(ReportService reports) {
    this.reports = reports;
  }

  @GetMapping("/reports")
  public Object catalog() {
    return reports.catalog();
  }

  @GetMapping("/reports/{type}")
  public Object preview(@PathVariable String type, @RequestParam Map<String, String> query) {
    return reports.read(type, query, true);
  }

  @GetMapping("/reports/{type}/export")
  public void export(
      @PathVariable String type, @RequestParam Map<String, String> query, HttpServletResponse res)
      throws IOException {
    String format = query.getOrDefault("format", "csv");
    if (!format.equals("csv") && !format.equals("xlsx"))
      throw new IllegalArgumentException("Formato inválido");
    var report = reports.read(type, query, false);
    res.setContentType(
        format.equals("csv")
            ? "text/csv;charset=UTF-8"
            : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", "attachment; filename=\"" + type + "." + format + "\"");
    res.setHeader("Cache-Control", "no-store");
    reports.export(report, format, res.getOutputStream());
  }

  @GetMapping("/orders/export.csv")
  public void orders(@RequestParam Map<String, String> query, HttpServletResponse res)
      throws IOException {
    var copy = new java.util.HashMap<>(query);
    copy.put("format", "csv");
    export("orders", copy, res);
  }
}
