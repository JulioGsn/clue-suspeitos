import { Controller, Get, Post, Body, Delete, Param, HttpCode, Patch } from '@nestjs/common';
import { TemasService } from './temas.service';
import { CreateTemaDto } from './dto/create-tema.dto';
import { UpdateTemaDto } from './dto/update-tema.dto';

@Controller('temas')
export class TemasController {
  constructor(private readonly temasService: TemasService) {}

  @Get()
  async list() {
    return this.temasService.findAll();
  }

  @Post()
  async create(@Body() createTemaDto: CreateTemaDto) {
    return this.temasService.create(createTemaDto.nome, createTemaDto.donoId, createTemaDto.visibilidade);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateTemaDto: UpdateTemaDto) {
    return this.temasService.update(id, updateTemaDto as any);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id') id: string) {
    await this.temasService.remove(id);
    return;
  }
}
