
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

interface Message {
  role: 'user' | 'bot';
  text: string;
}

const HelpChat: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'bot', text: 'Namaste! I am your Gurukul Assistant. How can I help you on your quest for knowledge today?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setLoading(true);

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: userMsg,
        config: {
          systemInstruction: "You are 'Gurukul Sahayak', a legendary AI guide for 'Bharat AI-Gurukul'. You help students navigate their educational quest. You explain game mechanics: Levels (Sopan), Worlds (Loka), Boss Levels (👹), and the ultimate God Level (🕉️). You provide technical help and emotional support. Your tone is like a wise but friendly elder brother/sister. Use 'Pure Hinglish' - mix Hindi and English naturally (e.g., 'Aapka quest shuru ho gaya hai, tension mat lo!'). Keep responses concise and encouraging. You are an AI, but you speak with the heart of a teacher."
        }
      });

      setMessages(prev => [...prev, { role: 'bot', text: response.text || "I'm sorry, I couldn't understand that. Can you try again?" }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'bot', text: "Gurukul connection is weak. Please try again later." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-[60]">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            className="absolute bottom-20 right-0 w-80 h-96 bg-[#0f172a] border border-orange-500/30 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          >
            <div className="p-4 bg-orange-600 flex justify-between items-center">
              <h3 className="font-bold text-white flex items-center">
                <span className="mr-2">🤖</span> Gurukul Sahayak
              </h3>
              <button onClick={() => setIsOpen(false)} className="text-white/80 hover:text-white">✕</button>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${msg.role === 'user' ? 'bg-orange-600 text-white rounded-tr-none' : 'bg-gray-800 text-gray-200 rounded-tl-none'}`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-gray-800 p-3 rounded-2xl rounded-tl-none animate-pulse">
                    <div className="flex space-x-1">
                      <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" />
                      <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce [animation-delay:0.2s]" />
                      <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce [animation-delay:0.4s]" />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-800 flex space-x-2">
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyPress={e => e.key === 'Enter' && handleSend()}
                placeholder="Ask for help..."
                className="flex-1 bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-sm outline-none focus:border-orange-500"
              />
              <button
                onClick={handleSend}
                disabled={loading}
                className="bg-orange-600 p-2 rounded-xl hover:bg-orange-500 disabled:opacity-50"
              >
                🚀
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 bg-orange-600 rounded-full shadow-lg shadow-orange-600/40 flex items-center justify-center text-2xl z-50"
      >
        {isOpen ? '✕' : '💬'}
      </motion.button>
    </div>
  );
};

export default HelpChat;
