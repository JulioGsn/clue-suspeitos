import { PartialType } from '@nestjs/swagger';
import { CreateCartaDto } from './create-carta.dto';

export class UpdateCartaDto extends PartialType(CreateCartaDto) {}
