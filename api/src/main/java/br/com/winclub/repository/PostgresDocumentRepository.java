package br.com.winclub.repository;

import br.com.winclub.model.Models.Buyer;
import br.com.winclub.security.PiiCipher;
import java.util.*;
import java.util.function.Supplier;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.support.TransactionTemplate;
import tools.jackson.databind.json.JsonMapper;

@Repository
@Profile("real & !mock")
public class PostgresDocumentRepository implements DocumentRepository {
  private final JdbcTemplate jdbc;
  private final TransactionTemplate transactions;
  private final JsonMapper json;
  private final PiiCipher cipher;

  public PostgresDocumentRepository(
      JdbcTemplate jdbc, TransactionTemplate transactions, JsonMapper json, PiiCipher cipher) {
    this.jdbc = jdbc;
    this.transactions = transactions;
    this.json = json;
    this.cipher = cipher;
  }

  public <T> Optional<T> find(String kind, String id, Class<T> type) {
    return jdbc
        .query(
            "select payload::text from winclub.documents where kind=? and id=?",
            (rs, n) -> decode(rs.getString(1), type),
            kind,
            id)
        .stream()
        .findFirst();
  }

  public <T> List<T> list(String kind, Class<T> type) {
    return jdbc.query(
        "select payload::text from winclub.documents where kind=? order by id",
        (rs, n) -> decode(rs.getString(1), type),
        kind);
  }

  private <T> T decode(String value, Class<T> type) {
    if (type == Buyer.class) value = cipher.decrypt(json.readTree(value).get("encrypted").asText());
    return json.readValue(value, type);
  }

  public void save(String kind, String id, Object value) {
    String payload = json.writeValueAsString(value);
    if (value instanceof Buyer)
      payload = json.writeValueAsString(Map.of("encrypted", cipher.encrypt(payload)));
    jdbc.update(
        "insert into winclub.documents(kind,id,payload) values (?,?,?::jsonb) on conflict(kind,id)"
            + " do update set payload=excluded.payload",
        kind,
        id,
        payload);
  }

  public void delete(String kind, String id) {
    jdbc.update("delete from winclub.documents where kind=? and id=?", kind, id);
  }

  public <T> T transaction(Supplier<T> work) {
    return transactions.execute(
        status -> {
          // Shared across JVMs; protects reservations, idempotency and state transitions.
          jdbc.execute("select pg_advisory_xact_lock(781923456)");
          return work.get();
        });
  }

  public boolean healthy() {
    try {
      return Integer.valueOf(1).equals(jdbc.queryForObject("select 1", Integer.class));
    } catch (RuntimeException ex) {
      return false;
    }
  }
}
