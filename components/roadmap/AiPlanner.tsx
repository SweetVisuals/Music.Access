import React, { useState, useRef, useEffect } from 'react';
import { Send, Calendar, Sparkles, Loader2, X, ArrowRight } from 'lucide-react';
import { Strategy } from '../../types';
import { callDeepSeek } from '../../services/geminiService';
import { createCalendarEvent } from '../../services/supabaseService';

interface AiPlannerProps {
    strategies: Strategy[];
    onEventsAdded: () => void;
}

interface ProposedEvent {
    title: string;
    date: string; // ISO
    type: 'content' | 'marketing' | 'milestone' | 'meeting' | 'release';
    description: string;
    platform?: string;
}

const renderFormattedText = (text: string) => {
    // Split by newlines to handle blocks
    const lines = text.split('\n');
    return lines.map((line, i) => {
        // Headers (### Title)
        if (line.startsWith('### ')) {
            return <h3 key={i} className="text-md font-bold text-white mt-3 mb-1">{line.replace('### ', '')}</h3>;
        }
        if (line.startsWith('**') && line.endsWith('**')) { // Full line bold
            return <p key={i} className="font-bold text-white mb-2">{line.replace(/\*\*/g, '')}</p>;
        }

        // List Items (- Item or * Item)
        if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
            const content = line.trim().substring(2);
            return (
                <div key={i} className="flex gap-2 ml-2 mb-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-neutral-500 mt-2 shrink-0" />
                    <p className="text-neutral-300">
                        {content.split(/(\*\*.*?\*\*)/).map((part, j) => {
                            if (part.startsWith('**') && part.endsWith('**')) {
                                return <strong key={j} className="text-white font-bold">{part.slice(2, -2)}</strong>;
                            }
                            return part;
                        })}
                    </p>
                </div>
            );
        }

        // Normal text with inline bold
        if (line.trim() === '') return <br key={i} />;

        return (
            <p key={i} className="mb-2 last:mb-0">
                {line.split(/(\*\*.*?\*\*)/).map((part, j) => {
                    if (part.startsWith('**') && part.endsWith('**')) {
                        return <strong key={j} className="text-white font-bold">{part.slice(2, -2)}</strong>;
                    }
                    return part;
                })}
            </p>
        );
    });
};

const AiPlanner: React.FC<AiPlannerProps> = ({ strategies, onEventsAdded }) => {
    // --- 1. Prepare Context from Strategies ---
    const getContext = () => {
        const stage4 = strategies.find(s => s.stageId === 'stage-4')?.data || {};
        const stage5 = strategies.find(s => s.stageId === 'stage-5')?.data || {};
        const campaigns = stage5.campaigns?.campaign_list || [];

        let context = `Current Era: ${stage4.era_title || 'Untitled'}.\n`;
        context += `Era Narrative: ${stage4.era_narrative || 'N/A'}.\n`;
        context += `\nActive Campaigns:\n`;
        campaigns.forEach((c: any, i: number) => {
            context += `${i + 1}. ${c.name} (${c.dates?.from} to ${c.dates?.to})\n   Goal: ${c.goal}\n   Purpose: ${c.purpose}\n`;
        });

        return context;
    };

    const initialMessage = {
        role: 'model',
        text: `I've analyzed your Roadmap. You have ${strategies.find(s => s.stageId === 'stage-5')?.data?.campaigns?.campaign_list?.length || 0} active campaigns. \n\nShall we create a **Weekly Plan** for you? I can suggest specific content and tasks for each day.`
    };

    const [messages, setMessages] = useState<{ role: string, text: string }[]>([initialMessage]);
    const [inputValue, setInputValue] = useState('');
    const [isThinking, setIsThinking] = useState(false);
    const [isGeneratingEvents, setIsGeneratingEvents] = useState(false);
    const [proposedEvents, setProposedEvents] = useState<ProposedEvent[]>([]);
    const [showPreview, setShowPreview] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = async () => {
        if (!inputValue.trim()) return;
        const userMsg = { role: 'user', text: inputValue };
        const newHistory = [...messages, userMsg];
        setMessages(newHistory);
        setInputValue('');
        setIsThinking(true);

        // System Prompt injection
        const systemPrompt = `You are a Music Career Strategist & Manager.
        Context:
        ${getContext()}
        
        Goal: iterate with the user to create a solid **Weekly Schedule**. 
        - Ask what days they are available.
        - Suggest specific "Content Buckets" or "Campaign Actions" for specific days.
        - Be encouraging but disciplined.
        - Once agreed, TELL THE USER to click the "Integrate Plan" button at the bottom of the chat to automatically map this to the calendar.
        - DO NOT offer .ics files or external downloads. The system handles it internally via the button.

        FORMATTING RULES:
        - Use ### for Section Titles (e.g. ### Day 1: The Lab).
        - Use **bold** for key terms.
        - Use - for bullet points.
        - Keep paragraphs short and punchy.
        `;

        try {
            const apiMessages = newHistory.map(m => ({
                role: m.role === 'model' ? 'assistant' : 'user',
                content: m.text
            }));

            const payload = [
                { role: 'system', content: systemPrompt },
                ...apiMessages
            ];

            const response = await callDeepSeek(payload);
            setMessages(prev => [...prev, { role: 'model', text: response }]);

        } catch (e) {
            console.error(e);
            setMessages(prev => [...prev, { role: 'model', text: "Sorry, I had a connection error." }]);
        } finally {
            setIsThinking(false);
        }
    };

    const handleGenerateEvents = async () => {
        setIsGeneratingEvents(true);
        try {
            const today = new Date();
            const dateContext = `Today is ${today.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.`;

            // We still use current history context
            const apiMessages = messages.map(m => ({
                role: m.role === 'model' ? 'assistant' : 'user',
                content: m.text
            }));

            const extractionPayload = [
                { role: 'system', content: `You are a JSON extractor helper. Context: ${getContext()} \n ${dateContext}` },
                ...apiMessages,
                { role: 'user', content: "Based on our agreed plan, extract a list of concrete calendar events. Return ONLY valid JSON array of objects with keys: title, date (YYYY-MM-DD), type (content|marketing|milestone|meeting), description. Resolve relative dates like 'next Monday' to actual YYYY-MM-DD dates starting from Today." }
            ];

            const response = await callDeepSeek(extractionPayload, undefined, true); // true for JSON mode

            // Clean response to get JSON
            const jsonMatch = response.match(/\[.*\]/s);
            if (jsonMatch) {
                const events = JSON.parse(jsonMatch[0]);
                setProposedEvents(events);
                setShowPreview(true);
            } else {
                try {
                    const events = JSON.parse(response);
                    if (Array.isArray(events)) {
                        setProposedEvents(events);
                        setShowPreview(true);
                    } else {
                        throw new Error("Not an array");
                    }
                } catch (e) {
                    setMessages(prev => [...prev, { role: 'model', text: "I couldn't generate the events automatically. Let's clarify the dates." }]);
                }
            }
        } catch (e) {
            console.error("JSON parsing error", e);
            setMessages(prev => [...prev, { role: 'model', text: "Failed to generate plan. Please try again." }]);
        } finally {
            setIsGeneratingEvents(false);
        }
    };

    const handleConfirmEvents = async () => {
        // Save all to Supabase
        for (const event of proposedEvents) {
            await createCalendarEvent({
                title: event.title,
                startDate: new Date(event.date).toISOString(),
                endDate: new Date(event.date).toISOString(), // Point event default
                type: event.type as any,
                description: event.description,
                status: 'pending',
                metadata: { source: 'ai_planner' }
            });
        }
        onEventsAdded();
        setProposedEvents([]);
        setShowPreview(false);
        setMessages(prev => [...prev, { role: 'model', text: "Great! I've added those events to your calendar." }]);
    };

    return (
        <div className="flex h-[calc(100vh-200px)] bg-[#0a0a0a] rounded-xl overflow-hidden shadow-2xl relative">

            {/* Sidebar / Chat Interface */}
            <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${showPreview ? 'hidden md:flex md:w-1/2 md:border-r border-neutral-800' : 'w-full'}`}>

                {/* Embedded Header */}
                <div className="h-14 border-b border-neutral-800 bg-neutral-900/50 flex items-center justify-between px-6 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-purple-500/20">
                            <Sparkles size={16} className="text-white" />
                        </div>
                        <div>
                            <h2 className="text-sm font-bold text-white">Strategy Assistant</h2>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-[url('/noise.png')]">
                    {messages.map((msg, i) => (
                        <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[85%] rounded-2xl px-5 py-4 text-sm leading-relaxed shadow-sm ${msg.role === 'user'
                                ? 'bg-primary/10 text-primary border border-primary/20 rounded-tr-sm'
                                : 'bg-neutral-900 text-neutral-300 rounded-tl-sm'
                                }`}>
                                {msg.role === 'user' ? msg.text : renderFormattedText(msg.text)}
                            </div>
                        </div>
                    ))}
                    {isThinking && (
                        <div className="flex justify-start">
                            <div className="bg-neutral-900 px-4 py-3 rounded-2xl rounded-tl-sm flex items-center gap-2">
                                <Loader2 size={14} className="animate-spin text-neutral-500" />
                                <span className="text-xs text-neutral-500 animate-pulse">Analyzing...</span>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-4 bg-neutral-900/30 border-t border-neutral-800 shrink-0">
                    {messages.length > 2 && !showPreview && (
                        <div className="flex justify-center -mt-10 mb-4 opacity-0 animate-in fade-in slide-in-from-bottom-2 fill-mode-forwards duration-500">
                            <button
                                onClick={handleGenerateEvents}
                                disabled={isGeneratingEvents}
                                className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white px-6 py-2 rounded-full shadow-lg shadow-purple-500/20 hover:scale-105 active:scale-95 transition-all text-xs font-black flex items-center gap-2"
                            >
                                {isGeneratingEvents ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                                Integrate Plan
                            </button>
                        </div>
                    )}

                    <div className="relative flex items-center">
                        <input
                            type="text"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                            placeholder="Type your message..."
                            className="w-full bg-neutral-950 border border-neutral-800 text-white text-sm rounded-xl py-4 pl-4 pr-12 focus:outline-none focus:border-neutral-700 focus:ring-1 focus:ring-neutral-700 placeholder:text-neutral-600 transition-all"
                        />
                        <button
                            onClick={handleSend}
                            disabled={!inputValue.trim() || isThinking}
                            className="absolute right-2 p-2 bg-neutral-800 text-neutral-400 rounded-lg hover:bg-primary hover:text-black transition-all disabled:opacity-50 disabled:hover:bg-neutral-800 disabled:hover:text-neutral-400"
                        >
                            <Send size={16} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Preview Section - Appears side-by-side on desktop */}
            {showPreview && (
                <div className={`bg-[#0F0F0F] flex flex-col md:w-1/2 w-full absolute md:relative inset-0 z-10 md:z-auto animate-in slide-in-from-right duration-300`}>
                    <div className="h-14 border-b border-neutral-800 flex items-center justify-between px-6 bg-neutral-900/50">
                        <h3 className="text-sm font-bold text-white flex items-center gap-2">
                            <Calendar size={16} className="text-emerald-500" />
                            Proposed Schedule
                        </h3>
                        <button onClick={() => setShowPreview(false)} className="md:hidden text-neutral-500">
                            <X size={20} />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 space-y-4">
                        {proposedEvents.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-neutral-500 gap-4">
                                <div className="w-16 h-16 rounded-full bg-neutral-900 flex items-center justify-center mb-2">
                                    <Calendar size={24} className="opacity-20" />
                                </div>
                                <p className="text-sm">No events extracted yet.</p>
                            </div>
                        ) : (
                            proposedEvents.map((event, i) => (
                                <div key={i} className="bg-neutral-900 border border-neutral-800 p-4 rounded-xl flex gap-4 hover:border-neutral-700 transition-colors group">
                                    <div className="flex flex-col items-center justify-center w-12 h-14 bg-neutral-950 rounded-lg border border-neutral-800 text-center shrink-0">
                                        <span className="text-[10px] text-neutral-500 font-bold uppercase">{new Date(event.date).toLocaleDateString('en-US', { month: 'short' })}</span>
                                        <span className="text-lg font-black text-white">{new Date(event.date).getDate()}</span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="text-sm font-bold text-white truncate mb-1">{event.title}</h4>
                                        <p className="text-xs text-neutral-400 line-clamp-2">{event.description}</p>
                                        <div className="mt-2 flex items-center gap-2">
                                            <span className="px-2 py-0.5 rounded bg-white/5 border border-white/5 text-[10px] text-neutral-400 uppercase font-bold">{event.type}</span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setProposedEvents(prev => prev.filter((_, idx) => idx !== i))}
                                        className="opacity-0 group-hover:opacity-100 p-2 text-neutral-600 hover:text-red-500 transition-all"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="p-6 border-t border-neutral-800 bg-neutral-900/30">
                        <button
                            onClick={handleConfirmEvents}
                            className="w-full py-4 bg-gradient-to-r from-indigo-500 to-purple-500 hover:brightness-110 text-white font-black rounded-xl shadow-lg shadow-purple-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                        >
                            Approve Plan & Add to Calendar ({proposedEvents.length})
                            <ArrowRight size={18} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AiPlanner;
