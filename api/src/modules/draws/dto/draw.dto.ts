import { ArrayMaxSize, ArrayMinSize, IsArray, Matches } from 'class-validator';

// Resultado da Loteria Federal: número do concurso e os 5 prêmios (5 dígitos cada, na ordem).
export class DrawDto {
  @Matches(/^\d{1,6}$/, { message: 'Concurso: só números' })
  contest: string;

  @IsArray()
  @ArrayMinSize(5)
  @ArrayMaxSize(5)
  @Matches(/^\d{5}$/, { each: true, message: 'Cada prêmio tem 5 dígitos' })
  prizes: string[];
}
