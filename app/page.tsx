import Image from 'next/image';
import SupplyHeroModule from './SupplyHeroModule';

const ventures = [
  {
    index: '01',
    title: 'Secret Satoshis',
    label: 'Bitcoin intelligence you can verify',
    description:
      'An AI-native Bitcoin market intelligence platform combining original research, open data, and a long-term market outlook.',
    href: 'https://secretsatoshis.com/',
    cta: 'Explore the platform',
  },
  {
    index: '02',
    title: 'Agent 21',
    label: 'Bitcoin AI agent',
    description:
      'An AI agent for exploring Secret Satoshis research, data, and market frameworks through conversation.',
    href: 'https://chatgpt.com/g/g-BZXtVdU6M-agent-21',
    cta: 'Meet Agent 21',
  },
  {
    index: '03',
    title: 'Bitcoin Chart Library',
    label: 'Open evidence',
    description:
      'Interactive charts for exploring Bitcoin’s price, network activity, supply, and valuation over time.',
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
    title: 'Stay close to real-world use',
    text: 'Stay close to how people and institutions use Bitcoin.',
  },
  {
    number: '03',
    title: 'Create clarity through access',
    text: 'Good research should be open and accessible, helping people examine the evidence and form their own views.',
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
            <p>Trey Brunson is a Bitcoin industry professional with a decade of experience across crypto exchange operations, financial products, and venture capital. Through Secret Satoshis, he shares research and tools that help people understand Bitcoin and explore the evidence for themselves.</p>
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
          <p className="eyebrow">Trey&apos;s perspective on Bitcoin</p>
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
          <h2>Platforms &amp; projects</h2>
          <p>Explore the research and tools behind Secret Satoshis—from market analysis and interactive charts to Agent 21.</p>
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
            <p className="about-lead">Trey got into Bitcoin in college. What started as curiosity at the University of Delaware turned into a decade-long career across the industry—from crypto exchange operations and financial products to working at a crypto venture fund.</p>
            <p>Along the way, he has been fortunate to work at some of the biggest companies in the space, including Blockchain.com, Binance.US, 21Shares, and Tribe Capital.</p>
            <p>Today, Trey brings that experience to <a className="inline-link" href="https://secretsatoshis.com/" target="_blank" rel="noopener noreferrer">Secret Satoshis</a>, where he shares Bitcoin research, open data, and AI tools. The aim is to help friends, family, and other curious readers make sense of Bitcoin and form their own informed views.</p>
            <a className="text-link" href="https://www.linkedin.com/in/trey-brunson" target="_blank" rel="noopener noreferrer">View LinkedIn <span aria-hidden="true">↗</span></a>
          </div>
        </div>
      </section>

      <section className="closing">
        <p className="eyebrow">Interested in connecting?</p>
        <h2>The future of Bitcoin is already here.<br /><em>It&apos;s just not evenly distributed.</em></h2>
        <p className="closing-support">Interested in the research or the work behind Secret Satoshis? Connect with Trey on LinkedIn.</p>
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
