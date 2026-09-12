import ExcelJS from 'exceljs';
import * as path from 'path';
import * as fs from 'fs';
import { EtaCheckResult } from '../types/hyperlocal.types';
import { formatMinutesAsHrsMins } from './eta-parser.helper';

const REPORTS_DIR = path.join(__dirname, '..', '..', '..', 'reports');

const rows: EtaCheckResult[] = [];

/** Call this once per check, right alongside logCheck(). */
export function recordEtaCheckToExcel(result: EtaCheckResult): void {
    rows.push(result);
}

function ensureReportsDir(): void {
    if (!fs.existsSync(REPORTS_DIR)) {
        fs.mkdirSync(REPORTS_DIR, { recursive: true });
    }
}

/** Formats ETA for display: prefers hrs/mins if parsed, falls back to raw text. */
function formatEta(result: EtaCheckResult): string {
    if (result.etaMinutes !== null) return formatMinutesAsHrsMins(result.etaMinutes);
    return result.rawEtaText ?? '';
}

/** Writes every recorded check to a single .xlsx file. Call once after the sweep finishes. */
export async function writeEtaExcelReport(): Promise<string> {
    ensureReportsDir();

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('ETA Sweep Results');

    sheet.columns = [
        { header: 'Cycle', key: 'cycle', width: 8 },
        { header: 'Variant', key: 'variant', width: 32 },
        { header: 'Pincode', key: 'pincode', width: 12 },
        { header: 'Status', key: 'status', width: 18 },
        { header: 'ETA', key: 'eta', width: 20 },
        { header: 'Timestamp', key: 'timestamp', width: 24 },
    ];
    sheet.getRow(1).font = { bold: true };
    sheet.autoFilter = { from: 'A1', to: 'F1' };

    const statusColors: Record<string, string> = {
        PASS: 'FFC6EFCE',
        FAIL: 'FFFFC7CE',
        UNDELIVERABLE: 'FFFFEB9C',
        NOT_FOUND: 'FFD9D2E9',
        INVALID_PINCODE: 'FFFFEB9C',
        ERROR: 'FFF2F2F2',
    };

    for (const result of rows) {
        const row = sheet.addRow({
            cycle: result.cycle,
            variant: result.variant,
            pincode: result.pincode,
            status: result.status,
            eta: formatEta(result),
            timestamp: result.timestamp,
        });

        const color = statusColors[result.status];
        if (color) {
            row.getCell('status').fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: color },
            };
        }
    }

    const filePath = path.join(REPORTS_DIR, `eta-results-${Date.now()}.xlsx`);
    await workbook.xlsx.writeFile(filePath);

    console.log(`Excel report written to: ${filePath}`);
    return filePath;
}