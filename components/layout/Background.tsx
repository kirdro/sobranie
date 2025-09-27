export function Background() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div className="gradient-orb gradient-orb--left" />
      <div className="gradient-orb gradient-orb--right" />
      <div className="absolute inset-0 backdrop-grid" />
    </div>
  );
}
