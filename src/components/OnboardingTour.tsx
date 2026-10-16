import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  FiSearch, 
  FiFolder, 
  FiPlus,
  FiFileText, 
  FiCheckCircle, 
  FiArrowRight, 
  FiArrowLeft, 
  FiX,
  FiHelpCircle
} from 'react-icons/fi';

interface OnboardingTourProps {
  isOpen: boolean;
  onClose: () => void;
}

interface TourStep {
  title: string;
  subtitle: string;
  description: string;
  icon: React.ReactNode;
  targetId?: string;
  preferredPlacement?: 'bottom' | 'right' | 'top' | 'left' | 'bottom-left' | 'inside-center';
  tips: string[];
}

const TOUR_STEPS: TourStep[] = [
  {
    title: "Welcome to SPDM!",
    subtitle: "Interactive Walkthrough Guide",
    description: "Welcome to the Spare Part Data Management system! Let's take a quick 1-minute interactive tour. We will walk through each component directly on your screen.",
    icon: <FiCheckCircle className="text-blue-500" size={28} />,
    tips: [
      "Access from any system with real-time cloud sync",
      "Manage client fleets and merged spreadsheets",
      "Instant high-speed remote search across all vessels"
    ]
  },
  {
    title: "Global Multi-Vessel Search",
    subtitle: "Search 100,000+ Parts Instantly",
    description: "Search across all vessels simultaneously. Type part names (e.g. 'Lub. Oil Pipe'), Drawing numbers, or Type specs. The dropdown shows exact matching row counts per vessel.",
    targetId: "tour-search-bar",
    preferredPlacement: "bottom",
    icon: <FiSearch className="text-amber-500" size={28} />,
    tips: [
      "Exact multi-word phrase matching eliminates false results",
      "Live matching row count indicator per vessel",
      "Clicking any vessel dropdown result opens directly to matching rows"
    ]
  },
  {
    title: "Clients & Vessel Hierarchy",
    subtitle: "Organized Fleet Navigation",
    description: "Browse all registered clients and their vessels here in the left sidebar. Click any client to expand its vessels and view or upload its master Excel file.",
    targetId: "tour-sidebar",
    preferredPlacement: "right",
    icon: <FiFolder className="text-emerald-500" size={28} />,
    tips: [
      "Click client to expand/collapse vessel fleet",
      "Vessels highlight in yellow when matching a search query",
      "Clicking a vessel's Excel file opens it immediately"
    ]
  },
  {
    title: "Add Clients & Vessels",
    subtitle: "Expand Your Fleet Anytime",
    description: "Easily register new clients with this '+' button. Hover over any client in the list to add new vessels underneath it.",
    targetId: "tour-add-client",
    preferredPlacement: "right",
    icon: <FiPlus className="text-indigo-500" size={28} />,
    tips: [
      "Add new clients in seconds with a custom name",
      "Organize multiple vessels per client",
      "Delete and management options available on hover"
    ]
  },
  {
    title: "Spreadsheet Viewer & Web Preview",
    subtitle: "Full Cloud Spreadsheet Inspection",
    description: "View entire spreadsheets in high performance. Filter rows instantly, copy row data or storage links, and use 'Web Preview' to view in Microsoft Office for the Web!",
    targetId: "tour-viewer",
    preferredPlacement: "inside-center",
    icon: <FiFileText className="text-purple-500" size={28} />,
    tips: [
      "Renders 16,000+ rows smoothly with sticky headers",
      "Click 'Web Preview' to view in official Microsoft Office",
      "Consecutive row numbering with original Excel row tooltips"
    ]
  },
  {
    title: "Interactive Guide Anytime",
    subtitle: "One-Click Quick Help",
    description: "Whenever you need a refresher or want to show a colleague around the system, just click this 'Guide' button in the top navigation bar!",
    targetId: "tour-guide-btn",
    preferredPlacement: "bottom-left",
    icon: <FiHelpCircle className="text-blue-500" size={28} />,
    tips: [
      "Available anytime from the top navigation bar",
      "Toggle on or off with a single click",
      "Navigate steps with arrow keys (← / →)"
    ]
  }
];

interface ElementRect {
  top: number;
  left: number;
  width: number;
  height: number;
  right: number;
  bottom: number;
}

const OnboardingTour: React.FC<OnboardingTourProps> = ({ isOpen, onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<ElementRect | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Reset to first step whenever reopened
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(0);
    }
  }, [isOpen]);

  const step = TOUR_STEPS[currentStep];
  const isFirst = currentStep === 0;
  const isLast = currentStep === TOUR_STEPS.length - 1;

  // Measure target element rect
  const updateTargetRect = useCallback(() => {
    if (!isOpen || !step.targetId) {
      setTargetRect(null);
      return;
    }

    const el = document.getElementById(step.targetId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
      const rect = el.getBoundingClientRect();
      setTargetRect({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
        right: rect.right,
        bottom: rect.bottom,
      });
    } else {
      setTargetRect(null);
    }
  }, [isOpen, step]);

  useEffect(() => {
    updateTargetRect();

    // Re-check after a brief timeout to allow smooth scroll / render to settle
    const timer = setTimeout(updateTargetRect, 80);

    const handleResizeOrScroll = () => {
      updateTargetRect();
    };

    window.addEventListener('resize', handleResizeOrScroll);
    window.addEventListener('scroll', handleResizeOrScroll, true);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleResizeOrScroll);
      window.removeEventListener('scroll', handleResizeOrScroll, true);
    };
  }, [updateTargetRect, currentStep]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleFinish();
      } else if (e.key === 'ArrowRight' && currentStep < TOUR_STEPS.length - 1) {
        setCurrentStep(prev => prev + 1);
      } else if (e.key === 'ArrowLeft' && currentStep > 0) {
        setCurrentStep(prev => prev - 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentStep]);

  if (!isOpen) return null;

  const handleNext = () => {
    if (isLast) {
      handleFinish();
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (!isFirst) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleFinish = () => {
    localStorage.setItem('spdm_has_seen_tour', 'true');
    onClose();
  };

  // Calculate popover coordinates
  const popoverWidth = Math.min(420, window.innerWidth - 32);
  const popoverEstimatedHeight = 350;
  const padding = 8;
  const margin = 14;

  let popoverTop = (window.innerHeight - popoverEstimatedHeight) / 2;
  let popoverLeft = (window.innerWidth - popoverWidth) / 2;
  let arrowPlacement: 'top' | 'bottom' | 'left' | 'right' | 'none' = 'none';
  let arrowOffset: number | undefined = undefined;

  if (targetRect && step.targetId) {
    const placement = step.preferredPlacement || 'bottom';

    if (placement === 'bottom') {
      popoverTop = targetRect.bottom + padding + margin;
      popoverLeft = targetRect.left + targetRect.width / 2 - popoverWidth / 2;
      arrowPlacement = 'top';
      arrowOffset = popoverWidth / 2;

      // Overflow check: flip to top if needed
      if (popoverTop + popoverEstimatedHeight > window.innerHeight - 16) {
        if (targetRect.top - padding - margin - popoverEstimatedHeight > 16) {
          popoverTop = targetRect.top - padding - margin - popoverEstimatedHeight;
          arrowPlacement = 'bottom';
        }
      }
    } else if (placement === 'right') {
      popoverLeft = targetRect.right + padding + margin;
      popoverTop = targetRect.top + Math.min(targetRect.height / 2, 200) - popoverEstimatedHeight / 2;
      arrowPlacement = 'left';

      // Overflow check: flip to bottom or left if too narrow
      if (popoverLeft + popoverWidth > window.innerWidth - 16) {
        if (targetRect.left - padding - margin - popoverWidth > 16) {
          popoverLeft = targetRect.left - padding - margin - popoverWidth;
          arrowPlacement = 'right';
        } else {
          popoverTop = targetRect.bottom + padding + margin;
          popoverLeft = targetRect.left;
          arrowPlacement = 'top';
        }
      }
    } else if (placement === 'bottom-left') {
      popoverTop = targetRect.bottom + padding + margin;
      popoverLeft = targetRect.right - popoverWidth;
      arrowPlacement = 'top';
      arrowOffset = popoverWidth - targetRect.width / 2;
    } else if (placement === 'inside-center') {
      popoverTop = targetRect.top + Math.max(30, (targetRect.height - popoverEstimatedHeight) / 2);
      popoverLeft = targetRect.left + (targetRect.width - popoverWidth) / 2;
      arrowPlacement = 'none';
    }

    // Viewport boundaries clamping
    popoverLeft = Math.max(16, Math.min(window.innerWidth - popoverWidth - 16, popoverLeft));
    popoverTop = Math.max(16, Math.min(window.innerHeight - popoverEstimatedHeight - 16, popoverTop));
  }

  const spotlightPadding = 6;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* SVG Cutout Mask for Dark Backdrop & Spotlight Hole */}
      <svg className="fixed inset-0 w-full h-full pointer-events-auto cursor-default">
        <defs>
          <mask id="tour-spotlight-mask">
            {/* White covers entire viewport (visible overlay) */}
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {/* Black cuts out hole over target element (transparent hole) */}
            {targetRect && (
              <rect
                x={targetRect.left - spotlightPadding}
                y={targetRect.top - spotlightPadding}
                width={targetRect.width + spotlightPadding * 2}
                height={targetRect.height + spotlightPadding * 2}
                rx="10"
                ry="10"
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(15, 23, 42, 0.78)"
          mask="url(#tour-spotlight-mask)"
          onClick={handleFinish}
        />
      </svg>

      {/* Glowing Pulsing Ring Around the Highlighted Target Element */}
      {targetRect && (
        <div
          style={{
            position: 'fixed',
            left: `${targetRect.left - spotlightPadding}px`,
            top: `${targetRect.top - spotlightPadding}px`,
            width: `${targetRect.width + spotlightPadding * 2}px`,
            height: `${targetRect.height + spotlightPadding * 2}px`,
            transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
          className="rounded-xl border-2 border-blue-400 ring-4 ring-blue-500/30 shadow-[0_0_30px_rgba(59,130,246,0.6)] pointer-events-none z-50 animate-pulse"
        />
      )}

      {/* Floating Popover Tooltip Card */}
      <div
        ref={popoverRef}
        style={{
          position: 'fixed',
          top: `${popoverTop}px`,
          left: `${popoverLeft}px`,
          width: `${popoverWidth}px`,
          transition: 'top 0.25s cubic-bezier(0.16, 1, 0.3, 1), left 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        className="z-50 bg-white rounded-2xl shadow-2xl border border-slate-200/90 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top colored indicator bar */}
        <div className="h-1.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500" />

        {/* Arrow pointer if anchored to a target */}
        {arrowPlacement === 'top' && (
          <div 
            style={{ left: arrowOffset ? `${Math.max(20, Math.min(popoverWidth - 28, arrowOffset))}px` : '50%' }}
            className="absolute -top-2 -translate-x-1/2 w-4 h-4 bg-white border-t border-l border-slate-200 transform rotate-45" 
          />
        )}
        {arrowPlacement === 'bottom' && (
          <div 
            style={{ left: arrowOffset ? `${Math.max(20, Math.min(popoverWidth - 28, arrowOffset))}px` : '50%' }}
            className="absolute -bottom-2 -translate-x-1/2 w-4 h-4 bg-white border-b border-r border-slate-200 transform rotate-45" 
          />
        )}
        {arrowPlacement === 'left' && (
          <div className="absolute -left-2 top-8 w-4 h-4 bg-white border-b border-l border-slate-200 transform rotate-45" />
        )}
        {arrowPlacement === 'right' && (
          <div className="absolute -right-2 top-8 w-4 h-4 bg-white border-t border-r border-slate-200 transform rotate-45" />
        )}

        <div className="p-5">
          {/* Header Row: Step counter & Close button */}
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold px-2.5 py-0.5 bg-blue-50 text-blue-700 rounded-full border border-blue-200 uppercase tracking-wider">
              Step {currentStep + 1} of {TOUR_STEPS.length}
            </span>
            <button
              onClick={handleFinish}
              className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
              title="Close guide (Esc)"
            >
              <FiX size={16} />
            </button>
          </div>

          {/* Title & Icon */}
          <div className="flex items-start gap-3.5 mb-2.5">
            <div className="p-2.5 bg-slate-100 rounded-xl flex-shrink-0 shadow-xs border border-slate-200/60">
              {step.icon}
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 leading-snug">
                {step.title}
              </h3>
              <p className="text-xs font-semibold text-blue-600 mt-0.5">
                {step.subtitle}
              </p>
            </div>
          </div>

          {/* Description */}
          <p className="text-xs text-slate-600 leading-relaxed mb-3">
            {step.description}
          </p>

          {/* Bulleted Feature Highlights */}
          <div className="bg-slate-50 border border-slate-200/70 rounded-xl p-3 mb-4 space-y-1.5">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Key Highlights:
            </span>
            {step.tips.map((tip, idx) => (
              <div key={idx} className="flex items-start gap-2 text-xs text-slate-700 leading-tight">
                <span className="text-emerald-500 font-bold">✓</span>
                <span>{tip}</span>
              </div>
            ))}
          </div>

          {/* Footer Navigation */}
          <div className="flex items-center justify-between pt-2.5 border-t border-slate-100">
            {/* Step Dots */}
            <div className="flex items-center gap-1.5">
              {TOUR_STEPS.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentStep(idx)}
                  className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                    idx === currentStep ? 'w-5 bg-blue-600' : 'w-2 bg-slate-200 hover:bg-slate-300'
                  }`}
                  title={`Jump to step ${idx + 1}`}
                />
              ))}
            </div>

            {/* Navigation Buttons */}
            <div className="flex items-center gap-1.5">
              {!isFirst && (
                <button
                  onClick={handlePrev}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                >
                  <FiArrowLeft size={13} />
                  <span>Back</span>
                </button>
              )}

              <button
                onClick={handleFinish}
                className="px-2.5 py-1.5 text-xs font-medium text-slate-400 hover:text-slate-600 rounded-lg transition-colors cursor-pointer"
              >
                Skip
              </button>

              <button
                onClick={handleNext}
                className="inline-flex items-center gap-1 px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors cursor-pointer"
              >
                <span>{isLast ? "Done" : "Next"}</span>
                <FiArrowRight size={13} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingTour;
