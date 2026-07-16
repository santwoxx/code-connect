const text = `3011.2.3.14 CONJ 06 CAD VERONA 1,40X75 060570 - TC 26
BCO LISO GRANITO OCRE
94032010 0/00 6101 UND 5,0000 337,6160 1.688,08 0,00 1.688,08 118,17 54,86 7,00 3,25
3011.60.4.14 CONJ 06 CAD VERONA 1,40X75 060570 - TC 83
PTO MART GRANITO OCRE
94032010 0/00 6101 UND 4,0000 375,1300 1.500,52 0,00 1.500,52 105,04 48,77 7,00 3,25
3011.68.1.14 CONJ 06 CAD VERONA 1,40X75 060570 - TC 91
PTA MART GRANITO OCRE
94032010 0/00 6101 UND 4,0000 375,1300 1.500,52 0,00 1.500,52 105,04 48,77 7,00 3,25
5422.60.4.31 CONJ 04 CAD MARSALA 1,00X60 260680 - TC
83 PTO MART TOPAZIO
94032010 0/00 6101 UND 5,0000 190,1060 950,53 0,00 950,53 66,54 30,89 7,00 3,25`;

function parseMultilineAlterdata(text) {
  const lines = text.split('\n');
  const items = [];
  let currentItem = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Matches the NCM line: NCM (8 digits) | CST (0/00) | CFOP (4 digits) | Unit | Quantity | Cost
    const valuesMatch = line.match(/^(\d{8})\s+\d{1,3}\/\d{2,3}\s+\d{4}\s+([A-Z]+)\s+([\d.,]+)\s+([\d.,]+)\s+([\d.,]+)/);
    if (valuesMatch) {
      if (currentItem) {
        currentItem.ncm = valuesMatch[1];
        currentItem.unit = valuesMatch[2];
        currentItem.quantity = parseFloat(valuesMatch[3].replace(/\./g, '').replace(',', '.'));
        currentItem.costPrice = parseFloat(valuesMatch[4].replace(/\./g, '').replace(',', '.'));
        // currentItem.totalPrice = parseFloat(valuesMatch[5].replace(/\./g, '').replace(',', '.'));
        items.push(currentItem);
        currentItem = null;
      }
    } else {
      if (!currentItem) {
        // First line of a new item
        // e.g., "3011.2.3.14 CONJ 06 CAD VERONA..."
        const codeMatch = line.match(/^([\d.]+)\s+(.*)/);
        if (codeMatch) {
          currentItem = {
            sku: codeMatch[1],
            name: codeMatch[2]
          };
        } else {
           // Fallback
           currentItem = { sku: 'UNKNOWN', name: line };
        }
      } else {
        // Continuation of description
        currentItem.name += ' ' + line;
      }
    }
  }
  return items;
}

console.log(parseMultilineAlterdata(text));
