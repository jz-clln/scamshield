import { Icon } from "./Icon";

interface AnalyzeButtonProps {
  onClick: () => void;
  loading: boolean;
  disabled: boolean;
}

export function AnalyzeButton({ onClick, loading, disabled }: AnalyzeButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      className="primary-button"
    >
      <Icon name="sparkle" /><span>{loading ? "Analyzing…" : "Analyze message"}</span><Icon name="arrow" />
    </button>
  );
}
