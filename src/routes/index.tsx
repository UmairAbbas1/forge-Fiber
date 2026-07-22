import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowRight,
  ShieldCheck,
  Package,
  Factory,
  Droplets,
  CheckSquare,
  ArrowUpRight,
  Sparkles,
  Users,
  Award,
  Clock,
  Layers,
  ChevronRight,
  X,
  CheckCircle2,
  Cpu,
  Boxes
} from "lucide-react";
import { PublicLayout } from "../components/PublicLayout";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Forge & Fabric | Industrial Garment Conversion & Sourcing" },
      { name: "description", content: "Real-time garment production tracking and fabric conversion manufacturing. We convert customer-supplied fabric and trims into finished, high-quality garments." },
      { property: "og:title", content: "Forge & Fabric | Industrial Garment Conversion & Sourcing" },
      { property: "og:description", content: "Real-time garment production tracking and fabric conversion manufacturing." },
    ],
  }),
  component: LandingPage,
});

interface StageModalData {
  num: string;
  title: string;
  desc: string;
  equipment: string;
  leadTime: string;
  output: string;
}

function LandingPage() {
  const navigate = useNavigate();
  const [selectedStageModal, setSelectedStageModal] = useState<StageModalData | null>(null);

  const stageDetails: StageModalData[] = [
    {
      num: "01",
      title: "Material Intake & Roll Inspection",
      desc: "Customer-supplied fabric rolls and trims logged, 4-point fabric inspection conducted, and shade lot matching completed.",
      equipment: "Automated Roll Inspection Frame & Color Matching Lightbox",
      leadTime: "12 Hours",
      output: "Approved Fabric Roll Inventory & Inspection Clearance Tag",
    },
    {
      num: "02",
      title: "Precision Spreading & Laser Cutting",
      desc: "Computerized marker planning, vacuum tension spreading, and high precision laser cut panel generation.",
      equipment: "Gerber Automatic Spreader & CNC Laser Cutter",
      leadTime: "18 Hours",
      output: "Bundled Cut Garment Panels & Shade Lot Stickers",
    },
    {
      num: "03",
      title: "Sewing Line Assembly",
      desc: "Modular line assembly with real-time barcode bundle tracking across collar, sleeve, placket, and main body stations.",
      equipment: "Juki Automatic Sewing Machines & Overlock Station",
      leadTime: "36 Hours",
      output: "Assembled Unwashed Garment Shells",
    },
    {
      num: "04",
      title: "Ozone Bio Wash & Garment Dyeing",
      desc: "Sustainable waterless ozone bio wash, vintage stone wash, laser distressing, and color fixation.",
      equipment: "Tonello Industrial Ozone Chamber & Laser Engraver",
      leadTime: "24 Hours",
      output: "Washed Finished Garments with Soft Texture",
    },
    {
      num: "05",
      title: "AQL 2.5 Audit & Goods Dispatch",
      desc: "Final AQL 2.5 quality control audit, steam pressing, price tagging, carton packing, and global shipping dispatch.",
      equipment: "Steam Tunnel Press, Tagging Tacker & Barcode Scanner",
      leadTime: "12 Hours",
      output: "Packed Master Cartons & Dispatch Manifest",
    },
  ];

  return (
    <PublicLayout>
      <div className="bg-[#FAF8F5] min-h-screen py-10 px-4 md:px-12 max-w-7xl mx-auto">
        
        {/* HERO SECTION */}
        <section className="pt-6 pb-12">
          
          {/* Top Headline Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-end">
            <div className="lg:col-span-8">
              <h1 className="font-display font-black text-5xl sm:text-7xl lg:text-8xl text-neutral-950 tracking-tight leading-[0.95] select-none">
                Garment Conversion <br />
                <span className="text-neutral-900">Simplified</span>
              </h1>
            </div>

            <div className="lg:col-span-4 pb-2">
              <p className="text-neutral-600 text-sm md:text-base leading-relaxed font-medium max-w-md">
                Custom fabrics, expert support, and 13 stage real-time tracking built for fashion brands, designers, and industrial garment enterprises.
              </p>
            </div>
          </div>

          {/* Thin Separator Line */}
          <div className="my-10 border-t border-neutral-200/90" />

          {/* Hero Bottom Banner Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
            
            {/* Left Card: Testimonial & Big Stat */}
            <div className="lg:col-span-4 flex flex-col justify-between bg-white/70 backdrop-blur border border-neutral-200/80 p-8 rounded-3xl shadow-sm">
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <img
                      src="/assets/machines/ozone_chambers.png"
                      alt="Production Director"
                      className="w-14 h-14 rounded-full object-cover border-2 border-amber-600"
                    />
                    <div className="absolute -bottom-1 -right-1 bg-amber-600 text-white rounded-full p-1 shadow">
                      <Sparkles className="w-3.5 h-3.5" />
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wider text-amber-700">Client Operations</div>
                    <div className="text-xs text-neutral-500 font-medium">Garment Sourcing &amp; CMT</div>
                  </div>
                </div>

                <blockquote className="text-neutral-700 text-sm italic font-medium leading-relaxed">
                  &ldquo;We deliver fully customized garment conversion at low MOQ with full 13 stage visibility to fashion businesses globally.&rdquo;
                </blockquote>
              </div>

              <div className="pt-8 border-t border-neutral-100 mt-6">
                <div className="font-display font-black text-5xl text-neutral-950 tracking-tight">
                  400<span className="text-amber-600 font-serif font-normal">+</span>
                </div>
                <div className="text-xs font-bold text-amber-700 uppercase tracking-widest mt-1">
                  Private Label Brands
                </div>
              </div>
            </div>

            {/* Right Card: Curved Hero Fabric Video Banner */}
            <div className="lg:col-span-8 relative min-h-[340px] md:min-h-[440px] rounded-3xl overflow-hidden group shadow-xl border border-neutral-200 bg-white">
              
              {/* Seamless Looping Golden Cloth Video - Ultra-Bright Original Quality */}
              <video
                autoPlay
                loop
                muted
                playsInline
                preload="auto"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000 brightness-[1.05]"
              >
                <source src="/assets/AnimationVideoofCloth.mp4" type="video/mp4" />
                Your browser does not support video playback.
              </video>

              {/* Floating Bottom-Right Explore Card */}
              <div className="absolute bottom-6 right-6 z-20">
                <Link
                  to="/orders"
                  className="group/btn flex items-center gap-4 bg-amber-600 hover:bg-neutral-950 text-white p-2.5 pl-6 rounded-full border-2 border-white/20 shadow-2xl transition-all duration-300"
                >
                  <div className="text-left">
                    <div className="text-xs font-bold uppercase tracking-wider">Explore</div>
                    <div className="text-sm font-black tracking-wide">Garment Conversion</div>
                  </div>
                  <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center group-hover/btn:bg-white group-hover/btn:text-neutral-950 transition-all">
                    <ArrowUpRight className="w-5 h-5" />
                  </div>
                </Link>
              </div>

            </div>

          </div>

        </section>

        {/* FACTORY STATS STRIP */}
        <section className="my-12 bg-neutral-950 text-white rounded-3xl p-8 md:p-12 shadow-xl border border-neutral-800">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center md:text-left">
            <div className="space-y-1">
              <div className="text-3xl md:text-4xl font-display font-black text-white">2,450+</div>
              <div className="text-xs font-bold uppercase tracking-wider text-amber-500">Active Machines</div>
              <p className="text-[11px] text-neutral-400">Automated sewing, cutting, and ozone wash</p>
            </div>
            
            <div className="space-y-1 border-l border-neutral-800 pl-4 md:pl-8">
              <div className="text-3xl md:text-4xl font-display font-black text-white">13 Stage</div>
              <div className="text-xs font-bold uppercase tracking-wider text-amber-500">Live Pipeline</div>
              <p className="text-[11px] text-neutral-400">Real-time WIP stage tracking</p>
            </div>

            <div className="space-y-1 border-l border-neutral-800 pl-4 md:pl-8">
              <div className="text-3xl md:text-4xl font-display font-black text-white">99.8%</div>
              <div className="text-xs font-bold uppercase tracking-wider text-amber-500">On-Time Shipping</div>
              <p className="text-[11px] text-neutral-400">Strict delivery schedule compliance</p>
            </div>

            <div className="space-y-1 border-l border-neutral-800 pl-4 md:pl-8">
              <div className="text-3xl md:text-4xl font-display font-black text-white">144K</div>
              <div className="text-xs font-bold uppercase tracking-wider text-amber-500">Daily Units</div>
              <p className="text-[11px] text-neutral-400">High throughput conversion capacity</p>
            </div>
          </div>
        </section>

        {/* 5-STAGE INTERACTIVE PROCESS CARDS */}
        <section className="py-12">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-amber-700">Industrial Process</span>
              <h2 className="text-3xl md:text-4xl font-display font-black text-neutral-950 mt-1">
                Conversion Manufacturing
              </h2>
            </div>
            <Link
              to="/process"
              className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-neutral-900 hover:text-amber-700 transition-colors"
            >
              <span>View Full Process Specifications</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            {stageDetails.map((stage) => (
              <div
                key={stage.num}
                onClick={() => setSelectedStageModal(stage)}
                className="bg-white border border-neutral-200/90 rounded-2xl p-6 shadow-sm hover:shadow-xl hover:border-amber-600 transition-all space-y-4 cursor-pointer group"
              >
                <div className="flex justify-between items-center">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold text-sm group-hover:bg-amber-600 group-hover:text-white transition-colors">
                    {stage.num}
                  </div>
                  <ChevronRight className="w-4 h-4 text-neutral-400 group-hover:translate-x-1 transition-transform" />
                </div>
                <h3 className="font-bold text-base text-neutral-950 group-hover:text-amber-700 transition-colors">{stage.title}</h3>
                <p className="text-xs text-neutral-600 leading-relaxed line-clamp-3">
                  {stage.desc}
                </p>
                <div className="pt-2 text-[10px] font-bold text-amber-800 uppercase tracking-wider">
                  Click to inspect specs ↗
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* CTA BANNER */}
        <section className="my-12 bg-amber-600 text-white rounded-3xl p-10 md:p-16 text-center space-y-6 shadow-xl relative overflow-hidden">
          <div className="max-w-2xl mx-auto space-y-4 relative z-10">
            <h2 className="text-3xl md:text-5xl font-display font-black tracking-tight">
              Ready to Track Your Garment Production?
            </h2>
            <p className="text-white/90 text-sm md:text-base font-medium">
              Access live 13 stage order tracking, material inspection logs, and dispatch manifests in real-time.
            </p>
            <div className="pt-4 flex flex-col sm:flex-row justify-center gap-4">
              <Link
                to="/dashboard"
                className="bg-neutral-950 text-white hover:bg-white hover:text-neutral-950 px-8 py-4 rounded-full text-xs font-bold uppercase tracking-wider transition-all shadow-lg"
              >
                Access Client Portal
              </Link>
              <button
                onClick={() => navigate({ to: "/process" })}
                className="bg-white text-neutral-950 hover:bg-neutral-950 hover:text-white px-8 py-4 rounded-full text-xs font-bold uppercase tracking-wider transition-all shadow-lg cursor-pointer"
              >
                Explore 13 Stage Specs
              </button>
            </div>
          </div>
        </section>

      </div>

      {/* INTERACTIVE STAGE DETAILS MODAL */}
      {selectedStageModal && (
        <div className="fixed inset-0 bg-neutral-950/70 backdrop-blur-sm z-50 grid place-items-center p-4">
          <div className="bg-white text-neutral-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-neutral-200 space-y-6">
            <div className="flex justify-between items-center border-b border-neutral-100 pb-4">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-full bg-amber-600 text-white font-bold text-xs grid place-items-center">
                  {selectedStageModal.num}
                </span>
                <h3 className="font-bold text-lg text-neutral-950">{selectedStageModal.title}</h3>
              </div>
              <button onClick={() => setSelectedStageModal(null)} className="text-neutral-400 hover:text-black">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-neutral-700 leading-relaxed font-medium">
              {selectedStageModal.desc}
            </p>

            <div className="space-y-3 bg-neutral-50 p-4 rounded-2xl border border-neutral-200 text-xs">
              <div className="flex justify-between items-center">
                <span className="font-bold text-neutral-500 uppercase tracking-wider text-[10px]">Equipment Required:</span>
                <span className="font-semibold text-neutral-950">{selectedStageModal.equipment}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-bold text-neutral-500 uppercase tracking-wider text-[10px]">Standard Lead Time:</span>
                <span className="font-semibold text-amber-700">{selectedStageModal.leadTime}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-bold text-neutral-500 uppercase tracking-wider text-[10px]">Stage Output:</span>
                <span className="font-semibold text-neutral-950">{selectedStageModal.output}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button 
                onClick={() => { setSelectedStageModal(null); navigate({ to: "/process" }); }}
                className="w-full bg-neutral-950 text-white hover:bg-amber-600 py-3 rounded-full text-xs font-bold uppercase tracking-wider transition-colors"
              >
                View Complete 13 Stage Manual
              </button>
            </div>
          </div>
        </div>
      )}
    </PublicLayout>
  );
}
