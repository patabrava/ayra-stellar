import { Info } from "lucide-react";

type MetricTooltipProps = {
  label: string;
  description: string;
};

export function MetricTooltip({ label, description }: MetricTooltipProps) {
  const id = `metric-help-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

  return (
    <span className="metric-tooltip">
      <button
        aria-describedby={id}
        aria-label={`More information about ${label}`}
        className="metric-tooltip-trigger"
        type="button"
      >
        <Info aria-hidden="true" className="h-3.5 w-3.5" />
      </button>
      <span className="metric-tooltip-content" id={id} role="tooltip">
        {description}
      </span>
    </span>
  );
}
