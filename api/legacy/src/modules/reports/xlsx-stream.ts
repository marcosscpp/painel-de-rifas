import { once } from 'node:events';
import type { Writable } from 'node:stream';
import { crc32, createDeflateRaw } from 'node:zlib';

// Gerador de XLSX em streaming, sem dependência: um .xlsx é um zip de XMLs, e a planilha vai sendo
// comprimida e enviada linha a linha. Libs como a exceljs guardam a aba inteira até o fim (centenas
// de MB num relatório de 1 milhão de linhas); aqui a memória fica constante.
// Limite: sem ZIP64, cada arquivo interno tem até 4 GB descomprimido (~40 milhões de linhas).

export type XlsxStyle = 'text' | 'bold' | 'money' | 'int' | 'percent' | 'date' | 'datetime';
export type XlsxCell = { v: string | number | null; s?: XlsxStyle; bold?: boolean };

// Índices em cellXfs do styles.xml abaixo (normal, depois a mesma ordem em negrito).
const FORMATS: XlsxStyle[] = ['text', 'money', 'int', 'percent', 'date', 'datetime'];
const NUMFMT: Record<XlsxStyle, number> = { text: 0, bold: 0, money: 164, int: 3, percent: 167, date: 165, datetime: 166 };
const styleIndex = (s: XlsxStyle = 'text', bold = false) => {
  const i = FORMATS.indexOf(s === 'bold' ? 'text' : s);
  return bold || s === 'bold' ? i + FORMATS.length : i;
};

const STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<numFmts count="4"><numFmt numFmtId="164" formatCode="&quot;R$&quot; #,##0.00"/><numFmt numFmtId="165" formatCode="dd/mm/yyyy"/><numFmt numFmtId="166" formatCode="dd/mm/yyyy hh:mm"/><numFmt numFmtId="167" formatCode="0.0%"/></numFmts>
<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>
<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>
<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="${FORMATS.length * 2}">${[0, 1]
  .flatMap((font) => FORMATS.map((f) => `<xf numFmtId="${NUMFMT[f]}" fontId="${font}" fillId="0" borderId="0" xfId="0"${NUMFMT[f] || font ? ' applyNumberFormat="1" applyFont="1"' : ''}/>`))
  .join('')}</cellXfs>
</styleSheet>`;

const STATIC_PARTS = (sheetName: string): [string, string][] => [
  [
    '[Content_Types].xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`,
  ],
  [
    '_rels/.rels',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
  ],
  [
    'xl/workbook.xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${xmlText(sheetName)}" sheetId="1" r:id="rId1"/></sheets></workbook>`,
  ],
  [
    'xl/_rels/workbook.xml.rels',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
  ],
  ['xl/styles.xml', STYLES],
];

// Escapa para XML e remove caracteres de controle que deixam o arquivo inválido no Excel.
export function xmlText(s: string): string {
  return s
    // oxlint-disable-next-line no-control-regex -- remover os caracteres de controle é o objetivo
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Data do Excel: dias desde 30/12/1899, usando os campos UTC do Date.
export const excelSerial = (d: Date) => d.getTime() / 86_400_000 + 25_569;

// Letra da coluna (0 → A, 26 → AA).
export function columnName(i: number): string {
  let name = '';
  for (let n = i + 1; n > 0; n = Math.floor((n - 1) / 26)) name = String.fromCharCode(65 + ((n - 1) % 26)) + name;
  return name;
}

// Referência explícita (r="B7") em cada célula: alguns leitores de planilha exigem.
function cellXml(c: XlsxCell, ref: string): string {
  const s = styleIndex(c.s, c.bold);
  const attr = ` r="${ref}"${s ? ` s="${s}"` : ''}`;
  if (c.v == null || c.v === '') return `<c${attr}/>`;
  if (typeof c.v === 'number') return Number.isFinite(c.v) ? `<c${attr}><v>${c.v}</v></c>` : `<c${attr}/>`;
  return `<c${attr} t="inlineStr"><is><t xml:space="preserve">${xmlText(c.v)}</t></is></c>`;
}

// Hora e data no formato do MS-DOS, usadas nos cabeçalhos do zip.
function dosTime(d: Date) {
  const time = (d.getHours() << 11) | (d.getMinutes() << 5) | Math.floor(d.getSeconds() / 2);
  const date = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
  return { time, date };
}

type Entry = { name: Buffer; crc: number; size: number; compressed: number; offset: number };

class ZipStream {
  private offset = 0;
  private readonly entries: Entry[] = [];
  private readonly when = dosTime(new Date());

  constructor(private readonly out: Writable) {}

  get closed() {
    return this.out.destroyed;
  }

  // Espera um evento, mas desiste se o cliente fechar a conexão (evita ficar pendurado).
  private async wait(emitter: NodeJS.EventEmitter, event: string) {
    if (this.closed) return;
    const ac = new AbortController();
    const onClose = () => ac.abort();
    this.out.once('close', onClose);
    try {
      await once(emitter, event, { signal: ac.signal });
    } catch {
      // conexão fechada
    } finally {
      this.out.off('close', onClose);
    }
  }

  private async raw(buf: Buffer) {
    this.offset += buf.length;
    if (!this.out.write(buf)) await this.wait(this.out, 'drain');
  }

  // Abre um arquivo dentro do zip; devolve write/end para alimentar aos poucos.
  async open(name: string) {
    const entry: Entry = { name: Buffer.from(name, 'utf8'), crc: 0, size: 0, compressed: 0, offset: this.offset };
    const header = Buffer.alloc(30);
    header.writeUInt32LE(0x04034b50, 0);
    header.writeUInt16LE(20, 4); // versão necessária
    header.writeUInt16LE(0x0808, 6); // bit 3: tamanhos no descritor; bit 11: nome em UTF-8
    header.writeUInt16LE(8, 8); // deflate
    header.writeUInt16LE(this.when.time, 10);
    header.writeUInt16LE(this.when.date, 12);
    header.writeUInt16LE(entry.name.length, 26);
    await this.raw(Buffer.concat([header, entry.name]));

    const deflate = createDeflateRaw({ level: 6 });
    const onDrain = () => deflate.resume();
    this.out.on('drain', onDrain);
    deflate.on('data', (chunk: Buffer) => {
      entry.compressed += chunk.length;
      this.offset += chunk.length;
      if (!this.out.write(chunk)) deflate.pause();
    });

    return {
      write: async (text: string) => {
        if (this.closed) return;
        const buf = Buffer.from(text, 'utf8');
        entry.crc = crc32(buf, entry.crc);
        entry.size += buf.length;
        if (!deflate.write(buf)) await this.wait(deflate, 'drain');
      },
      end: async () => {
        const ended = this.wait(deflate, 'end');
        deflate.end();
        await ended;
        this.out.off('drain', onDrain);
        if (this.closed) return;
        const desc = Buffer.alloc(16);
        desc.writeUInt32LE(0x08074b50, 0);
        desc.writeUInt32LE(entry.crc >>> 0, 4);
        desc.writeUInt32LE(entry.compressed, 8);
        desc.writeUInt32LE(entry.size, 12);
        await this.raw(desc);
        this.entries.push(entry);
      },
    };
  }

  async file(name: string, content: string) {
    const f = await this.open(name);
    await f.write(content);
    await f.end();
  }

  // Diretório central + fim do zip.
  async finish() {
    if (this.closed) return;
    const start = this.offset;
    for (const e of this.entries) {
      const h = Buffer.alloc(46);
      h.writeUInt32LE(0x02014b50, 0);
      h.writeUInt16LE(20, 4);
      h.writeUInt16LE(20, 6);
      h.writeUInt16LE(0x0808, 8);
      h.writeUInt16LE(8, 10);
      h.writeUInt16LE(this.when.time, 12);
      h.writeUInt16LE(this.when.date, 14);
      h.writeUInt32LE(e.crc >>> 0, 16);
      h.writeUInt32LE(e.compressed, 20);
      h.writeUInt32LE(e.size, 24);
      h.writeUInt16LE(e.name.length, 28);
      h.writeUInt32LE(e.offset, 42);
      await this.raw(Buffer.concat([h, e.name]));
    }
    const end = Buffer.alloc(22);
    end.writeUInt32LE(0x06054b50, 0);
    end.writeUInt16LE(this.entries.length, 8);
    end.writeUInt16LE(this.entries.length, 10);
    end.writeUInt32LE(this.offset - start, 12);
    end.writeUInt32LE(start, 16);
    await this.raw(end);
    this.out.end();
  }
}

// Planilha de uma aba: cabeçalho congelado, larguras por coluna e linhas vindas de um iterável assíncrono.
export async function streamXlsx(
  out: Writable,
  opts: { sheetName: string; widths: number[]; header: string[] },
  rows: AsyncIterable<XlsxCell[]>,
) {
  const zip = new ZipStream(out);
  for (const [name, content] of STATIC_PARTS(opts.sheetName.slice(0, 31))) await zip.file(name, content);

  const sheet = await zip.open('xl/worksheets/sheet1.xml');
  await sheet.write(
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
      '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
      '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>' +
      `<cols>${opts.widths.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('')}</cols>` +
      `<sheetData><row r="1">${opts.header.map((h, i) => cellXml({ v: h, s: 'bold' }, `${columnName(i)}1`)).join('')}</row>`,
  );
  const letters = opts.header.map((_, i) => columnName(i));
  // Agrupa linhas em blocos para não chamar o deflate a cada linha.
  let chunk = '';
  let n = 1;
  for await (const row of rows) {
    if (zip.closed) return;
    n++;
    chunk += `<row r="${n}">${row.map((c, i) => cellXml(c, `${letters[i]}${n}`)).join('')}</row>`;
    if (chunk.length > 64_000) {
      await sheet.write(chunk);
      chunk = '';
    }
  }
  await sheet.write(`${chunk}</sheetData></worksheet>`);
  await sheet.end();
  await zip.finish();
}
