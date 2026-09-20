import * as XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';

const dir = path.join(process.cwd(), 'fixtures/failures');
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

// 1. Valid Excel file, but wrong schema (e.g., an accounting or payroll spreadsheet)
const wb = XLSX.utils.book_new();
const ws = XLSX.utils.aoa_to_sheet([
  ['Employee ID', 'Employee Name', 'Department', 'Salary', 'Quarterly Bonus'],
  ['EMP-101', 'Jane Doe', 'Field Inspection', '$85,000', '$4,200'],
  ['EMP-102', 'John Smith', 'Operations', '$72,000', '$3,100'],
  ['EMP-103', 'Sarah Jenkins', 'Scheduling', '$64,000', '$2,500']
]);
XLSX.utils.book_append_sheet(wb, ws, 'Q3 Payroll');

const filePath = path.join(dir, 'invalid-generic-spreadsheet.xlsx');
XLSX.writeFile(wb, filePath);
console.log('Created failure fixture at:', filePath);
