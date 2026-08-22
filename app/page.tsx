import Image from 'next/image';
import SupplyHeroModule from './SupplyHeroModule';

const ventures = [
  {
    index: '01',
    title: 'Secret Satoshis',
    label: 'AI-native Bitcoin market intelligence',
    description:
      'An AI-native Bitcoin market intelligence platform built on open data, original analysis, and more than a decade inside Bitcoin markets.',
    href: 'https://secretsatoshis.com/',
    cta: 'Explore the platform',
  },
  {
    index: '02',
    title: 'Agent 21',
    label: 'Bitcoin AI agent',
    description:
      'The AI-native interface to the Secret Satoshis research, built on live on-chain data and current Bitcoin network state.',
    href: 'https://chatgpt.com/g/g-BZXtVdU6M-agent-21',
    cta: 'Meet Agent 21',
  },
  {
    index: '03',
    title: 'Bitcoin Chart Library',
    label: 'Open evidence',
    description:
      'A searchable library of interactive charts for exploring Bitcoin through market cycles, valuation, network data, and performance.',
    href: 'https://charts.secretsatoshis.com/',
    cta: 'View the library',
  },
];

const principles = [
  {
    number: '01',
    title: 'Think in decades',
    text: "Focus on first principles and Bitcoin's long-term growth—not short-term narratives.",
  },
  {
    number: '02',
    title: 'Stay close to the foundation',
    text: 'The clearest understanding comes from operating at the core of where users, investors, and institutions actually leverage the technology.',
  },
  {
    number: '03',
    title: 'Create clarity through access',
    text: 'Good research should be open and accessible, helping people form their own informed opinions and perspectives.',
  },
];

export default function Home() {
  const currentYear = new Date().getFullYear();

  return (
    <>
      <a className="skip-link" href="#main-content">Skip to content</a>
      <header className="site-header">
        <div className="header-inner">
          <a className="wordmark" href="#top" aria-label="Trey Brunson home">
            Trey Brunson<span aria-hidden="true">.</span>
          </a>
          <nav className="header-links" aria-label="External links">
            <a href="https://www.linkedin.com/in/trey-brunson" target="_blank" rel="noopener noreferrer">LinkedIn <span aria-hidden="true">↗</span></a>
            <a href="https://secretsatoshis.com/" target="_blank" rel="noopener noreferrer">Secret Satoshis <span aria-hidden="true">↗</span></a>
          </nav>
        </div>
      </header>

      <main id="main-content">
        <section className="hero" id="top">
        <div className="hero-grid" aria-hidden="true" />
        <div className="hero-inner">
          <h1 className="hero-title reveal-item">
            Focused on <em>Bitcoin</em> and its growing role in the world since 2016.
          </h1>
          <div className="hero-bottom reveal-item">
            <p>Trey Brunson is a professional in the Bitcoin industry with a decade of experience spanning exchange operations, institutional financial products, and venture capital.</p>
            <div className="hero-actions">
              <a className="button button-primary" href="#work">Explore the work <span aria-hidden="true">↓</span></a>
              <a className="button button-secondary" href="#about">About Trey</a>
            </div>
          </div>
          <SupplyHeroModule />
          <div className="hero-foot">
            <span>Experience across</span>
            <div className="company-list" aria-label="Selected companies">
              <strong>Blockchain.com</strong><i aria-hidden="true" /><strong>Grant Thornton</strong><i aria-hidden="true" /><strong>Binance.US</strong><i aria-hidden="true" /><strong>21Shares</strong><i aria-hidden="true" /><strong>Tribe Capital</strong>
            </div>
          </div>
        </div>
      </section>

      <section className="perspective section-shell" id="perspective">
        <div className="section-label"><span>01</span>Bitcoin perspective</div>
        <div className="perspective-lead">
          <p className="eyebrow">Our thesis on Bitcoin</p>
          <h2>
            <span>Bitcoin&apos;s importance will be understood over <em>decades</em>, not market cycles.</span>
            <span className="thesis-second">Its impact grows as the technology becomes more <em>useful and accessible</em>, and embedded in everyday financial life.</span>
          </h2>
        </div>
        <div className="principles">
          {principles.map((principle) => (
            <article className="principle" key={principle.number}>
              <span>{principle.number}</span><h3>{principle.title}</h3><p>{principle.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="work section-shell" id="work">
        <div className="section-label light-label"><span>02</span>Selected work</div>
        <div className="work-intro">
          <p className="eyebrow">Platforms &amp; projects</p>
          <h2>Making Bitcoin easier to understand.</h2>
          <p>Research, tools, and open frameworks designed to make Bitcoin more approachable, accessible, and useful.</p>
        </div>
        <div className="venture-list">
          {ventures.map((venture) => (
            <a className="venture-card" href={venture.href} target="_blank" rel="noopener noreferrer" key={venture.index}>
              <span className="venture-index">{venture.index}</span>
              <div><p className="venture-label">{venture.label}</p><h3>{venture.title}</h3></div>
              <p className="venture-description">{venture.description}</p>
              <span className="venture-link">{venture.cta} <b aria-hidden="true">↗</b></span>
            </a>
          ))}
        </div>
      </section>

      <section className="about section-shell" id="about">
        <div className="section-label"><span>03</span>About</div>
        <div className="about-grid">
          <figure className="portrait-wrap">
            <Image className="portrait" src="/trey-headshot.webp" alt="Portrait of Trey Brunson" width={1213} height={1818} sizes="(max-width: 760px) 100vw, (max-width: 1000px) 76vw, 42vw" />
            <figcaption><span>New York</span><span>Focused on Bitcoin since 2016</span></figcaption>
          </figure>
          <div className="about-copy">
            <p className="eyebrow">About Trey</p>
            <h2>A decade working across the Bitcoin industry.</h2>
            <p className="about-lead">Trey got into Bitcoin in college. What started as curiosity at the University of Delaware turned into a decade-long career across the industry—from crypto exchange operations and institutional financial products to working at a crypto venture fund.</p>
            <p>Along the way, he has been fortunate to work at some of the biggest companies in the space, including Blockchain.com, Binance.US, 21Shares, and Tribe Capital. This site is a place to share what he has learned and help friends, family, and anyone trying to make sense of a complex, fast-moving industry.</p>
            <p>Today, that work is centered on <a className="inline-link" href="https://secretsatoshis.com/" target="_blank" rel="noopener noreferrer">Secret Satoshis</a>—an open, verifiable, AI-native Bitcoin market intelligence platform. The goal is simple: use open-source research and accessible AI tools to make Bitcoin easier to understand, easier to access, and easier for people to explore on their own terms.</p>
            <a className="text-link" href="https://www.linkedin.com/in/trey-brunson" target="_blank" rel="noopener noreferrer">View LinkedIn <span aria-hidden="true">↗</span></a>
          </div>
        </div>
      </section>

      <section className="closing">
        <p className="eyebrow">Interested in connecting?</p>
        <h2>The future of Bitcoin is already here.<br /><em>It&apos;s just not evenly distributed.</em></h2>
        <div className="closing-links">
          <a className="button button-primary" href="https://www.linkedin.com/in/trey-brunson" target="_blank" rel="noopener noreferrer">Connect on LinkedIn <span aria-hidden="true">↗</span></a>
        </div>
      </section>
      </main>

      <footer className="site-footer">
        <a className="supply-mark" href="#top" aria-label="Back to top"><strong>∞</strong><span>/ 21 Million</span></a>
        <p>Trey Brunson</p>
        <span className="copyright">© {currentYear}</span>
      </footer>
    </>
  );
}
