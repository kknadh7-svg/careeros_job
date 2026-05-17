const faqs = [
  {
    q: "How does the AI resume tailoring work?",
    a: "Our AI analyzes the job description and rewrites your resume to mirror the language and keywords the ATS is looking for, while keeping your experience accurate.",
  },
  {
    q: "Is the auto-apply feature safe?",
    a: "Yes. The browser automation fills in application forms but never submits without your explicit approval. You review every application before it goes out.",
  },
  {
    q: "Which job boards does CareerOS aggregate?",
    a: "We pull from LinkedIn, Indeed, Greenhouse, Lever, Workday, and 10+ other boards, updated every 6 hours.",
  },
  {
    q: "What AI models power CareerOS?",
    a: "GPT-4o is our primary model with automatic fallback to Claude Sonnet and Groq Llama3 for reliability.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes, cancel anytime from your account settings. You keep access until the end of your billing period.",
  },
];

export function FAQSection() {
  return (
    <section className="py-24">
      <div className="mx-auto max-w-3xl px-4">
        <h2 className="mb-12 text-center text-3xl font-bold">Frequently Asked Questions</h2>
        <div className="space-y-6">
          {faqs.map((faq) => (
            <div key={faq.q} className="rounded-lg border border-border p-6">
              <h3 className="font-semibold">{faq.q}</h3>
              <p className="mt-2 text-muted-foreground">{faq.a}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
