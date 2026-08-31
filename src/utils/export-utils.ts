import { documentDirectory, writeAsStringAsync, EncodingType } from 'expo-file-system/legacy';
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

function sanitizeCsvField(field: string): string {
  if (!field) return '""';
  let val = String(field).replace(/"/g, '""');
  // Neutralize CSV formula execution (=, +, -, @, \t, \r)
  if (/^[=+@\t\r-]/.test(val)) {
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
      const amountStr = t.type === 'expense' ? `-${t.amount}` : `${t.amount}`;
      const note = t.note || '';
      csvString += `${sanitizeCsvField(t.date)},${sanitizeCsvField(t.type)},${sanitizeCsvField(category)},${sanitizeCsvField(account)},${sanitizeCsvField(amountStr)},${sanitizeCsvField(note)}\n`;
    });

    if (Platform.OS === 'web') {
      const blob = new Blob([csvString], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `lumina-export-${Date.now()}.csv`;
      a.click();
      return true;
    }

    const fileUri = documentDirectory + `lumina-export-${Date.now()}.csv`;
    await writeAsStringAsync(fileUri, csvString, { encoding: EncodingType.UTF8 });
    
    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'text/csv',
        dialogTitle: 'Export Transactions CSV'
      });
      return true;
    }
    return false;
  } catch (error) {
    console.error(error);
    return false;
  }
}

// @ts-ignore
import { jsPDF } from 'jspdf/dist/jspdf.es.min.js';
import autoTable from 'jspdf-autotable';

export async function exportToPDF(
  transactions: Transaction[],
  categories: Category[],
  currency: string
) {
  try {
    if (Platform.OS === 'web') {
      const doc = new jsPDF();
      doc.text("Lumina Finance Report", 14, 15);
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

      doc.save(`lumina-report-${Date.now()}.pdf`);
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
          <h1>Lumina Finance Report</h1>
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
  } catch (err) {
    console.error(err);
    return false;
  }
}
