import { Controller, Get } from '@nestjs/common';
import { TemasService } from './temas.service';

@Controller('temas')
export class TemasController {
  constructor(private readonly temasService: TemasService) {}

  @Get()
  async list() {
    return this.temasService.findAll();
  }
}
