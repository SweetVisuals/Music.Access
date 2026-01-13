
import React from 'react';
import { ArrowLeft, FileText, Shield } from 'lucide-react';

interface LegalPageProps {
    onBack: () => void;
}

export const TermsPage: React.FC<LegalPageProps> = ({ onBack }) => {
    return (
        <div className="w-full max-w-7xl mx-auto pb-12 lg:pb-32 pt-8 px-6 lg:px-12 animate-in fade-in slide-in-from-bottom-2 duration-700">
            <button onClick={onBack} className="flex items-center gap-2 text-neutral-500 hover:text-white mb-10 text-sm font-black uppercase tracking-widest transition-colors group">
                <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Back to Help Center
            </button>

            <div className="bg-[#0a0a0a] border border-neutral-800 rounded-3xl p-8 md:p-16 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-[100px] rounded-full translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>

                <div className="flex flex-col md:flex-row md:items-center gap-6 mb-12 pb-12 border-b border-white/5">
                    <div className="w-16 h-16 bg-neutral-900 rounded-2xl flex items-center justify-center text-primary shadow-xl ring-1 ring-white/10">
                        <FileText size={32} />
                    </div>
                    <div>
                        <h1 className="text-4xl font-black text-white mb-2 tracking-tight">Terms & Conditions</h1>
                        <p className="text-sm text-neutral-500 font-mono uppercase tracking-widest">Version 2.4 • Last Updated: October 2025</p>
                    </div>
                </div>

                <div className="prose prose-invert prose-base lg:prose-lg max-w-none text-neutral-400 space-y-10">
                    <section>
                        <h3 className="text-white font-black text-lg uppercase tracking-wider mb-4 border-l-2 border-primary pl-4">1. Introduction</h3>
                        <p className="leading-relaxed">Welcome to MusicAccess. By accessing our website and using our services, you agree to be bound by the following terms and conditions. our platform provides a high-performance environment for music industry professionals. If you do not agree to these terms, please do not use our platform.</p>
                    </section>

                    <section>
                        <h3 className="text-white font-black text-lg uppercase tracking-wider mb-4 border-l-2 border-primary pl-4">2. User Accounts</h3>
                        <p className="leading-relaxed">You are responsible for maintaining the confidentiality of your account and password. You agree to accept responsibility for all activities that occur under your account. We reserve the right to refuse service or terminate accounts at our sole discretion.</p>
                    </section>

                    <section>
                        <h3 className="text-white font-black text-lg uppercase tracking-wider mb-4 border-l-2 border-primary pl-4">3. Buying and Selling</h3>
                        <p className="leading-relaxed">MusicAccess serves as a marketplace. We are not a party to the transactions between buyers and sellers. Sellers are responsible for their content and buyers are responsible for reading all license terms before purchase. All transactions are final unless otherwise stated in the specific license agreement.</p>
                    </section>

                    <section>
                        <h3 className="text-white font-black text-lg uppercase tracking-wider mb-4 border-l-2 border-primary pl-4">4. Content and Licensing</h3>
                        <p className="leading-relaxed">All beats and sound kits uploaded must be original works. Unauthorized sampling of copyrighted material is strictly prohibited. Licenses granted are binding legal agreements between the producer and the artist. MusicAccess is not responsible for copyright disputes between users.</p>
                    </section>

                    <section>
                        <h3 className="text-white font-black text-lg uppercase tracking-wider mb-4 border-l-2 border-primary pl-4">5. Prohibited Conduct</h3>
                        <p className="leading-relaxed">Users may not use the platform to harass, abuse, or harm others. Fraudulent activities, spamming, and distribution of malware will result in immediate account termination. We maintain a zero-tolerance policy for platform exploitation.</p>
                    </section>

                    <section>
                        <h3 className="text-white font-black text-lg uppercase tracking-wider mb-4 border-l-2 border-primary pl-4">6. Termination</h3>
                        <p className="leading-relaxed">We reserve the right to terminate or suspend your account immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms. Upon termination, your right to use the Service will immediately cease.</p>
                    </section>
                </div>
            </div>
        </div>
    );
};

export const PrivacyPage: React.FC<LegalPageProps> = ({ onBack }) => {
    return (
        <div className="w-full max-w-7xl mx-auto pb-12 lg:pb-32 pt-8 px-6 lg:px-12 animate-in fade-in slide-in-from-bottom-2 duration-700">
            <button onClick={onBack} className="flex items-center gap-2 text-neutral-500 hover:text-white mb-10 text-sm font-black uppercase tracking-widest transition-colors group">
                <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Back to Help Center
            </button>

            <div className="bg-[#0a0a0a] border border-neutral-800 rounded-3xl p-8 md:p-16 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-[100px] rounded-full translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>

                <div className="flex flex-col md:flex-row md:items-center gap-6 mb-12 pb-12 border-b border-white/5">
                    <div className="w-16 h-16 bg-neutral-900 rounded-2xl flex items-center justify-center text-primary shadow-xl ring-1 ring-white/10">
                        <Shield size={32} />
                    </div>
                    <div>
                        <h1 className="text-4xl font-black text-white mb-2 tracking-tight">Privacy Policy</h1>
                        <p className="text-sm text-neutral-500 font-mono uppercase tracking-widest">Version 1.9 • Last Updated: October 2025</p>
                    </div>
                </div>

                <div className="prose prose-invert prose-base lg:prose-lg max-w-none text-neutral-400 space-y-10">
                    <section>
                        <h3 className="text-white font-black text-lg uppercase tracking-wider mb-4 border-l-2 border-primary pl-4">1. Information We Collect</h3>
                        <p className="leading-relaxed">We collect information you provide directly to us, such as when you create an account, update your profile, or make a purchase. This may include your name, email address, payment information, and profile details. We also collect automated usage data to improve your experience.</p>
                    </section>

                    <section>
                        <h3 className="text-white font-black text-lg uppercase tracking-wider mb-4 border-l-2 border-primary pl-4">2. How We Use Your Information</h3>
                        <p className="leading-relaxed">We use the information we collect to operate and improve our services, process transactions, send you technical notices, and communicate with you about products, services, offers, and events. Your data helps us personalize your discovery experience.</p>
                    </section>

                    <section>
                        <h3 className="text-white font-black text-lg uppercase tracking-wider mb-4 border-l-2 border-primary pl-4">3. Data Security</h3>
                        <p className="leading-relaxed">We implement industry-standard encryption and security measures to protect the security of your personal information. However, no method of transmission over the Internet is 100% secure. We continuously monitor our systems for potential vulnerabilities.</p>
                    </section>

                    <section>
                        <h3 className="text-white font-black text-lg uppercase tracking-wider mb-4 border-l-2 border-primary pl-4">4. Cookies</h3>
                        <p className="leading-relaxed">We use cookies and similar tracking technologies to track the activity on our service and hold certain information. These technologies are essential for maintaining your session and preferences across the platform.</p>
                    </section>

                    <section>
                        <h3 className="text-white font-black text-lg uppercase tracking-wider mb-4 border-l-2 border-primary pl-4">5. Third-Party Services</h3>
                        <p className="leading-relaxed">We may employ third-party companies and individuals to facilitate our Service (e.g. Stripe for payment processing). These third parties have access to your Personal Data only to perform these specific tasks on our behalf and are obligated not to disclose or use it for any other purpose.</p>
                    </section>

                    <section>
                        <h3 className="text-white font-black text-lg uppercase tracking-wider mb-4 border-l-2 border-primary pl-4">6. Contact Us</h3>
                        <p className="leading-relaxed text-primary font-bold">If you have any questions about this Privacy Policy or how your data is handled, please contact our data protection officer at privacy@musicaccess.com.</p>
                    </section>
                </div>
            </div>
        </div>
    );
};
