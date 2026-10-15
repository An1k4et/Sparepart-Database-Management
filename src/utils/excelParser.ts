import * as XLSX from 'xlsx';

export interface ParsedSheet {
  headers: string[];
  rows: string[][];
  parts: {
    rowIndex: number;
    partName: string;
    drawingNo?: string;
    sparePartGroupNo?: string;
    partType?: string;
    rawRow: string[];
  }[];
}

export const parseExcelFile = async (file: File): Promise<ParsedSheet> => {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[firstSheetName];

  // Convert sheet to 2D array of string cells
  const rawData: (string | number | boolean | null | undefined)[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: ''
  });

  if (!rawData || rawData.length === 0) {
    return { headers: [], rows: [], parts: [] };
  }

  // Row 0 is header
  const headers = rawData[0].map(h => (h !== null && h !== undefined ? String(h).trim() : ''));

  // Detect column indices (case-insensitive)
  const partNameCol = 0; // standard index 0 or fallback
  let drawingCol = -1;
  let groupCol = -1;
  let typeCol = -1;

  headers.forEach((h, idx) => {
    const lower = h.toLowerCase().replace(/[_\s-]+/g, '');
    if (lower.includes('drawing') || lower.includes('dwg')) drawingCol = idx;
    else if (lower.includes('sparepartgroup') || lower.includes('groupno') || lower.includes('group')) groupCol = idx;
    else if (lower.includes('type') || lower.includes('model')) typeCol = idx;
  });

  const rows: string[][] = [];
  const parts: ParsedSheet['parts'] = [];

  for (let i = 1; i < rawData.length; i++) {
    const rawRow = rawData[i] || [];
    const stringRow = rawRow.map(c => (c !== null && c !== undefined ? String(c).trim() : ''));
    
    // Skip completely empty rows
    const hasContent = stringRow.some(c => c.length > 0);
    if (!hasContent) continue;

    rows.push(stringRow);

    const partName = stringRow[partNameCol] || '';
    const drawingNo = drawingCol >= 0 ? stringRow[drawingCol] : undefined;
    const sparePartGroupNo = groupCol >= 0 ? stringRow[groupCol] : undefined;
    const partType = typeCol >= 0 ? stringRow[typeCol] : undefined;

    parts.push({
      rowIndex: i - 1, // 0-based row index in rows array
      partName,
      drawingNo,
      sparePartGroupNo,
      partType,
      rawRow: stringRow
    });
  }

  return { headers, rows, parts };
};
