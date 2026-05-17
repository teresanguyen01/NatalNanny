import { Link } from "react-router-dom";
import logo from "../assets/logo.png";
import heartsCappy from "../assets/hearts.png";
import measureHeartCappy from "../assets/measure_heart_cappy.png";
import signalCappy from "../assets/signal_cappy.png";

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
          className="rounded-xl bg-nn-deep-blue px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-nn-deep-blue-hover transition-colors"
        >
          Open app
        </Link>
      </header>

      {/* Hero */}
      <main className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <div className="max-w-2xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-nn-soft-blue px-4 py-2">
            <img src={logo} alt="NatalNanny" className="h-4 w-4 rounded-md object-cover" />
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
            heart rate and respiratory rate. No wearables required! Stay
            connected with your care team and notice changes earlier!
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/dashboard"
              className="rounded-xl bg-nn-deep-blue px-8 py-4 text-base font-semibold text-white shadow-sm hover:bg-nn-deep-blue-hover transition-colors"
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
              <img
                src={heartsCappy}
                alt="rPPG Vitals"
                className="h-full w-full object-cover rounded-2xl"
              />
            ),
            title: "rPPG Vitals Monitoring",
            desc: "Camera-based heart rate and breathing estimation — no patches, no wearables, no hassle.",
          },
          {
            icon: (
              <img
                src={measureHeartCappy}
                alt="Care Team Messaging"
                className="h-full w-full object-cover rounded-2xl"
              />
            ),
            title: "Care Team Messaging",
            desc: "Direct messaging with your OB, midwife, or doula — with one-tap checkup summaries.",
          },
          {
            icon: (
              <img
                src={signalCappy}
                alt="AI Wellness Companion"
                className="h-full w-full object-cover rounded-2xl"
              />
            ),
            title: "AI Wellness Companion",
            desc: "NatalNanny AI summarizes your checkup history and care notes — not a diagnosis, just support.",
          },
        ].map(({ icon, title, desc }) => (
          <div key={title} className="rounded-3xl bg-white p-6 shadow-sm">
            <div className="mb-3 h-12 w-12 overflow-hidden rounded-2xl">
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
