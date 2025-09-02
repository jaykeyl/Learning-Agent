import * as XLSX from 'xlsx';
import { message } from 'antd';

const normalize = (s: string) =>
  String(s ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const headerAliases = {
  nombres: ['nombre', 'nombres'],
  apellidos: ['apellido', 'apellidos'],
  codigo: ['codigo', 'código', 'cod', 'code'],
  correo: ['correo', 'email', 'mail', 'e-mail'],
  career: ['carrera', 'career'],
  campus: ['campus'],
  admissionYear: ['admissionyear', 'año de admisión', 'año', 'anio'],
  residence: ['residencia', 'residence'],
};

export function parseWorkbook(workbook: XLSX.WorkBook) {
  if (!workbook.SheetNames?.length) {
    message.error('No se pudo leer el archivo.');
    return null;
  }
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: '' });

  if (!rows.length) {
    message.error('El archivo no contiene filas para procesar.');
    return null;
  }
  if (rows.length > 100) {
    message.error('El archivo no puede contener más de 100 filas');
    return null;
  }

  const parsed = rows.map((row) => {
    const normRow: Record<string, any> = {};
    for (const k of Object.keys(row)) {
      normRow[normalize(k)] = row[k];
    }

    const pick = (aliases: string[]) => {
      for (const a of aliases) {
        const v = normRow[a];
        if (v !== undefined && v !== null && String(v).trim() !== '') return v;
      }
      return '';
    };

    const nombres = String(pick(headerAliases.nombres));
    const apellidos = String(pick(headerAliases.apellidos));
    const codigoValue = pick(headerAliases.codigo);
    const codigo = Number(String(codigoValue).replace(/[^\d]/g, '') || 0);
    const correo = String(pick(headerAliases.correo) || '').trim();

    const career = String(pick(headerAliases.career) || '').trim();
    const campus = String(pick(headerAliases.campus) || '').trim();
    const admissionYearRaw = String(pick(headerAliases.admissionYear) || '').trim();
    const admissionYear = admissionYearRaw ? Number(admissionYearRaw.replace(/[^\d]/g, '')) : undefined;
    const residence = String(pick(headerAliases.residence) || '').trim();

    const extras: Record<string, any> = {};
    for (const originalKey of Object.keys(row)) {
      const nk = normalize(originalKey);
      const isCore =
        headerAliases.nombres.includes(nk) ||
        headerAliases.apellidos.includes(nk) ||
        headerAliases.codigo.includes(nk) ||
        headerAliases.correo.includes(nk) ||
        headerAliases.career.includes?.(nk) ||
        headerAliases.campus.includes?.(nk) ||
        headerAliases.admissionYear.includes?.(nk) ||
        headerAliases.residence.includes?.(nk);
      if (isCore) continue;
      if (nk.startsWith('_empty')) continue;
      const val = row[originalKey];
      if (val === null || val === undefined) continue;
      if (String(val).trim() === '') continue;
      extras[originalKey] = val;
    }

    return {
      nombres,
      apellidos,
      codigo,
      ...(correo ? { correo } : {}),
      ...(career ? { career } : {}),
      ...(campus ? { campus } : {}),
      ...(admissionYear ? { admissionYear } : {}),
      ...(residence ? { residence } : {}),
      ...extras,
    };
  });

  const missingCore = parsed.some((r) => !r.nombres || !r.apellidos || !r.codigo);
  if (missingCore) {
    message.error('Faltan columnas obligatorias: Nombre(s), Apellido(s) y Código.');
    return null;
  }

  const seen = new Set<number>();
  const unique = parsed.filter((r) => {
    if (!r.codigo) return false;
    if (seen.has(r.codigo)) return false;
    seen.add(r.codigo);
    return true;
  });

  return unique;
}

export async function processFile(
  file: File,
  onProgress?: (step: string, progress: number, message: string) => void
) {
  onProgress?.('upload', 10, 'Leyendo archivo');

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const isCsv = /\.csv$/i.test(file.name);
        let workbook: XLSX.WorkBook;

        if (isCsv) {
          const text = String(e.target?.result || '');
          workbook = XLSX.read(text, { type: 'string' });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const cols = firstSheet ? XLSX.utils.sheet_to_json(firstSheet, { header: 1 })[0] as string[] : [];
          const allOneCell = cols && cols.length === 1;
          if (allOneCell && text.includes(';')) {
            workbook = XLSX.read(text, { type: 'string', FS: ';' });
          }
        } else {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          workbook = XLSX.read(data, { type: 'array' });
        }

        onProgress?.('upload', 50, 'Parseando datos');
        const parsed = parseWorkbook(workbook);

        if (!parsed) {
          reject(new Error('Error al parsear el archivo'));
          return;
        }

        onProgress?.('upload', 100, 'Archivo procesado');
        resolve(parsed);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => {
      reject(new Error('Error leyendo el archivo'));
    };

    if (/\.csv$/i.test(file.name)) {
      reader.readAsText(file, 'utf-8');
    } else {
      reader.readAsArrayBuffer(file);
    }
  });
}

