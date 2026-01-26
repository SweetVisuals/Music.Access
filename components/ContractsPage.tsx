
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Contract } from '../types';
import { FileText, Plus, Download, Trash2, ExternalLink, Eye, Printer, MoreVertical, PenTool, Save, X, Check, PenLine, ArrowLeft, ChevronRight, Mic2, Music } from 'lucide-react';
import { getContracts, createContract, updateContract, deleteContract, getCurrentUser } from '../services/supabaseService';

const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'N/A';
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    } catch (e) {
        return dateString;
    }
};

const ContractsPage: React.FC = () => {
    const [searchParams] = useSearchParams();
    const contractIdFromQuery = searchParams.get('id');
    const [contracts, setContracts] = useState<Contract[]>([]);
    const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState<Partial<Contract>>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Signature State
    const [isSigning, setIsSigning] = useState(false);
    const [signatureInput, setSignatureInput] = useState('');

    // Mobile Navigation State
    const [mobileView, setMobileView] = useState<'list' | 'detail'>('list');
    const [showMobileInfo, setShowMobileInfo] = useState(false);
    const [filter, setFilter] = useState<'all' | 'service' | 'audio'>('all');

    const handleSelectContract = (contract: Contract | null) => {
        setSelectedContract(contract);
        setEditForm({});
        setIsEditing(false);
        setIsSigning(false);
        setSignatureInput('');
        if (window.innerWidth < 1024 && contract) {
            setMobileView('detail');
        }
    };

    // Load contracts on component mount
    useEffect(() => {
        loadContracts();
    }, []);


    const loadContracts = async () => {
        try {
            setLoading(true);
            setError(null);
            const contractsData = await getContracts();
            setContracts(contractsData);

            if (contractsData.length > 0) {
                // Check if we should select a specific contract from query params
                if (contractIdFromQuery) {
                    const target = contractsData.find(c => c.id === contractIdFromQuery);
                    if (target) {
                        setSelectedContract(target);
                        if (window.innerWidth < 1024) {
                            setMobileView('detail');
                        }
                    } else {
                        setSelectedContract(contractsData[0]);
                    }
                } else if (!selectedContract) {
                    // Initial load: select first but don't force edit mode
                    setSelectedContract(contractsData[0]);
                }
            }

            // On mobile, keep list view initially unless a contract is explicitly selected
            if (window.innerWidth < 1024 && !contractIdFromQuery) {
                setMobileView('list');
            }
        } catch (err) {
            console.error('Error loading contracts:', err);
            setError('Failed to load contracts');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateNew = async () => {
        try {
            const newContract = await createContract({
                title: 'Untitled Contract',
                type: 'lease',
                status: 'draft',
                royaltySplit: 50,
                revenueSplit: 50,
                terms: 'Enter your terms and conditions here. This contract serves as a binding agreement between the Producer and the Licensee.',
                notes: '',
                distNotes: '',
                pubNotes: '',
                publisherName: '',
                producerSignature: '',
                clientSignature: ''
            });

            setContracts(prev => [newContract, ...prev]);
            setSelectedContract(newContract);
            setEditForm(newContract);
            setIsEditing(true);
            setIsSigning(false);
            setSignatureInput('');
            setMobileView('detail');
            setShowMobileInfo(true);
        } catch (err) {
            console.error('Error creating contract:', err);
            setError('Failed to create contract');
        }
    };

    const handleStartEdit = () => {
        if (!selectedContract) return;
        setEditForm({ ...selectedContract });
        setIsEditing(true);
        setShowMobileInfo(true);
    };

    const handleDeleteContract = async (contractId: string, e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent selecting the contract when clicking delete

        try {
            await deleteContract(contractId);

            // Remove the contract from the list
            setContracts(prev => prev.filter(c => c.id !== contractId));

            // If the deleted contract was selected, clear selection or select another contract
            if (selectedContract?.id === contractId) {
                const remainingContracts = contracts.filter(c => c.id !== contractId);
                handleSelectContract(remainingContracts.length > 0 ? remainingContracts[0] : null);
            }
        } catch (err) {
            console.error('Error deleting contract:', err);
            setError('Failed to delete contract');
        }
    };

    const handleCancelEdit = () => {
        setIsEditing(false);
        setEditForm({});
    };

    const handleSave = async () => {
        if (!selectedContract) return;

        try {
            const updatedContract = await updateContract(selectedContract.id, editForm);

            setContracts(contracts.map(c => c.id === selectedContract.id ? updatedContract : c));
            setSelectedContract(updatedContract);
            setIsEditing(false);
        } catch (err) {
            console.error('Error saving contract:', err);
            setError('Failed to save contract');
        }
    };

    const handleInputChange = (field: keyof Contract, value: any) => {
        setEditForm(prev => ({ ...prev, [field]: value }));
    };

    const handleStartSign = async (e: React.MouseEvent) => {
        e.stopPropagation();
        const currentSignature = isEditing ? editForm.producerSignature : selectedContract?.producerSignature;

        // If signature exists, allow editing it. If not, try to fetch user name
        if (currentSignature) {
            setSignatureInput(currentSignature);
            setIsSigning(true);
        } else {
            // Fetch current user details to default the signature
            try {
                const user = await getCurrentUser();
                // Use metadata name, or username, or empty string
                const defaultName = user?.user_metadata?.full_name || user?.user_metadata?.username || "";
                setSignatureInput(defaultName);
            } catch (err) {
                setSignatureInput("");
            }
            setIsSigning(true);
        }
    };

    const handleSaveSignature = async () => {
        try {
            if (isEditing) {
                handleInputChange('producerSignature', signatureInput);
            } else {
                if (selectedContract) {
                    const updated = await updateContract(selectedContract.id, { producerSignature: signatureInput });
                    setContracts(prev => prev.map(c => c.id === selectedContract.id ? updated : c));
                    setSelectedContract(updated);
                }
            }
            setIsSigning(false);
        } catch (err) {
            console.error('Error saving signature:', err);
            setError('Failed to save signature');
        }
    };

    // Data source to display: Edit form if editing, else selected contract
    const displayData = isEditing ? { ...selectedContract, ...editForm } as Contract : selectedContract;

    return (
        <div className="w-full h-[calc(100vh-5rem)] lg:h-[calc(100vh-10rem)] max-w-[1900px] mx-auto pb-4 pt-4 lg:pt-6 px-4 lg:px-10 xl:px-14 animate-in fade-in duration-500 flex flex-col">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-6 lg:mb-8 shrink-0 gap-4">
                <div className="hidden lg:block">
                    <h1 className="text-3xl lg:text-5xl font-black text-white mb-2 tracking-tighter">Contracts</h1>
                    <p className="text-neutral-500 text-sm lg:text-base max-w-2xl leading-relaxed">Manage your legal agreements, splits, and ownership rights.</p>
                </div>
            </div>

            <div className="w-auto md:w-auto -mx-4 px-4 md:mx-0 md:px-0 mb-6 lg:mb-8">
                {/* Mobile Tabs Layout (Grid) */}
                <div className="lg:hidden relative pb-2">
                    <div className="grid grid-cols-3 gap-1 p-1 bg-neutral-900/50 rounded-lg">
                        <button
                            onClick={() => setFilter('all')}
                            className={`
                                flex flex-col items-center justify-center gap-1 py-1.5 rounded transition-all
                                ${filter === 'all' ? 'bg-white/10 text-white shadow-sm' : 'text-neutral-500 hover:text-neutral-300'}
                            `}
                        >
                            <FileText size={14} className={filter === 'all' ? 'text-primary' : ''} />
                            <span className="text-[9px] font-bold uppercase tracking-tight">All</span>
                        </button>
                        <button
                            onClick={() => setFilter('service')}
                            className={`
                                flex flex-col items-center justify-center gap-1 py-1.5 rounded transition-all
                                ${filter === 'service' ? 'bg-white/10 text-white shadow-sm' : 'text-neutral-500 hover:text-neutral-300'}
                            `}
                        >
                            <Mic2 size={14} className={filter === 'service' ? 'text-primary' : ''} />
                            <span className="text-[9px] font-bold uppercase tracking-tight">Service</span>
                        </button>
                        <button
                            onClick={() => setFilter('audio')}
                            className={`
                                flex flex-col items-center justify-center gap-1 py-1.5 rounded transition-all
                                ${filter === 'audio' ? 'bg-white/10 text-white shadow-sm' : 'text-neutral-500 hover:text-neutral-300'}
                            `}
                        >
                            <Music size={14} className={filter === 'audio' ? 'text-primary' : ''} />
                            <span className="text-[9px] font-bold uppercase tracking-tight">Audio</span>
                        </button>
                    </div>
                </div>

                {/* Desktop Segmented Control */}
                <div className="hidden lg:flex lg:bg-neutral-900 lg:p-1 lg:rounded-lg">
                    <button
                        onClick={() => setFilter('all')}
                        className={`
                            px-6 py-2.5 text-sm font-bold rounded-md transition-all flex items-center justify-center
                            ${filter === 'all'
                                ? 'bg-neutral-800 text-white shadow'
                                : 'bg-transparent text-neutral-400 hover:bg-white/5'
                            }
                        `}
                    >
                        All Contracts
                    </button>
                    <button
                        onClick={() => setFilter('service')}
                        className={`
                            px-6 py-2.5 text-sm font-bold rounded-md transition-all flex items-center justify-center
                            ${filter === 'service'
                                ? 'bg-neutral-800 text-white shadow'
                                : 'bg-transparent text-neutral-400 hover:bg-white/5'
                            }
                        `}
                    >
                        Service
                    </button>
                    <button
                        onClick={() => setFilter('audio')}
                        className={`
                            px-6 py-2.5 text-sm font-bold rounded-md transition-all flex items-center justify-center
                            ${filter === 'audio'
                                ? 'bg-neutral-800 text-white shadow'
                                : 'bg-transparent text-neutral-400 hover:bg-white/5'
                            }
                        `}
                    >
                        Audio
                    </button>
                </div>
            </div>

            {error && (
                <div className="mb-4 p-3 bg-red-500/10 rounded-lg text-red-400 text-sm">
                    {error}
                </div>
            )}

            {loading && (
                <div className="flex-1 flex items-center justify-center">
                    <div className="text-neutral-500">Loading contracts...</div>
                </div>
            )}

            {!loading && (
                <div className="flex-1 flex gap-4 lg:gap-6 overflow-hidden relative">
                    {/* Sidebar List */}
                    <div className={`
                ${mobileView === 'list' ? 'flex' : 'hidden lg:flex'} 
                w-full lg:w-80 xl:w-96 flex-col gap-3 overflow-y-auto pr-2 shrink-0 custom-scrollbar
            `}>
                        <button
                            onClick={handleCreateNew}
                            className="p-3 rounded-lg flex items-center justify-center gap-2 text-neutral-500 hover:text-primary hover:bg-primary/5 transition-all group bg-white/[0.01]"
                        >
                            <Plus size={14} className="group-hover:scale-110 transition-transform" />
                            <span className="text-xs font-bold uppercase tracking-wide">Create New Contract</span>
                        </button>

                        {contracts.map(contract => (
                            <div
                                onClick={() => handleSelectContract(contract)}
                                className={`p-3 rounded-lg cursor-pointer transition-all hover:bg-white/5 group ${selectedContract?.id === contract.id ? 'bg-white/5' : 'bg-[#0a0a0a]'}`}
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <div className={`p-1.5 rounded text-neutral-400 group-hover:text-primary transition-colors ${selectedContract?.id === contract.id ? 'text-primary bg-primary/10' : 'bg-neutral-900'}`}>
                                        <FileText size={16} />
                                    </div>
                                    <div className="flex gap-1.5 items-center">
                                        <span className="text-[9px] font-mono font-bold px-1 py-0.5 bg-neutral-900 rounded text-neutral-500 uppercase">{contract.type}</span>
                                        <span className={`text-[9px] font-mono font-bold px-1 py-0.5 rounded uppercase ${contract.status === 'signed' ? 'bg-green-500/10 text-green-500' : 'bg-neutral-800 text-neutral-500'}`}>{contract.status}</span>
                                        <button
                                            onClick={(e) => handleDeleteContract(contract.id, e)}
                                            className="p-1 rounded text-neutral-500 hover:text-red-400 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100"
                                            title="Delete contract"
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                    </div>
                                </div>
                                <h3 className="text-sm font-bold text-white mb-1 truncate">{contract.title}</h3>
                                <div className="flex justify-between items-center">
                                    <p className="text-[10px] text-neutral-500 font-mono">Created {formatDate(contract.created)}</p>
                                    <ChevronRight size={12} className="text-neutral-700 lg:hidden" />
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Main Area */}
                    {selectedContract ? (
                        <div className={`
                    ${mobileView === 'detail' ? 'flex' : 'hidden lg:flex'} 
                    flex-1 flex-col bg-[#0a0a0a] rounded-xl overflow-hidden
                `}>
                            {/* Toolbar */}
                            <div className="h-12 flex items-center justify-between px-3 lg:px-4 bg-neutral-900/30 shrink-0">
                                <div className="flex items-center gap-2 lg:gap-3 overflow-hidden">
                                    {/* Mobile Back Button */}
                                    <button
                                        onClick={() => setMobileView('list')}
                                        className="lg:hidden p-1.5 hover:bg-white/5 rounded-lg text-neutral-400 transition-colors shrink-0"
                                    >
                                        <ArrowLeft size={18} />
                                    </button>

                                    {isEditing ? (
                                        <div className="flex items-center gap-2 text-primary animate-pulse shrink-0">
                                            <div className="w-2 h-2 bg-primary rounded-full"></div>
                                            <span className="text-[10px] lg:text-xs font-bold uppercase tracking-widest truncate">Editing Mode</span>
                                        </div>
                                    ) : (
                                        <h2 className="text-xs lg:text-sm font-bold text-white truncate flex items-center gap-2">
                                            {selectedContract.title}
                                            {selectedContract.producerSignature && <span className="text-[8px] lg:text-[9px] bg-green-500/10 text-green-500 px-1.5 py-0.5 rounded shrink-0">SIGNED</span>}
                                        </h2>
                                    )}
                                </div>
                                <div className="flex items-center gap-2 lg:gap-3">
                                    {isEditing ? (
                                        <>
                                            <button onClick={handleCancelEdit} className="flex items-center gap-1.5 px-2 lg:px-3 py-1.5 hover:bg-white/5 rounded text-[10px] lg:text-xs font-bold text-neutral-400 hover:text-white transition-colors">
                                                <X size={14} /> <span className="hidden sm:inline">Cancel</span>
                                            </button>
                                            <button onClick={handleSave} className="flex items-center gap-1.5 px-3 lg:px-4 py-1.5 lg:py-2 bg-primary text-black rounded-lg text-[10px] lg:text-xs font-bold hover:bg-primary/90 transition-colors shadow-[0_0_15px_rgba(var(--primary),0.3)]">
                                                <Save size={14} /> <span className="hidden sm:inline">Save Changes</span><span className="sm:hidden">Save</span>
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <button
                                                onClick={() => setShowMobileInfo(!showMobileInfo)}
                                                className={`lg:hidden p-1.5 rounded-lg transition-all ${showMobileInfo ? 'bg-primary/10 text-white' : 'bg-white/5 text-neutral-400'}`}
                                            >
                                                <Eye size={18} />
                                            </button>
                                            <button onClick={handleStartEdit} className="flex items-center gap-2 px-2 lg:px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded text-[10px] lg:text-xs font-bold text-white transition-colors">
                                                <PenTool size={12} />
                                                <span className="hidden sm:inline">Edit Contract</span>
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>

                            <div className="flex-1 flex overflow-hidden relative">
                                {/* Info Panel / Editor Form */}
                                <div className={`
                            ${showMobileInfo ? 'flex translate-x-0' : 'hidden lg:flex'} 
                            absolute lg:relative inset-0 lg:inset-auto z-30 lg:z-0
                            w-full lg:w-72 xl:w-80 p-5 space-y-6 bg-neutral-950 overflow-y-auto custom-scrollbar shrink-0 transition-transform duration-300
                        `}>
                                    {/* Mobile Info Overlay Close Button */}
                                    <div className="flex lg:hidden justify-between items-center mb-4">
                                        <h3 className="text-sm font-bold text-white uppercase tracking-wider">Contract Details</h3>
                                        <button onClick={() => setShowMobileInfo(false)} className="p-1.5 hover:bg-white/5 rounded-lg text-neutral-500"><X size={16} /></button>
                                    </div>

                                    <div className="space-y-4">
                                        {/* General */}
                                        <div>
                                            <h3 className="text-[11px] font-bold text-white mb-4 uppercase tracking-[0.1em] flex items-center gap-2 opacity-80">
                                                General Information
                                            </h3>
                                            <div className="space-y-3">
                                                <InputGroup label="Title" value={displayData?.title} onChange={(v) => handleInputChange('title', v)} isEditing={isEditing} />
                                                <InputGroup label="Client Name" value={displayData?.clientName || ''} onChange={(v) => handleInputChange('clientName', v)} isEditing={isEditing} placeholder="N/A" />

                                                <div className="grid grid-cols-2 gap-2">
                                                    <div className="space-y-1">
                                                        <label className="text-[10px] text-neutral-500 font-mono block">Type</label>
                                                        {isEditing ? (
                                                            <select
                                                                value={displayData?.type}
                                                                onChange={(e) => handleInputChange('type', e.target.value)}
                                                                className="w-full bg-neutral-900 border border-neutral-800 rounded px-2 py-1.5 text-xs text-white focus:border-primary/50 focus:outline-none"
                                                            >
                                                                <option value="exclusive">Exclusive</option>
                                                                <option value="lease">Lease</option>
                                                                <option value="audio">Audio</option>
                                                                <option value="service">Service</option>
                                                            </select>
                                                        ) : (
                                                            <span className="inline-block px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] font-bold text-neutral-300 uppercase">{displayData?.type}</span>
                                                        )}
                                                    </div>

                                                    <div className="space-y-1">
                                                        <label className="text-[10px] text-neutral-500 font-mono block">Status</label>
                                                        {isEditing ? (
                                                            <select
                                                                value={displayData?.status}
                                                                onChange={(e) => handleInputChange('status', e.target.value)}
                                                                className="w-full bg-neutral-900 border border-neutral-800 rounded px-2 py-1.5 text-xs text-white focus:border-primary/50 focus:outline-none"
                                                            >
                                                                <option value="draft">Draft</option>
                                                                <option value="pending">Pending</option>
                                                                <option value="signed">Signed</option>
                                                            </select>
                                                        ) : (
                                                            <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${displayData?.status === 'signed' ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-white/5 border border-white/10 text-neutral-300'}`}>
                                                                {displayData?.status}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="space-y-1.5">
                                                    <label className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider block">Created At</label>
                                                    <div className="text-sm text-neutral-300 font-medium">{formatDate(displayData?.created)}</div>
                                                </div>
                                            </div>
                                        </div>



                                        {/* Splits */}
                                        <div>
                                            <h3 className="text-[11px] font-bold text-white mb-4 uppercase tracking-[0.1em] opacity-80">Splits</h3>
                                            <div className="space-y-4">
                                                <div className="grid grid-cols-2 gap-2">
                                                    <InputGroup label="Royalty %" value={displayData?.royaltySplit} onChange={(v) => handleInputChange('royaltySplit', parseInt(v) || 0)} isEditing={isEditing} type="number" />
                                                    <InputGroup label="Revenue %" value={displayData?.revenueSplit} onChange={(v) => handleInputChange('revenueSplit', parseInt(v) || 0)} isEditing={isEditing} type="number" />
                                                </div>
                                                <InputGroup label="Notes" value={displayData?.notes} onChange={(v) => handleInputChange('notes', v)} isEditing={isEditing} multiline placeholder="Notes for splits..." />
                                            </div>
                                        </div>



                                        {/* Terms */}
                                        <div>
                                            <h3 className="text-[11px] font-bold text-white mb-4 uppercase tracking-[0.1em] opacity-80">Terms & Conditions</h3>
                                            <InputGroup label="Content" value={displayData?.terms} onChange={(v) => handleInputChange('terms', v)} isEditing={isEditing} multiline rows={4} placeholder="Enter detailed terms..." />
                                        </div>



                                        {/* Distribution */}
                                        <div>
                                            <h3 className="text-[11px] font-bold text-white mb-4 uppercase tracking-[0.1em] opacity-80">Distribution</h3>
                                            <InputGroup label="Territories" value={displayData?.distNotes} onChange={(v) => handleInputChange('distNotes', v)} isEditing={isEditing} placeholder="Worldwide" />
                                        </div>

                                        {/* Publishing */}
                                        <div>
                                            <h3 className="text-[11px] font-bold text-white mb-4 uppercase tracking-[0.1em] opacity-80">Publishing</h3>
                                            <InputGroup label="Publisher Name" value={displayData?.publisherName} onChange={(v) => handleInputChange('publisherName', v)} isEditing={isEditing} placeholder="N/A" />
                                            <InputGroup label="Notes" value={displayData?.pubNotes} onChange={(v) => handleInputChange('pubNotes', v)} isEditing={isEditing} placeholder="None" />
                                        </div>
                                    </div>
                                </div>

                                {/* PDF Simulation Area */}
                                <div className="flex-1 bg-[#111] overflow-y-auto custom-scrollbar relative flex flex-col items-center p-4">

                                    {/* PDF Controls */}
                                    <div className="sticky top-0 lg:top-4 z-20 flex gap-2 mb-4">
                                        <button className="p-2 bg-neutral-800/90 backdrop-blur rounded-lg hover:bg-neutral-700 text-white shadow-lg transition-transform hover:scale-105" title="Download PDF"><Download size={16} /></button>
                                        <button className="p-2 bg-neutral-800/90 backdrop-blur rounded-lg hover:bg-neutral-700 text-white shadow-lg transition-transform hover:scale-105" title="Print"><Printer size={16} /></button>
                                    </div>

                                    {/* Paper Container */}
                                    <div className="w-full max-w-[520px] pb-16">
                                        {/* 
                                    Paper Dimensions: 
                                    Fluid width for mobile, capped at 520px.
                                 */}
                                        <div className="w-full min-h-[780px] bg-white text-black p-4 lg:p-6 shadow-2xl flex flex-col text-[8px] lg:text-[9px] leading-relaxed font-serif relative transition-all">
                                            {/* Header */}
                                            <div className="pb-4 lg:pb-5 mb-4 lg:mb-5 flex flex-col items-center justify-center text-center relative">
                                                <div className="hidden sm:block absolute top-0 right-0 text-right">
                                                    <p className="font-bold text-[6px] lg:text-[7px] text-gray-400 truncate max-w-[100px]">ID: {displayData?.id}</p>
                                                </div>
                                                <h1 className="text-lg lg:text-2xl font-bold font-serif uppercase tracking-widest mb-1 lg:mb-2 mt-2">Contract of Agreement</h1>
                                                <p className="text-[7px] lg:text-[8px] text-gray-500 font-sans uppercase tracking-[0.2em]">MusicAccess • Official Document</p>
                                            </div>

                                            {/* Content Generated from Data */}
                                            <div className="space-y-5 flex-1">
                                                <section>
                                                    <h2 className="font-bold text-[10px] mb-2 uppercase pb-1 font-sans tracking-wider">GENERAL INFORMATION</h2>
                                                    <div className="grid grid-cols-1 gap-1">
                                                        <p><strong className="font-sans">Title:</strong> {displayData?.title}</p>
                                                        <p><strong className="font-sans">Type:</strong> {displayData?.type?.toUpperCase()}</p>
                                                        <p><strong className="font-sans">Status:</strong> {displayData?.status}</p>
                                                        <p><strong className="font-sans">Created At:</strong> {formatDate(displayData?.created)}</p>
                                                    </div>
                                                </section>

                                                <section>
                                                    <h2 className="font-bold text-[10px] mb-2 uppercase pb-1 font-sans tracking-wider">SPLITS</h2>
                                                    <p><strong className="font-sans">Royalty Split:</strong> {displayData?.royaltySplit}%</p>
                                                    <p><strong className="font-sans">Revenue Split:</strong> {displayData?.revenueSplit}%</p>
                                                    {displayData?.notes && <p className="mt-1 text-gray-600 italic"><strong className="font-sans">Notes:</strong> {displayData?.notes}</p>}
                                                </section>

                                                <section>
                                                    <h2 className="font-bold text-[10px] mb-2 uppercase pb-1 font-sans tracking-wider">TERMS AND CONDITIONS</h2>
                                                    <p className="whitespace-pre-wrap text-justify">{displayData?.terms || 'No terms specified.'}</p>
                                                </section>

                                                <section>
                                                    <h2 className="font-bold text-[10px] mb-2 uppercase pb-1 font-sans tracking-wider">DISTRIBUTION</h2>
                                                    <p><strong className="font-sans">Platforms:</strong> All</p>
                                                    <p><strong className="font-sans">Territories:</strong> {displayData?.distNotes || 'Worldwide'}</p>
                                                    <p><strong className="font-sans">Notes:</strong> {displayData?.distNotes}</p>
                                                </section>

                                                <section>
                                                    <h2 className="font-bold text-[10px] mb-2 uppercase pb-1 font-sans tracking-wider">PUBLISHING</h2>
                                                    <p><strong className="font-sans">Publisher Name:</strong> {displayData?.publisherName || 'N/A'}</p>
                                                    <p><strong className="font-sans">Notes:</strong> {displayData?.pubNotes || 'N/A'}</p>
                                                </section>
                                            </div>

                                            {/* Signatures */}
                                            <div className="mt-6 pt-6 flex flex-col sm:flex-row justify-between gap-6 bg-gray-50/50 p-4 -mx-4 -mb-4">
                                                <div className="flex-1 z-10 relative">
                                                    <div
                                                        className="h-16 flex items-end justify-center pb-2 mb-2 relative cursor-pointer hover:bg-black/5 transition-colors group"
                                                        onClick={handleStartSign}
                                                        title="Click to sign"
                                                    >
                                                        {isSigning ? (
                                                            <div className="w-full h-full flex flex-col items-center justify-center animate-pulse bg-primary/5 rounded">
                                                                <span className="font-signature text-xl text-black/50 transform -rotate-2">Signing...</span>
                                                            </div>
                                                        ) : (
                                                            displayData?.producerSignature ? (
                                                                <span className="font-signature text-2xl lg:text-3xl text-black transform -rotate-2 select-none truncate px-2">{displayData.producerSignature}</span>
                                                            ) : (
                                                                <div className="flex flex-col items-center justify-center h-full text-gray-400 group-hover:text-black transition-colors">
                                                                    <PenLine size={16} className="mb-1" />
                                                                    <span className="text-[7px] lg:text-[8px] italic font-sans">Click to e-sign</span>
                                                                </div>
                                                            )
                                                        )}
                                                    </div>
                                                    <div className="text-center font-bold uppercase text-[7px] lg:text-[8px] font-sans tracking-widest">Producer Signature</div>
                                                </div>
                                                <div className="flex-1">
                                                    <div className="h-16 flex items-end justify-center pb-2 mb-2 relative">
                                                        {displayData?.clientSignature ? (
                                                            <span className="font-signature text-2xl lg:text-3xl text-black transform -rotate-2 truncate px-2">{displayData.clientSignature}</span>
                                                        ) : (
                                                            <span className="text-[7px] lg:text-[8px] text-gray-300 italic self-center">Waiting for client...</span>
                                                        )}
                                                    </div>
                                                    <div className="text-center font-bold uppercase text-[7px] lg:text-[8px] font-sans tracking-widest">Client Signature</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 flex items-center justify-center text-neutral-500 rounded-xl bg-[#0a0a0a]">
                            <div className="text-center">
                                <FileText size={48} className="mx-auto mb-4 opacity-50" />
                                <p>Select a contract or create a new one</p>
                            </div>
                        </div>
                    )}
                </div>
            )}
            {/* Mobile Signing Modal */}
            {isSigning && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-neutral-900 w-full max-w-md rounded-2xl p-6 shadow-2xl animate-in slide-in-from-bottom-10 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-300">
                        <h3 className="text-lg font-bold text-white mb-2">Sign Contract</h3>
                        <p className="text-neutral-400 text-sm mb-6">Type your full name below to sign this contract.</p>

                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Signature Preview</label>
                                <div className="h-24 bg-white rounded-lg flex items-center justify-center overflow-hidden relative">
                                    <span className="font-signature text-4xl text-black transform -rotate-2 select-none px-4 text-center break-words w-full">
                                        {signatureInput || <span className="text-gray-300 text-xl font-sans not-italic">Your Signature</span>}
                                    </span>
                                    <div className="absolute bottom-2 right-3 text-[10px] text-gray-400 font-sans">
                                        Signed by: {signatureInput}
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Full Name</label>
                                <input
                                    autoFocus={window.innerWidth >= 768}
                                    type="text"
                                    value={signatureInput}
                                    onChange={(e) => setSignatureInput(e.target.value)}
                                    placeholder="e.g. Mani Rae"
                                    className="w-full bg-neutral-950 rounded-lg px-4 py-3 text-white focus:outline-none transition-colors"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleSaveSignature();
                                    }}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => setIsSigning(false)}
                                    className="px-4 py-3 rounded-xl font-bold text-neutral-400 hover:bg-white/5 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSaveSignature}
                                    disabled={!signatureInput.trim()}
                                    className="px-4 py-3 rounded-xl bg-primary text-black font-bold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(var(--primary),0.3)]"
                                >
                                    Sign Contract
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const InputGroup = ({ label, value, onChange, isEditing, multiline, rows, type = "text", placeholder }: any) => (
    <div className="space-y-2">
        <label className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider block">{label}</label>
        {isEditing ? (
            multiline ? (
                <textarea
                    value={value || ''}
                    onChange={(e) => onChange(e.target.value)}
                    rows={rows || 3}
                    className="w-full bg-neutral-900 rounded px-3 py-2 text-xs text-white focus:outline-none resize-none placeholder-neutral-700"
                    placeholder={placeholder}
                />
            ) : (
                <input
                    type={type}
                    value={value || ''}
                    onChange={(e) => onChange(e.target.value)}
                    className="w-full bg-neutral-900 rounded-md px-4 py-2.5 text-sm text-white focus:outline-none placeholder-neutral-700 transition-all"
                    placeholder={placeholder}
                />
            )
        ) : (
            <div className="text-sm text-neutral-300 font-medium min-h-[1.5em] whitespace-pre-wrap break-words">
                {value || <span className="text-neutral-600 italic">{placeholder || 'N/A'}</span>}
            </div>
        )}
    </div>
);

export default ContractsPage;
