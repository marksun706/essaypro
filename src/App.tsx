import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  AlertCircle, 
  Loader2, 
  Paperclip, 
  Mail, 
  ShieldAlert, 
  Info, 
  X, 
  Copy, 
  Check, 
  GraduationCap, 
  MessageSquare, 
  Download, 
  Sparkles, 
  FileText, 
  BookOpen
} from 'lucide-react';

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

  // Split-Screen Redesign States
  const [storyInput, setStoryInput] = useState<string>('');
  const [wordLimit, setWordLimit] = useState<string>('');
  const [targetProgram, setTargetProgram] = useState<string>('');
  const [generatedEssay, setGeneratedEssay] = useState<string>('');
  const [isGeneratingEssay, setIsGeneratingEssay] = useState<boolean>(false);
  
  // UI states
  const [copiedEssay, setCopiedEssay] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor');
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

  const copyEssayToClipboard = () => {
    if (!generatedEssay) return;
    navigator.clipboard.writeText(generatedEssay);
    setCopiedEssay(true);
    setTimeout(() => setCopiedEssay(false), 2000);
  };

  const downloadEssay = (format: 'txt' | 'md') => {
    if (!generatedEssay) return;
    const element = document.createElement("a");
    const file = new Blob([generatedEssay], { type: 'text/plain;charset=utf-8' });
    element.href = URL.createObjectURL(file);
    element.download = format === 'txt' ? 'essay_draft.txt' : 'essay_draft.md';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
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
            setStoryInput(prev => (prev ? prev + "\n\n" : "") + `[Content from ${file.name}]:\n${content}\n`);
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
              const result = await (window as any).mammoth.extractRawText({ arrayBuffer: arrayBuffer });
              setStoryInput(prev => (prev ? prev + "\n\n" : "") + `[Content from ${file.name}]:\n${result.value}\n`);
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
              const pdfjsLib = (window as any)['pdfjs-dist/build/pdf'];
              pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
              
              const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
              const pdf = await loadingTask.promise;
              let fullText = '';
              
              for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                const pageText = textContent.items.map((item: any) => item.str).join(' ');
                fullText += pageText + '\n';
              }
              
              setStoryInput(prev => (prev ? prev + "\n\n" : "") + `[Content from ${file.name}]:\n${fullText}\n`);
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

  const extractEssayFromReply = (text: string): string => {
    const markdownMatch = text.match(/```markdown\s*([\s\S]*?)\s*```/i);
    if (markdownMatch && markdownMatch[1]) {
      return markdownMatch[1].trim();
    }
    const genericMatch = text.match(/```\s*([\s\S]*?)\s*```/);
    if (genericMatch && genericMatch[1]) {
      return genericMatch[1].trim();
    }
    return text.trim();
  };

  const handleSend = async (customMessage?: string, isGenerate?: boolean) => {
    const isGen = isGenerate ?? false;
    // If generating essay, we require either story input, custom message, or standard chat input
    const messageToSend = customMessage || input;
    if (isGen && !storyInput.trim() && !messageToSend.trim()) {
      setError("Please provide background story details in the Admissions Profile (bottom) or type instructions in the Chatbox first to generate your essay.");
      return;
    }

    if (!isGen && !messageToSend.trim()) {
      setError("Please type a message or prompt in the Chatbox first!");
      return;
    }
    if (isLoading) return;

    // Construct standard visible message to show in the chat thread
    const userMsgContent = isGen 
      ? `✨ Generate Essay Draft (Target: ${targetProgram || 'Ivy League'}, Limit: ${wordLimit || 'Standard'})`
      : messageToSend;

    const userMsg: Message = { role: 'user', content: userMsgContent };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);
    if (isGen) {
      setIsGeneratingEssay(true);
    }
    setError(null);

    // Formulate final backend prompt combining form variables if in Generate mode
    let backendPrompt = messageToSend;
    if (isGen) {
      backendPrompt = `Please write/revision the admissions essay based on these parameters:\n`;
      if (targetProgram.trim()) backendPrompt += `- Target Program: ${targetProgram}\n`;
      if (wordLimit.trim()) backendPrompt += `- Word Limit: ${wordLimit}\n`;
      if (storyInput.trim()) backendPrompt += `- Story / Raw Background: ${storyInput}\n`;
      if (messageToSend.trim()) backendPrompt += `- Additional User Direction: ${messageToSend}\n`;
      backendPrompt += `\nEnsure the final essay conforms to Ivy League standards and complies with essayspro prompt manager rules. Output the essay draft cleanly, preferably inside a markdown code block (using \`\`\`markdown) so my workspace extracts it perfectly.`;
    }

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
        body: JSON.stringify({ message: backendPrompt, history: messages, isChatOnly: !isGen }),
      });

      const responseText = await response.text();
      let data: any;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        throw new Error(`Server returned invalid response (Status ${response.status}). The service may still be deploying or DMXAPI credentials might be incorrect.`);
      }

      if (!response.ok) throw new Error(data.error || 'Server error');
      
      const aiReply = data.reply;
      const extractedEssay = extractEssayFromReply(aiReply);

      if (isGen) {
        setGeneratedEssay(extractedEssay);
        setMessages(prev => [...prev, { 
          role: 'ai', 
          content: `✨ I have successfully generated your admissions essay draft based on your profile details! You can now view, directly edit, copy, or download it in the Workspace Preview on the right.\n\nFeel free to ask follow-up questions in the chatbox below to critique, rewrite, or polish specific sections!`
        }]);
        setActiveTab('preview');
      } else {
        setMessages(prev => [...prev, { role: 'ai', content: aiReply }]);
        if (aiReply.includes('```')) {
          setGeneratedEssay(extractedEssay);
        }
      }

    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
      setIsGeneratingEssay(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800 antialiased selection:bg-indigo-500/10 h-screen overflow-hidden">
      
      {/* 1. Corporate Header */}
      <header className="bg-white border-b border-slate-100 px-6 py-3.5 flex justify-between items-center z-30 shadow-sm shrink-0">
        <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => { setMessages([]); setGeneratedEssay(''); }}>
          <div className="w-9 h-9 bg-gradient-to-tr from-indigo-600 to-indigo-500 rounded-xl flex items-center justify-center text-white font-bold shadow-indigo-150 shadow-lg border border-indigo-400/20 transform hover:scale-105 transition-transform">
            <GraduationCap size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-black text-slate-900 tracking-tight leading-none">essayspro</h1>
          </div>
        </div>

        {/* Corporate Navigation */}
        <nav className="flex items-center gap-1.5">
          <button 
            onClick={() => setActiveModal('about')}
            className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-indigo-600 hover:bg-slate-50 rounded-lg transition-all flex items-center gap-1"
          >
            <Info size={13} />
            <span className="hidden sm:inline">About Us</span>
          </button>
          
          <button 
            onClick={() => setActiveModal('disclaimer')}
            className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-indigo-600 hover:bg-slate-50 rounded-lg transition-all flex items-center gap-1"
          >
            <ShieldAlert size={13} />
            <span className="hidden sm:inline">Disclaimer</span>
          </button>

          <button 
            onClick={() => setActiveModal('contact')}
            className="px-3.5 py-1.5 text-xs font-black text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-100 rounded-lg transition-all flex items-center gap-1 hover:shadow-lg active:scale-95"
          >
            <Mail size={13} />
            <span>Contact</span>
          </button>
        </nav>
      </header>

      {/* Responsive mobile Tab Toggles */}
      <div className="flex md:hidden border-b border-slate-100 bg-white shrink-0">
        <button
          onClick={() => setActiveTab('editor')}
          className={`flex-1 py-3 text-xs font-black tracking-wider uppercase border-b-2 flex items-center justify-center gap-2 transition-all ${
            activeTab === 'editor' 
              ? 'border-indigo-600 text-indigo-600' 
              : 'border-transparent text-slate-400'
          }`}
        >
          <Sparkles size={14} /> Admissions Chat & Info
        </button>
        <button
          onClick={() => setActiveTab('preview')}
          className={`flex-1 py-3 text-xs font-black tracking-wider uppercase border-b-2 flex items-center justify-center gap-2 transition-all ${
            activeTab === 'preview' 
              ? 'border-indigo-600 text-indigo-600' 
              : 'border-transparent text-slate-400'
          }`}
        >
          <FileText size={14} /> Workspace Preview
          {generatedEssay && (
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></span>
          )}
        </button>
      </div>

      {/* 2. Main Workspace layout split */}
      <main className="flex-1 flex flex-col md:flex-row w-full overflow-hidden">
        
        {/* ================= LEFT COLUMN: ADMISSIONS DATA & CHAT ================= */}
        <section className={`w-full md:w-[40%] flex flex-col border-r border-slate-100 bg-white h-full overflow-hidden ${
          activeTab === 'editor' ? 'flex' : 'hidden md:flex'
        }`}>
          
          {/* Top Section: Conversations Thread (Scrollable) */}
          <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4 h-full bg-slate-50/20 custom-scrollbar">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3 opacity-80 my-auto">
                <div className="w-12 h-12 bg-white border border-slate-100 rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm animate-scale-in">
                  <GraduationCap size={24} />
                </div>
                <h4 className="text-sm font-bold text-slate-800">Your Co-Pilot Admissions Chat</h4>
                <p className="text-xs text-slate-400 leading-relaxed max-w-xs">
                  Welcome! Paste your essay prompts, instructions, or specific requirements in the Chatbox below to begin editing, brainstorming, or writing your essay.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'ai' ? 'justify-start' : 'justify-end'}`}>
                    <div className={`max-w-[85%] p-3.5 rounded-2xl text-xs leading-relaxed border ${
                      msg.role === 'ai' 
                        ? 'bg-white border-slate-100 text-slate-800 rounded-tl-none shadow-sm shadow-slate-100/50' 
                        : 'bg-indigo-600 border-indigo-700 text-white rounded-tr-none shadow-md shadow-indigo-100'
                    }`}>
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  </div>
                ))}
                
                {isLoading && (
                  <div className="flex items-center gap-2 text-slate-400 text-[10px] font-bold animate-pulse py-1">
                    <Loader2 size={12} className="animate-spin text-indigo-600" /> Sculpting admissions vocabulary standard...
                  </div>
                )}
                
                {error && (
                  <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3.5 rounded-xl border border-red-100 text-xs font-semibold shadow-xs">
                    <AlertCircle size={14} className="shrink-0" /> 
                    <span>{error}</span>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
            )}
          </div>

          {/* Middle Section: Large Chatbox & Generate Button */}
          <div className="p-4 bg-white border-t border-slate-100 shrink-0">
            <div className="flex flex-col gap-2 w-full">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Active Chatbox</label>
              
              {/* ChatGPT-style text box with Send icon inside it */}
              <div className="relative border border-slate-200 focus-within:ring-4 focus-within:ring-indigo-100 focus-within:border-indigo-500 rounded-2xl p-3 bg-slate-50/50 focus-within:bg-white transition-all flex flex-col gap-2">
                <textarea 
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyPress}
                  disabled={isParsing}
                  className="w-full border-0 focus:outline-none focus:ring-0 resize-none bg-transparent text-xs min-h-[115px] max-h-[220px] leading-relaxed p-0 placeholder-slate-450 disabled:opacity-50"
                  placeholder={isParsing ? "Extracting document..." : "Paste essay questions, prompts, or specific requirements here..."}
                />
                
                {/* Bottom bar of the input box */}
                <div className="flex justify-between items-center mt-1 shrink-0">
                  <div className="text-[9px] text-slate-400 font-semibold">
                    Press <span className="font-bold text-slate-500">Enter</span> to chat
                  </div>
                  
                  {/* Integrated Send Icon Button */}
                  <button 
                    onClick={() => handleSend(undefined, false)}
                    disabled={isLoading || isParsing || !input.trim()}
                    className="p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-30 disabled:pointer-events-none"
                    title="Send message"
                  >
                    <Send size={13} />
                  </button>
                </div>
              </div>

              {/* Smaller Generate Essay Button Below the Chatbox */}
              <button 
                onClick={() => handleSend(undefined, true)}
                disabled={isLoading || isParsing}
                className="w-full py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-xs shadow-md shadow-indigo-100 hover:shadow-lg transition-all active:scale-97 flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:pointer-events-none mt-1"
                title="Generate polished admissions essay draft on the right"
              >
                <Sparkles size={11} />
                <span>Generate Essay</span>
              </button>
            </div>
          </div>

          {/* Bottom Section: Admissions Context Card (Collapsible scrollable profile details) */}
          <div className="border-t border-slate-100 p-4 bg-slate-50 shrink-0 overflow-y-auto max-h-[48%] custom-scrollbar">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5">
                <BookOpen size={14} className="text-indigo-600" />
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Admissions Profile Ingredients</h3>
              </div>
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="text-[9px] font-black text-indigo-600 hover:text-indigo-700 hover:underline flex items-center gap-0.5"
                title="Upload resume or documents"
              >
                <Paperclip size={10} /> Upload Doc
              </button>
              <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".txt,.pdf,.docx" />
            </div>
            
            <div className="grid grid-cols-2 gap-2 mb-2.5">
              {/* Target Program Box */}
              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Target Program/Major</label>
                <input 
                  type="text" 
                  value={targetProgram}
                  onChange={(e) => setTargetProgram(e.target.value)}
                  placeholder="e.g. Wharton MBA, CS PhD"
                  className="w-full text-xs bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 rounded-xl px-3 py-2 text-slate-800 placeholder-slate-300 font-medium transition-all"
                />
              </div>

              {/* Word Limit Box */}
              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Word Limit Goal</label>
                <input 
                  type="text" 
                  value={wordLimit}
                  onChange={(e) => setWordLimit(e.target.value)}
                  placeholder="e.g. 500 words, 650 max"
                  className="w-full text-xs bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 rounded-xl px-3 py-2 text-slate-800 placeholder-slate-300 font-medium transition-all"
                />
              </div>
            </div>

            {/* Background Story Textarea Input */}
            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Story, Failures & Accomplishments (Optional)</label>
              <textarea
                value={storyInput}
                onChange={(e) => setStoryInput(e.target.value)}
                rows={5}
                placeholder="Write down your life and academic experiences, whatever you think is worth writing (achievements or failures, anything that matters to you, special or unique). It is better if they are coupled with your own understanding or enlightenment—not necessarily shining or big, but unique. No grammar or quality requirements."
                className="w-full text-xs bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 rounded-xl p-2.5 text-slate-800 placeholder-slate-350 leading-relaxed font-medium transition-all resize-none"
              />
            </div>
            
            {isParsing && (
              <div className="flex items-center gap-1.5 text-slate-500 text-[10px] font-bold mt-2 animate-pulse">
                <Loader2 size={12} className="animate-spin text-indigo-600" />
                <span>Reading and extracting document content...</span>
              </div>
            )}
          </div>

        </section>

        {/* ================= RIGHT COLUMN: LIVE ESSAY PREVIEW & DOWNLOADS ================= */}
        <section className={`w-full md:w-[60%] flex flex-col bg-slate-50 h-full overflow-hidden ${
          activeTab === 'preview' ? 'flex' : 'hidden md:flex'
        }`}>
          
          {/* Document Workspace Header Bar */}
          <div className="bg-white border-b border-slate-100 px-5 py-3 shrink-0 flex justify-between items-center shadow-xs">
            <div className="flex items-center gap-2">
              <FileText size={16} className="text-indigo-600" />
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-black text-slate-800 uppercase tracking-wider block">active_essay_draft.md</span>
                {generatedEssay && (
                  <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider">Draft Sync</span>
                )}
              </div>
            </div>

            {/* Document Controls toolbar */}
            <div className="flex items-center gap-1">
              {generatedEssay && (
                <>
                  {/* Copy Button */}
                  <button 
                    onClick={copyEssayToClipboard}
                    className={`px-3 py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1 border transition-all ${
                      copiedEssay 
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                        : 'bg-white hover:bg-slate-50 text-slate-600 border-slate-200 shadow-xs'
                    }`}
                  >
                    {copiedEssay ? <Check size={12} /> : <Copy size={12} />}
                    <span>{copiedEssay ? 'Copied!' : 'Copy'}</span>
                  </button>

                  {/* Download Dropdowns */}
                  <button 
                    onClick={() => downloadEssay('txt')}
                    className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 rounded-lg text-xs font-extrabold flex items-center gap-1 shadow-xs transition-all"
                  >
                    <Download size={12} />
                    <span>Download (.txt)</span>
                  </button>

                  <button 
                    onClick={() => downloadEssay('md')}
                    className="px-3 py-1.5 bg-indigo-550/5 hover:bg-indigo-600 hover:text-white border border-indigo-150 text-indigo-700 rounded-lg text-xs font-black flex items-center gap-1 shadow-xs transition-all hidden sm:flex"
                  >
                    <Download size={12} />
                    <span>Download (.md)</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Workspace body editor area */}
          <div className="flex-1 p-6 overflow-y-auto custom-scrollbar flex flex-col h-full bg-slate-50 relative">
            {isLoading && isGeneratingEssay && (
              <div className="absolute inset-0 bg-slate-50/80 backdrop-blur-sm z-20 flex flex-col items-center justify-center p-6 text-center space-y-4 animate-fade-in">
                <div className="w-14 h-14 bg-white border border-slate-200/50 rounded-2xl flex items-center justify-center text-indigo-650 shadow-md">
                  <Sparkles className="animate-spin text-indigo-600" size={24} />
                </div>
                <div className="space-y-1">
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider animate-pulse">Sculpting Your Essay Draft...</h3>
                  <p className="text-[10px] text-slate-400 max-w-xs leading-relaxed font-semibold">
                    Analyzing admissions variables, structuring narrative, and editing to Ivy League standards. This may take up to a few seconds.
                  </p>
                </div>
              </div>
            )}
            {!generatedEssay ? (
              
              /* Pre-generation premium empty state */
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 max-w-md mx-auto space-y-4">
                <div className="w-16 h-16 bg-white border border-slate-200/50 rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm animate-pulse">
                  <Sparkles size={28} />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-black text-slate-800">Your Living Document Workspace</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Once you configure your admissions story and program details on the left pane and click **"Generate Essay"**, the admissions consultant draft will appear here in real time.
                  </p>
                </div>
              </div>
            ) : (
              
              /* Live interactive document viewer & editor */
              <div className="flex-1 flex flex-col bg-white border border-slate-200/60 rounded-3xl p-6 shadow-sm shadow-slate-100 h-full relative">
                <div className="flex justify-between items-center text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 shrink-0">
                  <span>Interactive Editor Pane</span>
                  <span className="flex items-center gap-1 text-emerald-600 font-bold"><Check size={10} /> Editable - tweak draft directly</span>
                </div>
                
                <textarea 
                  value={generatedEssay}
                  onChange={(e) => setGeneratedEssay(e.target.value)}
                  className="flex-1 w-full h-full text-sm text-slate-800 placeholder-slate-300 font-medium font-sans leading-relaxed focus:outline-none resize-none bg-transparent custom-scrollbar py-2"
                  placeholder="Click here to type or modify the essay draft..."
                />
              </div>
            )}
          </div>

        </section>

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
                  <h3 className="font-extrabold text-slate-900 tracking-tight">Admissions Notice</h3>
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
                    <h4 className="text-xs font-bold text-amber-900 mb-1">Core Admissions Notice</h4>
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
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                        : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-sm active:scale-95'
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