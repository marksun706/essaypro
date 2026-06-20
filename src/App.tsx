import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  AlertCircle,
  Paperclip,
  Mail,
  ShieldAlert,
  Info,
  X,
  Copy,
  Check,
  GraduationCap,
  MessageSquare,
  Sparkles,
  FileText,
  BookOpen,
  Pencil,
  ArrowDownToLine,
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

  const [storyInput, setStoryInput] = useState<string>('');
  const [wordLimit, setWordLimit] = useState<string>('');
  const [targetProgram, setTargetProgram] = useState<string>('');
  const [generatedEssay, setGeneratedEssay] = useState<string>('');
  const [isGeneratingEssay, setIsGeneratingEssay] = useState<boolean>(false);
  const [isWorkspaceActive, setIsWorkspaceActive] = useState<boolean>(false);

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
    navigator.clipboard.writeText('support@essayspro.org');
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

    const userMsgContent = isGen
      ? `✨ Generate Essay Draft (Target: ${targetProgram || 'Top College'}, Limit: ${wordLimit || 'Standard'})`
      : messageToSend;

    if (isGen) {
      setIsWorkspaceActive(true);
    }

    const userMsg: Message = { role: 'user', content: userMsgContent };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);
    if (isGen) {
      setIsGeneratingEssay(true);
    }
    setError(null);

    let backendPrompt = messageToSend;
    if (isGen) {
      backendPrompt = `Please write/revision the admissions essay based on these parameters:\n`;
      if (targetProgram.trim()) backendPrompt += `- Target Program: ${targetProgram}\n`;
      if (wordLimit.trim()) backendPrompt += `- Word Limit: ${wordLimit}\n`;
      if (storyInput.trim()) backendPrompt += `- Story / Raw Background: ${storyInput}\n`;
      if (messageToSend.trim()) backendPrompt += `- Additional User Direction: ${messageToSend}\n`;
      backendPrompt += `\nEnsure the final essay conforms to premium college admissions standards and complies with essayspro prompt manager rules. Output the essay draft cleanly, preferably inside a markdown code block (using \`\`\`markdown) so my workspace extracts it perfectly.`;
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
    <div className="min-h-screen bg-parchment-50 flex flex-col font-sans text-ink-900 antialiased selection:bg-aurora-500/15 h-screen overflow-hidden">

      {/* 1. Premium Header */}
      <header className="bg-white/90 backdrop-blur-md border-b border-ink-200/50 px-5 md:px-7 py-3 flex justify-between items-center z-30 shadow-soft shrink-0">
        <div
          className="flex items-center gap-3 cursor-pointer group"
          onClick={() => { setMessages([]); setGeneratedEssay(''); setStoryInput(''); setWordLimit(''); setTargetProgram(''); setIsWorkspaceActive(false); }}
        >
          <div className="w-9 h-9 bg-gradient-to-br from-aurora-600 to-aurora-500 rounded-xl flex items-center justify-center shadow-md shadow-aurora-500/15 border border-aurora-400/20 group-hover:scale-105 group-hover:shadow-lg transition-all duration-300">
            <GraduationCap size={18} className="text-white" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-lg font-display font-semibold text-ink-950 tracking-tight leading-none">essayspro</h1>
            <span className="text-[9px] font-semibold text-ink-400 uppercase tracking-[0.15em] leading-tight">Admissions Co-Pilot</span>
          </div>
        </div>

        <nav className="flex items-center gap-1">
          <button
            onClick={() => setActiveModal('about')}
            className="px-3 py-1.5 text-2xs font-semibold text-ink-500 hover:text-ink-900 hover:bg-ink-100/50 rounded-xl transition-all flex items-center gap-1.5"
          >
            <Info size={12} />
            <span className="hidden sm:inline">About</span>
          </button>

          <button
            onClick={() => setActiveModal('disclaimer')}
            className="px-3 py-1.5 text-2xs font-semibold text-ink-500 hover:text-ink-900 hover:bg-ink-100/50 rounded-xl transition-all flex items-center gap-1.5"
          >
            <ShieldAlert size={12} />
            <span className="hidden sm:inline">Notice</span>
          </button>

          <button
            onClick={() => setActiveModal('contact')}
            className="ml-1 px-4 py-1.5 text-2xs font-bold text-white bg-aurora-600 hover:bg-aurora-700 shadow-md shadow-aurora-500/20 rounded-xl transition-all flex items-center gap-1.5 hover:shadow-lg active:scale-[0.97]"
          >
            <Mail size={12} />
            <span>Contact</span>
          </button>
        </nav>
      </header>

      {/* Mobile Tab Toggles */}
      {isWorkspaceActive && (
        <div className="flex md:hidden border-b border-ink-200/50 bg-white/80 backdrop-blur-sm shrink-0 animate-fade-in">
          <button
            onClick={() => setActiveTab('editor')}
            className={`flex-1 py-3 text-2xs font-bold tracking-widest uppercase border-b-2 flex items-center justify-center gap-2 transition-all ${
              activeTab === 'editor'
                ? 'border-aurora-600 text-aurora-600'
                : 'border-transparent text-ink-400'
            }`}
          >
            <Sparkles size={14} /> Admissions Chat
          </button>
          <button
            onClick={() => setActiveTab('preview')}
            className={`flex-1 py-3 text-2xs font-bold tracking-widest uppercase border-b-2 flex items-center justify-center gap-2 transition-all ${
              activeTab === 'preview'
                ? 'border-aurora-600 text-aurora-600'
                : 'border-transparent text-ink-400'
            }`}
          >
            <FileText size={14} /> Workspace
            {generatedEssay && (
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
            )}
          </button>
        </div>
      )}

      {/* 2. Main Workspace */}
      <main className="flex-1 flex flex-col md:flex-row w-full overflow-hidden bg-parchment-50/50">

        {/* LEFT COLUMN */}
        <section className={`flex flex-col bg-white h-full overflow-hidden transition-all duration-500 ease-in-out shadow-soft ${
          isWorkspaceActive
            ? 'w-full md:w-[40%] border-r border-ink-200/50'
            : 'w-full max-w-2xl mx-auto'
        } ${activeTab === 'editor' ? 'flex' : 'hidden md:flex'}`}>

          {/* Chat Thread */}
          <div className="flex-1 overflow-y-auto px-5 py-6 space-y-5 h-full bg-parchment-50/30 custom-scrollbar">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center px-8 max-w-sm mx-auto my-auto space-y-6 animate-scale-in select-none">
                <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-aurora-600 to-aurora-500 flex items-center justify-center shadow-xl shadow-aurora-500/15 border border-aurora-400/20">
                  <GraduationCap size={30} className="text-white" />
                </div>
                <div className="space-y-2.5">
                  <h2 className="font-display text-3xl font-semibold text-ink-950 tracking-tight text-balance">essayspro</h2>
                  <p className="text-2xs font-semibold text-ink-400 uppercase tracking-[0.15em]">
                    College Application Essay Drafting
                  </p>
                </div>
                <p className="text-xs text-ink-400 leading-relaxed max-w-[260px] text-pretty">
                  Welcome to your admissions co-pilot. Paste essay prompts below to brainstorm, or fill in your story and click <span className="font-semibold text-ink-700">Generate Essay</span> to draft.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'ai' ? 'justify-start' : 'justify-end'}`}>
                    <div className={`relative max-w-[85%] p-3.5 rounded-2xl text-xs leading-relaxed ${
                      msg.role === 'ai'
                        ? 'bg-white text-ink-800 rounded-tl-sm shadow-card border border-ink-100/80'
                        : 'bg-aurora-600 text-white rounded-tr-sm shadow-elevated'
                    }`}>
                      <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                    </div>
                  </div>
                ))}

                {isLoading && (
                  <div className="flex items-center gap-2.5 text-ink-400 text-2xs font-semibold py-1">
                    <span className="w-5 h-5 rounded-full border-2 border-aurora-200 border-t-aurora-600 animate-spin" />
                    <span className="animate-pulse-soft">Sculpting admissions draft...</span>
                  </div>
                )}

                {error && (
                  <div className="flex items-start gap-2.5 text-red-700 bg-red-50/80 p-3.5 rounded-xl border border-red-100/80 text-xs font-medium shadow-soft">
                    <AlertCircle size={14} className="shrink-0 mt-0.5 text-red-500" />
                    <span className="text-pretty">{error}</span>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
            )}
          </div>

          {/* Chat Input */}
          <div className="px-4 pt-4 pb-2 bg-white border-t border-ink-200/50 shrink-0">
            <div className="flex flex-col gap-2.5 w-full">
              <div className="flex items-center justify-between px-0.5">
                <label className="text-2xs font-semibold text-ink-400 uppercase tracking-[0.12em]">Chat</label>
                {!isWorkspaceActive && (
                  <span className="text-2xs font-bold text-aurora-600 bg-aurora-50/80 px-2.5 py-0.5 rounded-md uppercase tracking-wider animate-pulse-soft">
                    Drafting Co-Pilot
                  </span>
                )}
              </div>

              <div className="relative border border-ink-200/80 focus-within:ring-4 focus-within:ring-aurora-100/80 focus-within:border-aurora-400 rounded-2xl p-3 bg-ink-50/40 focus-within:bg-white transition-all flex flex-col gap-2">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyPress}
                  disabled={isParsing}
                  className="w-full border-0 focus:outline-none focus:ring-0 resize-none bg-transparent text-sm min-h-[56px] max-h-[120px] leading-relaxed p-0 placeholder-ink-300/80 disabled:opacity-50"
                  placeholder={isParsing ? "Extracting document..." : "Type your message or essay prompt..."}
                />
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="p-1.5 rounded-lg text-ink-400 hover:text-ink-600 hover:bg-ink-100/60 transition-all"
                    title="Upload .txt .pdf .docx"
                  >
                    <Paperclip size={15} />
                  </button>
                  <button
                    onClick={() => handleSend()}
                    disabled={isLoading || !input.trim()}
                    className="p-2 rounded-xl bg-aurora-600 hover:bg-aurora-700 text-white disabled:opacity-30 disabled:pointer-events-none transition-all active:scale-[0.95] shadow-sm shadow-aurora-500/20"
                  >
                    <Send size={15} className={isLoading ? 'animate-pulse' : ''} />
                  </button>
                </div>
              </div>

              <button
                onClick={() => handleSend(undefined, true)}
                disabled={isLoading || isParsing}
                className="w-full py-2.5 px-3.5 bg-gradient-to-r from-aurora-600 to-aurora-500 hover:from-aurora-700 hover:to-aurora-600 text-white rounded-xl font-bold text-xs shadow-md shadow-aurora-500/15 hover:shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-40 disabled:pointer-events-none"
                title="Generate polished admissions essay draft"
              >
                <Sparkles size={13} />
                <span>Generate Essay</span>
              </button>
            </div>
          </div>

          {/* Admissions Profile */}
          <div className="border-t border-ink-200/50 px-4 py-3.5 bg-ink-50/30 shrink-0 overflow-y-auto max-h-[45%] custom-scrollbar">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <BookOpen size={14} className="text-aurora-600" />
                <h3 className="text-2xs font-bold text-ink-600 uppercase tracking-[0.12em]">Background Profile</h3>
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="text-2xs font-semibold text-aurora-600 hover:text-aurora-700 hover:bg-aurora-50 px-2 py-1 rounded-lg transition-all flex items-center gap-1"
                title="Upload resume or documents"
              >
                <Paperclip size={11} /> Upload
              </button>
              <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".txt,.pdf,.docx" />
            </div>

            <div className="grid grid-cols-2 gap-2.5 mb-3">
              <div>
                <label className="text-2xs font-semibold text-ink-400 uppercase tracking-[0.1em] block mb-1.5">Target Program</label>
                <input
                  type="text"
                  value={targetProgram}
                  onChange={(e) => setTargetProgram(e.target.value)}
                  placeholder="e.g. Wharton MBA, CS PhD"
                  className="w-full text-xs bg-white border border-ink-200/70 focus:outline-none focus:ring-2 focus:ring-aurora-100 focus:border-aurora-400 rounded-xl px-3 py-2 text-ink-800 placeholder-ink-300/80 font-medium transition-all"
                />
              </div>

              <div>
                <label className="text-2xs font-semibold text-ink-400 uppercase tracking-[0.1em] block mb-1.5">Word Limit</label>
                <input
                  type="text"
                  value={wordLimit}
                  onChange={(e) => setWordLimit(e.target.value)}
                  placeholder="e.g. 500, 650 max"
                  className="w-full text-xs bg-white border border-ink-200/70 focus:outline-none focus:ring-2 focus:ring-aurora-100 focus:border-aurora-400 rounded-xl px-3 py-2 text-ink-800 placeholder-ink-300/80 font-medium transition-all"
                />
              </div>
            </div>

            <div>
              <label className="text-2xs font-semibold text-ink-400 uppercase tracking-[0.1em] block mb-1.5">Your Story & Experiences (Optional)</label>
              <textarea
                value={storyInput}
                onChange={(e) => setStoryInput(e.target.value)}
                rows={5}
                placeholder="Share your experiences, achievements, challenges—anything that shaped you. No grammar requirements."
                className="w-full text-xs bg-white border border-ink-200/70 focus:outline-none focus:ring-2 focus:ring-aurora-100 focus:border-aurora-400 rounded-xl p-3 text-ink-800 placeholder-ink-300/70 leading-relaxed font-medium transition-all resize-none animate-fade-in"
              />
            </div>

            {isParsing && (
              <div className="flex items-center gap-2 text-ink-400 text-2xs font-semibold mt-2.5">
                <span className="w-4 h-4 rounded-full border-2 border-aurora-200 border-t-aurora-600 animate-spin" />
                <span>Reading and extracting document content...</span>
              </div>
            )}
          </div>

        </section>

        {/* RIGHT COLUMN */}
        {isWorkspaceActive && (
          <section className={`w-full md:w-[60%] flex flex-col bg-parchment-50/40 h-full overflow-hidden animate-slide-in-right ${
            activeTab === 'preview' ? 'flex' : 'hidden md:flex'
          }`}>

            {/* Doc header */}
            <div className="bg-white/80 backdrop-blur-sm border-b border-ink-200/50 px-5 py-3 shrink-0 flex justify-between items-center shadow-soft">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-aurora-600 to-aurora-500 flex items-center justify-center shadow-sm">
                  <FileText size={15} className="text-white" />
                </div>
                <div>
                  <span className="text-xs font-bold text-ink-800 tracking-tight block">active_essay_draft.md</span>
                  {generatedEssay && (
                    <span className="text-2xs font-semibold text-emerald-600 tracking-wide">Draft ready</span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1">
                {generatedEssay && (
                  <>
                    <button
                      onClick={copyEssayToClipboard}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all ${
                        copiedEssay
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80'
                          : 'bg-white hover:bg-ink-50 text-ink-600 border-ink-200/60 shadow-soft'
                      }`}
                    >
                      {copiedEssay ? <Check size={13} /> : <Copy size={13} />}
                      <span>{copiedEssay ? 'Copied!' : 'Copy'}</span>
                    </button>

                    <button
                      onClick={() => downloadEssay('txt')}
                      className="px-3 py-1.5 bg-white hover:bg-ink-50 border border-ink-200/60 text-ink-600 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-soft transition-all active:scale-[0.97]"
                    >
                      <ArrowDownToLine size={12} />
                      <span>.txt</span>
                    </button>

                    <button
                      onClick={() => downloadEssay('md')}
                      className="px-3 py-1.5 bg-aurora-50 hover:bg-aurora-600 hover:text-white border border-aurora-200/70 text-aurora-700 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-soft transition-all active:scale-[0.97] hidden sm:flex"
                    >
                      <ArrowDownToLine size={12} />
                      <span>.md</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Editor area */}
            <div className="flex-1 p-6 overflow-y-auto custom-scrollbar flex flex-col h-full bg-parchment-50/20 relative">
              {isLoading && isGeneratingEssay && (
                <div className="absolute inset-0 bg-parchment-50/80 backdrop-blur-sm z-20 flex flex-col items-center justify-center p-6 text-center space-y-5 animate-fade-in">
                  <div className="w-14 h-14 bg-white border border-ink-200/40 rounded-2xl flex items-center justify-center shadow-elevated">
                    <Sparkles className="animate-spin text-aurora-600" size={24} />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-xs font-bold text-ink-800 uppercase tracking-wider animate-pulse-soft">Sculpting Your Essay Draft...</h3>
                    <p className="text-2xs text-ink-400 max-w-xs leading-relaxed font-medium">
                      Analyzing your profile, structuring narrative, and editing to college standards.
                    </p>
                  </div>
                </div>
              )}
              {!generatedEssay ? (

                <div className="flex-1 flex flex-col items-center justify-center text-center p-8 max-w-xs mx-auto space-y-5 animate-fade-in">
                  <div className="w-16 h-16 bg-white border border-ink-200/40 rounded-2xl flex items-center justify-center shadow-card">
                    <FileText size={28} className="text-ink-300" />
                  </div>
                  <div className="space-y-1.5">
                    <h3 className="font-display text-lg font-semibold text-ink-900 text-balance">Your Document Workspace</h3>
                    <p className="text-xs text-ink-400 leading-relaxed text-pretty">
                      Configure your profile on the left, then click <span className="font-semibold text-ink-600">Generate Essay</span>. Your draft will appear here.
                    </p>
                  </div>
                </div>
              ) : (

                <div className="flex-1 flex flex-col bg-white border border-ink-200/50 rounded-3xl p-6 shadow-card h-full relative animate-scale-in">
                  <div className="flex items-center justify-between text-2xs font-semibold text-ink-400 uppercase tracking-wider mb-3 shrink-0 border-b border-ink-100/60 pb-3">
                    <span className="flex items-center gap-1.5"><Pencil size={12} /> Editor</span>
                    <span className="flex items-center gap-1.5 text-emerald-600"><Check size={11} /> Live editable</span>
                  </div>

                  <textarea
                    value={generatedEssay}
                    onChange={(e) => setGeneratedEssay(e.target.value)}
                    className="flex-1 w-full h-full text-sm text-ink-800 placeholder-ink-300/60 font-sans leading-relaxed focus:outline-none resize-none bg-transparent custom-scrollbar py-2"
                    placeholder="Click here to type or modify the essay draft..."
                  />
                </div>
              )}
            </div>

          </section>
        )}

      </main>

      {/* MODALS */}
      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-950/30 backdrop-blur-sm animate-fade-in" onClick={() => setActiveModal(null)}>

          {activeModal === 'about' && (
            <div className="glassmorphism rounded-3xl w-full max-w-lg shadow-modal overflow-hidden animate-scale-in" onClick={(e) => e.stopPropagation()}>
              <div className="px-6 py-5 bg-white/60 border-b border-ink-200/40 flex justify-between items-center">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 bg-gradient-to-br from-aurora-600 to-aurora-500 rounded-xl flex items-center justify-center shadow-sm">
                    <Info size={15} className="text-white" />
                  </div>
                  <h3 className="font-display font-semibold text-ink-950">About</h3>
                </div>
                <button
                  onClick={() => setActiveModal(null)}
                  className="p-1.5 hover:bg-ink-100/60 rounded-xl text-ink-400 hover:text-ink-600 transition-all"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <p className="text-sm text-ink-600 leading-relaxed">
                  <strong className="text-ink-900">essayspro</strong> is an elite academic editing platform that combines generative AI with seasoned human admissions expertise.
                </p>
                <div className="p-4 bg-aurora-50/60 border border-aurora-100/60 rounded-2xl">
                  <h4 className="text-2xs font-bold text-aurora-700 uppercase tracking-wider mb-1">Our Purpose</h4>
                  <p className="text-xs text-aurora-900 leading-relaxed">
                    We help high-achieving applicants organize their stories, structure supplements, and polish vocabulary. Raw drafts are elevated to the highest standard.
                  </p>
                </div>
                <p className="text-xs text-ink-400 leading-relaxed">
                  Our approach complies with academic writing standards and enhances authentic voice without substituting it.
                </p>
              </div>
              <div className="px-6 py-4 bg-ink-50/40 border-t border-ink-200/40 flex justify-end">
                <button
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 bg-aurora-600 hover:bg-aurora-700 text-white rounded-xl text-xs font-bold shadow-md shadow-aurora-500/15 transition-all active:scale-[0.97]"
                >
                  Close
                </button>
              </div>
            </div>
          )}

          {activeModal === 'disclaimer' && (
            <div className="glassmorphism rounded-3xl w-full max-w-lg shadow-modal overflow-hidden animate-scale-in" onClick={(e) => e.stopPropagation()}>
              <div className="px-6 py-5 bg-white/60 border-b border-ink-200/40 flex justify-between items-center">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 bg-amber-500 rounded-xl flex items-center justify-center shadow-sm">
                    <ShieldAlert size={15} className="text-white" />
                  </div>
                  <h3 className="font-display font-semibold text-ink-950">Admissions Notice</h3>
                </div>
                <button
                  onClick={() => setActiveModal(null)}
                  className="p-1.5 hover:bg-ink-100/60 rounded-xl text-ink-400 hover:text-ink-600 transition-all"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div className="p-4 bg-amber-50/60 border border-amber-200/50 rounded-2xl flex gap-3 items-start">
                  <ShieldAlert className="text-amber-500 shrink-0 mt-0.5" size={20} />
                  <div>
                    <h4 className="text-xs font-bold text-amber-900 mb-1.5">AI Detection Advisory</h4>
                    <p className="text-xs text-amber-800 leading-relaxed">
                      AI-generated statements are increasingly flagged by admissions software. Final submissions should undergo rigorous human refinement.
                    </p>
                  </div>
                </div>
                <p className="text-sm text-ink-600 leading-relaxed">
                  We offer <strong className="text-ink-900">human polishing services</strong> to transform drafts into natural, authentic masterpieces.
                </p>
                <div className="flex justify-center">
                  <button
                    onClick={() => setActiveModal('contact')}
                    className="text-xs font-bold text-aurora-600 hover:text-aurora-700 bg-aurora-50 hover:bg-aurora-100 px-4 py-2.5 rounded-xl transition-all flex items-center gap-1.5"
                  >
                    <MessageSquare size={14} /> Get Human Polish
                  </button>
                </div>
              </div>
              <div className="px-6 py-4 bg-ink-50/40 border-t border-ink-200/40 flex justify-end">
                <button
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 bg-ink-900 hover:bg-ink-950 text-white rounded-xl text-xs font-bold transition-all active:scale-[0.97]"
                >
                  Close
                </button>
              </div>
            </div>
          )}

          {activeModal === 'contact' && (
            <div className="glassmorphism rounded-3xl w-full max-w-md shadow-modal overflow-hidden animate-scale-in" onClick={(e) => e.stopPropagation()}>
              <div className="px-6 py-5 bg-white/60 border-b border-ink-200/40 flex justify-between items-center">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 bg-gradient-to-br from-aurora-600 to-aurora-500 rounded-xl flex items-center justify-center shadow-sm">
                    <Mail size={15} className="text-white" />
                  </div>
                  <h3 className="font-display font-semibold text-ink-950">Contact</h3>
                </div>
                <button
                  onClick={() => setActiveModal(null)}
                  className="p-1.5 hover:bg-ink-100/60 rounded-xl text-ink-400 hover:text-ink-600 transition-all"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="p-6 space-y-6">
                <p className="text-sm text-ink-600 leading-relaxed text-center text-pretty">
                  Reach our human editors or book custom review services via email:
                </p>

                <div className="bg-ink-950/[0.04] hover:bg-ink-950/[0.06] border border-ink-200/60 rounded-2xl p-5 flex flex-col items-center gap-3 transition-colors">
                  <span className="text-2xs font-semibold text-ink-400 uppercase tracking-wider">Official Contact</span>
                  <a href="mailto:support@essayspro.org" className="font-display text-base font-semibold text-ink-950 hover:text-aurora-600 transition-all underline decoration-dotted underline-offset-2">
                    support@essayspro.org
                  </a>

                  <button
                    onClick={copyEmail}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 active:scale-[0.97] ${
                      copied
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80'
                        : 'bg-white hover:bg-ink-50 text-ink-700 border border-ink-200/60 shadow-soft'
                    }`}
                  >
                    {copied ? <Check size={13} /> : <Copy size={13} />}
                    <span>{copied ? 'Copied!' : 'Copy to Clipboard'}</span>
                  </button>
                </div>

                <div className="text-2xs text-center text-ink-400 font-medium">
                  Response within 12 hours &middot; Mon&ndash;Sun
                </div>
              </div>
              <div className="px-6 py-4 bg-ink-50/40 border-t border-ink-200/40 flex justify-end">
                <button
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 bg-aurora-600 hover:bg-aurora-700 text-white rounded-xl text-xs font-bold shadow-md shadow-aurora-500/15 transition-all active:scale-[0.97]"
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
