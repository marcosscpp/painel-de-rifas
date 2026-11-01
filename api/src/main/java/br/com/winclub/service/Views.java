package br.com.winclub.service;

import java.util.*;

/** Linked maps allow optional JSON fields while preserving the existing HTTP contract. */
public final class Views {
  private Views() {}

  public static Map<String, Object> map(Object... entries) {
    var out = new LinkedHashMap<String, Object>();
    for (int i = 0; i < entries.length; i += 2) out.put((String) entries[i], entries[i + 1]);
    return out;
  }

  public static Map<String, Object> page(List<?> items, int page, int size) {
    if (page < 1 || size < 1 || size > 100)
      throw new IllegalArgumentException("Paginação inválida");
    long start = (long) (page - 1) * size;
    return map(
        "items",
        items.subList(
            (int) Math.min(start, items.size()), (int) Math.min(start + size, items.size())),
        "total",
        items.size(),
        "page",
        page,
        "pageSize",
        size);
  }
}
