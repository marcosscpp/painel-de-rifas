import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

// Toda rota exige login por padrão; use @Public() para liberar.
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
