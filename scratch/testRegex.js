const text = `
DADOS DOS PRODUTOS / SERVIÇOS
CÓDIGO PRODUTO DESCRIÇÃO DO PRODUTO / SERVIÇO NCM/SH O/CST CFOP UN QUANT VALOR
UNIT
VALOR
TOTAL
VALOR
DESC
B.CÁLC
ICMS
VALOR
ICMS
VALOR
IPI
ALÍQ.
ICMS
ALÍQ.
IPI
3011.2.3.14 CONJ 06 CAD VERONA 1,40X75 060570 - TC 26
BCO LISO GRANITO OCRE
94032010 0/00 6101 UND 5,0000 337,6160 1.688,08 0,00 1.688,08 118,17 54,86 7,00 3,25
3011.60.4.14 CONJ 06 CAD VERONA 1,40X75 060570 - TC 83
PTO MART GRANITO OCRE
94032010 0/00 6101 UND 4,0000 375,1300 1.500,52 0,00 1.500,52 105,04 48,77 7,00 3,25
3011.68.1.14 CONJ 06 CAD VERONA 1,40X75 060570 - TC 91
PTA MART GRANITO OCRE
94032010 0/00 6101 UND 4,0000 375,1300 1.500,52 0,00 1.500,52 105,04 48,77 7,00 3,25
3003.68.1.14 CONJ 04 CAD VERONA 1,20X75 060570 - TC 91
PTA MART GRANITO OCRE
94032010 0/00 6101 UND 5,0000 253,8200 1.269,10 0,00 1.269,10 88,84 41,25 7,00 3,25
`;

// Replace all newlines with a single space to make the text contiguous
const singleLineText = text.replace(/\n/g, ' ');

// Regex matches:
// 1: SKU (\S+)
// 2: Desc ([\s\S]+?)
// 3: NCM (\d{8})
// 4: CST/CSOSN ([^\s]+)
// 5: CFOP (\d{4})
// 6: UN ([A-Za-z]+)
// 7: QUANT ([\d.,]+)
// 8: V.UNIT ([\d.,]+)
// 9: V.TOTAL ([\d.,]+)
// 10: V.DESC ([\d.,]+)
// 11: BC.ICMS ([\d.,]+)
// 12: V.ICMS ([\d.,]+)
// 13: V.IPI ([\d.,]+)
// 14: ALIQ.ICMS ([\d.,]+)
// 15: ALIQ.IPI ([\d.,]+)
const regex = /(\S+)\s+([\s\S]+?)\s+(\d{8})\s+([^\s]+)\s+(\d{4})\s+([A-Za-z]+)\s+([\d.,]+)\s+([\d.,]+)\s+([\d.,]+)\s+([\d.,]+)\s+([\d.,]+)\s+([\d.,]+)\s+([\d.,]+)\s+([\d.,]+)\s+([\d.,]+)/g;

let match;
let count = 0;
while ((match = regex.exec(singleLineText)) !== null) {
  count++;
  console.log(`\nMatch ${count}:`);
  console.log(`SKU: ${match[1]}`);
  console.log(`Desc: ${match[2]}`);
  console.log(`NCM: ${match[3]}`);
  console.log(`CST: ${match[4]}`);
  console.log(`CFOP: ${match[5]}`);
  console.log(`UN: ${match[6]}`);
  console.log(`QUANT: ${match[7]}`);
  console.log(`V.UNIT: ${match[8]}`);
  console.log(`V.TOTAL: ${match[9]}`);
  console.log(`V.IPI: ${match[13]}`);
}
console.log(`Total items parsed: ${count}`);
