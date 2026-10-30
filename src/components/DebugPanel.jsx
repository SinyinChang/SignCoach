export default function DebugPanel({ feedback, visible }) {
  if (!visible || !feedback) return null;

  const lines = [];
  lines.push(`Source: ${feedback.source}`);
  lines.push(`Sign: ${feedback.signId}`);
  if (feedback.meta) {
    lines.push(`Usable frames: ${feedback.meta.usableFrames ?? '—'}`);
    lines.push(`Raw frames: ${feedback.meta.totalRawFrames ?? '—'}`);
  }
  lines.push('');

  for (const [key, result] of Object.entries(feedback.components || {})) {
    lines.push(`=== ${key} ===`);
    lines.push(`Status: ${result.status}`);
    lines.push(`Message: ${result.message}`);
    if (result.debug) {
      for (const [dk, dv] of Object.entries(result.debug)) {
        const value = typeof dv === 'number' ? Number(dv.toFixed?.(3) ?? dv) : dv;
        lines.push(`${dk}: ${typeof value === 'object' ? JSON.stringify(value) : value}`);
      }
    }
    lines.push('');
  }

  return (
    <aside className="debug-panel" aria-label="Developer debug details">
      <h3>Debug: calculated features</h3>
      <pre>{lines.join('\n')}</pre>
    </aside>
  );
}
