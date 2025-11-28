import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  onAuthStateChanged,
  signInWithCustomToken
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  where, 
  onSnapshot, 
  getDocs,
  writeBatch
} from 'firebase/firestore';
// CHANGED: Using safe, standard icon names to prevent crashes
import { 
  Users, Calendar, ClipboardList, Plus, Trash2, Edit2, 
  Save, Search, Printer, CheckCircle, XCircle, Wallet,
  DollarSign, Clock, Eye, EyeOff
} from 'lucide-react';

// --- CONFIGURATION & SETUP ---

// 1. FOR DEPLOYMENT: YOUR REAL KEYS
const manualConfig = {
  apiKey: "AIzaSyD2Vi6rGdzvUQS3SeiEgfndcP_vIi58Eio",
  authDomain: "paytracker-7f90c.firebaseapp.com",
  projectId: "paytracker-7f90c",
  storageBucket: "paytracker-7f90c.firebasestorage.app",
  messagingSenderId: "1033770418516",
  appId: "1:1033770418516:web:a051c237279237917188c1",
  measurementId: "G-BDLKK32EGE"
};

// 2. AUTOMATIC ENVIRONMENT DETECTION
const isChatEnv = typeof __firebase_config !== 'undefined';
const firebaseConfig = isChatEnv ? JSON.parse(__firebase_config) : manualConfig;

// FIX: Sanitize appId to ensure it is a valid document ID without slashes
// This fixes the "Invalid collection reference" error where slashes created extra path segments.
const rawAppId = typeof __app_id !== 'undefined' ? __app_id : 'default-app';
const appId = rawAppId.replace(/[./]/g, '_'); 

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- Helper Functions ---

const getColl = (name) => {
  if (isChatEnv) {
    return collection(db, 'artifacts', appId, 'public', 'data', name);
  }
  return collection(db, name);
};

const getDatesInRange = (startDate, endDate) => {
  const dates = [];
  let currentDate = new Date(startDate);
  const end = new Date(endDate);
  while (currentDate <= end) {
    dates.push(currentDate.toISOString().split('T')[0]);
    currentDate.setDate(currentDate.getDate() + 1);
  }
  return dates;
};

// --- Components ---

const EmployeeManager = ({ user }) => {
  const [employees, setEmployees] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoanModalOpen, setIsLoanModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState(null);
  
  const [formData, setFormData] = useState({ name: '', gender: 'ប្រុស', phone: '', daily_wage: '' });
  const [loanData, setLoanData] = useState({ employeeId: '', employeeName: '', amount: '', date: new Date().toISOString().split('T')[0], note: '' });

  useEffect(() => {
    if (!user) return;
    const q = query(getColl('employees'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setEmployees(data);
    });
    return () => unsubscribe();
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return;
    try {
      const payload = { ...formData, daily_wage: parseFloat(formData.daily_wage) || 0, updatedAt: new Date().toISOString() };
      if (editingId) {
        const docRef = isChatEnv 
          ? doc(db, 'artifacts', appId, 'public', 'data', 'employees', editingId)
          : doc(db, 'employees', editingId);
        await updateDoc(docRef, payload);
      } else {
        await addDoc(getColl('employees'), { ...payload, createdAt: new Date().toISOString() });
      }
      resetForm();
    } catch (error) {
      console.error(error);
      alert("បរាជ័យក្នុងការរក្សាទុកទិន្នន័យ");
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('តើអ្នកពិតជាចង់លុបឈ្មោះបុគ្គលិកនេះមែនទេ?')) return;
    const docRef = isChatEnv 
      ? doc(db, 'artifacts', appId, 'public', 'data', 'employees', id)
      : doc(db, 'employees', id);
    await deleteDoc(docRef);
  };

  const resetForm = () => {
    setFormData({ name: '', gender: 'ប្រុស', phone: '', daily_wage: '' });
    setEditingId(null);
    setIsModalOpen(false);
  };

  const handleEdit = (emp) => {
    setFormData({ name: emp.name, gender: emp.gender, phone: emp.phone, daily_wage: emp.daily_wage });
    setEditingId(emp.id);
    setIsModalOpen(true);
  };

  const handleLoanSubmit = async (e) => {
    e.preventDefault();
    try {
      await addDoc(getColl('loans'), {
        employeeId: loanData.employeeId,
        employeeName: loanData.employeeName,
        amount: parseFloat(loanData.amount) || 0,
        date: loanData.date,
        note: loanData.note,
        createdAt: new Date().toISOString()
      });
      alert("បានកត់ត្រាការខ្ចីប្រាក់ជោគជ័យ!");
      setIsLoanModalOpen(false);
    } catch (error) {
      alert("បរាជ័យក្នុងការកត់ត្រា");
    }
  };

  const openLoanModal = (emp) => {
    setLoanData({ employeeId: emp.id, employeeName: emp.name, amount: '', date: new Date().toISOString().split('T')[0], note: '' });
    setIsLoanModalOpen(true);
  };

  const filteredEmployees = employees.filter(emp => emp.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-slate-800">ការគ្រប់គ្រងបុគ្គលិក</h2>
        <button onClick={() => setIsModalOpen(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 font-medium">
          <Plus size={18} /> បន្ថែមបុគ្គលិក
        </button>
      </div>

      <div className="mb-4 relative">
        <Search className="absolute left-3 top-2.5 text-slate-400" size={20} />
        <input type="text" placeholder="ស្វែងរកតាមឈ្មោះ..." className="w-full pl-10 pr-4 py-2 border rounded-lg outline-none" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
      </div>

      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-100 text-slate-600 uppercase text-xs font-semibold">
            <tr>
              <th className="p-4">ឈ្មោះ</th>
              <th className="p-4">ភេទ</th>
              <th className="p-4">លេខទូរស័ព្ទ</th>
              <th className="p-4">ប្រាក់ឈ្នួល (៛)</th>
              <th className="p-4 text-right">សកម្មភាព</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredEmployees.map(emp => (
              <tr key={emp.id} className="hover:bg-slate-50">
                <td className="p-4 font-medium text-slate-800">{emp.name}</td>
                <td className="p-4 text-slate-600">{emp.gender}</td>
                <td className="p-4 text-slate-600">{emp.phone}</td>
                <td className="p-4 text-green-600 font-semibold">{Number(emp.daily_wage).toLocaleString()} ៛</td>
                <td className="p-4 text-right flex justify-end gap-2">
                  <button onClick={() => openLoanModal(emp)} className="bg-orange-100 text-orange-600 p-2 rounded hover:bg-orange-200"><Wallet size={18} /></button>
                  <button onClick={() => handleEdit(emp)} className="bg-blue-50 text-blue-600 p-2 rounded hover:bg-blue-100"><Edit2 size={18} /></button>
                  <button onClick={() => handleDelete(emp.id)} className="bg-red-50 text-red-600 p-2 rounded hover:bg-red-100"><Trash2 size={18} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-md shadow-xl">
            <h3 className="text-xl font-bold mb-4">{editingId ? 'កែប្រែព័ត៌មាន' : 'បន្ថែមបុគ្គលិកថ្មី'}</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div><label className="block text-sm font-medium mb-1">ឈ្មោះ</label><input required className="w-full border p-2 rounded" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium mb-1">ភេទ</label><select className="w-full border p-2 rounded" value={formData.gender} onChange={e => setFormData({...formData, gender: e.target.value})}><option value="ប្រុស">ប្រុស</option><option value="ស្រី">ស្រី</option></select></div>
                <div><label className="block text-sm font-medium mb-1">លេខទូរស័ព្ទ</label><input className="w-full border p-2 rounded" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} /></div>
              </div>
              <div><label className="block text-sm font-medium mb-1">ប្រាក់ឈ្នួល (៛)</label><input required type="number" step="100" className="w-full border p-2 rounded" value={formData.daily_wage} onChange={e => setFormData({...formData, daily_wage: e.target.value})} /></div>
              <div className="flex justify-end gap-3 mt-6"><button type="button" onClick={resetForm} className="px-4 py-2 bg-slate-100 rounded">បោះបង់</button><button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded">រក្សាទុក</button></div>
            </form>
          </div>
        </div>
      )}
      
      {isLoanModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-md shadow-xl">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2"><Wallet className="text-orange-500" /> ខ្ចីប្រាក់</h3>
            <p className="mb-4 text-slate-600">បុគ្គលិក: <b>{loanData.employeeName}</b></p>
            <form onSubmit={handleLoanSubmit} className="space-y-4">
              <div><label className="block text-sm font-medium mb-1">ចំនួនទឹកប្រាក់ (៛)</label><input required type="number" step="100" className="w-full border p-2 rounded font-bold text-orange-600" value={loanData.amount} onChange={e => setLoanData({...loanData, amount: e.target.value})} /></div>
              <div><label className="block text-sm font-medium mb-1">កាលបរិច្ឆេទ</label><input required type="date" className="w-full border p-2 rounded" value={loanData.date} onChange={e => setLoanData({...loanData, date: e.target.value})} /></div>
              <div><label className="block text-sm font-medium mb-1">កំណត់សម្គាល់</label><textarea className="w-full border p-2 rounded" value={loanData.note} onChange={e => setLoanData({...loanData, note: e.target.value})} /></div>
              <div className="flex justify-end gap-3 mt-6"><button type="button" onClick={() => setIsLoanModalOpen(false)} className="px-4 py-2 bg-slate-100 rounded">បោះបង់</button><button type="submit" className="px-4 py-2 bg-orange-600 text-white rounded">រក្សាទុក</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const AttendanceSystem = ({ user }) => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [employees, setEmployees] = useState([]);
  const [attendanceData, setAttendanceData] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    const q = query(getColl('employees'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setEmployees(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!user || !selectedDate) return;
    setLoading(true);
    const q = query(getColl('attendance'), where('date', '==', selectedDate));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const mapping = {};
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        mapping[data.employeeId] = { docId: doc.id, morning: data.morning, afternoon: data.afternoon };
      });
      setAttendanceData(mapping);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user, selectedDate]);

  const toggleAttendance = (employeeId, session) => {
    const current = attendanceData[employeeId] || { morning: false, afternoon: false };
    setAttendanceData({ ...attendanceData, [employeeId]: { ...current, [session]: !current[session] } });
  };

  const handleBulkSave = async () => {
    setLoading(true);
    const batch = writeBatch(db);
    try {
      employees.forEach(emp => {
        const status = attendanceData[emp.id] || { morning: false, afternoon: false };
        const existingRecord = attendanceData[emp.id];
        const payload = {
          employeeId: emp.id, employeeName: emp.name, dailyWageAtTime: emp.daily_wage,
          date: selectedDate, morning: status.morning || false, afternoon: status.afternoon || false,
        };
        if (existingRecord && existingRecord.docId) {
           const docRef = isChatEnv 
             ? doc(db, 'artifacts', appId, 'public', 'data', 'attendance', existingRecord.docId)
             : doc(db, 'attendance', existingRecord.docId);
           batch.update(docRef, payload);
        } else {
           const docRef = isChatEnv 
             ? doc(collection(db, 'artifacts', appId, 'public', 'data', 'attendance'))
             : doc(collection(db, 'attendance'));
           batch.set(docRef, payload);
        }
      });
      await batch.commit();
      alert("បានរក្សាទុកដោយជោគជ័យ!");
    } catch (err) {
      console.error(err);
      alert("មានបញ្ហាក្នុងការរក្សាទុក");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <h2 className="text-2xl font-bold text-slate-800">វត្តមានប្រចាំថ្ងៃ</h2>
        <div className="flex items-center gap-4 bg-white p-2 rounded-lg shadow-sm border">
          <label className="text-sm font-semibold text-slate-600">កាលបរិច្ឆេទ:</label>
          <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="outline-none text-slate-800"/>
        </div>
      </div>
      <div className="bg-white rounded-xl shadow overflow-hidden mb-6">
        <table className="w-full text-left">
          <thead className="bg-indigo-50 text-indigo-900 uppercase text-xs font-bold">
            <tr><th className="p-4">ឈ្មោះបុគ្គលិក</th><th className="p-4 text-center">ព្រឹក (0.5)</th><th className="p-4 text-center">រសៀល (0.5)</th><th className="p-4 text-center">ស្ថានភាព</th></tr>
          </thead>
          <tbody className="divide-y divide-indigo-50">
            {employees.map(emp => {
              const record = attendanceData[emp.id] || { morning: false, afternoon: false };
              const isPresent = record.morning || record.afternoon;
              return (
                <tr key={emp.id} className={isPresent ? 'bg-white' : 'bg-slate-50'}>
                  <td className="p-4 font-medium text-slate-800">{emp.name}</td>
                  <td className="p-4 text-center"><button onClick={() => toggleAttendance(emp.id, 'morning')} className={`p-2 rounded-full transition ${record.morning ? 'bg-green-100 text-green-600' : 'bg-slate-200 text-slate-400'}`}><CheckCircle size={24} className={record.morning ? 'fill-current' : ''} /></button></td>
                  <td className="p-4 text-center"><button onClick={() => toggleAttendance(emp.id, 'afternoon')} className={`p-2 rounded-full transition ${record.afternoon ? 'bg-green-100 text-green-600' : 'bg-slate-200 text-slate-400'}`}><CheckCircle size={24} className={record.afternoon ? 'fill-current' : ''} /></button></td>
                  <td className="p-4 text-center font-bold text-sm">{record.morning && record.afternoon ? <span className="text-green-600 bg-green-50 px-2 py-1 rounded">ពេញមួយថ្ងៃ</span> : record.morning || record.afternoon ? <span className="text-orange-600 bg-orange-50 px-2 py-1 rounded">កន្លះថ្ងៃ</span> : <span className="text-slate-400">អវត្តមាន</span>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="fixed bottom-6 right-6"><button onClick={handleBulkSave} disabled={loading} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-full shadow-lg flex items-center gap-2 font-bold transition transform hover:scale-105">{loading ? 'កំពុងរក្សាទុក...' : <><Save size={20} /> រក្សាទុកការផ្លាស់ប្តូរ</>}</button></div>
    </div>
  );
};

const Reports = ({ user }) => {
  const [dateRange, setDateRange] = useState({ start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0], end: new Date().toISOString().split('T')[0] });
  const [employees, setEmployees] = useState([]);
  const [reportData, setReportData] = useState([]);
  const [detailedLoans, setDetailedLoans] = useState([]);
  const [employeeStats, setEmployeeStats] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showFinancials, setShowFinancials] = useState(true);

  useEffect(() => {
    if (!user) return;
    const q = query(getColl('employees'));
    const unsubscribe = onSnapshot(q, (snapshot) => { setEmployees(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))); });
    return () => unsubscribe();
  }, [user]);

  const generateReport = async () => {
    if (!user) return;
    setLoading(true);
    setReportData([]); setDetailedLoans([]); setEmployeeStats([]);

    try {
      const qAtt = query(getColl('attendance'), where('date', '>=', dateRange.start), where('date', '<=', dateRange.end));
      const attSnapshot = await getDocs(qAtt);
      const qLoan = query(getColl('loans'), where('date', '>=', dateRange.start), where('date', '<=', dateRange.end));
      const loanSnapshot = await getDocs(qLoan);

      const aggregation = {}; const loansList = []; const attendanceByDate = {};
      loanSnapshot.docs.forEach(doc => {
        const data = doc.data();
        loansList.push({ id: doc.id, ...data });
        if (!aggregation[data.employeeId]) aggregation[data.employeeId] = { id: data.employeeId, name: data.employeeName || 'Unknown', wage: 0, days: 0, grossPay: 0, loanTotal: 0, netPay: 0 };
        aggregation[data.employeeId].loanTotal += (data.amount || 0);
      });

      attSnapshot.docs.forEach(doc => {
        const data = doc.data();
        const empId = data.employeeId;
        if (!aggregation[empId]) aggregation[empId] = { id: empId, name: data.employeeName || 'Unknown', wage: data.dailyWageAtTime || 0, days: 0, grossPay: 0, loanTotal: 0, netPay: 0 };
        else if (aggregation[empId].wage === 0) aggregation[empId].wage = data.dailyWageAtTime;

        let dayValue = 0; if (data.morning) dayValue += 0.5; if (data.afternoon) dayValue += 0.5;
        aggregation[empId].days += dayValue;
        aggregation[empId].grossPay += (dayValue * (data.dailyWageAtTime || 0));

        if (!attendanceByDate[data.date]) attendanceByDate[data.date] = {};
        attendanceByDate[data.date][empId] = { morning: data.morning, afternoon: data.afternoon };
      });

      Object.values(aggregation).forEach(emp => { emp.netPay = emp.grossPay - emp.loanTotal; });
      setReportData(Object.values(aggregation));
      setDetailedLoans(loansList.sort((a,b) => a.date.localeCompare(b.date)));

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
      alert("បរាជ័យក្នុងការបង្កើតរបាយការណ៍");
    } finally {
      setLoading(false);
    }
  };

  const totalGross = reportData.reduce((acc, curr) => acc + curr.grossPay, 0);
  const totalLoans = reportData.reduce((acc, curr) => acc + curr.loanTotal, 0);
  const totalNet = reportData.reduce((acc, curr) => acc + curr.netPay, 0);

  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row justify-between items-start mb-6 print:hidden gap-4">
        <div className="flex items-center gap-3">
           <h2 className="text-2xl font-bold text-slate-800">របាយការណ៍</h2>
           <button onClick={() => setShowFinancials(!showFinancials)} className={`p-2 rounded-full transition ${showFinancials ? 'bg-slate-200 text-slate-600' : 'bg-slate-800 text-white'}`}>
             {showFinancials ? <Eye size={20} /> : <EyeOff size={20} />}
           </button>
        </div>
        <div className="flex flex-wrap gap-4 items-end bg-white p-4 rounded-lg shadow-sm border w-full md:w-auto">
          <div><label className="block text-xs font-bold text-slate-500 mb-1">ចាប់ពី</label><input type="date" className="border p-2 rounded text-sm w-36" value={dateRange.start} onChange={e => setDateRange({...dateRange, start: e.target.value})} /></div>
          <div><label className="block text-xs font-bold text-slate-500 mb-1">ដល់</label><input type="date" className="border p-2 rounded text-sm w-36" value={dateRange.end} onChange={e => setDateRange({...dateRange, end: e.target.value})} /></div>
          <button onClick={generateReport} className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 font-medium text-sm">{loading ? 'កំពុងដំណើរការ...' : 'បង្ហាញ'}</button>
          <button onClick={() => window.print()} className="bg-slate-800 text-white px-4 py-2 rounded hover:bg-slate-900 font-medium text-sm flex items-center gap-2"><Printer size={16} /> បោះពុម្ព</button>
        </div>
      </div>

      <div className="bg-white p-8 rounded-xl shadow-lg print:shadow-none print:p-0">
        <div className="text-center mb-8 hidden print:block">
          <h1 className="text-3xl font-bold text-slate-900">{showFinancials ? 'តារាងបើកប្រាក់ខែ' : 'សង្ខេបប្រាក់ខែ (Privacy Mode)'}</h1>
          <p className="text-slate-500">កាលបរិច្ឆេទ: {dateRange.start} ដល់ {dateRange.end}</p>
        </div>

        <table className="w-full text-left border-collapse mb-8">
          <thead>
            <tr className="border-b-2 border-slate-200 bg-slate-50 print:bg-transparent">
              <th className="py-3 px-2 text-slate-600 font-bold uppercase text-sm">ឈ្មោះបុគ្គលិក</th>
              <th className="py-3 px-2 text-slate-600 font-bold uppercase text-sm text-center">ថ្ងៃធ្វើការ</th>
              <th className="py-3 px-2 text-slate-600 font-bold uppercase text-sm text-right">ប្រាក់សរុប (Gross)</th>
              <th className="py-3 px-2 text-red-600 font-bold uppercase text-sm text-right">ប្រាក់ខ្ចី (Loan)</th>
              <th className="py-3 px-2 text-green-700 font-bold uppercase text-sm text-right">ប្រាក់ត្រូវបើក (Net)</th>
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
              <td colSpan="2" className="py-4 px-2 text-right font-bold text-slate-800">សរុបរួម (Totals):</td>
              <td className="py-4 px-2 text-right font-bold text-slate-600">{totalGross.toLocaleString()} ៛</td>
              <td className="py-4 px-2 text-right font-bold text-red-600">-{totalLoans.toLocaleString()} ៛</td>
              <td className="py-4 px-2 text-right font-bold text-2xl text-slate-900">{totalNet.toLocaleString()} ៛</td>
            </tr>
          </tfoot>
        </table>

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
             <table className="w-full text-left text-sm border-collapse">
               <thead><tr className="border-b border-slate-200 text-slate-500"><th className="py-2 px-2">កាលបរិច្ឆេទ</th><th className="py-2 px-2">ឈ្មោះបុគ្គលិក</th><th className="py-2 px-2">កំណត់សម្គាល់</th><th className="py-2 px-2 text-right">ចំនួនទឹកប្រាក់</th></tr></thead>
               <tbody className="divide-y divide-slate-100">
                 {detailedLoans.map(loan => (
                   <tr key={loan.id} className="hover:bg-slate-50">
                     <td className="py-2 px-2 text-slate-600">{loan.date}</td>
                     <td className="py-2 px-2 font-medium">{loan.employeeName}</td>
                     <td className="py-2 px-2 text-slate-500 italic">{loan.note || '-'}</td>
                     <td className="py-2 px-2 text-right font-bold text-red-500">{loan.amount.toLocaleString()} ៛</td>
                   </tr>
                 ))}
               </tbody>
             </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default function App() {
  const [user, setUser] = useState(null);
  const [currentView, setCurrentView] = useState('attendance'); 

  useEffect(() => {
    // START ANONYMOUS AUTH AUTOMATICALLY
    const initAuth = async () => {
      // Check if we are in chat env and have a custom token
      if (isChatEnv && typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
        try {
          await signInWithCustomToken(auth, __initial_auth_token);
        } catch (err) {
          console.error("Custom token auth failed, falling back to anon", err);
          await signInAnonymously(auth);
        }
      } else {
        await signInAnonymously(auth);
      }
    };
    initAuth().catch((error) => console.error("Auth Failed", error));
    
    const unsubscribe = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsubscribe();
  }, []);

  if (!user) return <div className="flex h-screen items-center justify-center text-slate-500">កំពុងដំណើរការ...</div>;

  return (
    <div className="min-h-screen bg-slate-100 font-sans text-slate-900 flex" style={{ fontFamily: "'Hanuman', 'Noto Sans Khmer', system-ui, sans-serif" }}>
      <aside className="w-64 bg-slate-900 text-slate-300 flex-shrink-0 flex flex-col print:hidden transition-all">
        <div className="p-6"><h1 className="text-white font-bold text-xl flex items-center gap-2"><DollarSign className="text-green-400" /> PayTracker</h1></div>
        <nav className="flex-1 px-4 space-y-2">
          <button onClick={() => setCurrentView('attendance')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${currentView === 'attendance' ? 'bg-indigo-600 text-white' : 'hover:bg-slate-800'}`}><Calendar size={20} /> វត្តមាន</button>
          <button onClick={() => setCurrentView('employees')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${currentView === 'employees' ? 'bg-indigo-600 text-white' : 'hover:bg-slate-800'}`}><Users size={20} /> បុគ្គលិក</button>
          <button onClick={() => setCurrentView('reports')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${currentView === 'reports' ? 'bg-indigo-600 text-white' : 'hover:bg-slate-800'}`}><ClipboardList size={20} /> របាយការណ៍</button>
        </nav>
        <div className="p-6 text-xs text-slate-500">v1.5.0 Production</div>
      </aside>
      <main className="flex-1 overflow-auto print:overflow-visible h-screen print:h-auto print:bg-white print:w-full">
        {currentView === 'employees' && <EmployeeManager user={user} />}
        {currentView === 'attendance' && <AttendanceSystem user={user} />}
        {currentView === 'reports' && <Reports user={user} />}
      </main>
    </div>
  );
}