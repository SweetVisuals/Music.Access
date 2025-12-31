
import React from 'react';
import { View } from '../types';
import { HelpCircle, FileText, Shield, Mail, MessageSquare, ChevronRight, Search } from 'lucide-react';

interface GetHelpPageProps {
    onNavigate: (view: View) => void;
}

const GetHelpPage: React.FC<GetHelpPageProps> = ({ onNavigate }) => {
    return (
        <div className="w-full max-w-4xl mx-auto pb-4 lg:pb-32 pt-6 px-6 lg:px-8 animate-in fade-in duration-500">
            <div className="text-center mb-12">
                <div className="w-16 h-16 bg-neutral-900 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-white/10 shadow-2xl">
                    <HelpCircle size={32} className="text-primary" />
                </div>
                <h1 className="text-3xl font-black text-white mb-3">How can we help?</h1>
                <p className="text-neutral-500 text-sm max-w-lg mx-auto mb-8">
                    Browse our knowledge base, read legal documents, or get in touch with our support team.
                </p>

                <div className="relative max-w-lg mx-auto">
                    <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" />
                    <input
                        className="w-full bg-[#0a0a0a] border border-neutral-800 rounded-xl py-3 pl-11 pr-4 text-sm text-white focus:border-primary/50 focus:outline-none shadow-lg"
                        placeholder="Search for answers..."
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
                <div
                    onClick={() => onNavigate('terms')}
                    className="p-6 bg-[#0a0a0a] border border-neutral-800 rounded-xl hover:border-primary/30 hover:bg-white/5 transition-all cursor-pointer group"
                >
                    <div className="w-10 h-10 bg-neutral-900 rounded-lg flex items-center justify-center mb-4 text-neutral-400 group-hover:text-primary transition-colors">
                        <FileText size={20} />
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2">Terms & Conditions</h3>
                    <p className="text-xs text-neutral-500 mb-4 leading-relaxed">
                        Read our terms of service, usage policies, and user agreements for the platform.
                    </p>
                    <div className="flex items-center gap-1 text-xs font-bold text-primary">
                        Read Document <ChevronRight size={12} />
                    </div>
                </div>

                <div
                    onClick={() => onNavigate('privacy')}
                    className="p-6 bg-[#0a0a0a] border border-neutral-800 rounded-xl hover:border-primary/30 hover:bg-white/5 transition-all cursor-pointer group"
                >
                    <div className="w-10 h-10 bg-neutral-900 rounded-lg flex items-center justify-center mb-4 text-neutral-400 group-hover:text-primary transition-colors">
                        <Shield size={20} />
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2">Privacy Policy</h3>
                    <p className="text-xs text-neutral-500 mb-4 leading-relaxed">
                        Learn how we collect, use, and protect your data and personal information.
                    </p>
                    <div className="flex items-center gap-1 text-xs font-bold text-primary">
                        Read Document <ChevronRight size={12} />
                    </div>
                </div>
            </div>

            <div className="space-y-8">
                <div>
                    <h2 className="text-xl font-bold text-white mb-6">Frequently Asked Questions</h2>
                    <div className="space-y-3">
                        <FAQItem
                            question="How do I reset my password?"
                            answer="Go to Settings > Security and click on 'Change Password'. You can also use the 'Forgot Password' link on the login screen."
                        />
                        <FAQItem
                            question="What are Gems used for?"
                            answer="Gems are our internal currency used for tipping creators, unlocking special features, and boosting your profile visibility."
                        />
                        <FAQItem
                            question="How do I withdraw my earnings?"
                            answer="Navigate to Dashboard > Wallet. If you have a balance over $50, you can request a payout to your connected PayPal or Bank Account."
                        />
                        <FAQItem
                            question="Can I cancel a service order?"
                            answer="Orders can be cancelled if the seller has not yet started working. Go to Dashboard > Manage Orders to view your active orders and options."
                        />
                    </div>
                </div>

                <div className="bg-[#0a0a0a] border border-neutral-800 rounded-xl p-8 text-center">
                    <h2 className="text-lg font-bold text-white mb-2">Still need help?</h2>
                    <p className="text-xs text-neutral-500 mb-6">Our support team is available 24/7 to assist you.</p>
                    <div className="flex justify-center gap-4">
                        <button className="px-6 py-3 bg-white text-black rounded-lg text-xs font-bold hover:bg-neutral-200 transition-colors flex items-center gap-2">
                            <Mail size={16} /> Email Support
                        </button>
                        <button className="px-6 py-3 bg-neutral-800 text-white rounded-lg text-xs font-bold hover:bg-neutral-700 transition-colors flex items-center gap-2">
                            <MessageSquare size={16} /> Live Chat
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const FAQItem = ({ question, answer }: { question: string, answer: string }) => {
    const [isOpen, setIsOpen] = React.useState(false);

    return (
        <div className="border border-neutral-800 rounded-lg bg-[#0a0a0a] overflow-hidden">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between p-4 text-left hover:bg-white/5 transition-colors"
            >
                <span className="text-sm font-bold text-white">{question}</span>
                <ChevronRight size={16} className={`text-neutral-500 transition-transform duration-300 ${isOpen ? 'rotate-90' : ''}`} />
            </button>
            <div className={`px-4 text-xs text-neutral-400 leading-relaxed transition-all duration-300 ease-in-out overflow-hidden ${isOpen ? 'max-h-40 pb-4 opacity-100' : 'max-h-0 opacity-0'}`}>
                {answer}
            </div>
        </div>
    )
}

export default GetHelpPage;
