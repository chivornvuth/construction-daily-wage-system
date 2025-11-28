import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInAnonymously,
  signOut
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
import { 
  Users, Calendar, ClipboardList, Plus, Trash2, Edit2, 
  Save, Search, Printer, CheckCircle, XCircle, Wallet,
  DollarSign, Clock, Eye, EyeOff, Menu, X, LogOut, Lock, Mail, User, Check
} from 'lucide-react';

// --- CONFIGURATION & SETUP ---

const manualConfig = {
  apiKey: "AIzaSyD2Vi6rGdzvUQS3SeiEgfndcP_vIi58Eio",
  authDomain: "គ្រប់គ្រងបុគ្គលិក-7f90c.firebaseapp.com",
  projectId: "គ្រប់គ្រងបុគ្គលិក-7f90c",
  storageBucket: "គ្រប់គ្រងបុគ្គលិក-7f90c.firebasestorage.app",
  messagingSenderId: "1033770418516",
  appId: "1:1033770418516:web:a051c237279237917188c1",
  measurementId: "G-BDLKK32EGE"
};

const isChatEnv = typeof __firebase_config !== 'undefined';
const firebaseConfig = isChatEnv ? JSON.parse(__firebase_config) : manualConfig;
const rawAppId = typeof __app_id !== 'undefined' ? __app_id : 'default-app';
const appId = rawAppId.replace(/[./]/g, '_'); 

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

// --- UI Components ---

// NEW: Reusable Notification Toast Component
const Toast = ({ message, type = 'success', onClose }) => {
  if (!message) return null;
  return (
    <div className={`fixed top-4 right-4 z-[100] flex items-center gap-3 px-6 py-4 rounded-lg shadow-2xl animate-bounce-in transition-all duration-300 ${type === 'error' ? 'bg-red-600 text-white' : 'bg-green-600 text-white'}`}>
      {type === 'error' ? <XCircle size={24} /> : <CheckCircle size={24} />}
      <div>
        <h4 className="font-bold text-sm">{type === 'error' ? 'បរាជ័យ' : 'ជោគជ័យ'}</h4>
        <p className="text-sm opacity-90">{message}</p>
      </div>
      <button onClick={onClose} className="ml-4 opacity-70 hover:opacity-100"><X size={18} /></button>
    </div>
  );
};

// --- Auth Component ---

const LoginScreen = () => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAuth = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isRegistering) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err) {
      console.error(err);
      if (err.code === 'auth/invalid-credential') setError("អ៊ីមែល ឬ ពាក្យសម្ងាត់មិនត្រឹមត្រូវ");
      else if (err.code === 'auth/email-already-in-use') setError("អ៊ីមែលនេះត្រូវបានប្រើរួចហើយ");
      else if (err.code === 'auth/weak-password') setError("ពាក្យសម្ងាត់ត្រូវមានយ៉ាងតិច 6 តួ");
      else if (err.code === 'auth/operation-not-allowed') setError("សូមបើកដំណើរការ Login ក្នុង Firebase Console ជាមុនសិន");
      else setError("មានបញ្ហា (Error): " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    setLoading(true);
    setError('');
    try {
      await signInAnonymously(auth);
    } catch (err) {
      console.error(err);
      if (err.code === 'auth/operation-not-allowed') setError("សូមបើកដំណើរការ Anonymous Login ក្នុង Firebase Console");
      else setError("បរាជ័យក្នុងការចូលជាភ្ញៀវ");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 font-sans" style={{ fontFamily: "'Hanuman', sans-serif" }}>
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-slate-200">
        <div className="text-center mb-6">
          <div className="bg-indigo-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <DollarSign className="text-indigo-600" size={32} />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">គ្រប់គ្រងបុគ្គលិក</h1>
          <p className="text-slate-500 mt-2">{isRegistering ? 'បង្កើតគណនីថ្មី' : 'ចូលប្រើប្រាស់ប្រព័ន្ធ'}</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm flex items-center gap-2">
            <XCircle size={16} /> {error}
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">អ៊ីមែល</label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 text-slate-400" size={18} />
              <input type="email" required className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition" placeholder="example@gmail.com" value={email} onChange={(e) => setEmail(e.target.value)}/>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">ពាក្យសម្ងាត់</label>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 text-slate-400" size={18} />
              <input type="password" required className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)}/>
            </div>
          </div>
          <button type="submit" disabled={loading} className="w-full bg-indigo-600 text-white py-2.5 rounded-lg font-bold hover:bg-indigo-700 transition transform active:scale-95 disabled:opacity-50">
            {loading ? 'កំពុងដំណើរការ...' : (isRegistering ? 'បង្កើតគណនី (Register)' : 'ចូលប្រព័ន្ធ (Login)')}
          </button>
        </form>

        <div className="my-6 flex items-center">
            <div className="flex-grow border-t border-slate-300"></div>
            <span className="flex-shrink-0 mx-4 text-slate-400 text-sm">ឬ</span>
            <div className="flex-grow border-t border-slate-300"></div>
        </div>

        <button onClick={handleGuestLogin} type="button" className="w-full bg-slate-100 text-slate-700 py-2.5 rounded-lg font-bold hover:bg-slate-200 transition flex items-center justify-center gap-2 mb-4">
            <User size={18} /> ចូលមើលជាភ្ញៀវ (Guest Mode)
        </button>

        <div className="text-center mt-2">
          <button onClick={() => { setIsRegistering(!isRegistering); setError(''); }} className="text-sm text-indigo-600 hover:underline font-medium">
            {isRegistering ? 'ត្រឡប់ទៅការចូលប្រព័ន្ធវិញ' : 'មិនទាន់មានគណនី? ចុចបង្កើតថ្មី'}
          </button>
        </div>
      </div>
    </div>
  );
};

// --- Main Application Components ---

// ... keep imports

const EmployeeManager = ({ user }) => {
  const [employees, setEmployees] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal States
  const [isEmpModalOpen, setIsEmpModalOpen] = useState(false);
  const [editingEmp, setEditingEmp] = useState(null);
  const [empFormData, setEmpFormData] = useState({ name: '', gender: 'ប្រុស', phone: '', daily_wage: '' });

  // LOAN SYSTEM STATE
  const [loanModalData, setLoanModalData] = useState(null); // Stores the selected employee object
  const [loanHistory, setLoanHistory] = useState([]);
  const [loanForm, setLoanForm] = useState({ amount: '', date: new Date().toISOString().split('T')[0], note: '' });
  const [loadingLoans, setLoadingLoans] = useState(false);

  // Notification State
  const [toast, setToast] = useState(null);
  const showToast = (msg, type = 'success') => {
    setToast({ message: msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // --- EMPLOYEE FETCHING ---
  useEffect(() => {
    if (!user) return;
    const q = query(getColl('employees'), where('ownerId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setEmployees(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, [user]);

  // --- LOAN FETCHING (When Modal Opens) ---
  useEffect(() => {
    if (!user || !loanModalData) return;
    
    setLoadingLoans(true);
    const q = query(
        getColl('loans'), 
        where('ownerId', '==', user.uid), 
        where('employeeId', '==', loanModalData.id)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loans = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Sort by date descending (newest first)
      loans.sort((a, b) => new Date(b.date) - new Date(a.date));
      setLoanHistory(loans);
      setLoadingLoans(false);
    });

    return () => unsubscribe();
  }, [user, loanModalData]);

  // --- ACTIONS ---

  const handleEmpSubmit = async (e) => {
    e.preventDefault();
    if (!user) return;
    try {
      const payload = { 
        ...empFormData, 
        daily_wage: parseFloat(empFormData.daily_wage) || 0, 
        ownerId: user.uid,
        updatedAt: new Date().toISOString() 
      };
      
      if (editingEmp) {
        const docRef = isChatEnv 
          ? doc(db, 'artifacts', appId, 'public', 'data', 'employees', editingEmp)
          : doc(db, 'employees', editingEmp);
        await updateDoc(docRef, payload);
      } else {
        await addDoc(getColl('employees'), { 
          ...payload, 
          createdAt: new Date().toISOString() 
        });
      }
      showToast("បានរក្សាទុកព័ត៌មានបុគ្គលិកជោគជ័យ!");
      closeEmpModal();
    } catch (error) {
      console.error(error);
      showToast("បរាជ័យក្នុងការរក្សាទុក", 'error');
    }
  };

  const handleAddLoan = async (e) => {
    e.preventDefault();
    if (!loanModalData) return;

    try {
      await addDoc(getColl('loans'), {
        employeeId: loanModalData.id,
        employeeName: loanModalData.name,
        amount: parseFloat(loanForm.amount) || 0,
        date: loanForm.date,
        note: loanForm.note,
        ownerId: user.uid,
        createdAt: new Date().toISOString()
      });
      showToast("បានកត់ត្រាការខ្ចីប្រាក់!");
      // Reset form but keep modal open
      setLoanForm({ ...loanForm, amount: '', note: '' }); 
    } catch (error) {
      showToast("បរាជ័យក្នុងការកត់ត្រា", 'error');
    }
  };

  const handleDeleteLoan = async (loanId) => {
    if(!confirm("តើអ្នកចង់លុបការខ្ចីប្រាក់នេះមែនទេ?")) return;
    try {
        const docRef = isChatEnv 
            ? doc(db, 'artifacts', appId, 'public', 'data', 'loans', loanId)
            : doc(db, 'loans', loanId);
        await deleteDoc(docRef);
        showToast("បានលុបជោគជ័យ");
    } catch (err) {
        showToast("បរាជ័យក្នុងការលុប", 'error');
    }
  }

  const handleDeleteEmp = async (id) => {
    if (!confirm('តើអ្នកពិតជាចង់លុបឈ្មោះបុគ្គលិកនេះមែនទេ?')) return;
    const docRef = isChatEnv 
      ? doc(db, 'artifacts', appId, 'public', 'data', 'employees', id)
      : doc(db, 'employees', id);
    await deleteDoc(docRef);
    showToast("បានលុបឈ្មោះបុគ្គលិកជោគជ័យ!");
  };

  // --- MODAL HELPERS ---
  const openEmpModal = (emp = null) => {
    if (emp) {
      setEditingEmp(emp.id);
      setEmpFormData({ name: emp.name, gender: emp.gender, phone: emp.phone, daily_wage: emp.daily_wage });
    } else {
      setEditingEmp(null);
      setEmpFormData({ name: '', gender: 'ប្រុស', phone: '', daily_wage: '' });
    }
    setIsEmpModalOpen(true);
  };

  const closeEmpModal = () => {
    setIsEmpModalOpen(false);
    setEditingEmp(null);
  };

  const openLoanModal = (emp) => {
    setLoanModalData(emp);
    setLoanForm({ amount: '', date: new Date().toISOString().split('T')[0], note: '' });
  };

  const filteredEmployees = employees.filter(emp => emp.name.toLowerCase().includes(searchTerm.toLowerCase()));
  const totalBorrowed = loanHistory.reduce((acc, curr) => acc + (curr.amount || 0), 0);

  return (
    <div className="p-4 md:p-6 pb-24 relative">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-[100] flex items-center gap-3 px-6 py-4 rounded-lg shadow-2xl animate-bounce-in text-white ${toast.type === 'error' ? 'bg-red-600' : 'bg-green-600'}`}>
            {toast.type === 'error' ? <XCircle size={24} /> : <CheckCircle size={24} />}
            <div>{toast.message}</div>
        </div>
       )}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h2 className="text-2xl font-bold text-slate-800">ការគ្រប់គ្រងបុគ្គលិក</h2>
        <button onClick={() => openEmpModal()} className="w-full sm:w-auto bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-blue-700 font-medium shadow-sm">
          <Plus size={18} /> បន្ថែមបុគ្គលិក
        </button>
      </div>

      <div className="mb-4 relative">
        <Search className="absolute left-3 top-2.5 text-slate-400" size={20} />
        <input type="text" placeholder="ស្វែងរកតាមឈ្មោះ..." className="w-full pl-10 pr-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
      </div>

      <div className="bg-white rounded-xl shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left whitespace-nowrap">
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
                    <button onClick={() => openLoanModal(emp)} className="bg-orange-100 text-orange-600 p-2 rounded hover:bg-orange-200" title="Loan"><Wallet size={18} /></button>
                    <button onClick={() => openEmpModal(emp)} className="bg-blue-50 text-blue-600 p-2 rounded hover:bg-blue-100" title="Edit"><Edit2 size={18} /></button>
                    <button onClick={() => handleDeleteEmp(emp.id)} className="bg-red-50 text-red-600 p-2 rounded hover:bg-red-100" title="Delete"><Trash2 size={18} /></button>
                  </td>
                </tr>
              ))}
              {filteredEmployees.length === 0 && (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-slate-400">មិនមានទិន្នន័យបុគ្គលិក</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- EMPLOYEE MODAL (ADD/EDIT) --- */}
      {isEmpModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white p-6 rounded-lg w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4">{editingEmp ? 'កែប្រែព័ត៌មាន' : 'បន្ថែមបុគ្គលិកថ្មី'}</h3>
            <form onSubmit={handleEmpSubmit} className="space-y-4">
              <div><label className="block text-sm font-medium mb-1">ឈ្មោះ</label><input required className="w-full border p-2 rounded" value={empFormData.name} onChange={e => setEmpFormData({...empFormData, name: e.target.value})} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium mb-1">ភេទ</label><select className="w-full border p-2 rounded" value={empFormData.gender} onChange={e => setEmpFormData({...empFormData, gender: e.target.value})}><option value="ប្រុស">ប្រុស</option><option value="ស្រី">ស្រី</option></select></div>
                <div><label className="block text-sm font-medium mb-1">លេខទូរស័ព្ទ</label><input className="w-full border p-2 rounded" value={empFormData.phone} onChange={e => setEmpFormData({...empFormData, phone: e.target.value})} /></div>
              </div>
              <div><label className="block text-sm font-medium mb-1">ប្រាក់ឈ្នួល (៛)</label><input required type="number" step="100" className="w-full border p-2 rounded" value={empFormData.daily_wage} onChange={e => setEmpFormData({...empFormData, daily_wage: e.target.value})} /></div>
              <div className="flex justify-end gap-3 mt-6"><button type="button" onClick={closeEmpModal} className="px-4 py-2 bg-slate-100 rounded">បោះបង់</button><button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded">រក្សាទុក</button></div>
            </form>
          </div>
        </div>
      )}
      
      {/* --- LOAN MANAGEMENT MODAL (NEW IMPROVED) --- */}
      {loanModalData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Header */}
            <div className="bg-slate-900 text-white p-4 flex justify-between items-center shrink-0">
                <div>
                    <h3 className="text-lg font-bold flex items-center gap-2"><Wallet className="text-orange-400" /> គ្រប់គ្រងប្រាក់ខ្ចី</h3>
                    <p className="text-slate-400 text-sm">បុគ្គលិក: <span className="text-white font-bold">{loanModalData.name}</span></p>
                </div>
                <button onClick={() => setLoanModalData(null)} className="p-2 hover:bg-white/10 rounded-full"><X size={24} /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-50">
                {/* 1. Add Loan Form */}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6">
                    <h4 className="font-bold text-slate-800 mb-3 text-sm uppercase tracking-wide">កត់ត្រាការខ្ចីថ្មី</h4>
                    <form onSubmit={handleAddLoan} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                         <div className="md:col-span-4">
                            <label className="block text-xs font-bold text-slate-500 mb-1">ចំនួន (៛)</label>
                            <input required type="number" step="100" placeholder="0" className="w-full border border-slate-300 p-2 rounded-lg font-bold text-orange-600 focus:ring-2 focus:ring-orange-500 outline-none" value={loanForm.amount} onChange={e => setLoanForm({...loanForm, amount: e.target.value})} />
                         </div>
                         <div className="md:col-span-4">
                            <label className="block text-xs font-bold text-slate-500 mb-1">កាលបរិច្ឆេទ</label>
                            <input required type="date" className="w-full border border-slate-300 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" value={loanForm.date} onChange={e => setLoanForm({...loanForm, date: e.target.value})} />
                         </div>
                         <div className="md:col-span-4">
                            <label className="block text-xs font-bold text-slate-500 mb-1">ចំណាំ</label>
                            <input type="text" placeholder="..." className="w-full border border-slate-300 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" value={loanForm.note} onChange={e => setLoanForm({...loanForm, note: e.target.value})} />
                         </div>
                         <div className="md:col-span-12 mt-2">
                             <button type="submit" className="w-full bg-slate-800 text-white py-2 rounded-lg font-bold hover:bg-slate-900 transition flex items-center justify-center gap-2">
                                <Plus size={18} /> បន្ថែម
                             </button>
                         </div>
                    </form>
                </div>

                {/* 2. History List */}
                <div>
                    <div className="flex justify-between items-center mb-3">
                        <h4 className="font-bold text-slate-800 text-sm uppercase tracking-wide">ប្រវត្តិខ្ចីប្រាក់</h4>
                        <div className="bg-red-50 text-red-600 px-3 py-1 rounded-full text-xs font-bold border border-red-100">
                            សរុប: {totalBorrowed.toLocaleString()} ៛
                        </div>
                    </div>
                    
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-100 text-slate-500 font-semibold border-b">
                                <tr>
                                    <th className="p-3">កាលបរិច្ឆេទ</th>
                                    <th className="p-3">ចំនួន</th>
                                    <th className="p-3">ចំណាំ</th>
                                    <th className="p-3 text-right">លុប</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {loadingLoans ? (
                                    <tr><td colSpan={4} className="p-4 text-center text-slate-400">កំពុងផ្ទុក...</td></tr>
                                ) : loanHistory.length === 0 ? (
                                    <tr><td colSpan={4} className="p-8 text-center text-slate-400 flex flex-col items-center gap-2"><ClipboardList size={24} opacity={0.5}/> មិនទាន់មានទិន្នន័យ</td></tr>
                                ) : (
                                    loanHistory.map(loan => (
                                        <tr key={loan.id} className="hover:bg-slate-50">
                                            <td className="p-3 text-slate-600">{loan.date}</td>
                                            <td className="p-3 font-bold text-red-500">{loan.amount.toLocaleString()} ៛</td>
                                            <td className="p-3 text-slate-500 italic max-w-[150px] truncate">{loan.note || '-'}</td>
                                            <td className="p-3 text-right">
                                                <button onClick={() => handleDeleteLoan(loan.id)} className="text-slate-400 hover:text-red-500 transition p-1 rounded-md hover:bg-red-50">
                                                    <Trash2 size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ... (Keep existing imports)
import { 
  ChevronLeft, ChevronRight, Calendar as CalendarIcon 
} from 'lucide-react'; // Add these icons to imports if missing

// ... (Keep Helper Functions)

const AttendanceSystem = ({ user }) => {
  // State for the Monday of the current week
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    return new Date(d.setDate(diff)).toISOString().split('T')[0];
  });

  const [employees, setEmployees] = useState([]);
  const [attendanceData, setAttendanceData] = useState({});
  const [loading, setLoading] = useState(false);
  
  // Notification State (Local)
  const [toast, setToast] = useState(null);

  // Helper: Get array of 7 dates starting from currentWeekStart
  const getWeekDays = () => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(currentWeekStart);
      d.setDate(d.getDate() + i);
      days.push(d.toISOString().split('T')[0]);
    }
    return days;
  };

  const weekDays = getWeekDays();
  const khmerDays = ['អាទិត្យ', 'ចន្ទ', 'អង្គារ', 'ពុធ', 'ព្រហស្បតិ៍', 'សុក្រ', 'សៅរ៍'];

  // Fetch Employees
  useEffect(() => {
    if (!user) return;
    const q = query(getColl('employees'), where('ownerId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setEmployees(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, [user]);

  // Fetch Attendance for the whole week
  useEffect(() => {
    if (!user) return;
    setLoading(true);
    
    // Client-side filtering to avoid index issues
    const q = query(getColl('attendance'), where('ownerId', '==', user.uid));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const mapping = {};
      const start = weekDays[0];
      const end = weekDays[6];

      snapshot.docs.forEach(doc => {
        const data = doc.data();
        // Check if date is within current week
        if (data.date >= start && data.date <= end) {
          if (!mapping[data.employeeId]) mapping[data.employeeId] = {};
          mapping[data.employeeId][data.date] = { 
            docId: doc.id, 
            morning: data.morning, 
            afternoon: data.afternoon 
          };
        }
      });
      setAttendanceData(mapping);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user, currentWeekStart]);

  const toggleAttendance = (employeeId, date, session) => {
    setAttendanceData(prev => {
      const empData = prev[employeeId] || {};
      const dayData = empData[date] || { morning: false, afternoon: false };
      
      return {
        ...prev,
        [employeeId]: {
          ...empData,
          [date]: { ...dayData, [session]: !dayData[session] }
        }
      };
    });
  };

  const handleBulkSave = async () => {
    setLoading(true);
    const batch = writeBatch(db);
    let operationCount = 0;

    try {
      employees.forEach(emp => {
        weekDays.forEach(date => {
            const empRecord = attendanceData[emp.id] || {};
            const dayRecord = empRecord[date] || { morning: false, afternoon: false };
            
            // Only save if record exists or has data (Optimization could be added here to only save changes)
            // For simplicity, we save the state of the grid
            
            const payload = {
              employeeId: emp.id, 
              employeeName: emp.name, 
              dailyWageAtTime: emp.daily_wage,
              date: date, 
              morning: dayRecord.morning || false, 
              afternoon: dayRecord.afternoon || false,
              ownerId: user.uid
            };

            if (dayRecord.docId) {
               const docRef = isChatEnv 
                 ? doc(db, 'artifacts', appId, 'public', 'data', 'attendance', dayRecord.docId)
                 : doc(db, 'attendance', dayRecord.docId);
               batch.update(docRef, payload);
            } else {
               // Only create new doc if there is actual attendance to save to avoid clutter
               if (dayRecord.morning || dayRecord.afternoon) {
                   const docRef = isChatEnv 
                     ? doc(collection(db, 'artifacts', appId, 'public', 'data', 'attendance'))
                     : doc(collection(db, 'attendance'));
                   batch.set(docRef, payload);
               }
            }
            operationCount++;
        });
      });

      // Batch limit is 500. If lots of employees, logic needs splitting. 
      // For < 50 employees/week, this is fine.
      await batch.commit();
      setToast({ message: "បានរក្សាទុកវត្តមានប្រចាំសប្តាហ៍!", type: 'success' });
      setTimeout(() => setToast(null), 3000);

    } catch (err) {
      console.error(err);
      setToast({ message: "បរាជ័យក្នុងការរក្សាទុក", type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const changeWeek = (offset) => {
    const d = new Date(currentWeekStart);
    d.setDate(d.getDate() + (offset * 7));
    setCurrentWeekStart(d.toISOString().split('T')[0]);
  };

  return (
    <div className="p-4 md:p-6 pb-24 relative h-full flex flex-col">
       {/* Toast */}
       {toast && (
        <div className={`fixed top-4 right-4 z-[100] flex items-center gap-3 px-6 py-4 rounded-lg shadow-2xl animate-bounce-in text-white ${toast.type === 'error' ? 'bg-red-600' : 'bg-green-600'}`}>
            {toast.type === 'error' ? <XCircle size={24} /> : <CheckCircle size={24} />}
            <div>{toast.message}</div>
        </div>
       )}

      {/* Header Controls */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <CalendarIcon className="text-indigo-600"/> វត្តមានប្រចាំសប្តាហ៍
        </h2>
        
        <div className="flex items-center gap-4 bg-slate-50 p-1 rounded-lg border">
          <button onClick={() => changeWeek(-1)} className="p-2 hover:bg-white hover:shadow rounded-md transition"><ChevronLeft size={20}/></button>
          <div className="flex flex-col items-center px-4 w-40">
             <span className="text-xs text-slate-500 font-bold">សប្តាហ៍នៃថ្ងៃទី</span>
             <span className="font-bold text-slate-800">{new Date(currentWeekStart).toLocaleDateString('km-KH')}</span>
          </div>
          <button onClick={() => changeWeek(1)} className="p-2 hover:bg-white hover:shadow rounded-md transition"><ChevronRight size={20}/></button>
        </div>
      </div>
      
      {/* Scrollable Weekly Table */}
      <div className="bg-white rounded-xl shadow border border-slate-200 flex-1 overflow-hidden flex flex-col">
        <div className="overflow-auto flex-1">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-100 text-slate-700 sticky top-0 z-20 shadow-sm">
              <tr>
                <th className="p-3 border-r border-b min-w-[150px] sticky left-0 bg-slate-100 z-30">ឈ្មោះបុគ្គលិក</th>
                {weekDays.map((dateStr) => {
                  const dateObj = new Date(dateStr);
                  const dayName = khmerDays[dateObj.getDay()];
                  const dayNum = dateObj.getDate().toString().padStart(2, '0');
                  const isToday = dateStr === new Date().toISOString().split('T')[0];

                  return (
                    <th key={dateStr} className={`p-2 border-r border-b min-w-[140px] text-center ${isToday ? 'bg-indigo-50' : ''}`}>
                      <div className={`font-bold text-sm ${isToday ? 'text-indigo-700' : ''}`}>
                        {dayNum} - {dayName}
                      </div>
                      <div className="flex justify-center gap-4 mt-1 text-[10px] text-slate-500 uppercase font-bold tracking-wider">
                         <span>ព្រឹក</span>
                         <span>ល្ងាច</span>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {employees.map(emp => (
                <tr key={emp.id} className="hover:bg-slate-50 group transition-colors">
                  <td className="p-3 border-r font-medium text-slate-800 sticky left-0 bg-white group-hover:bg-slate-50 z-10 border-b">
                    {emp.name}
                  </td>
                  {weekDays.map(date => {
                    const record = attendanceData[emp.id]?.[date] || { morning: false, afternoon: false };
                    const isToday = date === new Date().toISOString().split('T')[0];
                    
                    return (
                      <td key={date} className={`p-2 border-r border-b text-center ${isToday ? 'bg-indigo-50/30' : ''}`}>
                        <div className="flex justify-center items-center gap-4">
                          {/* Morning Toggle */}
                          <button 
                            onClick={() => toggleAttendance(emp.id, date, 'morning')}
                            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${record.morning ? 'bg-green-500 text-white shadow-md scale-110' : 'bg-slate-200 text-slate-400 hover:bg-slate-300'}`}
                          >
                            {record.morning ? <Check size={16} strokeWidth={4} /> : <div className="w-2 h-2 rounded-full bg-slate-400"></div>}
                          </button>

                          {/* Afternoon Toggle */}
                          <button 
                            onClick={() => toggleAttendance(emp.id, date, 'afternoon')}
                            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${record.afternoon ? 'bg-green-500 text-white shadow-md scale-110' : 'bg-slate-200 text-slate-400 hover:bg-slate-300'}`}
                          >
                            {record.afternoon ? <Check size={16} strokeWidth={4} /> : <div className="w-2 h-2 rounded-full bg-slate-400"></div>}
                          </button>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
              {employees.length === 0 && (
                 <tr><td colSpan={8} className="p-8 text-center text-slate-400">មិនមានបុគ្គលិក</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Floating Save Button */}
      <div className="fixed bottom-6 right-6 z-40">
        <button onClick={handleBulkSave} disabled={loading} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-full shadow-lg flex items-center gap-2 font-bold transition transform hover:scale-105 active:scale-95">
          {loading ? 'កំពុងរក្សាទុក...' : <><Save size={20} /> រក្សាទុក (Save Week)</>}
        </button>
      </div>
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

  // Local Notification State
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (!user) return;
    const q = query(getColl('employees'), where('ownerId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => { setEmployees(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))); });
    return () => unsubscribe();
  }, [user]);

  const generateReport = async () => {
    if (!user) return;
    setLoading(true);
    setReportData([]); setDetailedLoans([]); setEmployeeStats([]);

    try {
      // FIX: Query ONLY by ownerId (No Index required)
      const qAtt = query(
        getColl('attendance'), 
        where('ownerId', '==', user.uid)
      );
      const attSnapshot = await getDocs(qAtt);

      const qLoan = query(
        getColl('loans'), 
        where('ownerId', '==', user.uid)
      );
      const loanSnapshot = await getDocs(qLoan);

      const aggregation = {}; const loansList = []; const attendanceByDate = {};
      
      // Helper to check date range in Javascript
      const isInRange = (dateStr) => {
        return dateStr >= dateRange.start && dateStr <= dateRange.end;
      };

      loanSnapshot.docs.forEach(doc => {
        const data = doc.data();
        // CLIENT-SIDE FILTERING HERE
        if (isInRange(data.date)) {
            loansList.push({ id: doc.id, ...data });
            if (!aggregation[data.employeeId]) aggregation[data.employeeId] = { id: data.employeeId, name: data.employeeName || 'Unknown', wage: 0, days: 0, grossPay: 0, loanTotal: 0, netPay: 0 };
            aggregation[data.employeeId].loanTotal += (data.amount || 0);
        }
      });

      attSnapshot.docs.forEach(doc => {
        const data = doc.data();
        // CLIENT-SIDE FILTERING HERE
        if (isInRange(data.date)) {
            const empId = data.employeeId;
            if (!aggregation[empId]) aggregation[empId] = { id: empId, name: data.employeeName || 'Unknown', wage: data.dailyWageAtTime || 0, days: 0, grossPay: 0, loanTotal: 0, netPay: 0 };
            else if (aggregation[empId].wage === 0) aggregation[empId].wage = data.dailyWageAtTime;

            let dayValue = 0; if (data.morning) dayValue += 0.5; if (data.afternoon) dayValue += 0.5;
            aggregation[empId].days += dayValue;
            aggregation[empId].grossPay += (dayValue * (data.dailyWageAtTime || 0));

            if (!attendanceByDate[data.date]) attendanceByDate[data.date] = {};
            attendanceByDate[data.date][empId] = { morning: data.morning, afternoon: data.afternoon };
        }
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
      setToast({ message: "មានបញ្ហាក្នុងការបង្កើតរបាយការណ៍: " + error.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const totalGross = reportData.reduce((acc, curr) => acc + curr.grossPay, 0);
  const totalLoans = reportData.reduce((acc, curr) => acc + curr.loanTotal, 0);
  const totalNet = reportData.reduce((acc, curr) => acc + curr.netPay, 0);

  return (
    <div className="p-4 md:p-6 pb-24 relative">
       {/* Use the parent's Toast if available, or just render simple UI here since Toast component is in parent. 
           To simplify, I'm assuming you copy the Toast component from previous response or I just remove notification for Report since data loads fast. 
       */}
       {toast && (
        <div className="fixed top-4 right-4 z-[100] bg-red-600 text-white px-6 py-4 rounded-lg shadow-2xl animate-bounce-in">
            {toast.message}
            <button onClick={() => setToast(null)} className="ml-4 opacity-70 hover:opacity-100"><X size={18} /></button>
        </div>
       )}

      <div className="flex flex-col xl:flex-row justify-between items-start mb-6 print:hidden gap-4">
        <div className="flex items-center gap-3 w-full xl:w-auto justify-between xl:justify-start">
           <h2 className="text-2xl font-bold text-slate-800">របាយការណ៍</h2>
           <button onClick={() => setShowFinancials(!showFinancials)} className={`p-2 rounded-full transition ${showFinancials ? 'bg-slate-200 text-slate-600' : 'bg-slate-800 text-white'}`}>
             {showFinancials ? <Eye size={20} /> : <EyeOff size={20} />}
           </button>
        </div>
        <div className="flex flex-col md:flex-row flex-wrap gap-4 items-end bg-white p-4 rounded-lg shadow-sm border w-full xl:w-auto">
          <div className="w-full md:w-auto"><label className="block text-xs font-bold text-slate-500 mb-1">ចាប់ពី</label><input type="date" className="border p-2 rounded text-sm w-full md:w-36" value={dateRange.start} onChange={e => setDateRange({...dateRange, start: e.target.value})} /></div>
          <div className="w-full md:w-auto"><label className="block text-xs font-bold text-slate-500 mb-1">ដល់</label><input type="date" className="border p-2 rounded text-sm w-full md:w-36" value={dateRange.end} onChange={e => setDateRange({...dateRange, end: e.target.value})} /></div>
          <div className="flex gap-2 w-full md:w-auto mt-2 md:mt-0">
            <button onClick={generateReport} className="flex-1 md:flex-none bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 font-medium text-sm">{loading ? '...' : 'បង្ហាញ'}</button>
            <button onClick={() => window.print()} className="flex-1 md:flex-none bg-slate-800 text-white px-4 py-2 rounded hover:bg-slate-900 font-medium text-sm flex items-center justify-center gap-2"><Printer size={16} /> បោះពុម្ព</button>
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

export default function App() {
  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [currentView, setCurrentView] = useState('attendance'); 
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoadingUser(false);
    });
    return () => unsubscribe();
  }, []);

  const handleNavClick = (view) => {
    setCurrentView(view);
    setIsMobileMenuOpen(false);
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error("Logout failed", err);
    }
  };

  if (loadingUser) return <div className="flex h-screen items-center justify-center text-slate-500">កំពុងដំណើរការ...</div>;

  // IF NO USER, SHOW LOGIN SCREEN
  if (!user) {
    return <LoginScreen />;
  }

  // IF USER LOGGED IN, SHOW MAIN APP
  return (
    <div className="min-h-screen bg-slate-100 font-sans text-slate-900 flex flex-col md:flex-row" style={{ fontFamily: "'Hanuman', 'Noto Sans Khmer', system-ui, sans-serif" }}>
      
      {/* Mobile Header */}
      <div className="md:hidden bg-slate-900 text-white p-4 flex justify-between items-center z-50 sticky top-0 shadow-md">
        <h1 className="font-bold text-lg flex items-center gap-2"><DollarSign className="text-green-400" size={20} /> គ្រប់គ្រងបុគ្គលិក</h1>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-1">
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Overlay for Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setIsMobileMenuOpen(false)}></div>
      )}

      {/* Sidebar Navigation */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-slate-300 flex flex-col transition-transform duration-300 ease-in-out
        md:translate-x-0 md:static md:h-screen md:flex-shrink-0
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-6 hidden md:block"><h1 className="text-white font-bold text-xl flex items-center gap-2"><DollarSign className="text-green-400" /> គ្រប់គ្រងបុគ្គលិក</h1></div>
        
        <div className="h-16 md:hidden"></div>

        <nav className="flex-1 px-4 space-y-2 mt-4 md:mt-0">
          <button onClick={() => handleNavClick('attendance')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${currentView === 'attendance' ? 'bg-indigo-600 text-white' : 'hover:bg-slate-800'}`}><Calendar size={20} /> វត្តមាន</button>
          <button onClick={() => handleNavClick('employees')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${currentView === 'employees' ? 'bg-indigo-600 text-white' : 'hover:bg-slate-800'}`}><Users size={20} /> បុគ្គលិក</button>
          <button onClick={() => handleNavClick('reports')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${currentView === 'reports' ? 'bg-indigo-600 text-white' : 'hover:bg-slate-800'}`}><ClipboardList size={20} /> របាយការណ៍</button>
        </nav>

        <div className="p-4 border-t border-slate-800">
          <div className="mb-4 px-2 text-xs text-slate-500 break-all">
             ចូលប្រើដោយ: {user.isAnonymous ? 'Guest (ភ្ញៀវ)' : user.email}
          </div>
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-2 text-red-400 hover:bg-slate-800 rounded-lg transition">
            <LogOut size={20} /> ចាកចេញ
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto print:overflow-visible h-[calc(100vh-64px)] md:h-screen print:h-auto print:bg-white print:w-full">
        {currentView === 'employees' && <EmployeeManager user={user} />}
        {currentView === 'attendance' && <AttendanceSystem user={user} />}
        {currentView === 'reports' && <Reports user={user} />}
      </main>
    </div>
  );
}