import { Controller, Get, Post, Body, Delete, Param, HttpCode } from '@nestjs/common';
import { TemasService } from './temas.service';

@Controller('temas')
export class TemasController {
  constructor(private readonly temasService: TemasService) {}

  @Get()
  async list() {
    return this.temasService.findAll();
  }

  @Post()
  async create(@Body() body: { nome: string; donoId?: string }) {
    return this.temasService.create(body.nome, body.donoId);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id') id: string) {
    await this.temasService.remove(id);
    return;
  }
}
