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
      className="w-full rounded-xl bg-dagat text-white font-display font-medium py-3.5 transition-colors hover:bg-dagat-dark disabled:opacity-40 disabled:cursor-not-allowed"
    >
      {loading ? "Analyzing..." : "Analyze message"}
    </button>
  );
}
