import { Logger } from '@nestjs/common';

// Testes não poluem a saída com logs da aplicação.
Logger.overrideLogger(false);
