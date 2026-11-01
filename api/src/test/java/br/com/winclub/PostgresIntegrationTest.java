package br.com.winclub;

import static org.junit.jupiter.api.Assertions.*;

import br.com.winclub.integration.*;
import br.com.winclub.model.Models.Buyer;
import br.com.winclub.repository.*;
import java.util.*;
import java.util.concurrent.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

/** Runs against an isolated PostgreSQL supplied by CI or the developer. */
@SpringBootTest(
    properties = {
      "app.admin-email=test@example.com",
      "app.admin-password=test-only-password-123456",
      "app.pii-key=AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
      "app.payment.api-key=test-key",
      "app.payment.webhook-token=test-webhook-token-1234567890",
      "app.storage.access-key=test",
      "app.storage.secret-key=test-secret"
    })
@ActiveProfiles("real")
@EnabledIfEnvironmentVariable(named = "RIFAS_TEST_JDBC_URL", matches = ".+")
class PostgresIntegrationTest {
  @Autowired DocumentRepository db;
  @Autowired JdbcTemplate jdbc;
  @Autowired PaymentGateway gateway;
  @Autowired ImageStorage storage;

  @DynamicPropertySource
  static void properties(DynamicPropertyRegistry registry) {
    registry.add("spring.datasource.url", () -> System.getenv("RIFAS_TEST_JDBC_URL"));
    registry.add(
        "spring.datasource.username",
        () -> System.getenv().getOrDefault("RIFAS_TEST_DB_USER", "rifas"));
    registry.add(
        "spring.datasource.password",
        () -> System.getenv().getOrDefault("RIFAS_TEST_DB_PASSWORD", ""));
  }

  @Test
  void selectsRealAdaptersAndRunsFlyway() {
    assertInstanceOf(PostgresDocumentRepository.class, db);
    assertInstanceOf(AsaasPaymentGateway.class, gateway);
    assertInstanceOf(S3ImageStorage.class, storage);
    assertTrue(db.healthy());
    assertEquals(
        1,
        jdbc.queryForObject(
            "select count(*) from winclub.flyway_schema_history where success and version='1'",
            Integer.class));
  }

  @Test
  void buyerDataIsEncryptedAtRestAndRoundTrips() {
    Buyer b = new Buyer();
    b.name = "Maria Silva";
    b.cpf = "52998224725";
    db.save("buyer", b.id, b);
    String payload =
        jdbc.queryForObject(
            "select payload::text from winclub.documents where kind='buyer' and id=?",
            String.class,
            b.id);
    assertFalse(payload.contains(b.cpf));
    assertFalse(payload.contains(b.name));
    assertEquals(b.cpf, db.find("buyer", b.id, Buyer.class).orElseThrow().cpf);
  }

  @Test
  void transactionRollsBackOnFailure() {
    String id = UUID.randomUUID().toString();
    assertThrows(
        IllegalStateException.class,
        () ->
            db.transaction(
                () -> {
                  db.save("test", id, "rollback");
                  throw new IllegalStateException();
                }));
    assertTrue(db.find("test", id, String.class).isEmpty());
  }

  @Test
  void advisoryLockSerializesConcurrentTransactions() throws Exception {
    String id = UUID.randomUUID().toString();
    db.save("counter", id, 0);
    try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
      List<Future<?>> jobs = new ArrayList<>();
      for (int i = 0; i < 30; i++)
        jobs.add(
            executor.submit(
                () ->
                    db.transaction(
                        () -> {
                          int current = db.find("counter", id, Integer.class).orElseThrow();
                          db.save("counter", id, current + 1);
                          return null;
                        })));
      for (var job : jobs) job.get();
    }
    assertEquals(30, db.find("counter", id, Integer.class).orElseThrow());
  }
}
