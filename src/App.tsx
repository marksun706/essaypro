import React, { useState, useRef, useEffect } from 'react';
import { Send, AlertCircle, Loader2, Paperclip, Mail, ShieldAlert, Info, X, Copy, Check, GraduationCap, ChevronRight, MessageSquare } from 'lucide-react';

interface Message {
  role: 'ai' | 'user';
  content: string;
}

const loadScript = (src: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load script ${src}`));
    document.body.appendChild(script);
  });
};

function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Navigation Modal States
  const [activeModal, setActiveModal] = useState<'about' | 'contact' | 'disclaimer' | null>(null);
  const [copied, setCopied] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messages.length > 0) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const copyEmail = () => {
    navigator.clipboard.writeText('admissions@essayspro.org');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsParsing(true);
    setError(null);

    try {
      const fileExtension = file.name.split('.').pop()?.toLowerCase();

      if (fileExtension === 'txt') {
        const reader = new FileReader();
        reader.onload = (event) => {
          const content = event.target?.result;
          if (typeof content === 'string') {
            setInput(prev => prev + `\n[File Content: ${file.name}]\n${content}\n`);
            setIsParsing(false);
          }
        };
        reader.onerror = () => {
          setError("Failed to read the text file.");
          setIsParsing(false);
        };
        reader.readAsText(file);
      } 
      else if (fileExtension === 'docx') {
        await loadScript('https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.8.0/mammoth.browser.min.js');
        
        const reader = new FileReader();
        reader.onload = async (event) => {
          const arrayBuffer = event.target?.result;
          if (arrayBuffer instanceof ArrayBuffer) {
            try {
              // @ts-ignore
              const result = await window.mammoth.extractRawText({ arrayBuffer: arrayBuffer });
              setInput(prev => prev + `\n[Document Content: ${file.name}]\n${result.value}\n`);
            } catch (err: any) {
              setError(`Failed to parse Word document: ${err.message}`);
            }
          }
          setIsParsing(false);
        };
        reader.onerror = () => {
          setError("Failed to read the Word file.");
          setIsParsing(false);
        };
        reader.readAsArrayBuffer(file);
      } 
      else if (fileExtension === 'pdf') {
        await loadScript('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js');
        
        const reader = new FileReader();
        reader.onload = async (event) => {
          const arrayBuffer = event.target?.result;
          if (arrayBuffer instanceof ArrayBuffer) {
            try {
              // @ts-ignore
              const pdfjsLib = window['pdfjs-dist/build/pdf'];
              pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
              
              const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
              const pdf = await loadingTask.promise;
              let fullText = '';
              
              for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                // @ts-ignore
                const pageText = textContent.items.map((item: any) => item.str).join(' ');
                fullText += pageText + '\n';
              }
              
              setInput(prev => prev + `\n[PDF Content: ${file.name}]\n${fullText}\n`);
            } catch (err: any) {
              setError(`Failed to parse PDF document: ${err.message}`);
            }
          }
          setIsParsing(false);
        };
        reader.onerror = () => {
          setError("Failed to read the PDF file.");
          setIsParsing(false);
        };
        reader.readAsArrayBuffer(file);
      } 
      else {
        setError("Unsupported file format. Please upload a .txt, .pdf, or .docx file.");
        setIsParsing(false);
      }
    } catch (err: any) {
      setError(`Failed to load document parsing library: ${err.message}`);
      setIsParsing(false);
    } finally {
      e.target.value = '';
    }
  };

  const handleSend = async (customMessage?: string) => {
    const messageToSend = customMessage || input;
    if (!messageToSend.trim() || isLoading) return;
    
    const userMsg: Message = { role: 'user', content: messageToSend };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);
    setError(null);

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const isPlaceholder = !supabaseUrl || 
                            supabaseUrl.includes('your-project') || 
                            supabaseUrl.includes('placeholder') || 
                            supabaseUrl.trim() === '';
      const fetchUrl = isPlaceholder ? '/functions/v1/chat' : `${supabaseUrl}/functions/v1/chat`;

      const response = await fetch(fetchUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY || 'local'}`
        },
        body: JSON.stringify({ message: messageToSend, history: messages }),
      });

      const responseText = await response.text();
      let data: any;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        throw new Error(`Server returned invalid response (Status ${response.status}). The service may still be deploying or DMXAPI credentials might be incorrect.`);
      }

      if (!response.ok) throw new Error(data.error || 'Server error');
      
      setMessages(prev => [...prev, { role: 'ai', content: data.reply }]);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Quick Start Suggestions
  const suggestions = [
    { title: "Draft a Personal Statement", text: "I want to draft a personal statement highlighting my passion for computer science and community volunteering." },
    { title: "Refine Ivy League Supplement", text: "Help me structure an elegant supplement response explaining 'Why Penn' for my undergraduate application." },
    { title: "Review Tone & Vocabulary", text: "Here is my essay introduction. Can you check its tone for flow, maturity, and academic rigor?" }
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800 antialiased selection:bg-indigo-500/10">
      
      {/* 1. Header (Corporate Nav Bar) */}
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-100 px-6 py-4 flex justify-between items-center sticky top-0 z-30 shadow-sm transition-all duration-300">
        <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => setMessages([])}>
          <div className="w-10 h-10 bg-gradient-to-tr from-indigo-600 to-indigo-500 rounded-xl flex items-center justify-center text-white font-bold shadow-indigo-200 shadow-xl border border-indigo-400/20 transform hover:scale-105 transition-transform">
            <GraduationCap size={22} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight leading-none">essayspro</h1>
            <span className="text-[9px] text-indigo-600 uppercase font-black tracking-widest block mt-0.5">Ivy League Standard</span>
          </div>
        </div>

        {/* Corporate Nav Menu Links */}
        <nav className="flex items-center gap-1 md:gap-2">
          <button 
            onClick={() => setActiveModal('about')}
            className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-indigo-600 hover:bg-slate-50 rounded-xl transition-all flex items-center gap-1.5"
          >
            <Info size={14} />
            <span className="hidden sm:inline">About Us</span>
          </button>
          
          <button 
            onClick={() => setActiveModal('disclaimer')}
            className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-indigo-600 hover:bg-slate-50 rounded-xl transition-all flex items-center gap-1.5"
          >
            <ShieldAlert size={14} />
            <span className="hidden sm:inline">Disclaimer</span>
          </button>

          <button 
            onClick={() => setActiveModal('contact')}
            className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-100 rounded-xl transition-all flex items-center gap-1.5 hover:shadow-lg active:scale-95"
          >
            <Mail size={14} />
            <span>Contact</span>
          </button>
        </nav>
      </header>

      {/* 2. Main Workspace (Dynamic Layout) */}
      <main className="flex-1 flex flex-col w-full relative">
        {messages.length === 0 ? (
          
          /* ================= GOOGLE-STYLE CENTRED HOMEPAGE ================= */
          <div className="flex-1 flex flex-col items-center justify-center px-4 max-w-3xl mx-auto w-full py-12 animate-fade-in">
            <div className="flex flex-col items-center text-center mb-9">
              <div className="w-16 h-16 bg-gradient-to-tr from-indigo-600 to-indigo-500 rounded-2xl flex items-center justify-center text-white font-bold shadow-indigo-100 shadow-2xl border border-indigo-400/20 mb-4 animate-scale-in">
                <GraduationCap size={36} />
              </div>
              <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight mb-2">
                essays<span className="text-indigo-600">pro</span>
              </h2>
              <p className="text-sm md:text-base text-slate-400 font-medium tracking-wide max-w-md">
                Ivy League standard generative outlining and vocabulary sculpting assistant.
              </p>
            </div>

            {/* Centered Search/Chat Input Box */}
            <div className="w-full bg-white border border-slate-200 focus-within:border-indigo-500 rounded-3xl p-3 shadow-xl shadow-slate-100/50 hover:shadow-2xl hover:shadow-slate-100/80 transition-all duration-300 max-w-2xl focus-within:ring-4 focus-within:ring-indigo-100">
              <div className="flex items-end gap-2 relative">
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isParsing}
                  className="p-3 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 rounded-2xl transition-all disabled:opacity-30 disabled:pointer-events-none"
                  title="Upload Requirements"
                >
                  <Paperclip size={20} />
                </button>
                <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".txt,.pdf,.docx" />

                <textarea 
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyPress}
                  disabled={isParsing}
                  className="flex-1 border-0 focus:outline-none focus:ring-0 resize-none bg-transparent py-2.5 px-2 text-sm text-slate-800 placeholder-slate-400 min-h-[44px] disabled:opacity-50"
                  placeholder={isParsing ? "Extracting text from document..." : "Paste essay requirements or type your story details..."}
                  rows={1}
                />
                
                <button 
                  onClick={() => handleSend()}
                  disabled={isLoading || isParsing || !input.trim()}
                  className="p-3.5 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 transition-all shadow-md active:scale-95 disabled:opacity-30 disabled:scale-100 disabled:pointer-events-none"
                >
                  <Send size={18} />
                </button>
              </div>
            </div>

            {isParsing && (
              <div className="w-full max-w-2xl mt-3 flex items-center justify-center gap-2 text-slate-500 text-xs font-bold animate-pulse animate-fade-in">
                <Loader2 size={16} className="animate-spin text-indigo-600" />
                <span>Reading and extracting document content...</span>
              </div>
            )}

            {/* Quick Suggestions Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 w-full max-w-2xl mt-8">
              {suggestions.map((s, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(s.text)}
                  className="text-left p-4 bg-white border border-slate-100 hover:border-indigo-100 hover:bg-indigo-50/20 rounded-2xl shadow-sm hover:shadow-md transition-all group duration-200"
                >
                  <h3 className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 flex items-center gap-1">
                    {s.title}
                    <ChevronRight size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                  </h3>
                  <p className="text-[11px] text-slate-400 group-hover:text-slate-500 mt-1.5 leading-relaxed line-clamp-2">
                    {s.text}
                  </p>
                </button>
              ))}
            </div>

            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold mt-12 text-center">
              🔒 Premium AI Outliner &bull; Fully Encrypted Connections
            </p>
          </div>
        ) : (
          
          /* ================= CONVERSATIONAL CHAT THREAD ================= */
          <div className="flex-1 flex flex-col w-full animate-fade-in">
            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto px-4 py-8 md:px-8 space-y-6 max-w-4xl mx-auto w-full">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'ai' ? 'justify-start animate-slide-up' : 'justify-end'}`}>
                  <div className={`max-w-[85%] md:max-w-[75%] p-4 md:p-5 rounded-2xl shadow-sm leading-relaxed border ${
                    msg.role === 'ai' 
                      ? 'bg-white border-slate-100 text-slate-800 rounded-tl-none' 
                      : 'bg-indigo-600 border-indigo-700 text-white rounded-tr-none shadow-md shadow-indigo-100'
                  }`}>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              ))}
              
              {isLoading && (
                <div className="flex items-center gap-2.5 text-slate-400 text-xs font-semibold animate-pulse py-2">
                  <Loader2 size={16} className="animate-spin text-indigo-600" /> Analyzing vocabulary standard...
                </div>
              )}

              {isParsing && (
                <div className="flex items-center gap-2.5 text-slate-400 text-xs font-semibold animate-pulse py-2">
                  <Loader2 size={16} className="animate-spin text-indigo-600" /> Extracting document text...
                </div>
              )}
              
              {error && (
                <div className="flex items-center gap-2.5 text-red-600 bg-red-50 p-4 rounded-2xl border border-red-100 text-sm shadow-sm">
                  <AlertCircle size={18} /> 
                  <span className="font-medium">{error}</span>
                </div>
              )}
              
              <div ref={chatEndRef} />
            </div>

            {/* Bottom sticky input bar */}
            <div className="p-4 md:p-6 bg-white border-t border-slate-100 sticky bottom-0 z-10 shadow-lg shadow-slate-100">
              <div className="max-w-3xl mx-auto flex items-end gap-2 relative">
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isParsing}
                  className="p-3 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 rounded-2xl transition-all disabled:opacity-30 disabled:pointer-events-none"
                  title="Upload Requirements"
                >
                  <Paperclip size={20} />
                </button>
                <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".txt,.pdf,.docx" />
                
                <textarea 
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyPress}
                  disabled={isParsing}
                  className="flex-1 border border-slate-200 focus:outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 rounded-2xl p-4 bg-slate-50 resize-none transition-all text-sm min-h-[52px] disabled:opacity-50"
                  placeholder={isParsing ? "Extracting text from document..." : "Ask a follow-up, paste a prompt or rewrite requirements..."}
                  rows={1}
                />
                
                <button 
                  onClick={() => handleSend()}
                  disabled={isLoading || isParsing || !input.trim()}
                  className="p-4 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 transition-all shadow-md active:scale-95 disabled:opacity-50 disabled:scale-100 disabled:pointer-events-none"
                >
                  <Send size={18} />
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ================= PREMIUM GLASSMORPHISM MODAL DIALOGS ================= */}
      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-md animate-fade-in">
          
          {/* About Us Modal */}
          {activeModal === 'about' && (
            <div className="glassmorphism rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-scale-in border border-white/60">
              <div className="px-6 py-5 bg-white/40 border-b border-slate-100/50 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold">
                    <Info size={16} />
                  </div>
                  <h3 className="font-extrabold text-slate-900 tracking-tight">About essayspro</h3>
                </div>
                <button 
                  onClick={() => setActiveModal(null)} 
                  className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 transition-all"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <p className="text-sm text-slate-600 leading-relaxed">
                  <strong>essayspro</strong> is an elite academic editing platform that marries state-of-the-art generative technology with seasoned human admissions experts. 
                </p>
                <div className="p-4 bg-indigo-50/50 border border-indigo-100/40 rounded-2xl">
                  <h4 className="text-xs font-black text-indigo-700 uppercase tracking-wider mb-1">Our Core Purpose</h4>
                  <p className="text-xs text-indigo-900 leading-relaxed">
                    We help high-achieving applicants organize their stories, structure supplement responses, and polished vocabulary structure. To achieve true Ivy League quality that stands out to committees, raw drafts are polished to the absolute highest human standard.
                  </p>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Our methodologies comply with academic writing standard recommendations and enhance authentic tone without substituting student voice.
                </p>
              </div>
              <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100/50 flex justify-end">
                <button 
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 shadow-md shadow-indigo-50"
                >
                  Close
                </button>
              </div>
            </div>
          )}

          {/* Disclaimer Modal */}
          {activeModal === 'disclaimer' && (
            <div className="glassmorphism rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-scale-in border border-white/60">
              <div className="px-6 py-5 bg-white/40 border-b border-slate-100/50 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center text-white font-bold">
                    <ShieldAlert size={16} />
                  </div>
                  <h3 className="font-extrabold text-slate-900 tracking-tight">AI & Admissions Notice</h3>
                </div>
                <button 
                  onClick={() => setActiveModal(null)} 
                  className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 transition-all"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div className="p-4 bg-amber-50/50 border border-amber-200/40 rounded-2xl flex gap-3 items-start">
                  <ShieldAlert className="text-amber-600 shrink-0 mt-0.5" size={20} />
                  <div>
                    <h4 className="text-xs font-bold text-amber-900 mb-1">Frightening but Important Reality</h4>
                    <p className="text-xs text-amber-800 leading-relaxed font-medium">
                      AI-generated personal statements and supplements are increasingly flagged by university admissions software. Admissions departments search for robotic tone patterns.
                    </p>
                  </div>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed">
                  While AI outliners help formulate structure, final applications should undergo rigorous human-led refining. To support this, our advisory desk offers high-quality <strong>De-AI polishing services</strong> which transform drafts into natural, human masterpieces.
                </p>
                <div className="flex justify-center pt-2">
                  <button 
                    onClick={() => setActiveModal('contact')}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-4 py-2.5 rounded-xl transition-all flex items-center gap-1"
                  >
                    <MessageSquare size={14} /> Get De-AI Human Services
                  </button>
                </div>
              </div>
              <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100/50 flex justify-end">
                <button 
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-950"
                >
                  Close
                </button>
              </div>
            </div>
          )}

          {/* Contact Modal */}
          {activeModal === 'contact' && (
            <div className="glassmorphism rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-scale-in border border-white/60">
              <div className="px-6 py-5 bg-white/40 border-b border-slate-100/50 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold">
                    <Mail size={16} />
                  </div>
                  <h3 className="font-extrabold text-slate-900 tracking-tight">Contact Admissions Desk</h3>
                </div>
                <button 
                  onClick={() => setActiveModal(null)} 
                  className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 transition-all"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="p-6 space-y-5">
                <p className="text-sm text-slate-600 leading-relaxed text-center">
                  To reach our human advisory editors, portfolio managers, or book custom review services, connect directly via email:
                </p>
                
                {/* Copy Card */}
                <div className="bg-slate-900/5 hover:bg-slate-900/10 border border-slate-200 rounded-2xl p-4 flex flex-col items-center justify-center relative gap-3 transition-colors">
                  <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">Official Contact Desk</span>
                  <a href="mailto:admissions@essayspro.org" className="text-base font-extrabold text-slate-900 hover:text-indigo-600 transition-all underline decoration-dotted">
                    admissions@essayspro.org
                  </a>
                  
                  <button 
                    onClick={copyEmail}
                    className={`mt-1 px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                      copied 
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                        : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-sm active:scale-95'
                    }`}
                  >
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                    <span>{copied ? 'Copied!' : 'Copy to Clipboard'}</span>
                  </button>
                </div>

                <div className="text-[10px] text-center text-slate-400 font-medium leading-normal">
                  Response Window: Less than 12 Hours &bull; Mon-Sun
                </div>
              </div>
              <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100/50 flex justify-end">
                <button 
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700"
                >
                  Done
                </button>
              </div>
            </div>
          )}

        </div>
      )}

    </div>
  );
}

export default App;