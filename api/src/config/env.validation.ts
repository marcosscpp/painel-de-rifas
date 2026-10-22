import { plainToInstance, Transform } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  Min,
  MinLength,
  validateSync,
} from 'class-validator';

export enum NodeEnv {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

const toInt = ({ value }: { value: unknown }) =>
  value === undefined || value === '' ? undefined : Number(value);

// Variáveis lidas no boot. Se algo obrigatório faltar ou estiver inválido,
// a API nem sobe (melhor falhar no deploy do que em produção às 3h da manhã).
export class EnvVars {
  @IsEnum(NodeEnv)
  NODE_ENV: NodeEnv = NodeEnv.Development;

  @Transform(toInt)
  @IsInt()
  PORT = 3000;

  @IsString()
  DATABASE_URL: string;

  @Transform(toInt)
  @IsInt()
  @Min(2)
  @Max(200)
  DB_POOL_SIZE = 20;

  @IsString()
  @MinLength(32, { message: 'JWT_SECRET precisa de pelo menos 32 caracteres' })
  JWT_SECRET: string;

  // Chaves dos dados pessoais (CPF, celular, e-mail, nascimento, endereço). Cada chave tem
  // 32 bytes em base64 (openssl rand -base64 32). Formato "1:<chave>,2:<chave>": grava com a
  // versão mais alta e lê todas; ao subir, a API recifra o que estiver com chave antiga.
  // Perder as chaves = perder os dados. Guardar fora do servidor.
  @IsString()
  PII_KEYS: string;

  // Chave do HMAC usado para buscar por CPF/celular/e-mail. Não muda depois de definida.
  @IsString()
  PII_INDEX_KEY: string;

  // Duração da sessão do admin, em minutos.
  @Transform(toInt)
  @IsInt()
  @Min(5)
  @Max(60 * 24)
  SESSION_TTL_MINUTES = 480;

  @IsString()
  CORS_ORIGINS = 'http://localhost:5173';

  // Quantos proxies reversos há na frente da API (Caddy = 1). Usado para pegar o IP real.
  @Transform(toInt)
  @IsInt()
  @Min(0)
  TRUST_PROXY = 1;

  @IsUrl({ require_tld: false, require_protocol: true })
  S3_ENDPOINT: string;

  @IsString()
  S3_PUBLIC_URL: string;

  @IsString()
  S3_REGION = 'us-east-1';

  @IsString()
  S3_BUCKET: string;

  @IsString()
  S3_ACCESS_KEY: string;

  @IsString()
  S3_SECRET_KEY: string;

  @IsIn(['FAKE', 'ASAAS', 'IUGU'])
  PAYMENT_PROVIDER = 'FAKE';

  @IsOptional()
  @IsString()
  PAYMENT_API_KEY?: string;

  @IsOptional()
  @IsString()
  PAYMENT_WEBHOOK_TOKEN?: string;

  // Base da API do gateway. Asaas: https://api-sandbox.asaas.com/v3 (teste) ou https://api.asaas.com/v3.
  @IsOptional()
  @IsUrl({ require_tld: false, require_protocol: true })
  PAYMENT_BASE_URL?: string;

  @Transform(toInt)
  @IsInt()
  @Min(0)
  PIX_FEE_CENTS = 199;

  @Transform(toInt)
  @IsInt()
  @Min(1)
  @Max(120)
  RESERVATION_MINUTES = 15;

  // Idade mínima do comprador (rifa: 18; título de capitalização costuma usar 16).
  @Transform(toInt)
  @IsInt()
  @Min(16)
  @Max(21)
  MIN_BUYER_AGE = 18;

  // Por quantos dias o site lembra o comprador ("Comprando como...").
  @Transform(toInt)
  @IsInt()
  @Min(1)
  @Max(365)
  BUYER_SESSION_DAYS = 90;
}

export function validateEnv(raw: Record<string, unknown>): EnvVars {
  const env = plainToInstance(EnvVars, raw, { exposeDefaultValues: true });
  const errors = validateSync(env, { skipMissingProperties: false });

  if (errors.length) {
    const msg = errors
      .map((e) => `${e.property}: ${Object.values(e.constraints ?? {}).join(', ')}`)
      .join('\n  ');
    throw new Error(`Variáveis de ambiente inválidas:\n  ${msg}`);
  }
  if (env.PAYMENT_PROVIDER !== 'FAKE' && !env.PAYMENT_API_KEY) {
    throw new Error(`PAYMENT_API_KEY obrigatório com PAYMENT_PROVIDER=${env.PAYMENT_PROVIDER}`);
  }
  if (env.PAYMENT_PROVIDER === 'IUGU') {
    throw new Error('PAYMENT_PROVIDER=IUGU ainda não implementado');
  }
  if (env.NODE_ENV === NodeEnv.Production) {
    if (env.PAYMENT_PROVIDER === 'FAKE') {
      throw new Error('PAYMENT_PROVIDER=FAKE não é permitido em produção');
    }
    if (!env.PAYMENT_WEBHOOK_TOKEN || env.PAYMENT_WEBHOOK_TOKEN.length < 24) {
      throw new Error('PAYMENT_WEBHOOK_TOKEN obrigatório (24+ caracteres) em produção');
    }
  }

  return env;
}
