import Link from "next/link";

export default function Page() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Fullscreen background video */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover z-0"
      >
        <source
          src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260314_131748_f2ca2a28-fed7-44c8-b9a9-bd9acdd5ec31.mp4"
          type="video/mp4"
        />
      </video>

      {/* Navigation */}
      <nav className="relative z-10 flex items-center justify-between px-8 py-6 max-w-7xl mx-auto">
        <Link
          href="/"
          className="text-3xl tracking-tight text-foreground"
          style={{ fontFamily: "'Instrument Serif', serif" }}
        >
          GitDrip<sup className="text-xs">®</sup>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          <Link href="/" className="text-sm text-foreground transition-colors">
            Home
          </Link>
          <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Dashboard
          </Link>
          <Link href="/register" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Register
          </Link>
          <Link href="/claim" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Claim
          </Link>
          <Link href="/vs" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Compare
          </Link>
        </div>

        <Link
          href="/register"
          className="liquid-glass rounded-full px-6 py-2.5 text-sm text-foreground hover:scale-[1.03] transition-transform"
        >
          Trust the Consensus
        </Link>
      </nav>

      {/* Hero Section */}
      <main>
      <section className="relative z-10 flex flex-col items-center justify-center text-center px-6 pt-32 pb-40 py-[90px]">
        <h1
          className="text-5xl sm:text-7xl md:text-8xl leading-[0.95] tracking-[-2.46px] max-w-7xl font-normal animate-fade-rise"
          style={{ fontFamily: "'Instrument Serif', serif" }}
        >
          Where the{" "}
          <em className="not-italic text-muted-foreground">chain</em>{" "}
          reads{" "}
          <em className="not-italic text-muted-foreground">
            code.
          </em>
        </h1>

        <p className="text-muted-foreground text-base sm:text-lg max-w-2xl mt-8 leading-relaxed animate-fade-rise-delay">
          An intelligent contract on GenLayer fetches your commits, scores
          their substance through LLM consensus, and splits the sponsor pool.
          The receipt is on-chain. The judgment is auditable.
        </p>

        <Link
          href="/register"
          className="liquid-glass rounded-full px-14 py-5 text-base text-foreground mt-12 hover:scale-[1.03] transition-transform cursor-pointer animate-fade-rise-delay-2"
        >
          Trust the Consensus
        </Link>
      </section>
      </main>

      {/* Bottom-right link cluster */}
      <div className="absolute bottom-6 right-6 md:bottom-8 md:right-8 z-10 flex items-center gap-5 md:gap-6">
        <a
          href="https://docs.genlayer.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs md:text-sm text-muted-foreground hover:text-foreground transition-colors underline-offset-4 hover:underline"
          aria-label="GenLayer documentation"
        >
          build with genlayer
        </a>
        <a
          href="https://github.com/YoneCode/GitDrip"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="GitDrip source on GitHub"
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <GithubLogo className="w-5 h-5" />
        </a>
        <a
          href="https://github.com/genlayerlabs/"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="GenLayer Labs on GitHub"
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <GithubLogo className="w-5 h-5" />
        </a>
        <a
          href="https://x.com/yonecode"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="@yonecode on X"
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <XLogo className="w-[18px] h-[18px]" />
        </a>
      </div>
    </div>
  );
}

function XLogo({ className = "" }: { className?: string }) {
  // Official X brand mark, simplified single-path.
  return (
    <svg
      viewBox="0 0 1200 1227"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      className={className}
      fill="currentColor"
    >
      <path d="M714.163 519.284 1160.89 0h-105.86L667.137 450.887 357.328 0H0l468.492 681.821L0 1226.37h105.866l409.625-476.152 327.181 476.152H1200L714.137 519.284h.026ZM569.165 687.828l-47.468-67.894-377.686-540.24h162.604l304.797 435.991 47.468 67.894 396.2 566.721H892.476L569.165 687.854v-.026Z" />
    </svg>
  );
}

function GithubLogo({ className = "" }: { className?: string }) {
  // Official GitHub Octocat mark.
  return (
    <svg
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      className={className}
      fill="currentColor"
    >
      <path d="M12 0C5.37 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.6.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.84 1.236 1.84 1.236 1.07 1.835 2.807 1.305 3.492.998.108-.776.418-1.305.762-1.604-2.665-.305-5.466-1.334-5.466-5.93 0-1.31.467-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.5 11.5 0 0 1 12 5.803a11.5 11.5 0 0 1 3.003.404c2.291-1.552 3.297-1.23 3.297-1.23.653 1.652.242 2.873.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.804 5.624-5.475 5.921.43.371.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.796 24 17.299 24 12 24 5.373 18.627 0 12 0Z" />
    </svg>
  );
}
