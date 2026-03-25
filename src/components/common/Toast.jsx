import React from 'react';
import { CheckCircle, XCircle, X } from 'lucide-react';

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

export default Toast;
