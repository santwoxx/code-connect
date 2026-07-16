/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const CSV_HEADER_ALIASES = {
  sku: ['sku', 'codigo', 'id', 'reference', 'ref'],
  name: ['nome', 'name', 'produto', 'titulo', 'item'],
  price: ['preco_venda', 'preco', 'venda', 'price', 'valor', 'unitario'],
  cost: ['preco_custo', 'custo', 'cost', 'compra'],
  stock: ['estoque', 'quantidade', 'qtd', 'currentstock', 'stock', 'saldo'],
  minStock: ['minimo', 'minstock', 'estoque_minimo', 'alerta'],
  category: ['categoria', 'category', 'grupo', 'secao'],
  description: ['descricao', 'description', 'obs', 'detalhe'],
  location: ['localizacao', 'location', 'prateleira', 'corredor']
};
