import { Link } from "react-router-dom";
import logo from "../assets/logo.png";

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-nn-pale-sky via-white to-nn-mist">
      {/* Header */}
      <header className="flex items-center justify-between px-8 py-5">
        <div className="flex items-center gap-3">
          <img
            src={logo}
            alt="NatalNanny logo"
            className="h-9 w-9 rounded-xl object-contain shadow-sm"
          />
          <span className="text-lg font-bold tracking-tight text-nn-navy">
            NatalNanny
          </span>
        </div>
        <Link
          to="/dashboard"
          className="rounded-xl bg-nn-deep-blue px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-nn-navy-light transition-colors"
        >
          Open app
        </Link>
      </header>

      {/* Hero */}
      <main className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <div className="max-w-2xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-nn-soft-blue px-4 py-2">
            <svg viewBox="0 0 16 16" fill="#4663ac" className="h-3.5 w-3.5">
              <path d="M8 1.5a.5.5 0 0 1 .447.276l1.25 2.535 2.797.407a.5.5 0 0 1 .278.852L10.75 7.54l.477 2.784a.5.5 0 0 1-.725.527L8 9.773 5.498 10.85a.5.5 0 0 1-.725-.527l.477-2.784L3.228 5.57a.5.5 0 0 1 .278-.852l2.797-.407 1.25-2.535A.5.5 0 0 1 8 1.5Z" />
            </svg>
            <span className="text-xs font-semibold text-nn-deep-blue">
              Voice-first · AI-assisted · rPPG powered
            </span>
          </div>

          <h1 className="mb-5 text-5xl font-bold tracking-tight text-nn-navy">
            Pregnancy wellness,{" "}
            <span className="text-nn-deep-blue">every single day</span>
          </h1>
          <p className="mb-8 text-lg text-nn-navy-light leading-relaxed">
            NatalNanny uses your webcam and remote photoplethysmography to track
            heart rate and respiratory rate — no wearable required. Stay
            connected with your care team and notice changes earlier.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/dashboard"
              className="rounded-xl bg-nn-deep-blue px-8 py-4 text-base font-semibold text-white shadow-sm hover:bg-nn-navy-light transition-colors"
            >
              Try the demo
            </Link>
            <a
              href="#features"
              className="rounded-xl border border-nn-periwinkle bg-white px-8 py-4 text-base font-semibold text-nn-navy hover:bg-nn-pale-sky transition-colors"
            >
              Learn more
            </a>
          </div>
        </div>
      </main>

      {/* Feature grid */}
      <section
        id="features"
        className="mx-auto grid max-w-4xl grid-cols-1 gap-5 px-6 pb-20 sm:grid-cols-3"
      >
        {[
          {
            icon: (
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="#4663ac"
                strokeWidth="1.6"
                className="h-7 w-7"
              >
                <path d="M12 21S3 15 3 9a5 5 0 0 1 9-3A5 5 0 0 1 21 9c0 6-9 12-9 12Z" />
              </svg>
            ),
            title: "rPPG Vitals Monitoring",
            desc: "Camera-based heart rate and breathing estimation — no patches, no wearables, no hassle.",
          },
          {
            icon: (
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="#4663ac"
                strokeWidth="1.6"
                className="h-7 w-7"
              >
                <path
                  d="M21 13.5C21 18.19 16.97 22 12 22c-1.38 0-2.69-.3-3.85-.84L3 22l1.38-4.65A9.46 9.46 0 0 1 3 13.5C3 8.81 7.03 5 12 5s9 3.81 9 8.5Z"
                  strokeLinejoin="round"
                />
              </svg>
            ),
            title: "Care Team Messaging",
            desc: "Direct messaging with your OB, midwife, or doula — with one-tap checkup summaries.",
          },
          {
            icon: (
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="#4663ac"
                strokeWidth="1.6"
                className="h-7 w-7"
              >
                <path d="M12 2a1 1 0 0 1 .894.553l2.5 5.067 5.59.813a1 1 0 0 1 .555 1.705l-4.045 3.943.955 5.566a1 1 0 0 1-1.45 1.054L12 18.347l-4.999 2.354a1 1 0 0 1-1.45-1.054l.955-5.566L2.461 10.138a1 1 0 0 1 .555-1.705l5.59-.813L11.106 2.553A1 1 0 0 1 12 2Z" />
              </svg>
            ),
            title: "AI Wellness Companion",
            desc: "NatalNanny AI summarizes your checkup history and care notes — not a diagnosis, just support.",
          },
        ].map(({ icon, title, desc }) => (
          <div key={title} className="rounded-3xl bg-white p-6 shadow-sm">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-nn-pale-sky">
              {icon}
            </div>
            <h3 className="mb-1.5 font-semibold text-nn-navy">{title}</h3>
            <p className="text-sm text-nn-navy-light leading-relaxed">{desc}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
