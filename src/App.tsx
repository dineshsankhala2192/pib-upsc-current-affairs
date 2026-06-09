/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useState, useRef, useEffect } from 'react';
import { BookOpen, Calendar, Clock, Globe, Layout, Loader2, FileText, BrainCircuit, Download, Inbox, Send, Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import html2pdf from 'html2pdf.js';
import QuizView from './components/QuizView';

type Timeframe = 'Daily' | 'Weekly' | 'Monthly' | 'Yearly';
type Language = 'English' | 'Hindi';
type Mode = 'Notes' | 'Quiz' | 'AutoFeed';

function CommentBox({ topicId }: { topicId: number }) {
  const [comment, setComment] = useState('');
  const [comments, setComments] = useState<string[]>([]);

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (comment.trim()) {
      setComments([...comments, comment]);
      setComment('');
    }
  };

  return (
    <div className="mt-6 mb-8 bg-slate-50 rounded-xl p-4 border border-slate-200">
      <h3 className="text-sm font-semibold text-slate-700 mb-3">Discuss this News</h3>
      {comments.length > 0 && (
        <div className="mb-4 space-y-3">
          {comments.map((c, i) => (
            <div key={i} className="text-sm text-slate-600 bg-white p-3 rounded-lg border border-slate-100 shadow-sm">
              {c}
            </div>
          ))}
        </div>
      )}
      <form onSubmit={handleAddComment} className="flex gap-2">
        <input
          type="text"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Add a comment..."
          className="flex-1 text-sm bg-white border border-slate-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <button
          type="submit"
          className="bg-indigo-600 text-white rounded-lg px-4 py-2 hover:bg-indigo-700 flex items-center justify-center transition-colors"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}

export default function App() {
  const [timeframe, setTimeframe] = useState<Timeframe>('Daily');
  const [language, setLanguage] = useState<Language>('English');
  const [mode, setMode] = useState<Mode>('AutoFeed');
  const [loading, setLoading] = useState(false);
  const [content, setContent] = useState<string>('');
  const [error, setError] = useState<string>('');
  
  const [publishedNotes, setPublishedNotes] = useState<any[]>([]);
  const [loadingFeed, setLoadingFeed] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  const contentRef = useRef<HTMLDivElement>(null);

  const fetchPublishedNotes = async () => {
    setLoadingFeed(true);
    try {
      const res = await fetch('/api/published-notes');
      const data = await res.json();
      setPublishedNotes(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingFeed(false);
    }
  };

  useEffect(() => {
    fetchPublishedNotes();
  }, []);

  const generateReport = async () => {
    setLoading(true);
    setError('');
    setContent('');
    try {
      const response = await fetch('/api/current-affairs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timeframe, language }),
      });
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch');
      }

      setContent(data.content);
      setMode('Notes');
      
      // Auto trigger print/download dialog after generating
      setTimeout(() => {
        handleDownloadPDF();
      }, 500);
    } catch (err: any) {
      setError(err.message || 'Something went wrong while generating the report.');
    } finally {
      setLoading(false);
    }
  };

  const loadPublishedNote = (noteContent: string) => {
    setContent(noteContent);
    setMode('Notes');
  };

  const handleDownloadPDF = () => {
    if (!contentRef.current) return;
    
    // Add a temporary class to format for PDF
    contentRef.current.classList.add('pdf-rendering');
    
    // Create elements for header that normally only show in print mode
    const headerHtml = `
      <div style="margin-bottom: 20px; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px;">
        <h1 style="font-size: 24px; font-weight: bold; color: #0f172a; margin-bottom: 8px;">UPSC Current Affairs Compilation</h1>
        <p style="color: #475569; font-size: 14px;">Date: ${new Date().toLocaleDateString()}</p>
      </div>
    `;
    
    const element = contentRef.current.querySelector('.markdown-body');
    if (!element) return;
    
    const printContainer = document.createElement('div');
    printContainer.innerHTML = headerHtml + element.innerHTML;
    printContainer.style.padding = '30px';
    
    const opt: any = {
      margin:       [10, 10, 15, 10],
      filename:     `UPSC_Current_Affairs_${new Date().toISOString().split('T')[0]}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(printContainer).save().then(() => {
      contentRef.current?.classList.remove('pdf-rendering');
    });
  };

  const handleCopyForBlogger = () => {
    const rawHTML = document.querySelector('.markdown-body')?.innerHTML || '';
    const bloggerHTML = `<div style="font-family: sans-serif; line-height: 1.6; color: #333;">
      <div style="text-align: center; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 1px solid #eee;">
        <p><strong>Timeframe:</strong> ${timeframe} | <strong>Language:</strong> ${language} | <strong>Date:</strong> ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric'})}</p>
      </div>
      <div>${rawHTML}</div>
    </div>`;
    
    navigator.clipboard.writeText(bloggerHTML).then(() => {
      alert('HTML Script Copied! You can now paste this directly in your Blogger HTML View.');
    }).catch(err => {
      console.error('Failed to copy: ', err);
      alert('Failed to copy. Please try again.');
    });
  };

  return (
    <div className="h-screen w-full bg-slate-50 flex flex-col font-sans overflow-hidden">
      {/* Header */}
      <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-xl">
            <BookOpen className="w-5 h-5" />
          </div>
          <h1 className="text-xl font-bold text-slate-800">
            PIB UPSC <span className="text-indigo-600">current Affairs</span>
          </h1>
        </div>
        
        <div className="flex items-center gap-6">
          <span className="flex items-center gap-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider">
            <Globe className="w-4 h-4 text-slate-400"/> Sources: PIB, The Hindu, TOI
          </span>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative">
        {/* Main Dashboard Area */}
        <main className="flex-1 p-6 md:p-8 flex flex-col gap-6 overflow-y-auto relative bg-slate-50">
          
          {mode === 'AutoFeed' && (
            <div className="max-w-4xl mx-auto w-full">
              <h2 className="text-2xl font-bold text-slate-800 mb-2">Automated Daily Feed</h2>
              <div className="text-slate-500 text-sm mb-8 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                Auto-Scheduler Active · Generates daily at 06:00 AM
              </div>

              {loadingFeed ? (
                <div className="flex justify-center p-12">
                  <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                </div>
              ) : publishedNotes.length === 0 ? (
                <div className="bg-white p-8 rounded-3xl border border-slate-100 text-center shadow-sm">
                  <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Clock className="w-8 h-8" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-800 mb-2">Scheduler is initializing...</h3>
                  <p className="text-sm text-slate-500">The daily background job will publish notes every morning. Check back shortly!</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {publishedNotes.map((note: any, idx: number) => (
                    <button 
                      key={idx}
                      onClick={() => loadPublishedNote(note.content)}
                      className="text-left bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-amber-200 transition-all flex items-center justify-between group"
                    >
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <span className="px-2 py-1 bg-amber-50 text-amber-700 text-[10px] font-bold rounded uppercase tracking-wider">{note.language}</span>
                          <span className="text-xs font-semibold text-slate-400">{new Date(note.date).toLocaleDateString()}</span>
                        </div>
                        <h3 className="text-lg font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">{note.title}</h3>
                      </div>
                      <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-indigo-50 text-slate-400 group-hover:text-indigo-600 transition-colors">
                        <FileText className="w-5 h-5" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {mode === 'Quiz' && (
            <QuizView timeframe={timeframe} language={language} />
          )}

          {mode === 'Notes' && error && (
            <div className="bg-red-50 p-4 rounded-2xl border border-red-100 flex items-start gap-3 shrink-0">
              <div className="w-8 h-8 bg-red-100 text-red-600 rounded-full flex items-center justify-center shrink-0">
                !
              </div>
              <div>
                <h4 className="text-sm font-bold text-red-800">Generation Error</h4>
                <p className="text-xs text-red-600 mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {mode === 'Notes' && content && (
            <div className="flex-1 bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col overflow-hidden max-w-5xl mx-auto w-full print-area" ref={contentRef}>
              <div className="p-4 md:p-6 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10 shrink-0 no-print">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-1 bg-indigo-50 text-indigo-600 border border-indigo-100 text-[10px] font-bold rounded uppercase tracking-wider">{timeframe} Notes</span>
                    <span className="px-2 py-1 bg-slate-50 text-slate-600 border border-slate-100 text-[10px] font-bold rounded uppercase tracking-wider">{language}</span>
                  </div>
                  <h2 className="font-bold text-slate-800 text-xl hidden sm:block">UPSC Current Affairs Compilation</h2>
                </div>
                <div className="flex gap-3 items-center">
                  <div className="text-right flex flex-col justify-center">
                     <span className="text-xs text-slate-400 flex items-center gap-1 justify-end">
                      <Calendar className="w-3 h-3" /> Generated Date
                    </span>
                    <span className="text-sm font-bold text-slate-700">{new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  </div>
                  <button 
                    onClick={handleCopyForBlogger}
                    className="ml-4 p-2 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-lg transition-colors flex items-center gap-2"
                    title="Copy HTML for Blogger"
                  >
                    <BookOpen className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase hidden sm:inline">Copy for Blogger</span>
                  </button>
                  <button 
                    onClick={handleDownloadPDF}
                    className="ml-2 p-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg transition-colors flex items-center gap-2"
                    title="Download / Print PDF"
                  >
                    <Download className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase hidden sm:inline">PDF</span>
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-6 md:p-10">
                <div className="hidden print:block mb-8 border-b border-slate-200 pb-4">
                  <h1 className="text-3xl font-bold text-slate-900 mb-2">UPSC Current Affairs Compilation</h1>
                  <p className="text-slate-600 font-medium">Timeframe: {timeframe} | Language: {language} | Date: {new Date().toLocaleDateString()}</p>
                </div>
                <div className="markdown-body max-w-full">
                  {content.split('---COMMENT_BOX_PLACEHOLDER---').map((part, index, array) => (
                    <React.Fragment key={index}>
                      <Markdown>{part}</Markdown>
                      {index < array.length - 1 && (
                        <div className="print:hidden">
                          <CommentBox topicId={index} />
                        </div>
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </div>
          )}
          
          {mode === 'Notes' && !content && !loading && !error && (
            <div className="flex-1 flex items-center justify-center p-8">
              <div className="max-w-md w-full bg-white p-8 rounded-3xl shadow-sm border border-slate-100 text-center flex flex-col items-center">
                <div className="w-20 h-20 bg-gradient-to-tr from-indigo-100 to-indigo-50 text-indigo-500 rounded-full flex items-center justify-center mb-6 shadow-inner">
                  <BookOpen className="w-10 h-10" />
                </div>
                <h3 className="text-2xl font-bold text-slate-800 mb-3">Ready to Analyze</h3>
                <p className="text-slate-500 text-sm leading-relaxed mb-8">
                  Configure your timeframe and language preferences in the sidebar. We'll aggregate and format current affairs from PIB, The Hindu, and TOI.
                </p>
                <div className="grid grid-cols-3 gap-4 w-full text-left">
                   <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                     <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Source 1</div>
                     <div className="text-xs font-semibold text-slate-700">PIB Releases</div>
                   </div>
                   <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                     <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Source 2</div>
                     <div className="text-xs font-semibold text-slate-700">The Hindu</div>
                   </div>
                   <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                     <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Source 3</div>
                     <div className="text-xs font-semibold text-slate-700">Times of India</div>
                   </div>
                </div>
              </div>
            </div>
          )}

          {mode === 'Notes' && loading && !content && (
            <div className="flex-1 flex items-center justify-center">
              <div className="flex flex-col items-center max-w-sm text-center">
                <div className="relative w-16 h-16 mb-6">
                  <div className="absolute inset-0 border-4 border-indigo-100 rounded-full"></div>
                  <div className="absolute inset-0 border-4 border-indigo-600 rounded-full border-t-transparent animate-spin"></div>
                </div>
                <h3 className="text-lg font-bold text-slate-800 mb-2">Compiling Custom Notes</h3>
                <p className="text-sm text-slate-500">Scanning recent articles and generating PYQs. This may take a few moments...</p>
              </div>
            </div>
          )}

          {/* Floating Menu */}
          <motion.div 
            drag 
            dragMomentum={false}
            className="absolute z-50 right-8 bottom-8 flex flex-col items-end"
          >
            <AnimatePresence>
              {isMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 20 }}
                  className="bg-white rounded-2xl shadow-2xl shadow-indigo-200/50 border border-slate-200 p-5 mb-4 w-72 flex flex-col max-h-[70vh] overflow-y-auto cursor-default"
                  onPointerDownCapture={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-xs font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2">
                      <Layout className="w-4 h-4 text-indigo-500"/> Menu Option
                    </p>
                    <button onClick={() => setIsMenuOpen(false)} className="p-1.5 hover:bg-slate-100 rounded-full text-slate-400 transition-colors">
                      <X className="w-4 h-4"/>
                    </button>
                  </div>

                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Analysis Hub</p>
                  
                  <div className="space-y-2 mb-6">
                    <button
                      onClick={() => { setMode('AutoFeed'); fetchPublishedNotes(); setIsMenuOpen(false); }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                        mode === 'AutoFeed' 
                          ? 'bg-amber-50 text-amber-700' 
                          : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <Inbox className="w-4 h-4" />
                      Daily Auto-Feed
                    </button>
                    <button
                      onClick={() => { setMode('Notes'); setIsMenuOpen(false); }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                        mode === 'Notes' 
                          ? 'bg-indigo-50 text-indigo-700' 
                          : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <FileText className="w-4 h-4" />
                      Custom Notes
                    </button>
                    <button
                      onClick={() => { setMode('Quiz'); setIsMenuOpen(false); }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                        mode === 'Quiz' 
                          ? 'bg-emerald-50 text-emerald-700' 
                          : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <BrainCircuit className="w-4 h-4" />
                      Practice Quiz
                    </button>
                  </div>

                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 border-t border-slate-100 pt-4">Configuration</p>
                  
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-800 flex items-center gap-2">
                        <Clock className="w-3 h-3 text-indigo-500" />
                        TIMEFRAME
                      </label>
                      <div className="flex flex-col gap-1.5">
                        {(['Daily', 'Weekly', 'Monthly', 'Yearly'] as Timeframe[]).map((t) => (
                          <button
                            key={t}
                            onClick={() => setTimeframe(t)}
                            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                              timeframe === t 
                                ? 'bg-indigo-50 text-indigo-700' 
                                : 'text-slate-600 hover:bg-slate-50'
                            }`}
                          >
                            <div className={`w-1.5 h-1.5 rounded-full ${timeframe === t ? 'bg-indigo-600' : 'bg-transparent'}`} />
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-800 flex items-center gap-2">
                        <Globe className="w-3 h-3 text-indigo-500" />
                        LANGUAGE
                      </label>
                      <div className="flex bg-slate-100 p-1 rounded-xl">
                        {(['English', 'Hindi'] as Language[]).map((l) => (
                          <button
                            key={l}
                            onClick={() => setLanguage(l)}
                            className={`flex-1 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                              language === l 
                                ? 'bg-white shadow-sm text-indigo-600' 
                                : 'text-slate-500 hover:text-slate-700'
                            }`}
                          >
                            {l}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-100">
                    <button
                      onClick={() => { generateReport(); setIsMenuOpen(false); }}
                      disabled={loading}
                      className="w-full py-3 bg-indigo-600 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-md shadow-indigo-200 hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" /> Generating...
                        </>
                      ) : (
                        <>
                          <Download className="w-4 h-4" /> Download PDF
                        </>
                      )}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              onPointerDownCapture={(e) => e.stopPropagation()}
              className="w-14 h-14 bg-indigo-600 rounded-full flex items-center justify-center text-white shadow-xl shadow-indigo-200 hover:bg-indigo-700 hover:shadow-indigo-300 transition-all active:scale-95 cursor-grab active:cursor-grabbing"
              title="Drag me!"
            >
              <Menu className="w-6 h-6" />
            </button>
          </motion.div>
        </main>
      </div>
    </div>
  );
}
