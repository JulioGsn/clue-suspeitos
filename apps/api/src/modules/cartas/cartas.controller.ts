import { Controller, Get, Post, Body, Query, Delete, Param, HttpCode, Patch } from '@nestjs/common';
import { CartasService } from './cartas.service';

@Controller('cartas')
export class CartasController {
  constructor(private readonly cartasService: CartasService) {}

  @Get()
  async list(@Query('temaId') temaId?: string) {
    return this.cartasService.findAll(temaId);
  }

  @Post()
  async create(@Body() body: { nome: string; tipo: string; imageUrl: string; temaId: string }) {
    return this.cartasService.create(body as any);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id') id: string) {
    await this.cartasService.remove(id);
    return;
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() body: { nome?: string; tipo?: string; imageUrl?: string }) {
    return this.cartasService.update(id, body as any);
  }
}
