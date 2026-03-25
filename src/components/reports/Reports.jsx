import React, { useState, useEffect } from 'react';
import { 
  query, where, onSnapshot, getDocs 
} from 'firebase/firestore';
import { 
  Printer, Eye, EyeOff, ClipboardList, Wallet, CheckCircle, Clock, XCircle, FileDown, X 
} from 'lucide-react';
import { getColl } from '../../config/firebase';
import Toast from '../common/Toast';
import * as XLSX from 'xlsx';

const Reports = ({ user }) => {
  const [dateRange, setDateRange] = useState({ 
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0], 
    end: new Date().toISOString().split('T')[0] 
  });
  const [employees, setEmployees] = useState([]);
  const [reportData, setReportData] = useState([]);
  const [detailedLoans, setDetailedLoans] = useState([]);
  const [employeeStats, setEmployeeStats] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showFinancials, setShowFinancials] = useState(true);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (!user) return;
    const q = query(getColl('employees'), where('ownerId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => { 
        setEmployees(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))); 
    });
    return () => unsubscribe();
  }, [user]);

  const generateReport = async () => {
    if (!user) return;
    setLoading(true);
    setReportData([]); setDetailedLoans([]); setEmployeeStats([]);

    try {
      const qAtt = query(getColl('attendance'), where('ownerId', '==', user.uid));
      const attSnapshot = await getDocs(qAtt);

      const qLoan = query(getColl('loans'), where('ownerId', '==', user.uid));
      const loanSnapshot = await getDocs(qLoan);

      const aggregation = {}; const loansList = []; const attendanceByDate = {};
      const isInRange = (dateStr) => dateStr >= dateRange.start && dateStr <= dateRange.end;

      loanSnapshot.docs.forEach(doc => {
        const data = doc.data();
        if (isInRange(data.date)) {
            loansList.push({ id: doc.id, ...data });
            if (!aggregation[data.employeeId]) aggregation[data.employeeId] = { id: data.employeeId, name: data.employeeName || 'Unknown', wage: 0, days: 0, grossPay: 0, loanTotal: 0, netPay: 0 };
            aggregation[data.employeeId].loanTotal += (data.amount || 0);
        }
      });

      const processedAttendance = new Set();
      attSnapshot.docs.forEach(doc => {
        const data = doc.data();
        const empId = data.employeeId;
        const dateKey = `${empId}_${data.date}`;

        if (isInRange(data.date)) {
            // Summary for specific dates (last record wins for the summary list)
            if (!attendanceByDate[data.date]) attendanceByDate[data.date] = {};
            attendanceByDate[data.date][empId] = { morning: data.morning, afternoon: data.afternoon };

            // Aggregate totals (only count each day once per employee)
            if (!processedAttendance.has(dateKey)) {
                processedAttendance.add(dateKey);

                if (!aggregation[empId]) aggregation[empId] = { id: empId, name: data.employeeName || 'Unknown', wage: data.dailyWageAtTime || 0, days: 0, grossPay: 0, loanTotal: 0, netPay: 0 };
                else if (aggregation[empId].wage === 0) aggregation[empId].wage = data.dailyWageAtTime;

                let dayValue = 0; if (data.morning) dayValue += 0.5; if (data.afternoon) dayValue += 0.5;
                aggregation[empId].days += dayValue;
                aggregation[empId].grossPay += (dayValue * (data.dailyWageAtTime || 0));
            }
        }
      });

      Object.values(aggregation).forEach(emp => { emp.netPay = emp.grossPay - emp.loanTotal; });
      setReportData(Object.values(aggregation));
      setDetailedLoans(loansList.sort((a,b) => a.date.localeCompare(b.date)));

      const getDatesInRange = (startDate, endDate) => {
        const dates = [];
        let currentDate = new Date(startDate);
        const endDay = new Date(endDate);
        while (currentDate <= endDay) {
          dates.push(currentDate.toISOString().split('T')[0]);
          currentDate.setDate(currentDate.getDate() + 1);
        }
        return dates;
      };

      const allDates = getDatesInRange(dateRange.start, dateRange.end);
      const stats = employees.map(emp => {
        const presentDates = []; const halfDates = []; const absentDates = [];
        allDates.forEach(date => {
           const record = attendanceByDate[date]?.[emp.id];
           if (record) {
             if (record.morning && record.afternoon) presentDates.push(date);
             else if (record.morning || record.afternoon) halfDates.push(`${date} (${record.morning ? 'ព្រឹក' : 'រសៀល'})`);
             else absentDates.push(date);
           } else absentDates.push(date);
        });
        return { id: emp.id, name: emp.name, presentDates, halfDates, absentDates };
      });
      setEmployeeStats(stats);
      
    } catch (error) {
      console.error(error);
      setToast({ message: "មានបញ្ហាក្នុងការបង្កើតរបាយការណ៍: " + error.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // --- NEW FEATURE: EXPORT TO CSV ---
  const exportToExcel = () => {
    if (reportData.length === 0) return;
    
    try {
      // 1. Prepare data with Sequence Number (No)
      const excelData = reportData.map((row, index) => ({
        "ល.រ (No)": index + 1,
        "ឈ្មោះបុគ្គលិក": row.name,
        "ថ្ងៃធ្វើការ": row.days,
        "ប្រាក់ខ្ចី (Loan)": row.loanTotal,
        "ប្រាក់ត្រូវបើក (Net Pay)": row.netPay
      }));

      // 2. Add Total Row at the bottom
      const totalDays = reportData.reduce((acc, curr) => acc + curr.days, 0);
      const totalLoans = reportData.reduce((acc, curr) => acc + curr.loanTotal, 0);
      const totalNet = reportData.reduce((acc, curr) => acc + curr.netPay, 0);
      
      excelData.push({
        "ល.រ (No)": "",
        "ឈ្មោះបុគ្គលិក": "សរុបរួម (TOTAL)",
        "ថ្ងៃធ្វើការ": totalDays,
        "ប្រាក់ខ្ចី (Loan)": totalLoans,
        "ប្រាក់ត្រូវបើក (Net Pay)": totalNet
      });

      // 3. Create worksheet and workbook
      const ws = XLSX.utils.json_to_sheet(excelData);
      
      // Auto-size columns (wider for Khmer text)
      const colWidths = [
        { wch: 10 }, // No
        { wch: 25 }, // Name
        { wch: 15 }, // Days
        { wch: 18 }, // Loan
        { wch: 25 }, // Net Pay
      ];
      ws['!cols'] = colWidths;

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Payroll");

      // 4. Manual download
      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      
      const fileName = `payroll_report_${dateRange.start}_to_${dateRange.end}.xlsx`;
      link.href = url;
      link.download = fileName;
      
      document.body.appendChild(link);
      link.click();
      
      setTimeout(() => {
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
      }, 200);

      setToast({ message: "នាំចេញជោគជ័យ!", type: 'success' });
    } catch (err) {
      console.error("Excel Export Error:", err);
      showToast("បរាជ័យក្នុងការនាំចេញ", 'error');
    }
  };

  const totalGross = reportData.reduce((acc, curr) => acc + curr.grossPay, 0);
  const totalLoans = reportData.reduce((acc, curr) => acc + curr.loanTotal, 0);
  const totalNet = reportData.reduce((acc, curr) => acc + curr.netPay, 0);

  return (
    <div className="p-4 md:p-6 pb-24 relative">
      <Toast message={toast?.message} type={toast?.type} onClose={() => setToast(null)} />

      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 print:hidden gap-4">
        <div className="flex items-center gap-3 w-full lg:w-auto justify-between lg:justify-start">
           <h2 className="text-xl sm:text-2xl font-bold text-slate-800">របាយការណ៍</h2>
           <button onClick={() => setShowFinancials(!showFinancials)} className={`p-2 rounded-xl transition-all shadow-sm ${showFinancials ? 'bg-slate-100 text-slate-500 hover:bg-slate-200' : 'bg-slate-900 text-white hover:bg-black'}`} title={showFinancials ? 'លាក់តួលេខ' : 'បង្ហាញតួលេខ'}>
             {showFinancials ? <Eye size={18} /> : <EyeOff size={18} />}
           </button>
        </div>
        <div className="flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-4 items-stretch sm:items-end bg-white p-3 sm:p-4 rounded-xl shadow-sm border border-slate-200 w-full lg:w-auto">
          <div className="flex-1 min-w-[120px]"><label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider">ចាប់ពី</label><input type="date" className="border border-slate-200 p-2 rounded-lg text-sm w-full focus:ring-2 focus:ring-indigo-500 outline-none" value={dateRange.start} onChange={e => setDateRange({...dateRange, start: e.target.value})} /></div>
          <div className="flex-1 min-w-[120px]"><label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider">ដល់</label><input type="date" className="border border-slate-200 p-2 rounded-lg text-sm w-full focus:ring-2 focus:ring-indigo-500 outline-none" value={dateRange.end} onChange={e => setDateRange({...dateRange, end: e.target.value})} /></div>
          <div className="flex gap-2 mt-2 sm:mt-0">
            <button onClick={generateReport} className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 font-bold text-sm shadow-sm transition active:scale-95">{loading ? '...' : 'បង្ហាញ'}</button>
            <button onClick={exportToExcel} disabled={reportData.length === 0} className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 font-bold text-sm shadow-sm transition active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1"><FileDown size={14} /> EXCEL</button>
            <button onClick={() => window.print()} className="hidden sm:flex bg-slate-800 text-white px-4 py-2 rounded-lg hover:bg-slate-900 font-bold text-sm shadow-sm transition active:scale-95 items-center justify-center gap-1"><Printer size={14} /> បោះពុម្ព</button>
          </div>
        </div>
      </div>

      <div className="bg-white p-4 md:p-8 rounded-xl shadow-lg print:shadow-none print:p-0">
        <div className="text-center mb-8 hidden print:block">
          <h1 className="text-3xl font-bold text-slate-900">{showFinancials ? 'តារាងបើកប្រាក់ខែ' : 'សង្ខេបប្រាក់ខែ (Privacy Mode)'}</h1>
          <p className="text-slate-500">កាលបរិច្ឆេទ: {dateRange.start} ដល់ {dateRange.end}</p>
        </div>

        <div className="overflow-x-auto mb-8">
            <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead className="bg-slate-50 border-b-2 border-slate-200">
                <tr className="print:bg-transparent">
                <th className="py-3 px-2 text-slate-500 font-bold uppercase text-[10px] sm:text-xs tracking-wider">ឈ្មោះបុគ្គលិក</th>
                <th className="py-3 px-2 text-slate-500 font-bold uppercase text-[10px] sm:text-xs tracking-wider text-center">ថ្ងៃធ្វើការ</th>
                <th className="py-3 px-2 text-slate-500 font-bold uppercase text-[10px] sm:text-xs tracking-wider text-right">ប្រាក់សរុប (Gross)</th>
                <th className="py-3 px-2 text-red-500 font-bold uppercase text-[10px] sm:text-xs tracking-wider text-right">ប្រាក់ខ្ចី (Loan)</th>
                <th className="py-3 px-2 text-green-700 font-bold uppercase text-[10px] sm:text-xs tracking-wider text-right">ប្រាក់ត្រូវបើក (Net)</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
                {reportData.map((row) => (
                <tr key={row.id}>
                    <td className="py-3 px-2 font-medium text-slate-800">{row.name}</td>
                    <td className="py-3 px-2 text-center"><span className="bg-indigo-50 text-indigo-700 px-2 py-1 rounded-full text-xs font-bold">{row.days} ថ្ងៃ</span></td>
                    <td className="py-3 px-2 text-right text-slate-500">{showFinancials ? `${row.grossPay.toLocaleString()} ៛` : '****'}</td>
                    <td className="py-3 px-2 text-right text-red-500 font-medium">{row.loanTotal > 0 ? `-${row.loanTotal.toLocaleString()} ៛` : '-'}</td>
                    <td className="py-3 px-2 text-right font-bold text-green-700 text-lg">{showFinancials ? `${row.netPay.toLocaleString()} ៛` : '****'}</td>
                </tr>
                ))}
            </tbody>
            <tfoot>
                <tr className="bg-slate-50 border-t-2 border-slate-300">
                <td colSpan="2" className="py-3 sm:py-4 px-2 text-right font-bold text-slate-800 text-sm sm:text-base">សរុបរួម (Totals):</td>
                <td className="py-3 sm:py-4 px-2 text-right font-bold text-slate-600 text-sm sm:text-base">{totalGross.toLocaleString()} ៛</td>
                <td className="py-3 sm:py-4 px-2 text-right font-bold text-red-600 text-sm sm:text-base">-{totalLoans.toLocaleString()} ៛</td>
                <td className="py-3 sm:py-4 px-2 text-right font-bold text-lg sm:text-2xl text-slate-900">{totalNet.toLocaleString()} ៛</td>
                </tr>
            </tfoot>
            </table>
        </div>

        {employeeStats.length > 0 && (
          <div className="mt-8 pt-6 break-inside-avoid border-t border-slate-200">
             <h3 className="text-lg font-bold text-slate-700 mb-6 flex items-center gap-2"><ClipboardList size={20} className="text-blue-600"/> លម្អិតវត្តមានបុគ្គលិក</h3>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 print:grid-cols-2">
                {employeeStats.map(stat => (
                  <div key={stat.id} className="border rounded-lg p-4 bg-slate-50 print:bg-white print:border-slate-300 break-inside-avoid">
                    <h4 className="font-bold text-slate-800 mb-3 border-b pb-2">{stat.name}</h4>
                    <div className="space-y-3 text-sm">
                      <div className="flex gap-2 text-xs font-bold mb-2">
                          <span className="bg-green-100 text-green-800 px-2 py-1 rounded">✅ {stat.presentDates.length} ពេញ</span>
                          <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded">⚠️ {stat.halfDates.length} កន្លះ</span>
                          <span className="bg-red-100 text-red-800 px-2 py-1 rounded">❌ {stat.absentDates.length} ឈប់</span>
                      </div>
                      {stat.presentDates.length > 0 && (<div className="flex items-start gap-2"><CheckCircle size={16} className="text-green-600 mt-0.5 shrink-0" /><div><span className="font-semibold text-green-700 block">វត្តមានពេញថ្ងៃ:</span><p className="text-slate-500 leading-tight text-xs mt-1">{stat.presentDates.join(', ')}</p></div></div>)}
                      {stat.halfDates.length > 0 && (<div className="flex items-start gap-2"><Clock size={16} className="text-orange-500 mt-0.5 shrink-0" /><div><span className="font-semibold text-orange-600 block">កន្លះថ្ងៃ:</span><p className="text-slate-500 leading-tight text-xs mt-1">{stat.halfDates.join(', ')}</p></div></div>)}
                      {stat.absentDates.length > 0 && (<div className="flex items-start gap-2"><XCircle size={16} className="text-red-500 mt-0.5 shrink-0" /><div><span className="font-semibold text-red-600 block">អវត្តមាន:</span><p className="text-slate-400 leading-tight text-xs mt-1">{stat.absentDates.join(', ')}</p></div></div>)}
                    </div>
                  </div>
                ))}
             </div>
          </div>
        )}

        {detailedLoans.length > 0 && (
          <div className="mt-8 border-t border-slate-200 pt-6 break-inside-avoid">
             <h3 className="text-lg font-bold text-slate-700 mb-4 flex items-center gap-2"><Wallet size={20} className="text-orange-500"/> ប្រវត្តិខ្ចីប្រាក់ក្នុងអំឡុងពេលនេះ</h3>
             <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse whitespace-nowrap">
                <thead><tr className="border-b border-slate-200 text-slate-500"><th className="py-2 px-2">កាលបរិច្ឆេទ</th><th className="py-2 px-2">ឈ្មោះបុគ្គលិក</th><th className="py-2 px-2">កំណត់សម្គាល់</th><th className="py-2 px-2 text-right">ចំនួនទឹកប្រាក់</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                    {detailedLoans.map(loan => (
                    <tr key={loan.id} className="hover:bg-slate-50">
                        <td className="py-2 px-2 text-slate-600">{loan.date}</td>
                        <td className="py-2 px-2 font-medium">{loan.employeeName}</td>
                        <td className="py-2 px-2 text-slate-500 italic max-w-xs truncate">{loan.note || '-'}</td>
                        <td className="py-2 px-2 text-right font-bold text-red-500">{loan.amount.toLocaleString()} ៛</td>
                    </tr>
                    ))}
                </tbody>
                </table>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Reports;
