package br.com.winclub;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import br.com.winclub.dto.Requests.*;
import br.com.winclub.integration.*;
import br.com.winclub.model.Models.*;
import br.com.winclub.repository.*;
import br.com.winclub.service.*;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.server.ResponseStatusException;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("mock")
@ExtendWith(OutputCaptureExtension.class)
class ApiIntegrationTest {
  @Autowired DocumentRepository db;
  @Autowired OrderService orders;
  @Autowired RaffleService raffles;
  @Autowired BuyerService buyers;
  @Autowired DrawService draws;
  @Autowired PaymentGateway payment;
  @Autowired MockMvc mvc;
  @Autowired ReportService reports;
  @Autowired SettingsService settings;
  @Autowired ImageStorage images;

  @Test
  void logsSecurityRejectionsWithCorrelationId(CapturedOutput output) throws Exception {
    String id = "8ca4e875-af42-4b2d-9bdb-59bac331f2ef";
    mvc.perform(get("/api/admin/dashboard").header("X-Request-ID", id))
        .andExpect(status().isUnauthorized())
        .andExpect(header().string("X-Request-ID", id));
    assertTrue(output.toString().contains("requestId=" + id));
    assertTrue(output.toString().contains("status=401"));
  }

  Buyer buyer;
  Raffle raffle;

  @BeforeEach
  void fixture() {
    buyer = new Buyer();
    buyer.name = "Maria Silva";
    buyer.phone = "11999999999";
    buyer.cpf = "52998224725";
    buyer.email = "maria@example.com";
    db.save("buyer", buyer.id, buyer);
    raffle = new Raffle();
    raffle.slug = "teste-" + raffle.id;
    raffle.title = "Campanha teste";
    raffle.description = "Descrição";
    raffle.status = "ACTIVE";
    raffle.saleMode = "PICK";
    raffle.totalNumbers = 100;
    raffle.maxPerOrder = 100;
    raffle.priceCents = 100;
    Prize prize = new Prize();
    prize.title = "Prêmio";
    raffle.prizes.add(prize);
    raffles.save(raffle);
  }

  CreateOrder input(int number, String key) {
    return new CreateOrder(raffle.slug, null, List.of(number), null, key);
  }

  Order create(int number) {
    return orders.create(input(number, UUID.randomUUID().toString()), buyer);
  }

  @Test
  void mockProfileHasNoExternalDependencies() {
    assertInstanceOf(MockDocumentRepository.class, db);
    assertInstanceOf(MockPaymentGateway.class, payment);
  }

  @Test
  void idempotentRequestsReturnSameOrder() {
    String key = UUID.randomUUID().toString();
    Order first = orders.create(input(1, key), buyer);
    Order second = orders.create(input(1, key), buyer);
    assertEquals(first.id, second.id);
    assertEquals(1, orders.all().stream().filter(o -> o.raffleId.equals(raffle.id)).count());
    assertThrows(ResponseStatusException.class, () -> orders.create(input(2, key), buyer));
  }

  @Test
  void concurrentRequestsCannotReserveSameNumber() throws Exception {
    try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
      var start = new CountDownLatch(1);
      List<Future<Boolean>> results = new ArrayList<>();
      for (int i = 0; i < 20; i++)
        results.add(
            executor.submit(
                () -> {
                  start.await();
                  try {
                    create(7);
                    return true;
                  } catch (ResponseStatusException ex) {
                    assertEquals(409, ex.getStatusCode().value());
                    return false;
                  }
                }));
      start.countDown();
      int successes = 0;
      for (var result : results) if (result.get()) successes++;
      assertEquals(1, successes);
    }
  }

  @Test
  void concurrentDuplicateRequestsCreateOneOrder() throws Exception {
    String key = UUID.randomUUID().toString();
    try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
      List<Future<String>> results = new ArrayList<>();
      for (int i = 0; i < 10; i++)
        results.add(executor.submit(() -> orders.create(input(4, key), buyer).id));
      Set<String> ids = new HashSet<>();
      for (var result : results) ids.add(result.get());
      assertEquals(1, ids.size());
    }
  }

  @Test
  void expiryReleasesNumbers() {
    Order first = create(8);
    first.expiresAt = Instant.now().minusSeconds(1);
    db.save("order", first.id, first);
    orders.expire();
    assertEquals("EXPIRED", orders.get(first.id).status);
    assertNotEquals(first.id, create(8).id);
  }

  @Test
  void latePaymentCollisionRequiresRefund() {
    Order first = create(9);
    first.expiresAt = Instant.now().minusSeconds(1);
    db.save("order", first.id, first);
    orders.expire();
    Order second = create(9);
    assertEquals(
        "refund-required", orders.confirm(first.payment.providerChargeId, "event-" + first.id));
    assertTrue(orders.get(first.id).refundRequired);
    assertEquals("PENDING", orders.get(second.id).status);
    assertEquals(1, raffles.progress(raffle).get("reserved"));
    assertEquals(0, raffles.progress(raffle).get("paid"));
  }

  @Test
  void latePaymentRecoversUnoccupiedNumbers() {
    Order o = create(11);
    o.expiresAt = Instant.now().minusSeconds(1);
    db.save("order", o.id, o);
    orders.expire();
    assertEquals("paid", orders.confirm(o.payment.providerChargeId, "late-" + o.id));
    assertFalse(orders.get(o.id).refundRequired);
  }

  @Test
  void duplicatePaymentDoesNotDoubleCount() {
    Order o = create(12);
    orders.confirm(o.payment.providerChargeId, "event-" + o.id);
    assertEquals("already-confirmed", orders.confirm(o.payment.providerChargeId, "other-" + o.id));
    assertEquals(1, raffles.progress(raffle).get("paid"));
  }

  @Test
  void rollbackRestoresMockRepository() {
    String id = UUID.randomUUID().toString();
    assertThrows(
        IllegalArgumentException.class,
        () ->
            db.transaction(
                () -> {
                  db.save("test", id, "value");
                  throw new IllegalArgumentException();
                }));
    assertTrue(db.find("test", id, String.class).isEmpty());
  }

  @Test
  void drawUsesPaidNumbersAndPublishesOnce() {
    Order o = create(45);
    orders.confirm(o.payment.providerChargeId, "draw-" + o.id);
    raffle.status = "CLOSED";
    raffles.save(raffle);
    Draw input = new Draw("1234", List.of("12345", "23456", "34567", "45678", "56789"));
    assertEquals(45, draws.draw(raffle.id, input, false).get("winningNumber"));
    assertEquals("CLOSED", raffles.get(raffle.id).status);
    draws.draw(raffle.id, input, true);
    assertEquals("DRAWN", raffles.get(raffle.id).status);
    assertThrows(ResponseStatusException.class, () -> draws.draw(raffle.id, input, true));
  }

  @Test
  void numbersGridKeepsFrontendEncoding() {
    create(3);
    assertEquals("00010", raffles.numbers(raffle.slug, 0, 5).get("statuses"));
  }

  @Test
  void validatesCpf() {
    assertTrue(BuyerService.validCpf("52998224725"));
    assertFalse(BuyerService.validCpf("11111111111"));
    assertFalse(BuyerService.validCpf("52998224724"));
  }

  @Test
  void failedGatewayKeepsDurableReservationForRetry() {
    var fail = new java.util.concurrent.atomic.AtomicBoolean(true);
    PaymentGateway unreliable =
        new PaymentGateway() {
          public String name() {
            return "FAKE";
          }

          public Payment charge(Order order, Buyer buyer, String description) {
            if (fail.getAndSet(false)) throw new IllegalStateException("Timeout");
            return payment.charge(order, buyer, description);
          }
        };
    var service = new OrderService(db, raffles, buyers, settings, unreliable, images);
    String key = UUID.randomUUID().toString();
    assertThrows(IllegalStateException.class, () -> service.create(input(32, key), buyer));
    var stored =
        orders.all().stream().filter(o -> o.idempotencyKey.equals(key)).findFirst().orElseThrow();
    assertNull(stored.payment);
    assertEquals("PENDING", stored.status);
    Order recovered = service.create(input(32, key), buyer);
    assertEquals(stored.id, recovered.id);
    assertNotNull(recovered.payment);
  }

  @Test
  void checkoutHttpFlowKeepsFrontendContract() throws Exception {
    var session = new MockHttpSession();
    session.setAttribute("buyerId", buyer.id);
    String body =
        "{\"raffleSlug\":\""
            + raffle.slug
            + "\",\"numbers\":[31],\"idempotencyKey\":\""
            + UUID.randomUUID()
            + "\"}";
    var response =
        mvc.perform(
                post("/api/orders")
                    .session(session)
                    .header("Origin", "http://localhost:5173")
                    .contentType("application/json")
                    .content(body))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.payment.canSimulate").value(true))
            .andExpect(jsonPath("$.numbers[0]").value(31))
            .andReturn();
    String id =
        new tools.jackson.databind.json.JsonMapper()
            .readTree(response.getResponse().getContentAsString())
            .get("id")
            .asText();
    mvc.perform(
            post("/api/orders/" + id + "/simulate-payment")
                .session(session)
                .header("Origin", "http://localhost:5173"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.order.status").value("PAID"))
        .andExpect(jsonPath("$.order.payment.pixCopyPaste").isEmpty());
    mvc.perform(get("/api/buyer/orders").session(session))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.orders[0].status").value("PAID"));
    mvc.perform(post("/api/orders").contentType("application/json").content("{\"unknown\":true}"))
        .andExpect(status().isBadRequest());
  }

  @Test
  void unauthenticatedAdminIsRejected() throws Exception {
    mvc.perform(get("/api/admin/raffles")).andExpect(status().isUnauthorized());
    mvc.perform(get("/api/health"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("ok"));
  }

  @Test
  void loginPersistsAdminSessionAndRejectsForeignOrigin() throws Exception {
    var result =
        mvc.perform(
                post("/api/auth/login")
                    .header("Origin", "http://localhost:5173")
                    .contentType("application/json")
                    .content("{\"email\":\"admin@rifas.local\",\"password\":\"admin-dev-123456\"}"))
            .andExpect(status().isOk())
            .andReturn();
    var session = (MockHttpSession) result.getRequest().getSession();
    mvc.perform(get("/api/admin/raffles").session(session)).andExpect(status().isOk());
    mvc.perform(
            post("/api/admin/raffles/" + raffle.id + "/close")
                .session(session)
                .header("Origin", "https://evil.example"))
        .andExpect(status().isForbidden());
  }

  @Test
  void rejectsInvalidOrUnknownInput() throws Exception {
    mvc.perform(
            post("/api/orders")
                .contentType("application/json")
                .content("{\"raffleSlug\":\"x\",\"quantity\":-1,\"idempotencyKey\":\"k\"}"))
        .andExpect(status().isBadRequest());
  }

  @Test
  void reportExportsValidXlsxAndEscapesCsvFormulas() throws Exception {
    buyer.name = "=1+1";
    db.save("buyer", buyer.id, buyer);
    create(20);
    var report = reports.read("orders", Map.of("raffleId", raffle.id), false);
    var csv = new java.io.ByteArrayOutputStream();
    reports.export(report, "csv", csv);
    assertTrue(csv.toString(java.nio.charset.StandardCharsets.UTF_8).contains("'=1+1"));
    var xlsx = new java.io.ByteArrayOutputStream();
    reports.export(report, "xlsx", xlsx);
    try (var workbook =
        new org.apache.poi.xssf.usermodel.XSSFWorkbook(
            new java.io.ByteArrayInputStream(xlsx.toByteArray()))) {
      assertEquals(2, workbook.getSheetAt(0).getPhysicalNumberOfRows());
      assertEquals("=1+1", workbook.getSheetAt(0).getRow(1).getCell(4).getStringCellValue());
    }
  }
}
