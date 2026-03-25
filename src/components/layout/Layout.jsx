import React from 'react';
import { 
  DollarSign, Menu, X, Calendar, Users, ClipboardList, LayoutDashboard, LogOut 
} from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth } from '../../config/firebase';

const Layout = ({ children, user, currentView, onNavClick, isMobileMenuOpen, setIsMobileMenuOpen }) => {
  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error("Logout failed", err);
    }
  };

  const navItems = [
    { id: 'dashboard', label: 'ផ្ទាំងគ្រប់គ្រង', icon: LayoutDashboard },
    { id: 'attendance', label: 'វត្តមាន', icon: Calendar },
    { id: 'employees', label: 'បុគ្គលិក', icon: Users },
    { id: 'reports', label: 'របាយការណ៍', icon: ClipboardList },
  ];

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
          {navItems.map((item) => (
            <button 
              key={item.id}
              onClick={() => {
                onNavClick(item.id);
                setIsMobileMenuOpen(false);
              }} 
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${currentView === item.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20' : 'hover:bg-slate-800 text-slate-400 hover:text-white'}`}
            >
              <item.icon size={20} className={currentView === item.id ? 'text-white' : 'text-slate-500'} /> 
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
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

      <main className="flex-1 overflow-auto print:overflow-visible h-[calc(100vh-64px)] md:h-screen print:h-auto print:bg-white print:w-full pb-20 md:pb-0">
        {children}
      </main>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-2 py-2 flex justify-around items-center z-50 shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
        {navItems.map((item) => (
          <button 
            key={item.id}
            onClick={() => onNavClick(item.id)} 
            className={`flex flex-col items-center gap-1 p-2 min-w-[64px] transition-all ${currentView === item.id ? 'text-indigo-600' : 'text-slate-400'}`}
          >
            <div className={`p-1.5 rounded-xl transition-all ${currentView === item.id ? 'bg-indigo-50' : ''}`}>
               <item.icon size={20} strokeWidth={currentView === item.id ? 2.5 : 2} />
            </div>
            <span className="text-[10px] font-bold">{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default Layout;
