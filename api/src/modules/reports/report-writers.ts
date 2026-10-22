import type { Writable } from 'node:stream';
import { csvCell } from '../orders/orders.admin.service.js';
import { excelSerial, streamXlsx, type XlsxCell } from './xlsx-stream.js';

export type ColumnType = 'text' | 'int' | 'money' | 'datetime' | 'date' | 'percent';
// money em centavos, percent em fração (0,125 = 12,5%), date como "AAAA-MM-DD", datetime como Date (UTC).
export type Cell = string | number | Date | null;
export type ReportColumn = { key: string; label: string; type: ColumnType; total?: boolean };

const TZ = 'America/Sao_Paulo';
const parts = new Intl.DateTimeFormat('en-US', {
  timeZone: TZ,
  hourCycle: 'h23',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});

// Data/hora de Brasília num Date cujos campos UTC são o horário local (planilha não tem fuso).
export function brtWallClock(d: Date): Date {
  const p = Object.fromEntries(parts.formatToParts(d).map((x) => [x.type, x.value]));
  return new Date(Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second));
}

const pad = (n: number) => String(n).padStart(2, '0');
const brDay = (iso: string) => iso.split('-').reverse().join('/');

// Texto da célula no CSV, já formatado para o Excel em português.
export function csvValue(v: Cell, type: ColumnType): string {
  if (v == null || v === '') return '';
  switch (type) {
    case 'money':
      return (Number(v) / 100).toFixed(2).replace('.', ',');
    case 'percent':
      return `${(Number(v) * 100).toFixed(1).replace('.', ',')}%`;
    case 'date':
      return brDay(String(v));
    case 'datetime': {
      const w = brtWallClock(v as Date);
      return `${pad(w.getUTCDate())}/${pad(w.getUTCMonth() + 1)}/${w.getUTCFullYear()} ${pad(w.getUTCHours())}:${pad(w.getUTCMinutes())}`;
    }
    default:
      return csvCell(v);
  }
}

// Célula do XLSX: número de verdade com formato (soma e filtra no Excel). Texto vai como inlineStr,
// que o Excel nunca interpreta como fórmula.
export function xlsxCell(v: Cell, type: ColumnType, bold = false): XlsxCell {
  if (v == null || v === '') return { v: null, s: type, bold };
  switch (type) {
    case 'money':
      return { v: Number(v) / 100, s: 'money', bold };
    case 'date':
      return { v: excelSerial(new Date(`${String(v)}T00:00:00Z`)), s: 'date', bold };
    case 'datetime':
      return { v: excelSerial(brtWallClock(v as Date)), s: 'datetime', bold };
    case 'text':
      return { v: String(v), s: 'text', bold };
    default:
      return { v: Number(v), s: type, bold };
  }
}

const XLSX_WIDTH: Record<ColumnType, number> = { text: 24, int: 12, money: 15, percent: 11, date: 12, datetime: 17 };

// Espera o cliente consumir o que já foi enviado: memória constante mesmo com milhões de linhas.
async function drained(out: Writable) {
  if (!out.writableNeedDrain || out.destroyed) return;
  await new Promise<void>((resolve) => {
    const done = () => {
      out.off('drain', done);
      out.off('close', done);
      resolve();
    };
    out.on('drain', done);
    out.on('close', done);
  });
}

// Soma as colunas marcadas com total enquanto as linhas passam (sem guardar as linhas).
function totalsRow(columns: ReportColumn[]) {
  const sums = columns.map(() => 0);
  return {
    enabled: columns.some((c) => c.total),
    add(row: Cell[]) {
      columns.forEach((c, i) => {
        if (c.total) sums[i] += Number(row[i] ?? 0);
      });
    },
    row: (): Cell[] => columns.map((c, i) => (i === 0 ? 'Total' : c.total ? sums[i] : null)),
  };
}

// CSV com ";" e BOM (Excel em português abre com acentos e colunas certas).
export async function writeCsv(out: Writable, columns: ReportColumn[], rows: AsyncIterable<Cell[]>) {
  const totals = totalsRow(columns);
  const line = (row: Cell[]) => row.map((v, i) => csvValue(v, columns[i].type)).join(';') + '\r\n';
  out.write('﻿' + columns.map((c) => csvCell(c.label)).join(';') + '\r\n');
  for await (const row of rows) {
    if (out.destroyed) return;
    totals.add(row);
    if (!out.write(line(row))) await drained(out);
  }
  if (totals.enabled) out.write(line(totals.row()));
  out.end();
}

// XLSX em streaming, com a linha de total em negrito no fim.
export async function writeXlsx(out: Writable, title: string, columns: ReportColumn[], rows: AsyncIterable<Cell[]>) {
  const totals = totalsRow(columns);
  async function* cells(): AsyncGenerator<XlsxCell[]> {
    for await (const row of rows) {
      totals.add(row);
      yield row.map((v, i) => xlsxCell(v, columns[i].type));
    }
    if (totals.enabled) {
      // A primeira célula é o rótulo "Total", seja qual for o tipo da coluna.
      yield totals.row().map((v, i) => (i === 0 ? { v: 'Total', s: 'bold' } : xlsxCell(v, columns[i].type, true)));
    }
  }
  await streamXlsx(out, { sheetName: title, widths: columns.map((c) => XLSX_WIDTH[c.type]), header: columns.map((c) => c.label) }, cells());
}
