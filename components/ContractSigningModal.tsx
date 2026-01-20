
import React, { useState, useEffect } from 'react';
import { X, FileText, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import { supabase } from '../services/supabaseService';
import { Contract } from '../types';
import { signContract } from '../services/supabaseService';

interface ContractSigningModalProps {
    isOpen: boolean;
    onClose: () => void;
    contractId: string;
    onSigned: () => void;
    isReadOnly?: boolean; // If true, just viewing (e.g. for seller or already signed)
}

export const ContractSigningModal: React.FC<ContractSigningModalProps> = ({
    isOpen,
    onClose,
    contractId,
    onSigned,
    isReadOnly = false
}) => {
    const [contract, setContract] = useState<Contract | null>(null);
    const [loading, setLoading] = useState(true);
    const [signing, setSigning] = useState(false);
    const [signatureName, setSignatureName] = useState('');
    const [agreed, setAgreed] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen && contractId) {
            fetchContract();
        }
    }, [isOpen, contractId]);

    const fetchContract = async () => {
        setLoading(true);
        setError(null);
        try {
            const { data, error } = await supabase
                .from('contracts')
                .select('*')
                .eq('id', contractId)
                .single();

            if (error) throw error;
            setContract(data);
        } catch (err: any) {
            console.error('Error fetching contract:', err);
            setError('Failed to load contract details.');
        } finally {
            setLoading(false);
        }
    };

    const handleSign = async () => {
        if (!signatureName.trim() || !agreed) return;

        setSigning(true);
        try {
            await signContract(contractId, signatureName);
            onSigned();
            onClose();
        } catch (err: any) {
            console.error('Error signing contract:', err);
            setError('Failed to sign contract. Please try again.');
        } finally {
            setSigning(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="w-full max-w-2xl bg-[#121212] border border-white/10 rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-white/5">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                            <FileText className="text-blue-400" size={20} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">
                                {isReadOnly ? 'View Contract' : 'Sign Contract'}
                            </h2>
                            <p className="text-xs text-zinc-400">
                                {isReadOnly ? 'Read-only mode' : 'Please read and sign to access your files'}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-zinc-400 hover:text-white hover:bg-white/5 rounded-full transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
                            <Loader className="animate-spin mb-3" size={24} />
                            <p>Loading contract...</p>
                        </div>
                    ) : error ? (
                        <div className="flex flex-col items-center justify-center py-20 text-red-400">
                            <AlertCircle className="mb-3" size={32} />
                            <p>{error}</p>
                            <button
                                onClick={fetchContract}
                                className="mt-4 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm text-white transition-colors"
                            >
                                Retry
                            </button>
                        </div>
                    ) : (
                        <>
                            {/* Contract Terms View */}
                            <div className="bg-white/5 rounded-xl p-6 border border-white/5 font-mono text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">
                                {contract?.terms || "No terms available for this contract."}
                            </div>

                            {/* Signing Section */}
                            {!isReadOnly && contract?.status !== 'signed' && (
                                <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-6 space-y-4">
                                    <h3 className="text-sm font-semibold text-blue-200 uppercase tracking-wider">
                                        Digital Signature
                                    </h3>

                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-xs text-zinc-400 mb-1.5">
                                                Type your full legal name
                                            </label>
                                            <input
                                                type="text"
                                                value={signatureName}
                                                onChange={(e) => setSignatureName(e.target.value)}
                                                placeholder="e.g. John Doe"
                                                className="w-full bg-[#0A0A0A] border border-white/10 rounded-lg px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500/50 transition-colors"
                                            />
                                        </div>

                                        <label className="flex items-start gap-3 cursor-pointer group">
                                            <div className={`mt-0.5 w-5 h-5 rounded border flex items-center justify-center transition-colors ${agreed
                                                ? 'bg-blue-500 border-blue-500'
                                                : 'border-zinc-600 group-hover:border-zinc-400'
                                                }`}>
                                                {agreed && <CheckCircle size={12} className="text-white" />}
                                            </div>
                                            <input
                                                type="checkbox"
                                                checked={agreed}
                                                onChange={(e) => setAgreed(e.target.checked)}
                                                className="hidden"
                                            />
                                            <span className="text-sm text-zinc-400 group-hover:text-zinc-300 transition-colors">
                                                I have read and agree to the terms and conditions set forth in this agreement. I understand that this digital signature is legally binding.
                                            </span>
                                        </label>
                                    </div>
                                </div>
                            )}

                            {/* Status Badge for Signed Contracts */}
                            {(isReadOnly || contract?.status === 'signed') && (
                                <div className="flex items-center gap-2 text-green-400 bg-green-500/10 px-4 py-3 rounded-lg border border-green-500/20">
                                    <CheckCircle size={16} />
                                    <span className="text-sm font-medium">
                                        Signed on {contract?.signed_at ? new Date(contract.signed_at).toLocaleDateString() : 'Unknown date'}
                                        {contract?.client_signature && ` by ${contract.client_signature}`}
                                    </span>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Footer actions */}
                {!isReadOnly && contract?.status !== 'signed' && !loading && !error && (
                    <div className="p-6 border-t border-white/5 bg-[#181818] rounded-b-2xl flex justify-end gap-3">
                        <button
                            onClick={onClose}
                            disabled={signing}
                            className="px-6 py-2.5 rounded-xl text-sm font-medium text-zinc-400 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSign}
                            disabled={!signatureName.trim() || !agreed || signing}
                            className={`px-8 py-2.5 rounded-xl text-sm font-medium text-black transition-all flex items-center gap-2 ${!signatureName.trim() || !agreed || signing
                                ? 'bg-zinc-700 cursor-not-allowed opacity-50'
                                : 'bg-white hover:bg-zinc-200 shadow-lg shadow-white/5'
                                }`}
                        >
                            {signing ? (
                                <>
                                    <Loader className="animate-spin" size={14} />
                                    Signing...
                                </>
                            ) : (
                                'Sign Agreement'
                            )}
                        </button>
                    </div>
                )}

                {/* Read-only close button */}
                {(isReadOnly || contract?.status === 'signed') && (
                    <div className="p-6 border-t border-white/5 bg-[#181818] rounded-b-2xl flex justify-end">
                        <button
                            onClick={onClose}
                            className="px-6 py-2.5 rounded-xl text-sm font-medium bg-white text-black hover:bg-zinc-200 transition-colors"
                        >
                            Close
                        </button>
                    </div>
                )}

            </div>
        </div>
    );
};
