
import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Terminal } from 'lucide-react';
import { askAiAssistant } from '../services/geminiService';
import { Project, AiMessage } from '../types';

interface AiAssistantProps {
  projects: Project[];
  isOpen: boolean;
  onClose: () => void;
}

const AiAssistant: React.FC<AiAssistantProps> = ({ projects, isOpen, onClose }) => {
  const [messages, setMessages] = useState<AiMessage[]>([
    { role: 'model', text: 'System initialized. I can help you find the perfect project based on your desired vibe.' }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  const handleSend = async () => {
    if (!inputValue.trim()) return;

    const userMsg: AiMessage = { role: 'user', text: inputValue };
    const updatedMessages = [...messages, userMsg];

    setMessages(updatedMessages);
    setInputValue('');
    setIsLoading(true);

    // Pass the full conversation history (or last 5 is handled in service, but we pass full array here)
    // The service now expects { role: string, text: string }[]
    const response = await askAiAssistant(updatedMessages, projects);

    setMessages(prev => [...prev, { role: 'model', text: response }]);
    setIsLoading(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-24 right-8 w-80 h-96 bg-neutral-950 border border-neutral-700 rounded-lg shadow-2xl z-50 flex flex-col animate-in fade-in zoom-in-95 duration-200">
      {/* Header */}
      <div className="h-10 bg-neutral-900 border-b border-neutral-800 flex items-center justify-between px-4 rounded-t-lg">
        <div className="flex items-center space-x-2">
          <Terminal size={14} className="text-primary" />
          <span className="text-xs font-mono text-neutral-300">System.AI_Assistant</span>
        </div>
        <button onClick={onClose} className="text-neutral-500 hover:text-white">
          <X size={14} />
        </button>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-black/50">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded px-3 py-2 text-xs whitespace-pre-wrap ${msg.role === 'user'
              ? 'bg-neutral-800 text-white border border-neutral-700'
              : 'bg-neutral-900 text-primary font-mono border border-neutral-800'
              }`}>
              {msg.text}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-neutral-900 text-primary text-xs px-3 py-2 rounded border border-neutral-800 font-mono animate-pulse">
              Computing...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-neutral-800 bg-neutral-900 rounded-b-lg flex items-start space-x-2">
        <textarea
          className="flex-1 bg-neutral-950 border border-neutral-800 rounded px-2 py-2 text-sm text-white focus:outline-none focus:border-neutral-600 placeholder-neutral-600 font-mono resize-none"
          placeholder="Type a command..."
          rows={1}
          style={{ minHeight: '38px', maxHeight: '100px' }}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button
          onClick={handleSend}
          disabled={isLoading}
          className="p-2 bg-neutral-800 rounded text-neutral-400 hover:text-white hover:bg-neutral-700 disabled:opacity-50 h-[38px] flex items-center justify-center"
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
};

export default AiAssistant;
