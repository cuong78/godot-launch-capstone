import React, { useState, useEffect } from 'react';
import { useLanguage } from '../hooks/useLanguage';
import { FileText, Plus, Loader2, X, CheckCircle, AlertCircle } from 'lucide-react';
import SignaturePad from '../components/SignaturePad';

export default function AdminContracts() {
  const { t } = useLanguage();
  const [contracts, setContracts] = useState([]);
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  // Create Offer Form
  const [formData, setFormData] = useState({
    gameId: '',
    contractType: 'co_publishing',
    revenueSplit: 70,
    lumpSumAmount: '',
    disputeResolutionClause: 'Hợp đồng này được điều chỉnh bởi luật pháp hoạt động thương mại số. Mọi tranh chấp phát sinh sẽ được ưu tiên giải quyết qua thương lượng. Trường hợp thương lượng thất bại, vụ việc sẽ được đưa ra phân xử tại Trung tâm giải quyết tranh chấp kỹ thuật số thuộc hệ thống Godot Launch.\n\nThis Agreement shall be governed by digital commerce regulations. Any disputes shall first be resolved through friendly negotiations. If unresolved, disputes will be submitted to the Godot Launch Digital Dispute Resolution Center for binding arbitration.',
    additionalTerms: '',
    buyerRepresentative: '',
    buyerPosition: 'Ban quản trị hệ thống / Authorized Representative',
    sellerRepresentative: '',
    sellerAddress: '',
    sellerTaxCode: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // View/Sign Contract
  const [selectedContract, setSelectedContract] = useState(null);
  const [signing, setSigning] = useState(false);
  const [showSignPad, setShowSignPad] = useState(false);

  const fetchContracts = async () => {
    try {
      const response = await fetch('/api/contracts', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        const data = await response.json();
        setContracts(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchGames = async () => {
    try {
      const res = await fetch('/api/v1/games', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setGames(data.data);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const initData = async () => {
    setLoading(true);
    await Promise.all([fetchContracts(), fetchGames()]);
    setLoading(false);
  };

  useEffect(() => {
    initData();
  }, []);

  const handleCreateOffer = async (e) => {
    e.preventDefault();
    if (!formData.gameId) {
      setError("Please select a game.");
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/contracts/offers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          gameId: formData.gameId,
          contractType: formData.contractType,
          revenueSplit: parseInt(formData.revenueSplit, 10),
          lumpSumAmount: formData.lumpSumAmount,
          disputeResolutionClause: formData.disputeResolutionClause,
          additionalTerms: formData.additionalTerms,
          buyerRepresentative: formData.buyerRepresentative,
          buyerPosition: formData.buyerPosition,
          sellerRepresentative: formData.sellerRepresentative,
          sellerAddress: formData.sellerAddress,
          sellerTaxCode: formData.sellerTaxCode
        })
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || "Failed to create offer");
      }
      setShowCreateModal(false);
      setFormData({
        gameId: '',
        contractType: 'co_publishing',
        revenueSplit: 70,
        lumpSumAmount: '',
        disputeResolutionClause: 'Hợp đồng này được điều chỉnh bởi luật pháp hoạt động thương mại số. Mọi tranh chấp phát sinh sẽ được ưu tiên giải quyết qua thương lượng. Trường hợp thương lượng thất bại, vụ việc sẽ được đưa ra phân xử tại Trung tâm giải quyết tranh chấp kỹ thuật số thuộc hệ thống Godot Launch.\n\nThis Agreement shall be governed by digital commerce regulations. Any disputes shall first be resolved through friendly negotiations. If unresolved, disputes will be submitted to the Godot Launch Digital Dispute Resolution Center for binding arbitration.',
        additionalTerms: '',
        buyerRepresentative: '',
        buyerPosition: 'Ban quản trị hệ thống / Authorized Representative',
        sellerRepresentative: '',
        sellerAddress: '',
        sellerTaxCode: ''
      });
      fetchContracts();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAdminSign = async (signatureBase64) => {
    if (!selectedContract) return;
    setSigning(true);
    try {
      const response = await fetch(`/api/contracts/${selectedContract.id}/sign/admin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ signatureBase64 })
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || "Failed to sign");
      }
      fetchContracts();
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
    <main className="flex-grow max-w-container-max mx-auto w-full px-margin-mobile md:px-margin-desktop pt-28 md:pt-32 pb-20 overflow-y-auto min-h-screen">
      <div className="space-y-8">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-3xl font-headline-lg text-on-surface uppercase tracking-tight">Contract Management</h1>
            <p className="text-on-surface-variant">Manage platform publishing agreements and offers.</p>
          </div>
          <button 
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-primary-container text-on-primary-fixed rounded-lg font-headline-sm flex items-center gap-2 hover:brightness-110 cursor-pointer"
          >
            <Plus className="w-5 h-5" />
            Create Offer
          </button>
        </header>

        <div className="bg-surface-container-low border border-white/5 rounded-xl shadow-lg overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead className="bg-surface-container border-b border-white/10">
              <tr>
                <th className="p-4 text-sm font-label-sm uppercase text-on-surface-variant">Game Title</th>
                <th className="p-4 text-sm font-label-sm uppercase text-on-surface-variant">Developer</th>
                <th className="p-4 text-sm font-label-sm uppercase text-on-surface-variant">Type</th>
                <th className="p-4 text-sm font-label-sm uppercase text-on-surface-variant">Status</th>
                <th className="p-4 text-sm font-label-sm uppercase text-on-surface-variant text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {contracts.length === 0 ? (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-on-surface-variant">
                    No contracts found.
                  </td>
                </tr>
              ) : (
                contracts.map(c => {
                  const canSign = c.status === 'pending' && c.signedAtSeller && !c.signedAtBuyer;
                  return (
                    <tr key={c.id} className="hover:bg-surface-variant/10 transition-colors">
                      <td className="p-4 font-headline-sm">{c.gameTitle}</td>
                      <td className="p-4 text-sm text-on-surface-variant">{c.sellerName}</td>
                      <td className="p-4 text-sm text-on-surface-variant uppercase">{c.contractType.replace('_', ' ')}</td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded text-xs uppercase font-mono border ${
                          c.status === 'signed' ? 'bg-green-500/10 text-green-400 border-green-500/30' : 
                          canSign ? 'bg-blue-500/10 text-blue-400 border-blue-500/30' :
                          'bg-yellow-500/10 text-yellow-400 border-yellow-500/30'
                        }`}>
                          {c.status === 'pending' && c.signedAtSeller ? 'Dev Signed' : c.status}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <button 
                          onClick={() => setSelectedContract(c)}
                          className={`text-sm px-3 py-1.5 rounded cursor-pointer ${
                            canSign ? 'bg-primary-container text-on-primary-fixed font-bold hover:brightness-110' : 'bg-surface-container-high text-on-surface hover:bg-surface-variant'
                          }`}
                        >
                          {canSign ? 'Countersign' : 'View PDF'}
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Offer Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest border border-white/10 w-full max-w-3xl h-full max-h-[85vh] rounded-xl shadow-2xl flex flex-col overflow-hidden relative animate-in zoom-in-95 duration-200">
            <button onClick={() => setShowCreateModal(false)} className="absolute top-4 right-4 text-on-surface-variant hover:text-white z-10 p-1">
              <X className="w-5 h-5" />
            </button>
            
            {/* Fixed Header */}
            <div className="p-6 pb-4 border-b border-white/5 bg-surface-container/20 flex items-center justify-between">
              <h2 className="font-headline-md text-xl flex items-center gap-2 text-on-surface">
                <FileText className="text-primary-container" /> Contract Draft &amp; Creator Portal
              </h2>
            </div>
            
            <form onSubmit={handleCreateOffer} className="flex-1 flex flex-col overflow-hidden">
              {/* Scrollable Form Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                {error && (
                  <div className="p-3 bg-error/10 text-error border border-error/20 rounded flex items-center gap-2 text-sm">
                    <AlertCircle className="w-4 h-4" /> {error}
                  </div>
                )}

                {/* Grid 2 Columns for Basic Settings */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-primary-container mb-1.5 uppercase font-mono tracking-wider">Select Game</label>
                    <select 
                      className="w-full bg-surface-container border border-white/10 rounded-lg p-2.5 text-on-surface focus:border-primary-container focus:outline-none focus:ring-1 focus:ring-primary-container transition-all"
                      value={formData.gameId}
                      onChange={e => {
                        const selectedGame = games.find(g => g.id === e.target.value);
                        setFormData({
                          ...formData,
                          gameId: e.target.value,
                          sellerRepresentative: selectedGame ? (selectedGame.creatorName || '') : ''
                        });
                      }}
                      required
                    >
                      <option value="">-- Choose a Game --</option>
                      {games.map(g => (
                        <option key={g.id} value={g.id}>{g.title} (by {g.creatorName})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs text-primary-container mb-1.5 uppercase font-mono tracking-wider">Contract Type</label>
                    <select 
                      className="w-full bg-surface-container border border-white/10 rounded-lg p-2.5 text-on-surface focus:border-primary-container focus:outline-none focus:ring-1 focus:ring-primary-container transition-all"
                      value={formData.contractType}
                      onChange={e => setFormData({...formData, contractType: e.target.value})}
                    >
                      <option value="co_publishing">Co-Publishing</option>
                      <option value="full_acquisition">Full Acquisition</option>
                    </select>
                  </div>
                </div>

                {/* Grid 2 Columns for Parties Custom Information */}
                <div className="bg-surface-container/30 border border-white/5 rounded-lg p-4 space-y-4">
                  <h3 className="text-xs font-bold text-primary-container uppercase tracking-wider flex items-center gap-1.5 border-b border-white/5 pb-2">
                    <span className="w-1.5 h-1.5 bg-primary-container rounded-full"></span> BÊN A: BÊN NHẬN PHÁT HÀNH (PLATFORM)
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] text-on-surface-variant mb-1 uppercase font-mono">Người Đại Diện Bên A / Representative Name</label>
                      <input 
                        type="text" 
                        placeholder="E.g. Nguyễn Văn A (Default: Godot Launch Admin)"
                        className="w-full bg-surface-container border border-white/10 rounded-lg p-2.5 text-xs text-on-surface focus:border-primary-container focus:outline-none"
                        value={formData.buyerRepresentative}
                        onChange={e => setFormData({...formData, buyerRepresentative: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-on-surface-variant mb-1 uppercase font-mono">Chức Vụ Đại Diện / Position Title</label>
                      <input 
                        type="text" 
                        placeholder="E.g. Giám đốc điều hành"
                        className="w-full bg-surface-container border border-white/10 rounded-lg p-2.5 text-xs text-on-surface focus:border-primary-container focus:outline-none"
                        value={formData.buyerPosition}
                        onChange={e => setFormData({...formData, buyerPosition: e.target.value})}
                      />
                    </div>
                  </div>

                  <h3 className="text-xs font-bold text-primary-container uppercase tracking-wider flex items-center gap-1.5 border-b border-white/5 pb-2 pt-2">
                    <span className="w-1.5 h-1.5 bg-primary-container rounded-full"></span> BÊN B: NHÀ PHÁT TRIỂN (DEVELOPER)
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[10px] text-on-surface-variant mb-1 uppercase font-mono">Tên Đối Tác / Seller Name</label>
                      <input 
                        type="text" 
                        placeholder="E.g. Trần Văn B"
                        className="w-full bg-surface-container border border-white/10 rounded-lg p-2.5 text-xs text-on-surface focus:border-primary-container focus:outline-none"
                        value={formData.sellerRepresentative}
                        onChange={e => setFormData({...formData, sellerRepresentative: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-on-surface-variant mb-1 uppercase font-mono">Địa chỉ / Address</label>
                      <input 
                        type="text" 
                        placeholder="E.g. 123 Đường Láng, Hà Nội"
                        className="w-full bg-surface-container border border-white/10 rounded-lg p-2.5 text-xs text-on-surface focus:border-primary-container focus:outline-none"
                        value={formData.sellerAddress}
                        onChange={e => setFormData({...formData, sellerAddress: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-on-surface-variant mb-1 uppercase font-mono">Mã số thuế / CCCD (Tax / ID Code)</label>
                      <input 
                        type="text" 
                        placeholder="E.g. 0102030405 hoặc 030012345678"
                        className="w-full bg-surface-container border border-white/10 rounded-lg p-2.5 text-xs text-on-surface focus:border-primary-container focus:outline-none"
                        value={formData.sellerTaxCode}
                        onChange={e => setFormData({...formData, sellerTaxCode: e.target.value})}
                      />
                    </div>
                  </div>
                </div>

                {/* Dynamic Financial Configuration */}
                {formData.contractType === 'co_publishing' ? (
                  <div className="bg-surface-container/30 border border-white/5 rounded-lg p-4">
                    <label className="block text-xs text-primary-container mb-1.5 uppercase font-mono tracking-wider">Developer Revenue Share (%)</label>
                    <div className="flex items-center gap-4">
                      <input 
                        type="number" 
                        min="1" max="99"
                        className="w-32 bg-surface-container border border-white/10 rounded-lg p-2.5 text-on-surface focus:border-primary-container focus:outline-none"
                        value={formData.revenueSplit}
                        onChange={e => setFormData({...formData, revenueSplit: e.target.value})}
                      />
                      <div className="text-sm text-on-surface-variant">
                        Developer receives <strong className="text-on-surface">{formData.revenueSplit}%</strong>. Platform commission is <strong className="text-primary-container">{100 - parseInt(formData.revenueSplit || 0)}%</strong>.
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-surface-container/30 border border-white/5 rounded-lg p-4 animate-in fade-in duration-200">
                    <label className="block text-xs text-primary-container mb-1.5 uppercase font-mono tracking-wider">Acquisition Lump-Sum Price (e.g. $5,000 or 120,000,000 VND)</label>
                    <input 
                      type="text"
                      placeholder="E.g. 5,000 USD or 120,000,000 VND"
                      className="w-full bg-surface-container border border-white/10 rounded-lg p-2.5 text-on-surface focus:border-primary-container focus:outline-none focus:ring-1 focus:ring-primary-container"
                      value={formData.lumpSumAmount}
                      onChange={e => setFormData({...formData, lumpSumAmount: e.target.value})}
                      required={formData.contractType === 'full_acquisition'}
                    />
                    <p className="text-xs text-on-surface-variant mt-1.5">This exact valuation will be legally embedded into Section 3.2 (Lump-Sum Payment).</p>
                  </div>
                )}

                {/* Legal Clauses and Terms Editing Area */}
                <div className="space-y-4 border-t border-white/10 pt-4">
                  <h3 className="text-sm font-bold text-on-surface uppercase tracking-wide flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary-container"></span> Contract Clauses &amp; Terms
                  </h3>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-xs text-primary-container uppercase font-mono tracking-wider">Section 5.3: Dispute Resolution Clause</label>
                      <button 
                        type="button"
                        onClick={() => setFormData({...formData, disputeResolutionClause: ''})}
                        className="text-[10px] text-on-surface-variant hover:text-white underline"
                      >
                        Reset to Default Template
                      </button>
                    </div>
                    <textarea 
                      rows="3"
                      className="w-full bg-surface-container border border-white/10 rounded-lg p-2.5 text-xs text-on-surface focus:border-primary-container focus:outline-none focus:ring-1 focus:ring-primary-container font-sans"
                      value={formData.disputeResolutionClause}
                      onChange={e => setFormData({...formData, disputeResolutionClause: e.target.value})}
                      placeholder="Enter custom dispute resolution clause, or leave empty for default bilingual Godot Launch dispute system..."
                    />
                    <p className="text-[10px] text-on-surface-variant mt-1">Allows custom arbitration courts or local jurisdictions instead of Godot Launch Center.</p>
                  </div>

                  <div>
                    <label className="block text-xs text-primary-container mb-1 uppercase font-mono tracking-wider">Section 6: Custom Additional Agreements (Optional)</label>
                    <textarea 
                      rows="4"
                      className="w-full bg-surface-container border border-white/10 rounded-lg p-2.5 text-xs text-on-surface focus:border-primary-container focus:outline-none focus:ring-1 focus:ring-primary-container font-sans"
                      value={formData.additionalTerms}
                      onChange={e => setFormData({...formData, additionalTerms: e.target.value})}
                      placeholder="Enter any other custom provisions, deadlines, deliverables, or restrictions (e.g. Bên B cam kết bàn giao mã nguồn sạch trước ngày 30/06/2026...)"
                    />
                    <p className="text-[10px] text-on-surface-variant mt-1">This custom block will be appended to the PDF as Section 6 (Additional Terms).</p>
                  </div>
                </div>
              </div>

              {/* Fixed Footer */}
              <div className="p-4 border-t border-white/5 bg-surface-container/50 flex justify-end gap-3 z-10">
                <button 
                  type="button" 
                  onClick={() => setShowCreateModal(false)} 
                  className="px-4 py-2 rounded text-on-surface-variant hover:bg-white/5 transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={submitting}
                  className="px-6 py-2 rounded-lg bg-primary-container text-on-primary-fixed font-bold hover:brightness-110 disabled:opacity-50 flex items-center gap-2 cursor-pointer transition-all shadow-md"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  Save &amp; Generate PDF
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View PDF & Countersign Modal */}
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

            <div className="p-4 border-t border-white/5 bg-surface-container/50 flex justify-end gap-4 items-center">
              {selectedContract.status === 'pending' && selectedContract.signedAtSeller && !selectedContract.signedAtBuyer && (
                <span className="text-sm text-blue-400 mr-auto flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" /> Developer has signed. Waiting for your countersignature.
                </span>
              )}
              
              <button 
                onClick={() => setSelectedContract(null)}
                className="px-6 py-2 rounded-lg border border-white/10 text-on-surface-variant hover:bg-white/5 transition-all cursor-pointer font-label-lg"
              >
                Close
              </button>
              
              {selectedContract.status === 'pending' && selectedContract.signedAtSeller && !selectedContract.signedAtBuyer && (
                <button 
                  onClick={() => setShowSignPad(true)}
                  disabled={signing}
                  className="px-6 py-2 rounded-lg bg-primary-container text-on-primary-fixed hover:brightness-110 transition-all font-bold tracking-wide flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {signing ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                  DRAW SIGNATURE &amp; COUNTERSIGN
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
            onSave={(base64) => handleAdminSign(base64)}
            onCancel={() => setShowSignPad(false)}
          />
        </div>
      )}
    </main>
  );
}
