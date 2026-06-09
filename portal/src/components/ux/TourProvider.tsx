'use client';

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import dynamic from 'next/dynamic';
import { STATUS, type Step, type EventData, type TooltipRenderProps } from 'react-joyride';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

const Joyride = dynamic(() => import('react-joyride').then(m => m.Joyride), { ssr: false });

const TOUR_STEPS: Step[] = [
  {
    target: '[data-tour="dashboard"]',
    title: 'Your Dashboard',
    content: 'See your inspection stats at a glance — total inspections, published reports, and monthly activity.',
    placement: 'bottom',
    skipBeacon: true,
  },
  {
    target: '[data-tour="inspections"]',
    title: 'Your Inspections',
    content: 'Browse all inspections created from the mobile app. Filter by status, search by address, and view details.',
    placement: 'bottom',
    skipBeacon: true,
  },
  {
    target: '[data-tour="reports"]',
    title: 'Published Reports',
    content: 'View completed reports, copy shareable links, and send them to your clients directly.',
    placement: 'bottom',
    skipBeacon: true,
  },
  {
    target: '[data-tour="templates"]',
    title: 'Checklist Templates',
    content: 'Review the inspection checklists available for your inspections. Templates are managed from the mobile app.',
    placement: 'bottom',
    skipBeacon: true,
  },
  {
    target: '[data-tour="settings"]',
    title: 'Your Settings',
    content: 'View your profile, firm membership, and account details. You can also replay this tour from here anytime.',
    placement: 'bottom',
    skipBeacon: true,
  },
];

function TourTooltip({
  backProps,
  continuous,
  index,
  isLastStep,
  primaryProps,
  skipProps,
  step,
  tooltipProps,
}: TooltipRenderProps) {
  return (
    <div
      {...tooltipProps}
      className="w-80 rounded-lg border border-border bg-card shadow-lg"
    >
      <div className="flex items-start justify-between border-b border-border px-4 py-3">
        <h3 className="font-heading text-sm font-600 text-foreground">{step.title}</h3>
        <button {...skipProps} className="ml-2 text-muted-foreground hover:text-foreground transition-colors" aria-label="Close tour">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="px-4 py-3">
        <p className="text-sm leading-relaxed text-muted-foreground">{step.content}</p>
      </div>
      <div className="flex items-center justify-between border-t border-border px-4 py-3">
        <span className="text-xs text-muted-foreground">{index + 1} of {TOUR_STEPS.length}</span>
        <div className="flex items-center gap-2">
          {index > 0 && (
            <button
              {...backProps}
              className="flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
            >
              <ChevronLeft className="h-3 w-3" />
              Back
            </button>
          )}
          {continuous && (
            <button
              {...primaryProps}
              className="flex items-center gap-1 rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-accent-foreground transition-colors hover:brightness-110"
            >
              {isLastStep ? 'Finish' : 'Next'}
              {!isLastStep && <ChevronRight className="h-3 w-3" />}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

interface TourContextType {
  startTour: () => void;
  isTourRunning: boolean;
}

const TourContext = createContext<TourContextType>({ startTour: () => {}, isTourRunning: false });

export function useTour() {
  return useContext(TourContext);
}

export function TourProvider({ children }: { children: ReactNode }) {
  const [run, setRun] = useState(false);

  useEffect(() => {
    const pending = localStorage.getItem('inspectly-tour-pending');
    if (pending === 'true') {
      localStorage.removeItem('inspectly-tour-pending');
      const timer = setTimeout(() => setRun(true), 700);
      return () => clearTimeout(timer);
    }
  }, []);

  const startTour = useCallback(() => {
    localStorage.removeItem('inspectly-tour-completed');
    setRun(true);
  }, []);

  const handleEvent = useCallback((data: EventData) => {
    if (data.status === STATUS.FINISHED || data.status === STATUS.SKIPPED) {
      setRun(false);
      localStorage.setItem('inspectly-tour-completed', 'true');
    }
  }, []);

  return (
    <TourContext.Provider value={{ startTour, isTourRunning: run }}>
      {children}
      <Joyride
        steps={TOUR_STEPS}
        run={run}
        continuous
        scrollToFirstStep
        tooltipComponent={TourTooltip}
        onEvent={handleEvent}
        options={{ buttons: ['back', 'primary', 'skip'] }}
        locale={{ back: 'Back', close: 'Close', last: 'Finish', next: 'Next', skip: 'Skip' }}
      />
    </TourContext.Provider>
  );
}
