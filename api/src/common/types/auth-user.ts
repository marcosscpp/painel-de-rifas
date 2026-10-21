import type { Role } from '../../generated/prisma/client.js';

export type AuthUser = { id: string; role: Role };

// Conteúdo do JWT. `v` é a versão da sessão: incrementar no usuário derruba todos os tokens dele.
export type JwtPayload = { sub: string; role: Role; v: number };

export const SESSION_COOKIE = 'rifas_session';
