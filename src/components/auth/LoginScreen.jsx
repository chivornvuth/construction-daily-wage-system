import React, { useState } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInAnonymously 
} from 'firebase/auth';
import { DollarSign, XCircle, Mail, Lock, User } from 'lucide-react';
import { auth } from '../../config/firebase';

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

export default LoginScreen;
