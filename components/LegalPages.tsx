
import React from 'react';
import { ArrowLeft, FileText, Shield } from 'lucide-react';

interface LegalPageProps {
    onBack: () => void;
}

export const TermsPage: React.FC<LegalPageProps> = ({ onBack }) => {
  return (
    <div className="w-full max-w-4xl mx-auto pb-32 pt-6 px-6 lg:px-8 animate-in fade-in duration-500">
        <button onClick={onBack} className="flex items-center gap-2 text-neutral-500 hover:text-white mb-8 text-xs font-bold">
            <ArrowLeft size={14} /> Back to Help Center
        </button>
        
        <div className="bg-[#0a0a0a] border border-neutral-800 rounded-xl p-8 md:p-12">
            <div className="flex items-center gap-4 mb-8 pb-8 border-b border-neutral-800">
                <div className="p-3 bg-neutral-900 rounded-xl text-white">
                    <FileText size={32} />
                </div>
                <div>
                    <h1 className="text-2xl font-black text-white mb-1">Terms & Conditions</h1>
                    <p className="text-xs text-neutral-500 font-mono uppercase">Last Updated: October 2025</p>
                </div>
            </div>

            <div className="prose prose-invert prose-sm max-w-none text-neutral-400 space-y-6">
                <section>
                    <h3 className="text-white font-bold text-sm uppercase tracking-wide mb-2">1. Introduction</h3>
                    <p>Welcome to MusicAccess. By accessing our website and using our services, you agree to be bound by the following terms and conditions. If you do not agree to these terms, please do not use our platform.</p>
                </section>
                
                <section>
                    <h3 className="text-white font-bold text-sm uppercase tracking-wide mb-2">2. User Accounts</h3>
                    <p>You are responsible for maintaining the confidentiality of your account and password. You agree to accept responsibility for all activities that occur under your account.</p>
                </section>

                <section>
                    <h3 className="text-white font-bold text-sm uppercase tracking-wide mb-2">3. Buying and Selling</h3>
                    <p>MusicAccess serves as a marketplace. We are not a party to the transactions between buyers and sellers. Sellers are responsible for their content and buyers are responsible for reading all license terms before purchase.</p>
                </section>

                <section>
                    <h3 className="text-white font-bold text-sm uppercase tracking-wide mb-2">4. Content and Licensing</h3>
                    <p>All beats and sound kits uploaded must be original works. Unauthorized sampling of copyrighted material is strictly prohibited. Licenses granted are binding legal agreements between the producer and the artist.</p>
                </section>

                <section>
                    <h3 className="text-white font-bold text-sm uppercase tracking-wide mb-2">5. Prohibited Conduct</h3>
                    <p>Users may not use the platform to harass, abuse, or harm others. Fraudulent activities, spamming, and distribution of malware will result in immediate account termination.</p>
                </section>

                <section>
                    <h3 className="text-white font-bold text-sm uppercase tracking-wide mb-2">6. Termination</h3>
                    <p>We reserve the right to terminate or suspend your account immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms.</p>
                </section>
            </div>
        </div>
    </div>
  );
};

export const PrivacyPage: React.FC<LegalPageProps> = ({ onBack }) => {
  return (
    <div className="w-full max-w-4xl mx-auto pb-32 pt-6 px-6 lg:px-8 animate-in fade-in duration-500">
        <button onClick={onBack} className="flex items-center gap-2 text-neutral-500 hover:text-white mb-8 text-xs font-bold">
            <ArrowLeft size={14} /> Back to Help Center
        </button>
        
        <div className="bg-[#0a0a0a] border border-neutral-800 rounded-xl p-8 md:p-12">
            <div className="flex items-center gap-4 mb-8 pb-8 border-b border-neutral-800">
                <div className="p-3 bg-neutral-900 rounded-xl text-white">
                    <Shield size={32} />
                </div>
                <div>
                    <h1 className="text-2xl font-black text-white mb-1">Privacy Policy</h1>
                    <p className="text-xs text-neutral-500 font-mono uppercase">Last Updated: October 2025</p>
                </div>
            </div>

            <div className="prose prose-invert prose-sm max-w-none text-neutral-400 space-y-6">
                <section>
                    <h3 className="text-white font-bold text-sm uppercase tracking-wide mb-2">1. Information We Collect</h3>
                    <p>We collect information you provide directly to us, such as when you create an account, update your profile, or make a purchase. This may include your name, email address, payment information, and profile details.</p>
                </section>
                
                <section>
                    <h3 className="text-white font-bold text-sm uppercase tracking-wide mb-2">2. How We Use Your Information</h3>
                    <p>We use the information we collect to operate and improve our services, process transactions, send you technical notices, and communicate with you about products, services, offers, and events.</p>
                </section>

                <section>
                    <h3 className="text-white font-bold text-sm uppercase tracking-wide mb-2">3. Data Security</h3>
                    <p>We implement reasonable security measures to protect the security of your personal information. However, no method of transmission over the Internet is 100% secure.</p>
                </section>

                <section>
                    <h3 className="text-white font-bold text-sm uppercase tracking-wide mb-2">4. Cookies</h3>
                    <p>We use cookies and similar tracking technologies to track the activity on our service and hold certain information. You can instruct your browser to refuse all cookies.</p>
                </section>

                <section>
                    <h3 className="text-white font-bold text-sm uppercase tracking-wide mb-2">5. Third-Party Services</h3>
                    <p>We may employ third-party companies and individuals to facilitate our Service (e.g. payment processors). These third parties have access to your Personal Data only to perform these tasks on our behalf.</p>
                </section>

                <section>
                    <h3 className="text-white font-bold text-sm uppercase tracking-wide mb-2">6. Contact Us</h3>
                    <p>If you have any questions about this Privacy Policy, please contact us at privacy@musicaccess.com.</p>
                </section>
            </div>
        </div>
    </div>
  );
};
