import { useState, useCallback, FormEvent } from 'react';
import { toast } from 'sonner';
import { parseLeadsFile, CSVParseResult } from '@/utils/csv';
import { api } from '@/lib/api';
import { Lead } from '@/types';
import { useSession } from '@/hooks/useSession';
import { Spinner } from '@/components/ui/Spinner';

interface ComposeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface FormState {
  subject: string;
  body: string;
  senderEmail: string;
  hourlyLimit: number;
  delaySeconds: number;
  startTime: string;
}

const defaultForm: FormState = {
  subject: '',
  body: '',
  senderEmail: '',
  hourlyLimit: 50,
  delaySeconds: 5,
  startTime: '',
};

/** Returns the local datetime-local string for "now + 2 minutes" */
function getDefaultStartTime(): string {
  const d = new Date(Date.now() + 2 * 60 * 1000);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}


export function ComposeModal({ isOpen, onClose, onSuccess }: ComposeModalProps) {
  const { data: session } = useSession();
  
  const [form, setForm] = useState<FormState>(() => ({
    ...defaultForm,
    senderEmail: session?.user?.email ?? '',
    startTime: getDefaultStartTime(),
  }));
  
  const [parseResult, setParseResult] = useState<CSVParseResult | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [leads, setLeads] = useState<Lead[]>([]);
  
  // Toggle for Start Date/Time Picker popup (clock icon in header)
  const [showDatePicker, setShowDatePicker] = useState(false);

  const resetForm = useCallback(() => {
    setForm({ 
      ...defaultForm, 
      senderEmail: session?.user?.email ?? '', 
      startTime: getDefaultStartTime() 
    });
    setParseResult(null);
    setLeads([]);
    setIsParsing(false);
    setIsSubmitting(false);
    setShowDatePicker(false);
  }, [session]);

  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [onClose, resetForm]);

  const handleFileUpload = useCallback(async (file: File) => {
    setIsParsing(true);
    setParseResult(null);
    setLeads([]);
    try {
      const result = await parseLeadsFile(file);
      setParseResult(result);
      setLeads(result.leads);
      if (result.leads.length === 0) {
        toast.error('No valid leads found in the CSV file.');
      } else if (result.errors.length > 0) {
        toast.warning(`Parsed ${result.leads.length} leads with ${result.errors.length} warnings.`);
      } else {
        toast.success(`✓ ${result.leads.length} leads loaded successfully!`);
      }
    } catch {
      toast.error('Failed to read CSV file.');
    } finally {
      setIsParsing(false);
    }
  }, []);

  const clearLeads = () => {
    setLeads([]);
    setParseResult(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!form.subject.trim()) return toast.error('Subject is required.');
    if (!form.body.trim()) return toast.error('Email body is required.');
    
    const sender = form.senderEmail.trim() || session?.user?.email;
    if (!sender) return toast.error('Sender email is required.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sender)) {
      return toast.error('Sender email is invalid.');
    }
    
    if (leads.length === 0) {
      return toast.error('Please upload a leads CSV file containing recipient emails.');
    }
    if (!form.startTime) return toast.error('Please set a start time.');
    if (new Date(form.startTime) < new Date()) {
      return toast.error('Start time must be in the future.');
    }

    setIsSubmitting(true);
    try {
      const result = await api.campaigns.schedule({
        subject: form.subject.trim(),
        body: form.body.trim(),
        leads,
        senderEmail: sender.toLowerCase(),
        hourlyLimit: form.hourlyLimit,
        delaySeconds: form.delaySeconds,
        startTime: new Date(form.startTime).toISOString(),
      });

      toast.success(result.message);
      resetForm();
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to schedule campaign.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-[560px] bg-white rounded-2xl border border-slate-200 shadow-modal overflow-hidden flex flex-col">
        
        {/* Header (Figma styled: Back arrow left, Send/Clock/Clip controls right) */}
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-slate-100">
          <div className="flex items-center">
            <button
              onClick={handleClose}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 mr-3 focus:outline-none"
              title="Back / Close"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <h2 className="text-sm font-bold text-slate-800">
              Compose New Email
            </h2>
          </div>

          <div className="flex items-center gap-3">
            {/* Paperclip Button for CSV Upload */}
            <label className="cursor-pointer p-1 rounded-lg text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors" title="Attach Leads (CSV)">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
              <input
                type="file"
                accept=".csv"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file);
                }}
                className="hidden"
                disabled={isParsing || isSubmitting}
              />
            </label>

            {/* Clock icon toggles start time picker */}
            <button
              type="button"
              onClick={() => setShowDatePicker(!showDatePicker)}
              className={`p-1 rounded-lg transition-colors focus:outline-none ${
                showDatePicker ? 'bg-emerald-50 text-[#00a854] border border-emerald-100' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'
              }`}
              title="Set Start Time"
              disabled={isSubmitting}
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>

            {/* Send Later Button (Figma green styled) */}
            <button
              onClick={handleSubmit as unknown as () => void}
              type="submit"
              className="bg-[#00a854] hover:bg-[#00944b] text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-[#00a854]"
              disabled={leads.length === 0 || isSubmitting || isParsing}
            >
              {isSubmitting ? (
                <>
                  <Spinner size="sm" />
                  Sending...
                </>
              ) : (
                'Send Later'
              )}
            </button>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-y-auto">
          {/* Header Rows */}
          <div className="divide-y divide-slate-100">
            {/* From field */}
            <div className="flex items-center px-6 py-3 text-sm">
              <span className="w-16 font-semibold text-slate-400">From</span>
              <div className="flex-grow flex items-center bg-[#f8fafc] border border-slate-200 rounded-md px-2.5 py-1 text-slate-600 max-w-[280px]">
                <input
                  type="email"
                  required
                  value={form.senderEmail}
                  onChange={(e) => setForm((f) => ({ ...f, senderEmail: e.target.value }))}
                  placeholder={session?.user?.email ?? 'sender@domain.com'}
                  className="flex-grow bg-transparent border-0 outline-none p-0 text-slate-600 placeholder-slate-300 text-xs focus:ring-0"
                  disabled={isSubmitting}
                />
                <svg className="h-3 w-3 text-slate-400 ml-1 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>

            {/* To / Leads file Uploader field (styled matching the green pills & Upload List in mockup) */}
            <div className="flex items-center px-6 py-3 text-sm">
              <span className="w-16 font-semibold text-slate-400 shrink-0">To</span>
              <div className="flex-1 min-w-0 flex items-center justify-between gap-4">
                {leads.length > 0 ? (
                  <div className="flex items-center gap-1.5 overflow-hidden">
                    {leads.slice(0, 3).map((lead, idx) => (
                      <span key={idx} className="inline-flex items-center bg-[#eaf8f2] text-[#00a854] border border-[#d1fae5] rounded-full px-2.5 py-0.5 text-xs truncate max-w-[130px] font-semibold">
                        {lead.email.split('@')[0]}
                      </span>
                    ))}
                    {leads.length > 3 && (
                      <span className="inline-flex items-center bg-slate-100 text-slate-500 rounded-full px-2 py-0.5 text-xs font-bold shrink-0">
                        +{leads.length - 3}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={clearLeads}
                      className="text-[10px] text-red-500 hover:underline font-medium shrink-0 ml-1 focus:outline-none"
                      disabled={isSubmitting}
                    >
                      Clear
                    </button>
                  </div>
                ) : (
                  <span className="text-xs text-slate-400">No leads loaded</span>
                )}

                <label className="cursor-pointer text-xs text-[#00a854] font-semibold hover:underline flex items-center gap-1 shrink-0">
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  Upload List
                  <input
                    type="file"
                    accept=".csv"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file);
                    }}
                    className="hidden"
                    disabled={isParsing || isSubmitting}
                  />
                </label>
              </div>
            </div>

            {/* Subject field */}
            <div className="flex items-center px-6 py-3 text-sm">
              <span className="w-16 font-semibold text-slate-400">Subject</span>
              <input
                type="text"
                required
                placeholder="Subject"
                value={form.subject}
                onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                className="flex-1 bg-transparent border-0 outline-none p-0 text-slate-800 placeholder-slate-300 text-sm focus:ring-0"
                disabled={isSubmitting}
              />
            </div>

            {/* Schedule Parameters (Figma inline styled: Delay & Hourly inputs) */}
            <div className="flex items-center px-6 py-3 gap-6 text-xs bg-slate-50/50">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-400">Delay between 2 emails</span>
                <input
                  type="number"
                  min={0}
                  required
                  value={form.delaySeconds}
                  onChange={(e) => setForm((f) => ({ ...f, delaySeconds: parseInt(e.target.value, 10) || 0 }))}
                  className="w-12 text-center bg-[#f1f5f9] border border-slate-200 rounded-md py-1 text-slate-800 font-semibold focus:ring-1 focus:ring-[#00a854] outline-none"
                  disabled={isSubmitting}
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-400">Hourly Limit</span>
                <input
                  type="number"
                  min={1}
                  required
                  value={form.hourlyLimit}
                  onChange={(e) => setForm((f) => ({ ...f, hourlyLimit: parseInt(e.target.value, 10) || 0 }))}
                  className="w-12 text-center bg-[#f1f5f9] border border-slate-200 rounded-md py-1 text-slate-800 font-semibold focus:ring-1 focus:ring-[#00a854] outline-none"
                  disabled={isSubmitting}
                />
              </div>

              {isParsing && (
                <div className="flex items-center gap-1 text-[10px] text-slate-400 ml-auto font-medium">
                  <Spinner size="sm" />
                  Parsing leads...
                </div>
              )}
            </div>
          </div>

          {/* Date Picker Drawer (revealed by clicking clock icon) */}
          {showDatePicker && (
            <div className="px-6 py-3 border-b border-slate-100 bg-[#f8fafc] flex items-center justify-between text-xs animate-fade-in">
              <span className="font-semibold text-slate-500 uppercase tracking-wider">Start Time (Campaign Launch)</span>
              <input
                type="datetime-local"
                value={form.startTime}
                onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))}
                className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-slate-700 outline-none focus:ring-2 focus:ring-[#00a854]"
                disabled={isSubmitting}
              />
            </div>
          )}

          {/* Formatting Toolbar Mockup (exactly matching the Figma screenshot) */}
          <div className="flex items-center gap-1.5 px-6 py-2 bg-slate-50 border-b border-slate-100 overflow-x-auto shrink-0 select-none">
            {/* Undo / Redo */}
            <button type="button" className="p-1 rounded text-slate-400 hover:bg-slate-100 hover:text-slate-600" title="Undo"><svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg></button>
            <button type="button" className="p-1 rounded text-slate-400 hover:bg-slate-100 hover:text-slate-600" title="Redo"><svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10H11a8 8 0 00-8 8v2m18-10l-6 6m6-6l-6-6" /></svg></button>
            
            <div className="h-4 w-px bg-slate-200 mx-1" />
            
            {/* Font formatting options */}
            <span className="text-xs font-semibold text-slate-400 px-1 select-none">Tt</span>
            <button type="button" className="p-1 rounded text-slate-400 hover:bg-slate-100 hover:text-slate-600 font-bold" title="Bold">B</button>
            <button type="button" className="p-1 rounded text-slate-400 hover:bg-slate-100 hover:text-slate-600 italic" title="Italic">I</button>
            <button type="button" className="p-1 rounded text-slate-400 hover:bg-slate-100 hover:text-slate-600 underline" title="Underline">U</button>
            <button type="button" className="p-1 rounded text-slate-400 hover:bg-slate-100 hover:text-slate-600 line-through" title="Strikethrough">S</button>
            
            <div className="h-4 w-px bg-slate-200 mx-1" />
            
            {/* Alignment and Lists */}
            <button type="button" className="p-1 rounded text-slate-400 hover:bg-slate-100 hover:text-slate-600" title="Align Left"><svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h12M4 18h16" /></svg></button>
            <button type="button" className="p-1 rounded text-slate-400 hover:bg-slate-100 hover:text-slate-600" title="Bullet List"><svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg></button>
            <button type="button" className="p-1 rounded text-slate-400 hover:bg-slate-100 hover:text-slate-600 font-serif" title="Quote">“</button>
          </div>

          {/* Email Body Textarea */}
          <div className="flex-grow min-h-[220px] px-6 py-4 flex flex-col">
            <textarea
              required
              placeholder="Type Your Reply..."
              value={form.body}
              onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
              className="flex-grow w-full bg-transparent border-0 resize-none outline-none p-0 text-slate-800 placeholder-slate-300 text-sm focus:ring-0"
              disabled={isSubmitting}
            />
          </div>
        </form>
      </div>
    </div>
  );
}
