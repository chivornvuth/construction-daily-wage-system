import React, { useState, useEffect } from 'react';
import { 
  query, where, onSnapshot, updateDoc, doc, addDoc, deleteDoc 
} from 'firebase/firestore';
import { 
  Users, Plus, Search, Wallet, Edit2, Trash2, X, XCircle, CheckCircle, ClipboardList 
} from 'lucide-react';
import { db, getColl } from '../../config/firebase';
import Toast from '../common/Toast';

const EmployeeManager = ({ user }) => {
  const [employees, setEmployees] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal States
  const [isEmpModalOpen, setIsEmpModalOpen] = useState(false);
  const [editingEmp, setEditingEmp] = useState(null);
  const [empFormData, setEmpFormData] = useState({ name: '', gender: 'ប្រុស', phone: '', daily_wage: '' });

  // LOAN SYSTEM STATE
  const [loanModalData, setLoanModalData] = useState(null); 
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

  // --- LOAN FETCHING ---
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
    
    // 1. Prepare data
    const wageValue = parseFloat(empFormData.daily_wage) || 0;
    const finalPayload = { 
      name: empFormData.name,
      gender: empFormData.gender,
      phone: empFormData.phone,
      daily_wage: wageValue,
      ownerId: user.uid,
      updatedAt: new Date().toISOString() 
    };

    // 2. Start save process (non-blocking for better UI feel)
    if (editingEmp) {
      updateDoc(doc(getColl('employees'), editingEmp), finalPayload)
        .catch(err => {
          console.error("Update failed", err);
          showToast("បរាជ័យក្នុងការកែប្រែ", 'error');
        });
    } else {
      addDoc(getColl('employees'), { 
        ...finalPayload, 
        createdAt: new Date().toISOString() 
      }).catch(err => {
        console.error("Add failed", err);
        showToast("បរាជ័យក្នុងការបន្ថែម", 'error');
      });
    }

    // 3. Close modal immediately
    closeEmpModal();
    showToast("បានរក្សាទុកព័ត៌មានបុគ្គលិកជោគជ័យ!");
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
      setLoanForm({ ...loanForm, amount: '', note: '' }); 
    } catch (error) {
      showToast("បរាជ័យក្នុងការកត់ត្រា", 'error');
    }
  };

  const handleDeleteLoan = async (loanId) => {
    if(!confirm("តើអ្នកចង់លុបការខ្ចីប្រាក់នេះមែនទេ?")) return;
    try {
        const docRef = doc(getColl('loans'), loanId);
        await deleteDoc(docRef);
        showToast("បានលុបជោគជ័យ");
    } catch (err) {
        showToast("បរាជ័យក្នុងការលុប", 'error');
    }
  }

  const handleDeleteEmp = async (id) => {
    if (!confirm('តើអ្នកពិតជាចង់លុបឈ្មោះបុគ្គលិកនេះមែនទេ?')) return;
    const docRef = doc(getColl('employees'), id);
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
      <Toast message={toast?.message} type={toast?.type} onClose={() => setToast(null)} />

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

      <div className="bg-white rounded-xl shadow overflow-hidden border border-slate-200">
        <div className="overflow-x-auto">
          <table className="w-full text-left whitespace-nowrap">
            <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] sm:text-xs font-bold tracking-wider">
              <tr>
                <th className="p-3 sm:p-4">ឈ្មោះ</th>
                <th className="p-3 sm:p-4 hidden sm:table-cell">ភេទ</th>
                <th className="p-3 sm:p-4">លេខទូរស័ព្ទ</th>
                <th className="p-3 sm:p-4">ប្រាក់ឈ្នួល (៛)</th>
                <th className="p-3 sm:p-4 text-right">សកម្មភាព</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredEmployees.map(emp => (
                <tr key={emp.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-3 sm:p-4 font-medium text-slate-800">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                      <span>{emp.name}</span>
                      <span className="sm:hidden text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded w-fit">{emp.gender}</span>
                    </div>
                  </td>
                  <td className="p-3 sm:p-4 text-slate-600 hidden sm:table-cell">{emp.gender}</td>
                  <td className="p-3 sm:p-4 text-slate-600 font-mono text-sm">{emp.phone}</td>
                  <td className="p-3 sm:p-4 text-green-600 font-bold">{Number(emp.daily_wage).toLocaleString()} ៛</td>
                  <td className="p-3 sm:p-4 text-right flex justify-end gap-1 sm:gap-2">
                    <button onClick={() => openLoanModal(emp)} className="bg-orange-50 text-orange-600 p-2 rounded-lg hover:bg-orange-100 transition" title="Loan"><Wallet size={16} /></button>
                    <button onClick={() => openEmpModal(emp)} className="bg-blue-50 text-blue-600 p-2 rounded-lg hover:bg-blue-100 transition" title="Edit"><Edit2 size={16} /></button>
                    <button onClick={() => handleDeleteEmp(emp.id)} className="bg-red-50 text-red-600 p-2 rounded-lg hover:bg-red-100 transition" title="Delete"><Trash2 size={16} /></button>
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
      
      {loanModalData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-slate-900 text-white p-4 flex justify-between items-center shrink-0">
                <div>
                    <h3 className="text-lg font-bold flex items-center gap-2"><Wallet className="text-orange-400" /> គ្រប់គ្រងប្រាក់ខ្ចី</h3>
                    <p className="text-slate-400 text-sm">បុគ្គលិក: <span className="text-white font-bold">{loanModalData.name}</span></p>
                </div>
                <button onClick={() => setLoanModalData(null)} className="p-2 hover:bg-white/10 rounded-full"><X size={24} /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-50">
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

export default EmployeeManager;
