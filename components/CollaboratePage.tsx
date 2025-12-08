
import React, { useEffect, useState } from 'react';
import { Verified, MessageSquare, ExternalLink, Instagram, Youtube, Music, Radio } from 'lucide-react';
import { getCollabServices } from '../services/supabaseService';
import { CollabService } from '../types';

const CollaboratePage: React.FC = () => {
  const [collabServices, setCollabServices] = useState<CollabService[]>([]);

  useEffect(() => {
      const fetchCollabs = async () => {
          try {
              const data = await getCollabServices();
              setCollabServices(data);
          } catch (error) {
              console.error('Error fetching collab services:', error);
              setCollabServices([]);
          }
      };
      fetchCollabs();
  }, []);
  
  const getPlatformIcon = (platform: string) => {
      switch(platform) {
          case 'Instagram': return <Instagram size={16} className="text-pink-500" />;
          case 'YouTube': return <Youtube size={16} className="text-red-500" />;
          case 'TikTok': return <span className="font-black text-[10px] bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-pink-500">TT</span>;
          case 'Spotify': return <Music size={16} className="text-green-500" />;
          default: return <Radio size={16} className="text-white" />;
      }
  };

  return (
    <div className="w-full max-w-[1600px] mx-auto pb-32 pt-6 px-6 lg:px-8 animate-in fade-in duration-500">
        
        <div className="flex flex-col md:flex-row justify-between items-end mb-10 gap-6">
            <div>
                <h1 className="text-3xl font-black text-white mb-2">Collaborate & Promote</h1>
                <p className="text-neutral-500 text-sm max-w-2xl">
                    Connect with platforms, influencers, and channels to promote your music. 
                    Book campaigns directly through the terminal.
                </p>
            </div>
            
            <div className="flex gap-2 bg-neutral-900 p-1 rounded-lg border border-neutral-800">
                <button className="px-4 py-2 bg-neutral-800 text-white rounded text-xs font-bold shadow">All</button>
                <button className="px-4 py-2 text-neutral-500 hover:text-white rounded text-xs font-bold transition-colors">Instagram</button>
                <button className="px-4 py-2 text-neutral-500 hover:text-white rounded text-xs font-bold transition-colors">Spotify</button>
                <button className="px-4 py-2 text-neutral-500 hover:text-white rounded text-xs font-bold transition-colors">TikTok</button>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {collabServices.map(service => (
                <div key={service.id} className="bg-[#0a0a0a] border border-neutral-800 rounded-xl overflow-hidden hover:border-primary/30 transition-all group hover:-translate-y-1 shadow-lg">
                    <div className="p-6 relative">
                        <div className="absolute top-4 right-4 p-2 bg-neutral-900 rounded-lg border border-neutral-800">
                            {getPlatformIcon(service.platform)}
                        </div>
                        
                        <div className="flex items-center gap-3 mb-4">
                            <img src={service.avatar} alt={service.name} className="w-12 h-12 rounded-lg object-cover border border-white/10" />
                            <div>
                                <h3 className="text-sm font-bold text-white flex items-center gap-1">
                                    {service.name}
                                    {service.verified && <Verified size={12} className="text-blue-400" />}
                                </h3>
                                <span className="text-[10px] text-neutral-500 font-mono">{service.handle}</span>
                            </div>
                        </div>

                        <div className="mb-4">
                            <h4 className="text-sm font-bold text-white mb-1">{service.serviceTitle}</h4>
                            <p className="text-xs text-neutral-400 leading-relaxed h-10 line-clamp-2">{service.description}</p>
                        </div>

                        <div className="flex items-center justify-between p-3 bg-neutral-900/50 rounded-lg mb-4 border border-neutral-800">
                            {service.stats.map((stat, idx) => (
                                <div key={idx} className="text-center flex-1 first:border-r border-neutral-800">
                                    <div className="text-xs font-bold text-white">{stat.value}</div>
                                    <div className="text-[8px] text-neutral-500 uppercase tracking-wider">{stat.label}</div>
                                </div>
                            ))}
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-white/5">
                            <div className="text-xs font-mono">
                                <span className="text-neutral-500">Price:</span> <span className="text-white font-bold">{service.priceRange}</span>
                            </div>
                            <button className="flex items-center gap-2 px-4 py-2 bg-white text-black rounded-lg text-xs font-bold hover:bg-primary hover:text-black transition-colors">
                                <MessageSquare size={14} /> Message
                            </button>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    </div>
  );
};

export default CollaboratePage;
