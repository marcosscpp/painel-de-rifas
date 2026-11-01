package br.com.winclub.integration;

import java.util.Map;

public interface PublicDataGateway {
  Map<String, Object> cep(String cep);

  Map<String, Object> federal(String contest);
}
