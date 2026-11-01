import { PassThrough } from 'node:stream';
import { inflateRawSync } from 'node:zlib';
import { brtWallClock, csvValue, type Cell, type ReportColumn, writeCsv, writeXlsx } from './report-writers.js';
import { columnName, xmlText } from './xlsx-stream.js';

const columns: ReportColumn[] = [
  { key: 'day', label: 'Dia', type: 'date' },
  { key: 'name', label: 'Comprador', type: 'text' },
  { key: 'qty', label: 'Números', type: 'int', total: true },
  { key: 'revenue', label: 'Faturamento', type: 'money', total: true },
  { key: 'paidAt', label: 'Pago em', type: 'datetime' },
];
const rows: Cell[][] = [
  ['2026-10-01', 'Maria; "Mari"', 10, 2500, new Date('2026-10-01T15:30:00Z')],
  ['2026-10-02', '=HYPERLINK("x")', 5, 1250, null],
];

async function* iter(list: Cell[][]) {
  for (const r of list) yield r;
}

async function collect(write: (out: PassThrough) => Promise<void>) {
  const out = new PassThrough();
  const chunks: Buffer[] = [];
  out.on('data', (c: Buffer) => chunks.push(c));
  await write(out);
  return Buffer.concat(chunks);
}

// Lê os arquivos de um zip pelo diretório central (o que um leitor de XLSX faz).
function unzip(buf: Buffer) {
  const end = buf.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  const count = buf.readUInt16LE(end + 10);
  let p = buf.readUInt32LE(end + 16);
  const files: Record<string, string> = {};
  for (let i = 0; i < count; i++) {
    const size = buf.readUInt32LE(p + 20);
    const nameLen = buf.readUInt16LE(p + 28);
    const offset = buf.readUInt32LE(p + 42);
    const name = buf.subarray(p + 46, p + 46 + nameLen).toString();
    const local = offset + 30 + buf.readUInt16LE(offset + 26) + buf.readUInt16LE(offset + 28);
    files[name] = inflateRawSync(buf.subarray(local, local + size)).toString();
    p += 46 + nameLen + buf.readUInt16LE(p + 30) + buf.readUInt16LE(p + 32);
  }
  return files;
}

describe('report writers', () => {
  it('formata células do CSV para o Excel em português', () => {
    expect(csvValue(123456, 'money')).toBe('1234,56');
    expect(csvValue(0.125, 'percent')).toBe('12,5%');
    expect(csvValue('2026-10-01', 'date')).toBe('01/10/2026');
    expect(csvValue(new Date('2026-10-01T02:30:00Z'), 'datetime')).toBe('30/09/2026 23:30');
    expect(csvValue(null, 'money')).toBe('');
    expect(csvValue('+5511', 'text')).toBe("'+5511");
  });

  it('converte para o horário de Brasília', () => {
    expect(brtWallClock(new Date('2026-10-01T15:30:00Z')).toISOString()).toBe('2026-10-01T12:30:00.000Z');
  });

  it('CSV tem BOM, cabeçalho, escapes e linha de total', async () => {
    const csv = (await collect((out) => writeCsv(out, columns, iter(rows)))).toString();
    const lines = csv.split('\r\n');
    expect(lines[0]).toBe('﻿Dia;Comprador;Números;Faturamento;Pago em');
    expect(lines[1]).toBe('01/10/2026;"Maria; ""Mari""";10;25,00;01/10/2026 12:30');
    expect(lines[2]).toBe(`02/10/2026;"'=HYPERLINK(""x"")";5;12,50;`);
    expect(lines[3]).toBe('Total;;15;37,50;');
  });

  it('XLSX é um zip válido com números, datas e total', async () => {
    const files = unzip(await collect((out) => writeXlsx(out, 'Vendas por dia', columns, iter(rows))));
    expect(Object.keys(files)).toEqual(
      expect.arrayContaining(['[Content_Types].xml', 'xl/workbook.xml', 'xl/styles.xml', 'xl/worksheets/sheet1.xml']),
    );
    expect(files['xl/workbook.xml']).toContain('name="Vendas por dia"');
    const sheet = files['xl/worksheets/sheet1.xml'];
    expect(sheet).toContain('<row r="1">');
    expect(sheet).toContain('<c r="C2" s="2"><v>10</v></c>'); // inteiro com formato
    expect(sheet).toContain('<c r="D2" s="1"><v>25</v></c>'); // reais, não centavos
    expect(sheet).toContain('Maria; &quot;Mari&quot;'); // texto escapado como inlineStr
    expect(sheet).toContain('<c r="A2" s="4"><v>46296</v></c>'); // 01/10/2026 como data do Excel
    expect(sheet).toContain('<c r="D4" s="7"><v>37.5</v></c>'); // total em negrito
    expect(sheet.endsWith('</sheetData></worksheet>')).toBe(true);
  });

  it('para de ler linhas quando o cliente fecha a conexão', async () => {
    const out = new PassThrough();
    let produced = 0;
    async function* endless() {
      for (;;) {
        produced++;
        if (produced === 3) out.destroy();
        yield rows[0];
      }
    }
    await writeCsv(out, columns, endless());
    expect(produced).toBeLessThan(5);
  });

  it('helpers do XLSX', () => {
    expect([0, 25, 26, 27, 701].map(columnName)).toEqual(['A', 'Z', 'AA', 'AB', 'ZZ']);
    expect(xmlText('a<b>&"\u0001')).toBe('a&lt;b&gt;&amp;&quot;');
  });
});
