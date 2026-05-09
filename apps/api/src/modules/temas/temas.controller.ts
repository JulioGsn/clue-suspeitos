import { Controller, Get, Post, Body, Delete, Param, HttpCode, Patch } from '@nestjs/common';
import { TemasService } from './temas.service';

@Controller('temas')
export class TemasController {
  constructor(private readonly temasService: TemasService) {}

  @Get()
  async list() {
    return this.temasService.findAll();
  }

  @Post()
  async create(@Body() body: { nome: string; donoId?: string; visibilidade?: 'PUBLIC' | 'PRIVATE' }) {
    return this.temasService.create(body.nome, body.donoId, body.visibilidade);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() body: { nome?: string; visibilidade?: 'PUBLIC' | 'PRIVATE' }) {
    return this.temasService.update(id, body as any);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id') id: string) {
    await this.temasService.remove(id);
    return;
  }
}
