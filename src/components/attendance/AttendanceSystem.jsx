import React, { useState, useEffect } from 'react';
import { 
  query, where, onSnapshot, doc, collection, setDoc, updateDoc, waitForPendingWrites, deleteDoc, orderBy, limit, getDocs, addDoc, serverTimestamp 
} from 'firebase/firestore';
import { 
  ChevronLeft, ChevronRight, Calendar as CalendarIcon, Save, Check, Trash2, Search, RefreshCcw, LayoutGrid, List 
} from 'lucide-react';
import { db, getColl } from '../../config/firebase';
import Toast from '../common/Toast';

const AttendanceSystem = ({ user }) => {
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); 
    return new Date(d.setDate(diff)).toISOString().split('T')[0];
  });

  const [employees, setEmployees] = useState([]);
  const [attendanceData, setAttendanceData] = useState({});
  const [initialAttendanceData, setInitialAttendanceData] = useState({});
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [view, setView] = useState('grid');
  const [historyData, setHistoryData] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const showToast = (msg, type = 'success') => {
    setToast({ message: msg, type });
    setTimeout(() => setToast(null), 3000);
  };

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

  useEffect(() => {
    if (!user) return;
    const q = query(getColl('employees'), where('ownerId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setEmployees(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const start = weekDays[0];
    const end = weekDays[6];
    const q = query(
      getColl('attendance'), 
      where('ownerId', '==', user.uid),
      where('date', '>=', start),
      where('date', '<=', end)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const mapping = {};
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (!mapping[data.employeeId]) mapping[data.employeeId] = {};
        mapping[data.employeeId][data.date] = { 
          docId: doc.id, 
          morning: data.morning, 
          afternoon: data.afternoon 
        };
      });
      setAttendanceData(mapping);
      setInitialAttendanceData(JSON.parse(JSON.stringify(mapping)));
      setLoading(false);
    }, (error) => {
      console.error("Attendance fetch error:", error);
      showToast("មិនអាចទាញយកទិន្នន័យវត្តមាន", 'error');
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user, currentWeekStart]);

  const logActivity = async (action, details) => {
    try {
      await addDoc(getColl('activity_logs'), {
        ownerId: user.uid,
        action,
        details,
        timestamp: serverTimestamp()
      });
    } catch (err) {
      console.error("Log Error:", err);
    }
  };

  const fetchHistory = async () => {
    if (!user) return;
    setHistoryLoading(true);
    try {
      const q = query(
        getColl('activity_logs'),
        where('ownerId', '==', user.uid),
        orderBy('timestamp', 'desc'),
        limit(50)
      );
      const snapshot = await getDocs(q);
      setHistoryData(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (err) {
      console.error("History Fetch Error:", err);
      if (err.message.includes('index')) {
        showToast("ត្រូវការបង្កើត Index ថ្មី (សូមពិនិត្យ Walkthrough)", 'error');
      } else {
        showToast("បរាជ័យក្នុងការទាញយកប្រវត្តិ", 'error');
      }
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (view === 'history') fetchHistory();
  }, [view, user]);

  const handleDeleteHistory = async (id, details) => {
    if (!window.confirm("តើអ្នកពិតជាចង់លុបកំណត់ត្រាសកម្មភាពនេះមែនទេ?")) return;
    try {
      await deleteDoc(doc(getColl('activity_logs'), id));
      await logActivity("លុបកំណត់ត្រា", `បានលុបសកម្មភាព: ${details}`);
      showToast("បានលុបដោយជោគជ័យ");
      setHistoryData(prev => prev.filter(item => item.id !== id));
    } catch (err) {
      console.error("Delete Error:", err);
      showToast("បរាជ័យក្នុងការលុប", 'error');
    }
  };

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

  const handleMarkAll = (session) => {
    setAttendanceData(prev => {
      const newData = { ...prev };
      employees.forEach(emp => {
        if (!newData[emp.id]) newData[emp.id] = {};
        weekDays.forEach(date => {
            if (!newData[emp.id][date]) newData[emp.id][date] = { morning: false, afternoon: false };
            newData[emp.id][date] = { ...newData[emp.id][date], [session]: true };
        });
      });
      return newData;
    });
  };

  const handleBulkSave = async () => {
    setLoading(true);
    showToast("កំពុងរក្សាទុក...", 'success');

    try {
      const savePromises = [];
      const recordChanges = {}; // Grouped by employee name

      employees.forEach(emp => {
        weekDays.forEach(date => {
          const current = attendanceData[emp.id]?.[date] || { morning: false, afternoon: false };
          const initial = initialAttendanceData[emp.id]?.[date] || { morning: false, afternoon: false };
          
          const dateShort = date.split('-').slice(1).reverse().join('/'); // DD/MM
          
          if (current.morning !== initial.morning) {
            if (!recordChanges[emp.name]) recordChanges[emp.name] = [];
            recordChanges[emp.name].push(`${dateShort} ព្រឹក ${current.morning ? '+' : '-'}`);
          }
          if (current.afternoon !== initial.afternoon) {
            if (!recordChanges[emp.name]) recordChanges[emp.name] = [];
            recordChanges[emp.name].push(`${dateShort} ល្ងាច ${current.afternoon ? '+' : '-'}`);
          }

          // Database Payload
          const payload = {
            employeeId: emp.id, 
            employeeName: emp.name, 
            dailyWageAtTime: emp.daily_wage || 0,
            date: date, 
            morning: current.morning, 
            afternoon: current.afternoon,
            ownerId: user.uid
          };

          if (current.docId || initial.docId) {
            const docId = current.docId || initial.docId;
            const docRef = doc(getColl('attendance'), docId);
            savePromises.push(updateDoc(docRef, payload));
          } else if (current.morning || current.afternoon) {
            const docId = `attendance_${user.uid}_${emp.id}_${date}`;
            const docRef = doc(getColl('attendance'), docId);
            savePromises.push(setDoc(docRef, payload));
          }
        });
      });

      if (savePromises.length > 0) {
        await Promise.all(savePromises);
        
        const empNames = Object.keys(recordChanges);
        if (empNames.length > 0) {
          const details = empNames.map(name => `${name}: ${recordChanges[name].join(', ')}`).join('\n');
          // Still cap if extremely huge, but newlines help a lot
          const cappedDetails = details.length > 1000 ? details.substring(0, 1000) + '...' : details;
          await logActivity("រក្សាទុកវត្តមាន", cappedDetails);
        }
        
        await waitForPendingWrites(db);
        setInitialAttendanceData(JSON.parse(JSON.stringify(attendanceData)));
        showToast("បានរក្សាទុកវត្តមានប្រចាំសប្តាហ៍!", 'success');
      } else {
        showToast("គ្មានការផ្លាស់ប្តូរដែលត្រូវរក្សាទុក", 'success');
      }
    } catch (err) {
      console.error("Bulk Save Error:", err);
      showToast("បរាជ័យក្នុងការរក្សាទុក", 'error');
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
       <Toast message={toast?.message} type={toast?.type} onClose={() => setToast(null)} />

      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-4 gap-4 bg-white p-3 sm:p-4 rounded-xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-3">
            <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600">
                <CalendarIcon size={20}/>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-800">គ្រប់គ្រងវត្តមាន</h2>
            <div className="flex bg-slate-100 p-1 rounded-lg ml-2">
              <button onClick={() => setView('grid')} className={`px-3 py-1 text-xs font-bold rounded-md transition ${view === 'grid' ? 'bg-white shadow text-indigo-600' : 'text-slate-500'}`}><LayoutGrid size={14} className="inline mr-1"/> តារាង</button>
              <button onClick={() => setView('history')} className={`px-3 py-1 text-xs font-bold rounded-md transition ${view === 'history' ? 'bg-white shadow text-indigo-600' : 'text-slate-500'}`}><List size={14} className="inline mr-1"/> ប្រវត្តិ</button>
            </div>
        </div>
        
        {view === 'grid' ? (
          <div className="flex items-center gap-2 sm:gap-4 bg-slate-50 p-1 rounded-lg border w-full lg:w-auto justify-between lg:justify-start">
            <button onClick={() => changeWeek(-1)} className="p-2 hover:bg-white hover:shadow rounded-md transition"><ChevronLeft size={20}/></button>
            <div className="flex flex-col items-center px-2 sm:px-4 shrink-0">
               <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">សប្តាហ៍នៃថ្ងៃទី</span>
               <span className="font-bold text-slate-800 text-sm sm:text-base">{new Date(currentWeekStart).toLocaleDateString('km-KH')}</span>
            </div>
            <button onClick={() => changeWeek(1)} className="p-2 hover:bg-white hover:shadow rounded-md transition"><ChevronRight size={20}/></button>
          </div>
        ) : (
          <div className="flex items-center gap-2 w-full lg:w-auto">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text" 
                placeholder="ស្វែងរក..." 
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
            <button onClick={fetchHistory} className="p-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition"><RefreshCcw size={20} className={historyLoading ? 'animate-spin' : ''}/></button>
          </div>
        )}

        {view === 'grid' && (
          <div className="flex gap-2 w-full lg:w-auto">
              <button onClick={() => handleMarkAll('morning')} className="flex-1 lg:flex-none text-[10px] sm:text-xs bg-slate-100 px-3 py-2 rounded-lg font-bold hover:bg-green-100 hover:text-green-700 transition border border-slate-200">ព្រឹកទាំងអស់</button>
              <button onClick={() => handleMarkAll('afternoon')} className="flex-1 lg:flex-none text-[10px] sm:text-xs bg-slate-100 px-3 py-2 rounded-lg font-bold hover:bg-green-100 hover:text-green-700 transition border border-slate-200">ល្ងាចទាំងអស់</button>
          </div>
        )}
      </div>
      
      <div className="bg-white rounded-xl shadow border border-slate-200 flex-1 overflow-hidden flex flex-col">
        {view === 'grid' ? (
          <div className="overflow-auto flex-1">
            <table className="w-full text-left border-collapse table-fixed lg:table-auto">
              <thead className="bg-slate-50 text-slate-700 sticky top-0 z-20 shadow-sm border-b">
                <tr>
                  <th className="p-3 border-r min-w-[120px] sm:min-w-[150px] sticky left-0 bg-slate-50 z-30 font-bold text-slate-600 uppercase text-[10px] tracking-wider">ឈ្មោះបុគ្គលិក</th>
                  {weekDays.map((dateStr) => {
                    const dateObj = new Date(dateStr);
                    const dayName = khmerDays[dateObj.getDay()];
                    const dayNum = dateObj.getDate().toString().padStart(2, '0');
                    const isToday = dateStr === new Date().toISOString().split('T')[0];

                    return (
                      <th key={dateStr} className={`p-2 border-r min-w-[100px] sm:min-w-[140px] text-center ${isToday ? 'bg-indigo-50/50' : ''}`}>
                        <div className={`font-bold text-[10px] sm:text-xs ${isToday ? 'text-indigo-700' : 'text-slate-500'}`}>
                          {dayName}
                        </div>
                        <div className={`text-sm sm:text-base font-black ${isToday ? 'text-indigo-600' : 'text-slate-800'}`}>
                          {dayNum}
                        </div>
                        <div className="flex justify-center gap-4 mt-1 text-[8px] sm:text-[10px] text-slate-400 uppercase font-bold tracking-wider">
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
                            <button onClick={() => toggleAttendance(emp.id, date, 'morning')} className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${record.morning ? 'bg-green-500 text-white shadow-md scale-110' : 'bg-slate-200 text-slate-400 hover:bg-slate-300'}`}>
                              {record.morning ? <Check size={16} strokeWidth={4} /> : <div className="w-2 h-2 rounded-full bg-slate-400"></div>}
                            </button>
                            <button onClick={() => toggleAttendance(emp.id, date, 'afternoon')} className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${record.afternoon ? 'bg-green-500 text-white shadow-md scale-110' : 'bg-slate-200 text-slate-400 hover:bg-slate-300'}`}>
                              {record.afternoon ? <Check size={16} strokeWidth={4} /> : <div className="w-2 h-2 rounded-full bg-slate-400"></div>}
                            </button>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-auto flex-1">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 text-slate-700 sticky top-0 z-20 shadow-sm border-b">
                <tr>
                  <th className="p-3 font-bold text-slate-600 uppercase text-[10px] tracking-wider">ម៉ោង/ថ្ងៃ</th>
                  <th className="p-3 font-bold text-slate-600 uppercase text-[10px] tracking-wider">សកម្មភាព</th>
                  <th className="p-3 font-bold text-slate-600 uppercase text-[10px] tracking-wider">ព័ត៌មានលម្អិត</th>
                  <th className="p-3 font-bold text-slate-600 uppercase text-[10px] tracking-wider text-right px-6">លុប</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {historyData
                  .filter(item => item.details?.toLowerCase().includes(searchQuery.toLowerCase()) || item.action?.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map(item => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3 text-[10px] text-slate-500 font-mono">
                      {item.timestamp?.toDate ? item.timestamp.toDate().toLocaleString('km-KH') : 'រក្សាទុក...'}
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${item.action === 'លុបកំណត់ត្រា' ? 'bg-rose-100 text-rose-700' : 'bg-green-100 text-green-700'}`}>
                        {item.action}
                      </span>
                    </td>
                    <td className="p-3 text-sm text-slate-600 whitespace-pre-wrap break-words max-w-xl">
                      <div className="flex flex-wrap gap-2">
                        {item.details?.split('\n').map((line, idx) => {
                          const [name, rest] = line.split(': ');
                          if (!rest) return <div key={idx} className={`px-3 py-1.5 rounded-lg border text-[11px] font-medium ${item.action === 'លុបកំណត់ត្រា' ? 'bg-rose-50 border-rose-100 text-rose-700' : 'bg-slate-50 border-slate-100 text-slate-600'}`}>{line}</div>;
                          
                          return (
                            <div key={idx} className="px-3 py-1.5 rounded-lg border bg-white border-slate-200 text-[11px] font-medium shadow-sm">
                              <span className="text-slate-800 font-bold">{name}:</span>
                              <span className="ml-1">
                                {rest.split(', ').map((change, cIdx) => (
                                  <React.Fragment key={cIdx}>
                                    {cIdx > 0 && <span className="text-slate-300 mx-1">,</span>}
                                    <span className={change.includes('-') ? 'text-rose-600 font-black' : 'text-emerald-600 font-black'}>
                                      {change}
                                    </span>
                                  </React.Fragment>
                                ))}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </td>
                    <td className="p-3 text-right px-6">
                      <button onClick={() => handleDeleteHistory(item.id, item.details)} className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition"><Trash2 size={18}/></button>
                    </td>
                  </tr>
                ))}
                {historyData.length === 0 && !historyLoading && (
                  <tr><td colSpan={4} className="p-8 text-center text-slate-400">មិនទាន់មានសកម្មភាព</td></tr>
                )}
                {historyLoading && (
                  <tr><td colSpan={4} className="p-8 text-center text-slate-400 animate-pulse">កំពុងទាញយក...</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
      
      <div className={`fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-40 transition-transform ${view === 'history' ? 'scale-0' : 'scale-100'}`}>
        <button onClick={handleBulkSave} disabled={loading} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 sm:px-6 py-3 rounded-full shadow-2xl flex items-center gap-2 font-bold transition transform hover:scale-105 active:scale-95 shadow-indigo-200">
          {loading ? 'កំពុងរក្សាទុក...' : <><Save size={20} /> <span className="hidden sm:inline">រក្សាទុក</span> <span className="sm:hidden">Save</span></>}
        </button>
      </div>
    </div>
  );
};

export default AttendanceSystem;
