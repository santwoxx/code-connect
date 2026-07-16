/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Product, Payment, StockTransaction, Category, Delivery } from './types';

export const INITIAL_CATEGORIES: Category[] = [
  { id: 'cat-1', name: 'Cozinha', description: 'Armário Aéreo, Balcão, Paneleiro, Cristaleira, Fruteira, Kit Cozinha' },
  { id: 'cat-2', name: 'Guarda-Roupa', description: 'Roupeiro, Guarda-Roupas' },
  { id: 'cat-3', name: 'Cômoda', description: 'Cômoda' },
  { id: 'cat-4', name: 'Sapateira', description: 'Sapateira' },
  { id: 'cat-5', name: 'Multiuso', description: 'Multiuso, Armário Multiuso' },
  { id: 'cat-6', name: 'Berço', description: 'Berço' },
  { id: 'cat-7', name: 'Quarto Infantil', description: 'Guarda-Roupas Infantil, Cômoda Infantil' },
  { id: 'cat-8', name: 'Cabeceira', description: 'Cabeceira, Cabeceira com Criado' },
  { id: 'cat-9', name: 'Colchão', description: 'Colchão, Ortopedic, Ortogan, Itapuã' },
  { id: 'cat-10', name: 'Base Box', description: 'Base Box, Base Baú' },
  { id: 'cat-11', name: 'Estofado', description: 'Sofá, Estofado, Retrátil, Canto' },
  { id: 'cat-12', name: 'Rack / Home', description: 'Home Suspenso, Bancada TV, Painel TV, Rack' },
  { id: 'cat-13', name: 'Painel para TV', description: 'Painel, Painel Ripado' },
  { id: 'cat-14', name: 'Bancada', description: 'Bancada' },
  { id: 'cat-15', name: 'Buffet', description: 'Buffet' },
  { id: 'cat-16', name: 'Aparador', description: 'Aparador' },
  { id: 'cat-17', name: 'Mesa de Jantar', description: 'Mesa, Conjunto Mesa' },
  { id: 'cat-18', name: 'Cadeira', description: 'Cadeira' },
  { id: 'cat-19', name: 'Sala de Jantar', description: 'Kit Mesa + Cadeiras' },
  { id: 'cat-20', name: 'Eletrodomésticos', description: 'Fogão, Cooktop, Lavadora, Centrífuga, Purificador, Bebedouro, Depurador' },
  { id: 'cat-21', name: 'Eletroportáteis', description: 'Air Fryer, Ferro, Extrator, Batedeira, Liquidificador, Ventilador' },
  { id: 'cat-22', name: 'Áudio', description: 'Caixa Amplificada' },
  { id: 'cat-23', name: 'Utilidades Domésticas', description: 'Panela, Conjunto de Panelas, Panela de Pressão' },
  { id: 'cat-24', name: 'Lavanderia', description: 'Tábua de Passar' },
  { id: 'cat-25', name: 'Colchões e Camas', description: 'Kit Cama, Base, Colchão' },
  { id: 'cat-26', name: 'Escritório', description: 'Armário de Aço, Balcão de Aço' },
  { id: 'cat-27', name: 'Outros', description: 'Outros produtos e complementos' }
];
