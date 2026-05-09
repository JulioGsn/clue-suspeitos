import { Controller, Get, Post, Body, Query, Delete, Param, HttpCode, Patch } from '@nestjs/common';
import { CartasService } from './cartas.service';
import { CreateCartaDto } from './dto/create-carta.dto';
import { UpdateCartaDto } from './dto/update-carta.dto';

@Controller('cartas')
export class CartasController {
  constructor(private readonly cartasService: CartasService) {}

  @Get()
  async list(@Query('temaId') temaId?: string) {
    return this.cartasService.findAll(temaId);
  }

  @Post()
  async create(@Body() createCartaDto: CreateCartaDto) {
    return this.cartasService.create(createCartaDto as any);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id') id: string) {
    await this.cartasService.remove(id);
    return;
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateCartaDto: UpdateCartaDto) {
    return this.cartasService.update(id, updateCartaDto as any);
  }
}
