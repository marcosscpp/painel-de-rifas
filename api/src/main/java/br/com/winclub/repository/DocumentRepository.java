package br.com.winclub.repository;

import java.util.*;
import java.util.function.Supplier;

/** Repository boundary shared by real persistence and deterministic local mocks. */
public interface DocumentRepository {
  <T> Optional<T> find(String kind, String id, Class<T> type);

  <T> List<T> list(String kind, Class<T> type);

  void save(String kind, String id, Object value);

  void delete(String kind, String id);

  <T> T transaction(Supplier<T> work);

  boolean healthy();
}
