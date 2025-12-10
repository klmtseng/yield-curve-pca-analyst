
import { YieldCurvePoint, TENORS, Tenor } from '../types';

export const parseCSV = (csvContent: string): { data: YieldCurvePoint[], availableTenors: Tenor[] } => {
  const lines = csvContent.split(/\r?\n/).filter(line => line.trim() !== '');
  if (lines.length < 2) throw new Error("CSV must have a header row and data rows.");

  const headers = lines[0].split(',').map(h => h.trim());
  
  // Helper to normalize header names
  // e.g., "1 Mo" -> "1M", "1 Year" -> "1Y", "Date" -> "DATE"
  const normalizeHeader = (h: string): string => {
    let clean = h.toUpperCase().replace(/\s/g, '');
    clean = clean.replace('MO', 'M').replace('MONTH', 'M');
    clean = clean.replace('YR', 'Y').replace('YEAR', 'Y');
    return clean;
  };

  const headerIndexMap: Partial<Record<Tenor, number>> = {};
  let dateIndex = -1;

  // Identify columns
  headers.forEach((h, i) => {
    const normalized = normalizeHeader(h);
    if (normalized === 'DATE') {
      dateIndex = i;
    } else if (TENORS.includes(normalized as Tenor)) {
      headerIndexMap[normalized as Tenor] = i;
    }
  });

  if (dateIndex === -1) throw new Error("CSV must contain a 'Date' column.");

  // Identify which Tenors we actually found in this CSV
  const foundTenors = TENORS.filter(t => headerIndexMap[t] !== undefined);
  if (foundTenors.length < 3) throw new Error("CSV must contain at least 3 valid tenor columns (e.g., 2Y, 5Y, 10Y) for PCA.");

  const data: YieldCurvePoint[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const values = line.split(',');
    
    // Skip empty lines or lines with not enough columns
    if (values.length < headers.length) continue;

    const dateStr = values[dateIndex].trim();
    const point: any = { date: dateStr };
    
    let rowIsValid = true;

    // Only extract data for the tenors we found in the header
    for (const tenor of foundTenors) {
      const idx = headerIndexMap[tenor]!;
      const valStr = values[idx]?.trim();
      
      // Handle N/A or empty
      if (!valStr || valStr === 'N/A' || valStr === '') {
        rowIsValid = false;
        break; 
      }

      const val = parseFloat(valStr);
      if (isNaN(val)) {
        rowIsValid = false;
        break;
      }
      
      point[tenor] = val;
    }

    if (rowIsValid) {
      data.push(point);
    }
  }

  if (data.length === 0) throw new Error("No valid data rows found. Ensure dates and numeric values are formatted correctly.");
  
  // Sort by date ascending
  data.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return { data, availableTenors: foundTenors };
};
