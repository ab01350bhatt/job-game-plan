const stars = Array.from({ length: 28 }, (_, i) => ({
  top: (i * 37) % 60,
  left: (i * 53) % 100,
  delay: (i % 7) * 0.4,
  size: i % 5 === 0 ? 3 : 1.5,
}));

export function Backdrop() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {stars.map((s, i) => (
        <span
          key={i}
          className="absolute rounded-full bg-foreground animate-twinkle"
          style={{ top: `${s.top}%`, left: `${s.left}%`, width: s.size, height: s.size, animationDelay: `${s.delay}s` }}
        />
      ))}
      <div className="glow-blob absolute left-[8%] top-[45%] h-72 w-72" />
      <div className="glow-blob absolute right-[2%] top-[30%] h-80 w-80" />
      <div className="orb absolute -right-16 -top-16 h-72 w-72 animate-floaty" />
      <div className="orb absolute -left-24 bottom-[-6rem] h-80 w-80 animate-floaty" style={{ animationDelay: "2s" }} />
    </div>
  );
}
