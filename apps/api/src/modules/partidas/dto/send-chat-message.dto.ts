import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class SendChatMessageDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500, { message: 'A mensagem não pode exceder 500 caracteres' })
  text: string;
}
