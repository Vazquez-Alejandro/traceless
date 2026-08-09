import { readSheet } from "read-excel-file/universal";
import type { Row } from "read-excel-file/universal";
import writeXlsxFile from "write-excel-file/browser";

type Celda = { value: string | number | boolean; fontWeight?: "bold"; width?: number };

export async function leerExcel(file: File): Promise<Record<string, string>[]> {
  const rows: Row[] = await readSheet(file);
  if (!rows.length) return [];
  const headers = rows[0]!.map(h => String(h ?? "").toLowerCase().trim());
  return rows.slice(1).map(r => {
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => {
      obj[h] = r[i] == null ? "" : String(r[i]);
    });
    return obj;
  });
}

export async function descargarExcel(
  filename: string,
  sheet: string,
  headers: string[],
  filas: (string | number | boolean)[][],
  widths?: number[]
) {
  const data: Celda[][] = [
    headers.map((h, i) => ({ value: h, fontWeight: "bold", width: widths?.[i] })),
    ...filas.map(f => f.map(v => ({ value: v }))),
  ];
  const result = await writeXlsxFile(data, {
    sheet,
    columns: widths?.map(w => ({ width: w })) || undefined,
  });
  await result.toFile(filename);
}

export async function descargarExcelObjetos(
  filename: string,
  sheet: string,
  data: Record<string, string | number | boolean>[]
) {
  if (!data.length) return;
  const headers = Object.keys(data[0]);
  const filas = data.map(o => headers.map(h => o[h] ?? ""));
  await descargarExcel(filename, sheet, headers, filas);
}