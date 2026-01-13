
import React from 'react';
import { View } from '../types';
import { HelpCircle, FileText, Shield, Mail, MessageSquare, ChevronRight, Search } from 'lucide-react';

interface GetHelpPageProps {
    onNavigate: (view: View) => void;
}

const GetHelpPage: React.FC<GetHelpPageProps> = ({ onNavigate }) => {
    return (
        <div className="w-full max-w-7xl mx-auto pb-12 lg:pb-32 pt-8 px-6 lg:px-12 animate-in fade-in slide-in-from-bottom-2 duration-700">
            {/* Header Section */}
            <div className="text-center mb-16 px-4">
                <div className="w-14 h-14 bg-neutral-900 rounded-2xl flex items-center justify-center mx-auto mb-8 border border-white/10 shadow-[0_0_30px_rgba(0,0,0,0.5)] ring-1 ring-white/5">
                    <HelpCircle size={28} className="text-primary drop-shadow-[0_0_8px_rgba(var(--primary),0.4)]" />
                </div>
                <h1 className="text-4xl lg:text-5xl font-black text-white mb-4 tracking-tight">How can we help?</h1>
                <p className="text-neutral-400 text-lg lg:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
                    Explore our knowledge base, legal documentation, or connect with our specialized support team.
                </p>

                <div className="relative max-w-2xl mx-auto group">
                    <Search size={20} className="absolute left-5 top-1/2 -translate-y-1/2 text-neutral-500 group-focus-within:text-primary transition-colors" />
                    <input
                        className="w-full bg-[#0a0a0a] border border-neutral-800 rounded-2xl py-4 pl-14 pr-6 text-base text-white placeholder:text-neutral-600 focus:border-primary/40 focus:ring-4 focus:ring-primary/5 focus:outline-none shadow-2xl transition-all"
                        placeholder="Search for answers, guides, and policies..."
                    />
                </div>
            </div>

            {/* Legal / Policy Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-20">
                <div
                    onClick={() => onNavigate('terms')}
                    className="p-8 bg-[#0a0a0a] border border-neutral-800 rounded-2xl hover:border-primary/40 hover:bg-white/[0.02] hover:shadow-[0_20px_40px_rgba(0,0,0,0.4)] transition-all cursor-pointer group relative overflow-hidden"
                >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-[60px] rounded-full translate-x-1/2 -translate-y-1/2 group-hover:bg-primary/10 transition-colors"></div>
                    <div className="w-12 h-12 bg-neutral-900 rounded-xl flex items-center justify-center mb-6 text-neutral-400 group-hover:text-primary group-hover:scale-110 transition-all duration-300">
                        <FileText size={24} />
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-3">Terms & Conditions</h3>
                    <p className="text-sm lg:text-base text-neutral-500 mb-6 leading-relaxed">
                        Complete overview of our terms of service, acceptable usage policies, and platform agreements.
                    </p>
                    <div className="flex items-center gap-2 text-sm font-black text-primary uppercase tracking-widest">
                        Read Document <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                    </div>
                </div>

                <div
                    onClick={() => onNavigate('privacy')}
                    className="p-8 bg-[#0a0a0a] border border-neutral-800 rounded-2xl hover:border-primary/40 hover:bg-white/[0.02] hover:shadow-[0_20px_40px_rgba(0,0,0,0.4)] transition-all cursor-pointer group relative overflow-hidden"
                >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-[60px] rounded-full translate-x-1/2 -translate-y-1/2 group-hover:bg-primary/10 transition-colors"></div>
                    <div className="w-12 h-12 bg-neutral-900 rounded-xl flex items-center justify-center mb-6 text-neutral-400 group-hover:text-primary group-hover:scale-110 transition-all duration-300">
                        <Shield size={24} />
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-3">Privacy Policy</h3>
                    <p className="text-sm lg:text-base text-neutral-500 mb-6 leading-relaxed">
                        Understanding how we process, protect, and manage your data and personal identity safely.
                    </p>
                    <div className="flex items-center gap-2 text-sm font-black text-primary uppercase tracking-widest">
                        Read Document <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                    </div>
                </div>
            </div>

            {/* Support & FAQ Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 items-start">
                <div className="lg:col-span-2 space-y-10">
                    <div>
                        <h2 className="text-3xl font-black text-white mb-8 flex items-center gap-3">
                            Common Questions
                            <div className="h-px flex-1 bg-gradient-to-r from-neutral-800 to-transparent"></div>
                        </h2>
                        <div className="grid grid-cols-1 gap-4">
                            <FAQItem
                                question="How do I reset my account password?"
                                answer="You can update your security credentials in Settings > Security. If you're logged out, use the 'Forgot Password' link on the sign-in page to receive a secure reset link via email."
                            />
                            <FAQItem
                                question="What exactly are Gems and how do they work?"
                                answer="Gems are the official platform currency. They permit you to tip creators, unlock exclusive content tiers, and promote your own projects within the marketplace discovery algorithm."
                            />
                            <FAQItem
                                question="How do I withdraw my accumulated earnings?"
                                answer="Head to Dashboard > Wallet to see your balance. Once you reach the minimum threshold of $50, you can initiate a secure withdrawal to your verified Stripe or bank account."
                            />
                            <FAQItem
                                question="Is it possible to cancel an active service order?"
                                answer="Orders can be cancelled before the creator has marked the status as 'In Progress'. Visit Dashboard > Manage Orders to see cancellation eligibility for your current transactions."
                            />
                            <FAQItem
                                question="How do I verify my creator profile?"
                                answer="Verification is available to creators with at least 5 successful sales and a completed portfolio. You can apply for a verification badge through the Settings > Account section."
                            />
                        </div>
                    </div>
                </div>

                <div className="lg:sticky lg:top-8">
                    <div className="bg-[#0a0a0a] border border-neutral-800 rounded-2xl p-8 shadow-2xl relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                        <h2 className="text-2xl font-black text-white mb-4">Dedicated Support</h2>
                        <p className="text-base text-neutral-500 mb-8 leading-relaxed">
                            Can't find what you're looking for? Our elite support team is standing by to resolve any issue.
                        </p>
                        <div className="space-y-4">
                            <button className="w-full px-6 py-4 bg-white text-black rounded-xl text-sm font-black hover:bg-neutral-200 transition-all flex items-center justify-center gap-3 shadow-[0_10px_20px_rgba(255,255,255,0.1)] active:scale-[0.98]">
                                <Mail size={18} /> Email Official Support
                            </button>
                            <button className="w-full px-6 py-4 bg-neutral-900 text-white border border-white/5 rounded-xl text-sm font-black hover:bg-neutral-800 transition-all flex items-center justify-center gap-3 active:scale-[0.98]">
                                <MessageSquare size={18} /> Start Live Chat
                            </button>
                        </div>
                        <div className="mt-8 pt-8 border-t border-white/5">
                            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-widest text-neutral-500">
                                <span>Average Response</span>
                                <span className="text-emerald-400">&lt; 15 Mins</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const FAQItem = ({ question, answer }: { question: string, answer: string }) => {
    const [isOpen, setIsOpen] = React.useState(false);

    return (
        <div className={`border transition-all duration-300 rounded-2xl overflow-hidden ${isOpen ? 'border-primary/30 bg-primary/[0.02]' : 'border-neutral-800 bg-[#0a0a0a] hover:border-neutral-700'}`}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between p-6 text-left transition-colors group"
            >
                <span className={`text-base font-bold transition-colors ${isOpen ? 'text-white' : 'text-neutral-300 group-hover:text-white'}`}>{question}</span>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${isOpen ? 'bg-primary text-black' : 'bg-neutral-900 text-neutral-500 group-hover:text-neutral-300'}`}>
                    <ChevronRight size={20} className={`transition-transform duration-300 ${isOpen ? 'rotate-90' : ''}`} />
                </div>
            </button>
            <div className={`transition-all duration-500 ease-in-out overflow-hidden ${isOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
                <div className="px-6 pb-6 text-base text-neutral-400 leading-relaxed border-t border-white/5 pt-4">
                    {answer}
                </div>
            </div>
        </div>
    )
}

export default GetHelpPage;
