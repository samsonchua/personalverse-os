import React, { useEffect, useRef } from 'react';
import mermaid from 'mermaid';

mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  securityLevel: 'loose',
  fontFamily: 'Inter, sans-serif',
  themeVariables: {
    darkMode: true,
    background: '#0B0F19',
    primaryColor: '#38BDF8',
    secondaryColor: '#8B5CF6',
    tertiaryColor: '#1E293B',
    lineColor: '#94A3B8',
    textColor: '#F8FAFC',
  }
});

interface FlowchartViewerProps {
  chart: string;
  className?: string;
}

export const FlowchartViewer: React.FC<FlowchartViewerProps> = ({ chart, className = '' }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isMounted = true;
    const renderChart = async () => {
      if (containerRef.current) {
        try {
          const id = `mermaid-${Math.random().toString(36).substring(2, 9)}`;
          const { svg } = await mermaid.render(id, chart);
          if (isMounted && containerRef.current) {
            containerRef.current.innerHTML = svg;
          }
        } catch (err) {
          if (isMounted && containerRef.current) {
            containerRef.current.innerHTML = `<pre class="text-xs text-rose-400 p-4">${chart}</pre>`;
          }
        }
      }
    };
    renderChart();
    return () => {
      isMounted = false;
    };
  }, [chart]);

  return (
    <div
      ref={containerRef}
      className={`w-full overflow-x-auto p-4 rounded-xl glass-panel flex justify-center items-center ${className}`}
    />
  );
};
