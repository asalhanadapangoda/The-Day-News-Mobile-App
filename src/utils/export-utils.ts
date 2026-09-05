import { cacheDirectory, documentDirectory, writeAsStringAsync, deleteAsync, EncodingType } from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import { Platform } from 'react-native';
import { Transaction, Category, Account } from '@/data/types';
import { formatMoney } from '@/components/ui';

function escapeHtml(text: string): string {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Serializes an application-validated numeric value as an unquoted, formula-safe numeric CSV literal.
 * Ensures the value is finite and formatted to two decimal places.
 * Example: -32.20, 1500.00, 0.00
 */
export function formatCsvNumeric(value: number, isNegative: boolean = false): string {
  if (!Number.isFinite(value)) {
    return '0.00';
  }
  const magnitude = Math.abs(value);
  const formatted = magnitude.toFixed(2);
  return isNegative && magnitude > 0 ? `-${formatted}` : formatted;
}

/**
 * Serializes a user-controlled text field safely for CSV.
 * Escapes double quotes and neutralizes spreadsheet formula execution prefixes
 * (=, +, -, @, \t, \r, \n) by prepending an apostrophe.
 * Example: "- Keells Super" -> '"\'- Keells Super"'
 */
export function formatCsvText(text: string | null | undefined): string {
  if (text === null || text === undefined) return '""';
  let val = String(text);
  if (!val) return '""';

  // Escape double quotes
  val = val.replace(/"/g, '""');

  // Neutralize CSV formula execution prefixes
  if (/^[=+@\t\r\n-]/.test(val)) {
    val = "'" + val;
  }
  return `"${val}"`;
}

export async function exportToCSV(
  transactions: Transaction[],
  categories: Category[],
  accounts: Account[],
  currency: string
) {
  try {
    let csvString = 'Date,Type,Category,Account,Amount,Note\n';
    
    transactions.forEach(t => {
      const category = categories.find(c => c.id === t.categoryId)?.name || '';
      const account = accounts.find(a => a.id === t.accountId)?.name || '';
      const isExpense = t.type === 'expense';
      const formattedAmount = formatCsvNumeric(t.amount, isExpense);

      csvString += `${formatCsvText(t.date)},${formatCsvText(t.type)},${formatCsvText(category)},${formatCsvText(account)},${formattedAmount},${formatCsvText(t.note)}\n`;
    });

    if (Platform.OS === 'web') {
      const blob = new Blob([csvString], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `thedayapp-export-${Date.now()}.csv`;
      a.click();
      setTimeout(() => window.URL.revokeObjectURL(url), 1000);
      return true;
    }

    const baseDir = cacheDirectory || documentDirectory || '';
    const fileUri = `${baseDir}thedayapp-export-${Date.now()}.csv`;
    await writeAsStringAsync(fileUri, csvString, { encoding: EncodingType.UTF8 });
    
    try {
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'text/csv',
          dialogTitle: 'Export Transactions CSV'
        });
        return true;
      }
      return false;
    } finally {
      // Clean up temporary export file to prevent unencrypted persistent file buildup
      try {
        await deleteAsync(fileUri, { idempotent: true });
      } catch {
        // Tolerated
      }
    }
  } catch (error) {
    console.error(error);
    return false;
  }
}

export async function exportToPDF(
  transactions: Transaction[],
  categories: Category[],
  currency: string
) {
  try {
    if (Platform.OS === 'web') {
      // @ts-ignore
      const { jsPDF } = await import('jspdf/dist/jspdf.es.min.js');
      // @ts-ignore
      const autoTableModule = await import('jspdf-autotable');
      const autoTable = autoTableModule.default || autoTableModule;

      const doc = new jsPDF();
      doc.text("The Day App Report", 14, 15);
      doc.setFontSize(10);
      doc.text(`Generated on ${new Date().toLocaleDateString()}`, 14, 22);
      
      const tableData = transactions.map(t => {
        const cat = categories.find(c => c.id === t.categoryId);
        const sign = t.type === 'expense' ? '-' : '+';
        return [
          t.date,
          cat?.name || t.type,
          t.note || '',
          `${sign}${formatMoney(t.amount, currency)}`
        ];
      });

      autoTable(doc, {
        startY: 30,
        head: [['Date', 'Category', 'Note', 'Amount']],
        body: tableData,
        headStyles: { fillColor: [23, 69, 124] },
        didParseCell: function(data) {
          if (data.section === 'body' && data.column.index === 3) {
             const isExpense = String((data.row.raw as string[])[3]).startsWith('-');
             data.cell.styles.textColor = isExpense ? [246, 160, 176] : [85, 226, 173]; 
             data.cell.styles.fontStyle = 'bold';
          }
        }
      });

      doc.save(`thedayapp-report-${Date.now()}.pdf`);
      return true;
    }

    const tableRows = transactions.map(t => {
      const cat = categories.find(c => c.id === t.categoryId);
      const color = t.type === 'expense' ? '#F6A0B0' : '#55E2AD';
      const sign = t.type === 'expense' ? '-' : '+';
      const safeDate = escapeHtml(t.date || '');
      const safeCat = escapeHtml(cat?.name || t.type || '');
      const safeNote = escapeHtml(t.note || '');
      const safeAmount = escapeHtml(`${sign}${formatMoney(t.amount, currency)}`);

      return `
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #ddd;">${safeDate}</td>
          <td style="padding: 10px; border-bottom: 1px solid #ddd;">${safeCat}</td>
          <td style="padding: 10px; border-bottom: 1px solid #ddd;">${safeNote}</td>
          <td style="padding: 10px; border-bottom: 1px solid #ddd; color: ${color}; font-weight: bold;">
            ${safeAmount}
          </td>
        </tr>
      `;
    }).join('');

    const html = `
      <html>
        <head>
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; color: #333; }
            h1 { color: #17457C; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { text-align: left; padding: 10px; border-bottom: 2px solid #17457C; color: #17457C; }
          </style>
        </head>
        <body>
          <h1>The Day App Report</h1>
          <p>Generated on ${escapeHtml(new Date().toLocaleDateString())}</p>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Category</th>
                <th>Note</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>
        </body>
      </html>
    `;

    const { uri } = await Print.printToFileAsync({ html });
    
    try {
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, {
          UTI: '.pdf',
          mimeType: 'application/pdf',
          dialogTitle: 'Export Transactions PDF'
        });
        return true;
      }
      return false;
    } finally {
      // Clean up temporary printed PDF to prevent storage accumulation
      try {
        await deleteAsync(uri, { idempotent: true });
      } catch {
        // Tolerated
      }
    }
  } catch (err) {
    console.error(err);
    return false;
  }
}
