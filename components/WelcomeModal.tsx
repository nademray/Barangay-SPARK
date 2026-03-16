
import React, { useState, useMemo } from 'react';

interface WelcomeModalProps {
  lgus: string[];
  barangaysMap: Record<string, string[]>; // Map of LGU to its Barangays
  onSelect: (lgu: string, brgy: string) => void;
}

const WelcomeModal: React.FC<WelcomeModalProps> = ({ lgus, barangaysMap, onSelect }) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedLgu, setSelectedLgu] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedBrgy, setSelectedBrgy] = useState('');
  const [error, setError] = useState('');

  const handleLguSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedLgu) {
      if (selectedLgu === 'Province') {
        setStep(2); // Province still needs password
      } else {
        setStep(3); // LGUs skip password and go straight to barangay selection
      }
    }
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // This now only applies to 'Province'
    const expectedPassword = 'Spark2025';
    
    if (password.toLowerCase() === expectedPassword.toLowerCase()) {
      setError('');
      onSelect('Province', 'All');
    } else {
      setError('Incorrect password for ' + selectedLgu);
    }
  };

  const handleBrgySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedBrgy) {
      onSelect(selectedLgu, selectedBrgy);
    }
  };

  const availableBrgys = useMemo(() => {
    return barangaysMap[selectedLgu] || [];
  }, [selectedLgu, barangaysMap]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/90 backdrop-blur-md transition-all duration-500">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md mx-4 overflow-hidden border border-white/50 p-8 animate-fade-in-up relative ring-1 ring-black/5">
        
        <div className="relative z-10 text-center">
            <div className="mb-6 flex justify-center">
                <div className="bg-gradient-to-br from-blue-50 to-white p-4 rounded-2xl border border-blue-100 shadow-sm">
                    <img src="https://upload.wikimedia.org/wikipedia/commons/c/c9/Department_of_the_Interior_and_Local_Government_%28DILG%29_Seal_-_Logo.svg" alt="DILG" className="h-12 w-12" />
                </div>
            </div>

            <h2 className="text-2xl font-black text-slate-800 mb-1 tracking-tight">DILG SPARK</h2>
            <p className="text-slate-500 mb-8 text-xs font-bold uppercase tracking-widest">Barangay Report Keeper</p>

            {step === 1 && (
                <form onSubmit={handleLguSubmit} className="space-y-5 animate-fade-in">
                    <div className="text-left">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Select Office / LGU</label>
                        <select
                            value={selectedLgu}
                            onChange={(e) => setSelectedLgu(e.target.value)}
                            className="w-full border-slate-200 p-4 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 bg-slate-50 text-sm font-bold shadow-sm transition-all outline-none text-slate-700"
                            required
                        >
                            <option value="" disabled>Select LGU...</option>
                            <option value="Province" className="text-blue-600 font-black">PROVINCIAL OFFICE</option>
                            {lgus.map((lgu) => <option key={lgu} value={lgu}>{lgu}</option>)}
                        </select>
                    </div>
                    <button type="submit" disabled={!selectedLgu} className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold shadow-lg hover:bg-blue-700 transition-all disabled:opacity-50">
                        Continue
                    </button>
                </form>
            )}

            {step === 2 && (
                <form onSubmit={handlePasswordSubmit} className="space-y-5 animate-fade-in">
                    <div className="text-left">
                        <div className="flex justify-between items-end mb-2">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Provincial Access Password</label>
                            <button type="button" onClick={() => setStep(1)} className="text-[10px] text-blue-600 font-bold hover:underline">Go Back</button>
                        </div>
                        <div className="relative">
                            <input
                                type={showPassword ? "text" : "password"}
                                placeholder="Enter admin password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full border-slate-200 p-4 pr-12 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 bg-slate-50 text-sm font-bold shadow-sm transition-all outline-none"
                                required
                                autoFocus
                            />
                            <button 
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                            >
                                {showPassword ? (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                    </svg>
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                                    </svg>
                                )}
                            </button>
                        </div>
                        {error && <p className="mt-2 text-xs text-red-600 font-bold">⚠️ {error}</p>}
                    </div>
                    <button type="submit" className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold shadow-lg hover:bg-blue-700 transition-all">
                        Validate Admin Password
                    </button>
                </form>
            )}

            {step === 3 && (
                <form onSubmit={handleBrgySubmit} className="space-y-5 animate-fade-in">
                    <div className="text-left">
                         <div className="flex justify-between items-end mb-2">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Select Your Barangay</label>
                            <button type="button" onClick={() => setStep(1)} className="text-[10px] text-blue-600 font-bold hover:underline">Change LGU</button>
                        </div>
                        <select
                            value={selectedBrgy}
                            onChange={(e) => setSelectedBrgy(e.target.value)}
                            className="w-full border-slate-200 p-4 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 bg-slate-50 text-sm font-bold shadow-sm transition-all outline-none text-slate-700"
                            required
                        >
                            <option value="" disabled>Select Barangay...</option>
                            {availableBrgys.map((brgy) => <option key={brgy} value={brgy}>{brgy}</option>)}
                        </select>
                        <p className="mt-2 text-[10px] text-slate-400 font-medium italic">Welcome to {selectedLgu}! Please select your specific barangay to access the dashboard.</p>
                    </div>
                    <button type="submit" disabled={!selectedBrgy} className="w-full py-4 bg-emerald-600 text-white rounded-xl font-bold shadow-lg hover:bg-emerald-700 transition-all">
                        Access Dashboard
                    </button>
                </form>
            )}
            
            <p className="mt-8 text-[10px] text-slate-300 font-medium">
                © 2025 DILG SAMAR | Barangay Reports | Nadem Ray Uy
            </p>
        </div>
      </div>
    </div>
  );
};

export default WelcomeModal;
