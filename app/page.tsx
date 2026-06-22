import Link from 'next/link';
import { Check, Cpu, Sparkles, Layers, Sliders, Eye, Download, ShieldCheck, ChevronDown } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Top Navbar */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-primary to-accent flex items-center justify-center text-white font-bold text-lg shadow-sm">
                D
              </div>
              <span className="font-bold text-xl text-text tracking-tight">DocuGen</span>
            </Link>
            <nav className="hidden md:flex items-center gap-6">
              <a href="#features" className="text-text-secondary hover:text-primary transition-colors text-sm font-medium">Features</a>
              <a href="#templates" className="text-text-secondary hover:text-primary transition-colors text-sm font-medium">Templates</a>
              <a href="#pricing" className="text-text-secondary hover:text-primary transition-colors text-sm font-medium">Pricing</a>
              <div className="relative group cursor-pointer">
                <span className="text-text-secondary group-hover:text-primary transition-colors text-sm font-medium flex items-center gap-1">
                  Resources <ChevronDown className="w-4 h-4" />
                </span>
              </div>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-primary transition-colors">
              Log in
            </Link>
            <Link href="/signup" className="px-4 py-2 text-sm font-medium bg-primary hover:bg-primary-hover text-white rounded-btn shadow-sm transition-all">
              Sign up
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-6 pt-12 pb-20 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        {/* Left Content */}
        <div className="lg:col-span-6 flex flex-col gap-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold w-fit animate-pulse">
            <Sparkles className="w-3.5 h-3.5" />
            <span>New: AI field detection is here. Try it now →</span>
          </div>
          
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-text leading-tight tracking-tight">
            Generate Thousands of Personalized Documents in <span className="text-accent underline decoration-primary/30">Minutes</span>
          </h1>
          
          <p className="text-lg text-text-secondary leading-relaxed">
            Upload a PDF template, define dynamic fields on our canvas, and automate certificate or document generation from CSV data with instant auto-fit and quality checks.
          </p>

          <div className="flex flex-col gap-3 py-2">
            {[
              "No design skills required — use existing PDFs",
              "Smart text fitting & automated quality checks",
              "Export, review flagged rows & download ZIPs"
            ].map((text, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-success/15 flex items-center justify-center text-success">
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </div>
                <span className="text-sm md:text-base font-medium text-text-secondary">{text}</span>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4 mt-2">
            <Link href="/signup" className="w-full sm:w-auto px-8 py-4 bg-primary hover:bg-primary-hover text-white font-semibold rounded-btn shadow-lg hover:shadow-xl transition-all text-center">
              Get Started Free
            </Link>
            <Link href="/login" className="w-full sm:w-auto px-8 py-4 border border-border-strong hover:bg-muted text-text font-semibold rounded-btn transition-all text-center">
              View Demo
            </Link>
          </div>
          
          <span className="text-xs text-text-muted mt-1">No credit card required. Start generating instantly.</span>
        </div>

        {/* Right Content - Visual Mockup */}
        <div className="lg:col-span-6 relative flex justify-center items-center">
          {/* Main Certificate Mockup */}
          <div className="relative w-full max-w-[480px] bg-canvas border border-border rounded-xl shadow-elevated p-6 overflow-hidden">
            {/* Elegant Certificate Border */}
            <div className="border-[8px] border-double border-accent/25 rounded-lg p-6 flex flex-col items-center justify-between min-h-[300px] bg-white">
              <span className="text-[10px] tracking-[0.2em] uppercase font-bold text-text-secondary">Certificate</span>
              <span className="text-[8px] tracking-[0.1em] text-text-muted uppercase mt-1">of achievement</span>
              
              <div className="my-6 text-center">
                <div className="text-[9px] text-text-muted italic">This certifies that</div>
                <div className="mt-2 text-xl font-bold font-serif text-primary border-b border-primary/20 pb-1 px-4 inline-block">
                  Participant Name
                </div>
                <div className="mt-2 text-[9px] text-text-muted">has successfully completed the</div>
                <div className="mt-1 text-xs font-semibold text-text">AI Hackathon 2026</div>
              </div>

              <div className="w-full flex justify-between items-end mt-4 px-4 text-[8px] text-text-secondary">
                <div className="flex flex-col items-center">
                  <span className="border-t border-border pt-1">Date: 21-06-2026</span>
                </div>
                <div className="w-8 h-8 rounded-full border border-primary/20 bg-primary-soft flex items-center justify-center text-[10px] font-bold text-primary">
                  ★
                </div>
                <div className="flex flex-col items-center">
                  <span className="border-t border-border pt-1">Organizer Signature</span>
                </div>
              </div>
            </div>
            
            {/* Overlaid Data Table Mockup */}
            <div className="absolute bottom-6 left-6 right-6 bg-white/95 border border-border shadow-lg rounded-lg p-3 backdrop-blur-sm transform translate-y-8 translate-x-2 hidden md:block">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">data_source.csv</span>
                <span className="text-[9px] text-success font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-success"></span> mapped
                </span>
              </div>
              <div className="text-[9px] divide-y divide-border">
                <div className="grid grid-cols-3 py-1 font-bold text-text-muted">
                  <span>Name</span>
                  <span>Event</span>
                  <span>Date</span>
                </div>
                <div className="grid grid-cols-3 py-1 text-text-secondary">
                  <span>Tejas</span>
                  <span>AI Hackathon</span>
                  <span>21-06-2026</span>
                </div>
                <div className="grid grid-cols-3 py-1 text-text-secondary">
                  <span>John Doe</span>
                  <span>AI Hackathon</span>
                  <span>21-06-2026</span>
                </div>
              </div>
            </div>

            {/* Overlaid Float Status Badge */}
            <div className="absolute top-8 right-8 bg-success-bg border border-success text-success px-3 py-1.5 rounded-full shadow-lg flex items-center gap-2 transform rotate-3">
              <span className="w-2 h-2 rounded-full bg-success animate-ping"></span>
              <span className="text-xs font-bold">1,245 Documents Generated</span>
            </div>
          </div>
        </div>
      </section>

      {/* Grayscale Logo Wall */}
      <section className="bg-canvas border-y border-border py-10">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <span className="text-xs uppercase tracking-widest text-text-muted font-semibold">Trusted by 10,000+ organizations worldwide</span>
          <div className="flex flex-wrap items-center justify-center gap-12 mt-6 opacity-40 grayscale">
            <span className="font-bold text-xl md:text-2xl text-text tracking-tight">Google</span>
            <span className="font-bold text-xl md:text-2xl text-text tracking-tight">Microsoft</span>
            <span className="font-bold text-xl md:text-2xl text-text tracking-tight">Amazon</span>
            <span className="font-bold text-xl md:text-2xl text-text tracking-tight">Deloitte</span>
            <span className="font-bold text-xl md:text-2xl text-text tracking-tight">Airtel</span>
          </div>
        </div>
      </section>

      {/* Key Features Section */}
      <section id="features" className="max-w-7xl mx-auto px-6 py-20">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl font-bold text-text">Built for Fast, Reliable Document Scaling</h2>
          <p className="text-text-secondary mt-3">From tiny sets to huge batches, DocuGen simplifies high-volume personalized PDF generations.</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[
            {
              icon: <Sliders className="w-6 h-6 text-primary" />,
              title: "Smart Text Fitting",
              desc: "Automatically shrinks, wraps, or truncates text to fit inside defined field boxes without manual font size tweaking."
            },
            {
              icon: <Cpu className="w-6 h-6 text-primary" />,
              title: "Quality Checks",
              desc: "Scans generated batches for overflows or truncation issues, flagging rows for easy human-in-the-loop review."
            },
            {
              icon: <Layers className="w-6 h-6 text-primary" />,
              title: "Bulk Generation",
              desc: "Generates thousands of custom PDFs asynchronously via background processes, keeping the UI fast and fluid."
            },
            {
              icon: <Eye className="w-6 h-6 text-primary" />,
              title: "Multiple Field Types",
              desc: "Supports customized fonts (Playfair Display, Arial), variable sizing, alignments, transforms, and colors."
            },
            {
              icon: <Download className="w-6 h-6 text-primary" />,
              title: "Export & Download",
              desc: "Download all documents in a unified ZIP file or export summary validation reports in CSV and JSON formats."
            },
            {
              icon: <ShieldCheck className="w-6 h-6 text-primary" />,
              title: "Secure & Private",
              desc: "Role-based row level security (RLS) protects documents. Data and credentials are fully encrypted."
            }
          ].map((feat, i) => (
            <div key={i} className="bg-canvas border border-border hover:border-primary/30 p-6 rounded-card shadow-card hover:shadow-lg transition-all flex flex-col gap-4">
              <div className="w-12 h-12 rounded-lg bg-primary-soft flex items-center justify-center shadow-sm">
                {feat.icon}
              </div>
              <h3 className="font-semibold text-lg text-text">{feat.title}</h3>
              <p className="text-sm text-text-secondary leading-relaxed">{feat.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-canvas py-12">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-gradient-to-tr from-primary to-accent flex items-center justify-center text-white font-bold text-sm">
              D
            </div>
            <span className="font-bold text-text">DocuGen</span>
          </div>
          <span className="text-xs text-text-muted">© 2026 DocuGen Technologies. All rights reserved.</span>
          <div className="flex gap-6 text-xs text-text-secondary">
            <a href="#" className="hover:text-primary transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-primary transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-primary transition-colors">Contact Support</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
