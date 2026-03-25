import React, { useState, useEffect } from 'react';
import { 
  query, where, onSnapshot, getDocs 
} from 'firebase/firestore';
import { 
  Users, DollarSign, Wallet, TrendingUp, Calendar, AlertCircle 
} from 'lucide-react';
import { getColl } from '../../config/firebase';

const Dashboard = ({ user }) => {
  const [stats, setStats] = useState({
    totalEmployees: 0,
    totalWagesMonth: 0,
    totalLoans: 0,
    activeThisWeek: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      try {
        // 1. Total Employees
        const qEmp = query(getColl('employees'), where('ownerId', '==', user.uid));
        const empSnap = await getDocs(qEmp);
        const totalEmp = empSnap.size;

        // 2. Loans
        const qLoan = query(getColl('loans'), where('ownerId', '==', user.uid));
        const loanSnap = await getDocs(qLoan);
        const totalLoans = loanSnap.docs.reduce((acc, doc) => acc + (doc.data().amount || 0), 0);

        // 3. Wages this month
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        const oneWeekAgoStr = oneWeekAgo.toISOString().split('T')[0];
        
        // Fetch only records needed for either "Month Wages" or "Active This Week"
        const fetchStart = startOfMonth < oneWeekAgoStr ? startOfMonth : oneWeekAgoStr;

        const qAtt = query(
          getColl('attendance'), 
          where('ownerId', '==', user.uid),
          where('date', '>=', fetchStart)
        );
        const attSnap = await getDocs(qAtt);
        
        let monthWages = 0;
        const activeIds = new Set();
        
        const processedAttendance = new Set();
        attSnap.docs.forEach(doc => {
            const data = doc.data();
            const dateKey = `${data.employeeId}_${data.date}`;
            
            // Calculation for current month wages
            if (data.date >= startOfMonth && !processedAttendance.has(dateKey)) {
                processedAttendance.add(dateKey);
                
                let dayValue = 0;
                if (data.morning) dayValue += 0.5;
                if (data.afternoon) dayValue += 0.5;
                monthWages += (dayValue * (data.dailyWageAtTime || 0));
            }
            // Calculation for active this week (always add to set, set manages unique IDs)
            if (data.date >= oneWeekAgoStr && (data.morning || data.afternoon)) {
                activeIds.add(data.employeeId);
            }
        });

        setStats({
          totalEmployees: totalEmp,
          totalWagesMonth: monthWages,
          totalLoans: totalLoans,
          activeThisWeek: activeIds.size
        });
      } catch (err) {
        console.error("Dashboard data fetch failed", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const cards = [
    { title: 'បុគ្គលិកសរុប', value: stats.totalEmployees, icon: Users, color: 'bg-blue-500', detail: 'នាក់' },
    { title: 'សកម្មក្នុងសប្តាហ៍នេះ', value: stats.activeThisWeek, icon: Calendar, color: 'bg-green-500', detail: 'នាក់' },
    { title: 'ប្រាក់ឈ្នួលខែនេះ', value: `${stats.totalWagesMonth.toLocaleString()} ៛`, icon: DollarSign, color: 'bg-indigo-500', detail: '' },
    { title: 'ប្រាក់ខ្ចីសរុប', value: `${stats.totalLoans.toLocaleString()} ៛`, icon: Wallet, color: 'bg-orange-500', detail: '' },
  ];

  if (loading) return <div className="p-8 text-center text-slate-500">កំពុងផ្ទុកទិន្នន័យ...</div>;

  return (
    <div className="p-4 md:p-6">
      <h2 className="text-2xl font-bold text-slate-800 mb-6">ផ្ទាំងគ្រប់គ្រង (Dashboard)</h2>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card, idx) => (
          <div key={idx} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 sm:p-6 flex items-center gap-4 hover:shadow-md transition-all hover:-translate-y-1">
            <div className={`${card.color} p-3 sm:p-4 rounded-xl text-white shadow-lg shrink-0`}>
              <card.icon size={22} />
            </div>
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-medium text-slate-500 truncate">{card.title}</p>
              <h3 className="text-lg sm:text-xl font-black text-slate-800 truncate">
                {card.value} 
                {card.detail && <span className="text-xs sm:text-sm font-normal text-slate-400 ml-1">{card.detail}</span>}
              </h3>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Tips / Info */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-slate-100">
           <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2 text-sm sm:text-base"><TrendingUp size={20} className="text-indigo-600"/> ព័ត៌មានសង្ខេប</h3>
           <div className="space-y-3 sm:y-4">
              <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                 <span className="text-xs sm:text-sm text-slate-500 font-medium">មធ្យមភាគប្រាក់ឈ្នួល/ម្នាក់</span>
                 <span className="font-bold text-slate-800 text-sm sm:text-base">{(stats.totalEmployees > 0 ? stats.totalWagesMonth / stats.totalEmployees : 0).toLocaleString()} ៛</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                 <span className="text-xs sm:text-sm text-slate-500 font-medium">អត្រាវត្តមាន (សប្តាហ៍នេះ)</span>
                 <span className="font-bold text-slate-800 text-sm sm:text-base">{(stats.totalEmployees > 0 ? (stats.activeThisWeek / stats.totalEmployees) * 100 : 0).toFixed(1)}%</span>
              </div>
           </div>
        </div>

        <div className="bg-indigo-900 p-6 rounded-2xl text-white shadow-xl relative overflow-hidden">
           <div className="relative z-10">
              <h3 className="font-bold text-indigo-200 mb-2 uppercase text-xs tracking-wider">PayTracker Tips</h3>
              <p className="text-lg font-medium leading-relaxed">កុំភ្លេចកត់ត្រាវត្តមានរៀងរាល់ថ្ងៃ ដើម្បីទទួលបានរបាយការណ៍ដែលត្រឹមត្រូវ និងងាយស្រួលក្នុងការបើកប្រាក់ខែ!</p>
              <div className="mt-4 flex items-center gap-2 text-indigo-300">
                 <AlertCircle size={16} />
                 <span className="text-sm">អ្នកអាចទាញយករបាយការណ៍ជា CSV ក្នុងផ្នែក 'របាយការណ៍'</span>
              </div>
           </div>
           <DollarSign className="absolute -right-8 -bottom-8 text-indigo-800 opacity-50" size={160} />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
