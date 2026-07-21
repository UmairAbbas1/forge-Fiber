import { Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Share2, Mail, Menu, X } from "lucide-react";

export function PublicLayout({ children }: { children: React.ReactNode }) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 50) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="bg-white text-foreground font-sans overflow-x-hidden min-h-screen">
      {/* TopNavBar */}
      <nav
        className={`fixed top-0 w-full z-50 bg-white/95 border-b border-border transition-all duration-300 ${
          scrolled ? "h-16 shadow-sm" : "h-20"
        }`}
      >
        <div className="flex justify-between items-center px-6 md:px-12 h-full w-full max-w-7xl mx-auto">
          <Link to="/" className="flex items-center gap-3">
            <img src="/favicon.png" alt="Forge & Fabric Logo" className="h-12 w-12 md:h-14 md:w-14 rounded-lg object-contain" />
            <span className="font-display text-2xl md:text-3xl font-extrabold text-neutral-900 tracking-tight">
              Forge &amp; Fabric
            </span>
          </Link>
          
          <div className="hidden md:flex gap-8 items-center">
            {/* Navigation links have been removed for unauthenticated landing page */}
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/dashboard"
              className="hidden sm:inline-flex bg-primary-container text-on-primary-container hover:bg-primary hover:text-white px-6 py-2.5 rounded-lg font-label-caps text-xs tracking-wider uppercase transition-all duration-200"
            >
              Sign In
            </Link>
            
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-on-surface hover:text-secondary"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden absolute top-full left-0 w-full bg-surface-container-lowest border-b border-outline-variant p-6 space-y-4 shadow-xl">
            <Link
              to="/dashboard"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-center bg-primary-container text-on-primary-container hover:bg-primary hover:text-white py-3 rounded-lg font-label-caps text-sm tracking-wider uppercase transition-all"
            >
              Sign In
            </Link>
          </div>
        )}
      </nav>

      <main className={`${scrolled ? "mt-16" : "mt-20"} transition-all duration-300`}>
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-primary-container text-on-primary-container w-full py-16 px-6 md:px-12 border-t border-outline-variant/20">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="flex flex-col lg:flex-row justify-between items-start gap-12">
            <div className="max-w-sm space-y-4">
              <span className="font-display-lg text-lg font-bold text-white tracking-wider uppercase">
                Forge &amp; Fabric
              </span>
              <p className="font-body-sm text-sm text-on-primary-container/80 leading-relaxed">
                Industrial garment manufacturing for premium brands. Specializing in conversion models and sustainable finishing.
              </p>
              <div className="flex gap-4 pt-2">
                <a
                  href="#"
                  className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center hover:bg-secondary transition-colors duration-200"
                  aria-label="Share"
                >
                  <Share2 className="h-5 w-5 text-white" />
                </a>
                <a
                  href="mailto:faizijaz914@gmail.com"
                  className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center hover:bg-secondary transition-colors duration-200"
                  aria-label="Email"
                >
                  <Mail className="h-5 w-5 text-white" />
                </a>
              </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-12 lg:gap-24">
              <div className="space-y-4">
                <h5 className="font-label-caps text-xs uppercase tracking-widest text-white font-bold">Factory</h5>
                <ul className="space-y-3 font-body-sm text-sm text-on-primary-container/70">
                  <li><Link className="hover:text-white transition-colors" to="/process">Our Process</Link></li>
                  <li><Link className="hover:text-white transition-colors" to="/sustainability">Sustainability</Link></li>
                  <li><Link className="hover:text-white transition-colors" to="/machines">Machine List</Link></li>
                  <li><Link className="hover:text-white transition-colors" to="/compliance">Compliance</Link></li>
                </ul>
              </div>
              
              <div className="space-y-4">
                <h5 className="font-label-caps text-xs uppercase tracking-widest text-white font-bold">Company</h5>
                <ul className="space-y-3 font-body-sm text-sm text-on-primary-container/70">
                  <li><Link className="hover:text-white transition-colors" to="/about">About Us</Link></li>
                  <li><Link className="hover:text-white transition-colors" to="/contact">Contact</Link></li>
                  <li><Link className="hover:text-white transition-colors" to="/privacy">Privacy Policy</Link></li>
                  <li><Link className="hover:text-white transition-colors" to="/terms">Terms of Service</Link></li>
                </ul>
              </div>
              
              <div className="col-span-2 md:col-span-1 space-y-4">
                <h5 className="font-label-caps text-xs uppercase tracking-widest text-white font-bold">Contact</h5>
                <p className="font-body-sm text-sm text-on-primary-container/80">faizijaz914@gmail.com</p>
                <p className="font-body-sm text-sm text-on-primary-container/80">03269428312</p>
                <p className="font-body-sm text-sm text-on-primary-container/60 mt-4 leading-relaxed">
                  1200 Industrial Pkwy<br />New York, NY 10001
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 border-t border-white/10 pt-8">
            <p className="font-body-sm text-xs text-on-primary-container/60">
              © 2026 Forge &amp; Fabric Industrial. All rights reserved.
            </p>
            <div className="flex gap-8">
              <Link className="font-body-sm text-xs text-on-primary-container/70 hover:text-white transition-colors" to="/sustainability">
                Sustainability Report
              </Link>
              <Link className="font-body-sm text-xs text-on-primary-container/70 hover:text-white transition-colors" to="/compliance">
                Compliance
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
