export function SocialProof() {
  const stats = [
    { value: "50,000+", label: "Jobs Applied" },
    { value: "12,000+", label: "Users" },
    { value: "89%", label: "Interview Rate" },
    { value: "4.9★", label: "User Rating" },
  ];

  return (
    <section className="border-y border-border bg-muted/30 py-12">
      <div className="mx-auto max-w-6xl px-4">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-3xl font-bold text-primary">{stat.value}</div>
              <div className="mt-1 text-sm text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
