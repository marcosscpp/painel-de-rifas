package br.com.winclub.repository;

import java.util.*;
import java.util.concurrent.locks.ReentrantLock;
import java.util.function.Supplier;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Repository;
import tools.jackson.databind.json.JsonMapper;

@Repository
@Profile("mock & !real")
public class MockDocumentRepository implements DocumentRepository {
  private final Map<String, String> documents = new LinkedHashMap<>();
  private final ReentrantLock lock = new ReentrantLock(true);
  private final JsonMapper json;

  public MockDocumentRepository(JsonMapper json) {
    this.json = json;
  }

  public <T> Optional<T> find(String kind, String id, Class<T> type) {
    lock.lock();
    try {
      return Optional.ofNullable(documents.get(kind + ":" + id)).map(s -> json.readValue(s, type));
    } finally {
      lock.unlock();
    }
  }

  public <T> List<T> list(String kind, Class<T> type) {
    lock.lock();
    try {
      return documents.entrySet().stream()
          .filter(e -> e.getKey().startsWith(kind + ":"))
          .map(e -> json.readValue(e.getValue(), type))
          .toList();
    } finally {
      lock.unlock();
    }
  }

  public void save(String kind, String id, Object value) {
    lock.lock();
    try {
      documents.put(kind + ":" + id, json.writeValueAsString(value));
    } finally {
      lock.unlock();
    }
  }

  public void delete(String kind, String id) {
    lock.lock();
    try {
      documents.remove(kind + ":" + id);
    } finally {
      lock.unlock();
    }
  }

  public <T> T transaction(Supplier<T> work) {
    lock.lock();
    var snapshot = new LinkedHashMap<>(documents);
    try {
      return work.get();
    } catch (RuntimeException | Error ex) {
      documents.clear();
      documents.putAll(snapshot);
      throw ex;
    } finally {
      lock.unlock();
    }
  }

  public boolean healthy() {
    return true;
  }
}
