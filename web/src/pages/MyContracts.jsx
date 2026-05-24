import React, { useState, useEffect } from 'react';
import { useLanguage } from '../hooks/useLanguage';
import { FileText, CheckCircle, AlertCircle, Loader2, X } from 'lucide-react';
import SignaturePad from '../components/SignaturePad';

export default function MyContracts() {
  const { t } = useLanguage();
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedContract, setSelectedContract] = useState(null);
  const [signing, setSigning] = useState(false);
  const [showSignPad, setShowSignPad] = useState(false);

  const fetchContracts = async () => {
    try {
      const response = await fetch('/api/contracts/my-contracts', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch contracts');
      const data = await response.json();
      setContracts(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContracts();
  }, []);

  const handleSign = async (signatureBase64) => {
    if (!selectedContract) return;
    setSigning(true);
    try {
      const response = await fetch(`/api/contracts/${selectedContract.id}/sign/developer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ signatureBase64 })
      });
      if (!response.ok) throw new Error('Failed to sign contract');
      await fetchContracts();
      setSelectedContract(null);
      setShowSignPad(false);
    } catch (err) {
      alert(err.message);
    } finally {
      setSigning(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 p-8 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-container" />
      </div>
    );
  }

  return (
    <div className="flex-1 w-full lg:ml-64 px-margin-mobile md:px-margin-desktop pb-8 md:pb-12 pt-28 md:pt-32 overflow-y-auto min-h-screen relative">
      <div className="max-w-6xl mx-auto space-y-8 relative z-10">
        <header className="space-y-4">
          <div className="inline-flex items-center space-x-2 bg-secondary-container/20 text-secondary px-3 py-1 rounded-full text-xs font-mono border border-secondary/30">
            <FileText className="w-4 h-4" />
            <span>CONTRACT MANAGEMENT</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-headline-lg text-on-surface uppercase tracking-tight">
            My Contracts
          </h1>
          <p className="text-on-surface-variant max-w-2xl text-lg">
            Review, sign, and manage your publishing agreements with the platform.
          </p>
        </header>

        {error && (
          <div className="p-4 bg-error/10 border border-error/20 text-error rounded-lg flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            {error}
          </div>
        )}

        <div className="bg-surface-container-low border border-white/5 rounded-xl p-6 shadow-lg">
          {contracts.length === 0 ? (
            <div className="text-center py-12 space-y-4">
              <FileText className="w-16 h-16 text-on-surface-variant/30 mx-auto" />
              <h3 className="text-xl font-headline-md text-on-surface">No Contracts Yet</h3>
              <p className="text-on-surface-variant">When the platform issues a contract, it will appear here.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {contracts.map(contract => (
                <div key={contract.id} className="border border-white/10 rounded-lg p-6 bg-surface flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-headline-sm text-on-surface">{contract.gameTitle}</h3>
                    <p className="text-sm text-on-surface-variant font-mono mt-1">Type: {contract.contractType}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-mono uppercase border ${
                      contract.status === 'signed' ? 'bg-green-500/10 text-green-400 border-green-500/30' : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30'
                    }`}>
                      {contract.status}
                    </span>
                    <button 
                      onClick={() => setSelectedContract(contract)}
                      className="px-4 py-2 bg-primary-container text-on-primary-fixed rounded-lg text-sm font-headline-sm hover:brightness-110 transition-all cursor-pointer"
                    >
                      {contract.status === 'pending' && !contract.signedAtSeller ? 'Review & Sign' : 'View PDF'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* PDF Modal */}
      {selectedContract && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 md:p-8 animate-in fade-in">
          <div className="bg-surface-container-lowest border border-white/10 w-full max-w-5xl h-full max-h-[90vh] rounded-xl shadow-2xl flex flex-col overflow-hidden relative">
            <div className="flex items-center justify-between p-4 border-b border-white/5 bg-surface-container/50">
              <h3 className="font-headline-sm text-lg text-on-surface">
                {selectedContract.gameTitle} - Agreement
              </h3>
              <button 
                onClick={() => setSelectedContract(null)}
                className="text-on-surface-variant hover:text-white transition-colors p-1"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className={`flex-1 p-0 bg-white ${showSignPad ? 'hidden' : ''}`}>
              <iframe 
                src={selectedContract.pdfUrl} 
                className="w-full h-full border-none"
                title="Contract PDF"
              />
            </div>

            <div className="p-4 border-t border-white/5 bg-surface-container/50 flex justify-end gap-4">
              <button 
                onClick={() => setSelectedContract(null)}
                className="px-6 py-2 rounded-lg border border-white/10 text-on-surface-variant hover:bg-white/5 transition-all cursor-pointer font-label-lg"
              >
                Close
              </button>
              
              {selectedContract.status === 'pending' && !selectedContract.signedAtSeller && (
                <button 
                  onClick={() => setShowSignPad(true)}
                  disabled={signing}
                  className="px-6 py-2 rounded-lg bg-primary-container text-on-primary-fixed hover:brightness-110 transition-all font-bold tracking-wide flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {signing ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                  DRAW SIGNATURE &amp; SIGN
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Signature Pad Modal Overlay */}
      {showSignPad && (
        <div className="fixed inset-0 z-[150] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <SignaturePad 
            onSave={(base64) => handleSign(base64)}
            onCancel={() => setShowSignPad(false)}
          />
        </div>
      )}
    </div>
  );
}
