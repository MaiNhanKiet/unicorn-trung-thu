export function PageLoading({ label = "Đang tải…" }: { label?: string }) {
  return (
    <div className="page-loading" role="status" aria-live="polite">
      <div className="page-loading__inner">
        <span className="page-spinner" aria-hidden="true" />
        <p className="page-loading__label">{label}</p>
      </div>
    </div>
  );
}
