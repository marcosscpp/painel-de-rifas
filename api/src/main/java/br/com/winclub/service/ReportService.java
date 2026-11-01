package br.com.winclub.service;

import br.com.winclub.model.Models.*;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.*;
import org.apache.poi.xssf.streaming.SXSSFWorkbook;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class ReportService {
  public record Column(String key, String label, String type, boolean total) {}

  public record Definition(
      String type,
      String title,
      String periodOf,
      boolean needsRaffle,
      boolean usesStatus,
      List<Column> columns) {}

  public record Report(
      String type,
      String title,
      List<Column> columns,
      List<List<Object>> rows,
      boolean truncated) {}

  private final OrderService orders;
  private final BuyerService buyers;
  private final RaffleService raffles;
  private final AdminService admin;

  public ReportService(
      OrderService orders, BuyerService buyers, RaffleService raffles, AdminService admin) {
    this.orders = orders;
    this.buyers = buyers;
    this.raffles = raffles;
    this.admin = admin;
  }

  private Column col(String key, String label, String type) {
    return new Column(key, label, type, false);
  }

  public List<Definition> catalog() {
    return List.of(
        new Definition(
            "orders",
            "Pedidos",
            "data de criação do pedido",
            false,
            true,
            List.of(
                col("id", "Pedido", "text"),
                col("createdAt", "Criado em", "datetime"),
                col("status", "Status", "text"),
                col("raffle", "Rifa", "text"),
                col("buyer", "Comprador", "text"),
                col("quantity", "Números", "int"),
                col("subtotal", "Subtotal", "money"),
                col("fee", "Taxa Pix", "money"),
                col("total", "Total", "money"))),
        new Definition(
            "buyers",
            "Compradores",
            "data de cadastro",
            false,
            false,
            List.of(
                col("name", "Nome", "text"),
                col("phone", "Celular", "text"),
                col("cpf", "CPF", "text"),
                col("email", "E-mail", "text"),
                col("orders", "Pedidos pagos", "int"),
                col("numbers", "Números pagos", "int"),
                col("total", "Total pago", "money"))),
        new Definition(
            "numbers",
            "Números",
            "data de criação do pedido",
            true,
            true,
            List.of(
                col("number", "Número", "int"),
                col("status", "Status", "text"),
                col("order", "Pedido", "text"),
                col("buyer", "Comprador", "text"))),
        new Definition(
            "sales-by-day",
            "Vendas por dia",
            "data do pagamento",
            false,
            false,
            List.of(
                col("day", "Dia", "date"),
                col("orders", "Pedidos pagos", "int"),
                col("numbers", "Números vendidos", "int"),
                col("buyers", "Compradores", "int"),
                col("revenue", "Faturamento", "money"),
                col("fees", "Taxas Pix", "money"))),
        new Definition(
            "sales-by-raffle",
            "Vendas por rifa",
            "data do pagamento",
            false,
            false,
            List.of(
                col("raffle", "Rifa", "text"),
                col("status", "Status", "text"),
                col("orders", "Pedidos pagos", "int"),
                col("numbers", "Números vendidos", "int"),
                col("buyers", "Compradores", "int"),
                col("revenue", "Faturamento", "money"),
                col("fees", "Taxas Pix", "money"))));
  }

  public Report read(String type, Map<String, String> query, boolean preview) {
    Definition definition =
        catalog().stream()
            .filter(d -> d.type.equals(type))
            .findFirst()
            .orElseThrow(
                () ->
                    new ResponseStatusException(HttpStatus.NOT_FOUND, "Relatório não encontrado"));
    String from = query.get("from"), to = query.get("to");
    if (from != null) LocalDate.parse(from);
    if (to != null) LocalDate.parse(to);
    if (from != null && to != null && from.compareTo(to) > 0)
      throw new IllegalArgumentException("Período inválido");
    if (definition.needsRaffle && !query.containsKey("raffleId"))
      throw new IllegalArgumentException("Selecione uma rifa");
    if (query.containsKey("raffleId")) raffles.get(query.get("raffleId"));
    var source =
        orders.filtered(query).stream()
            .filter(o -> inPeriod(type.startsWith("sales-") ? o.paidAt : o.createdAt, from, to))
            .toList();
    var rows = new ArrayList<List<Object>>();
    switch (type) {
      case "orders" ->
          source.forEach(
              o ->
                  rows.add(
                      row(
                          o.id,
                          o.createdAt.toString(),
                          o.status,
                          raffles.get(o.raffleId).title,
                          buyers.get(o.userId).name,
                          o.quantity,
                          o.subtotalCents,
                          o.feeCents,
                          o.totalCents)));
      case "buyers" ->
          buyers.all().stream()
              .filter(b -> inPeriod(b.createdAt, from, to))
              .forEach(
                  b -> {
                    var s = admin.buyer(b, false);
                    rows.add(
                        row(
                            b.name,
                            b.phone,
                            b.cpf,
                            b.email,
                            s.get("paidOrders"),
                            s.get("paidNumbers"),
                            s.get("spentCents")));
                  });
      case "numbers" ->
          source.stream()
              .filter(o -> !o.refundRequired && Set.of("PENDING", "PAID").contains(o.status))
              .forEach(
                  o ->
                      o.numbers.forEach(
                          n -> rows.add(row(n, o.status, o.id, buyers.get(o.userId).name))));
      case "sales-by-day", "sales-by-raffle" -> {
        var grouped = new TreeMap<String, List<Order>>();
        for (Order o : source)
          if (o.status.equals("PAID") && !o.refundRequired)
            grouped
                .computeIfAbsent(
                    type.equals("sales-by-day") ? AdminService.day(o.paidAt) : o.raffleId,
                    k -> new ArrayList<>())
                .add(o);
        grouped.forEach(
            (key, list) -> {
              var values = new ArrayList<Object>();
              if (type.equals("sales-by-day")) values.add(key);
              else {
                Raffle r = raffles.get(key);
                values.add(r.title);
                values.add(r.status);
              }
              values.addAll(
                  row(
                      list.size(),
                      list.stream().mapToInt(o -> o.quantity).sum(),
                      list.stream().map(o -> o.userId).distinct().count(),
                      list.stream().mapToLong(o -> o.subtotalCents).sum(),
                      list.stream().mapToLong(o -> o.feeCents).sum()));
              rows.add(values);
            });
      }
      default -> throw new IllegalArgumentException("Relatório inválido");
    }
    boolean truncated = preview && rows.size() > 100;
    return new Report(
        type,
        definition.title,
        definition.columns,
        truncated ? rows.subList(0, 100) : rows,
        truncated);
  }

  private boolean inPeriod(java.time.Instant time, String from, String to) {
    if (time == null) return from == null && to == null;
    String day = AdminService.day(time);
    return (from == null || day.compareTo(from) >= 0) && (to == null || day.compareTo(to) <= 0);
  }

  private static List<Object> row(Object... values) {
    return Arrays.asList(values);
  }

  public void export(Report report, String format, OutputStream output) throws IOException {
    if (format.equals("csv")) {
      var writer = new BufferedWriter(new OutputStreamWriter(output, StandardCharsets.UTF_8));
      writer.write('\uFEFF');
      writeLine(writer, report.columns.stream().map(c -> (Object) c.label).toList());
      for (var row : report.rows) writeLine(writer, row);
      writer.flush();
    } else if (format.equals("xlsx")) {
      try (var workbook = new SXSSFWorkbook(100)) {
        var sheet = workbook.createSheet("Relatório");
        int index = 0;
        var header = sheet.createRow(index++);
        for (int c = 0; c < report.columns.size(); c++)
          header.createCell(c).setCellValue(report.columns.get(c).label);
        for (var values : report.rows) {
          var row = sheet.createRow(index++);
          for (int c = 0; c < values.size(); c++) {
            var cell = row.createCell(c);
            Object v = values.get(c);
            if (v instanceof Number n) cell.setCellValue(n.doubleValue());
            else cell.setCellValue(v == null ? "" : v.toString());
          }
        }
        sheet.createFreezePane(0, 1);
        workbook.write(output);
      }
    } else throw new IllegalArgumentException("Formato inválido");
  }

  private void writeLine(Writer writer, List<?> values) throws IOException {
    var cells = new ArrayList<String>();
    for (Object value : values) {
      String s = value == null ? "" : value.toString();
      String trimmed = s.stripLeading();
      if (value instanceof String && !trimmed.isEmpty() && "=+@-".indexOf(trimmed.charAt(0)) >= 0)
        s = "'" + s;
      cells.add("\"" + s.replace("\"", "\"\"") + "\"");
    }
    writer.write(String.join(";", cells) + "\r\n");
  }
}
