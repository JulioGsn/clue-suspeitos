import { TipoCarta } from '../cartas/entities/carta.entity';

export type CartaSeed = {
  nome: string;
  tipo: TipoCarta;
  imageUrl: string;
};

export const CARTAS_BASE_SEED: CartaSeed[] = [
  {
    nome: 'Srta. Scarlet',
    tipo: TipoCarta.SUSPEITO,
    imageUrl: '/uploads/cards/suspeito-scarlet.png',
  },
  {
    nome: 'Coronel Mostarda',
    tipo: TipoCarta.SUSPEITO,
    imageUrl: '/uploads/cards/suspeito-mostarda.png',
  },
  {
    nome: 'Sra. White',
    tipo: TipoCarta.SUSPEITO,
    imageUrl: '/uploads/cards/suspeito-white.png',
  },
  {
    nome: 'Sr. Green',
    tipo: TipoCarta.SUSPEITO,
    imageUrl: '/uploads/cards/suspeito-green.png',
  },
  {
    nome: 'Sra. Peacock',
    tipo: TipoCarta.SUSPEITO,
    imageUrl: '/uploads/cards/suspeito-peacock.png',
  },
  {
    nome: 'Prof. Plum',
    tipo: TipoCarta.SUSPEITO,
    imageUrl: '/uploads/cards/suspeito-plum.png',
  },
  {
    nome: 'Faca',
    tipo: TipoCarta.ARMA,
    imageUrl: '/uploads/cards/arma-faca.png',
  },
  {
    nome: 'Castical',
    tipo: TipoCarta.ARMA,
    imageUrl: '/uploads/cards/arma-castical.png',
  },
  {
    nome: 'Revolver',
    tipo: TipoCarta.ARMA,
    imageUrl: '/uploads/cards/arma-revolver.png',
  },
  {
    nome: 'Corda',
    tipo: TipoCarta.ARMA,
    imageUrl: '/uploads/cards/arma-corda.png',
  },
  {
    nome: 'Cano de Chumbo',
    tipo: TipoCarta.ARMA,
    imageUrl: '/uploads/cards/arma-cano-de-chumbo.png',
  },
  {
    nome: 'Chave Inglesa',
    tipo: TipoCarta.ARMA,
    imageUrl: '/uploads/cards/arma-chave-inglesa.png',
  },
  {
    nome: 'Cozinha',
    tipo: TipoCarta.LOCAL,
    imageUrl: '/uploads/cards/local-cozinha.png',
  },
  {
    nome: 'Sala de Jantar',
    tipo: TipoCarta.LOCAL,
    imageUrl: '/uploads/cards/local-sala-de-jantar.png',
  },
  {
    nome: 'Sala de Estar',
    tipo: TipoCarta.LOCAL,
    imageUrl: '/uploads/cards/local-sala-de-estar.png',
  },
  {
    nome: 'Sala de Jogos',
    tipo: TipoCarta.LOCAL,
    imageUrl: '/uploads/cards/local-sala-de-jogos.png',
  },
  {
    nome: 'Biblioteca',
    tipo: TipoCarta.LOCAL,
    imageUrl: '/uploads/cards/local-biblioteca.png',
  },
  {
    nome: 'Escritorio',
    tipo: TipoCarta.LOCAL,
    imageUrl: '/uploads/cards/local-escritorio.png',
  },
  {
    nome: 'Hall',
    tipo: TipoCarta.LOCAL,
    imageUrl: '/uploads/cards/local-hall.png',
  },
  {
    nome: 'Jardim de Inverno',
    tipo: TipoCarta.LOCAL,
    imageUrl: '/uploads/cards/local-jardim-de-inverno.png',
  },
  {
    nome: 'Sala de Musica',
    tipo: TipoCarta.LOCAL,
    imageUrl: '/uploads/cards/local-sala-de-musica.png',
  },
];
