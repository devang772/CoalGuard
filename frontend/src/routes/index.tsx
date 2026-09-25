import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Activity,
  AlertTriangle,
  ArrowDown,
  ArrowRight,
  BrainCircuit,
  Check,
  ChevronRight,
  CircleDot,
  ClipboardCheck,
  Crosshair,
  Database,
  FileScan,
  Gauge,
  Layers3,
  LocateFixed,
  LockKeyhole,
  Map,
  Menu,
  Mountain,
  Orbit,
  Play,
  Radar,
  Satellite,
  ScanLine,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Upload,
  X,
  Zap,
} from "lucide-react";
import { useEffect, useState, useRef, type ReactNode } from "react";
import heroMine from "../assets/coalguard-mine-hero.jpg";
import twinMine from "../assets/coalguard-digital-twin.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CoalGuard — AI Mine Intelligence Platform" },
      {
        name: "description",
        content:
          "CoalGuard unifies AI, computer vision, geospatial intelligence and digital twins for safer, compliant mining operations.",
      },
      { property: "og:title", content: "CoalGuard — Intelligence for Safer Mines" },
      {
        property: "og:description",
        content: "AI-powered governance, safety and compliance intelligence for modern coal mines.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CoalGuard,
});

const navItems = [
  ["Platform", "platform"],
  ["AI Intelligence", "ai-intelligence"],
  ["GIS & Digital Twin", "digital-twin"],
  ["Compliance", "compliance"],
  ["Impact", "impact"],
  ["About", "about"],
];

const capabilities = [
  { icon: FileScan, title: "AI Document Intelligence", text: "Extract and understand critical mine documents." },
  { icon: Radar, title: "Real-Time Monitoring", text: "Continuously monitor field conditions and incidents." },
  { icon: Layers3, title: "GIS & 3D Digital Twin", text: "Visualize mine terrain, assets and risk zones." },
  { icon: ClipboardCheck, title: "Automated Compliance", text: "AI-assisted regulatory and compliance analysis." },
  { icon: AlertTriangle, title: "Predictive Risk Alerts", text: "Identify potential risks before they become incidents." },
];

const metrics = [
  ["24+", "Mines Onboarded"],
  ["10K+", "Inspections Processed"],
  ["98%", "Compliance Visibility"],
  ["40%", "Faster Issue Resolution"],
  ["24/7", "Intelligent Monitoring"],
];

const aiFlow = ["Document AI", "OCR", "Knowledge Engine", "RAG", "Compliance Intelligence", "Risk Engine", "Decision Support"];

function BrandMark() {
  return (
    <span className="brand-mark" aria-hidden="true">
      <ShieldCheck size={23} strokeWidth={1.8} />
      <span className="brand-node" />
    </span>
  );
}

function ActionLink({ children, href = "#platform", secondary = false }: { children: ReactNode; href?: string; secondary?: boolean }) {
  return (
    <a className={secondary ? "action-link action-secondary" : "action-link action-primary"} href={href}>
      {children}
    </a>
  );
}

function SectionIntro({ eyebrow, title, text }: { eyebrow: string; title: string; text: string }) {
  return (
    <div className="section-intro">
      <span className="eyebrow"><span />{eyebrow}</span>
      <h2>{title}</h2>
      <p>{text}</p>
    </div>
  );
}

function MineOverlay({ expanded = false }: { expanded?: boolean }) {
  return (
    <div className={expanded ? "mine-visual mine-visual-expanded" : "mine-visual"}>
      <img src={expanded ? twinMine : heroMine} alt="Open-pit coal mine represented as a monitored digital twin" width={expanded ? 1600 : 1920} height={expanded ? 1000 : 1080} />
      <div className="mine-vignette" />
      <div className="terrain-grid" />
      <div className="contour contour-one" />
      <div className="contour contour-two" />
      <div className="geo-boundary" />
      <div className="scan-beam" />
      <div className="radar-ring radar-a" />
      <div className="radar-ring radar-b" />
      <div className="risk-pin risk-high"><span />HIGH</div>
      <div className="risk-pin risk-medium"><span />MEDIUM</div>
      <div className="risk-pin risk-low"><span />LOW</div>
      <div className="map-coordinates">23.7957° N / 86.4304° E<br />ELEV 184.3 M</div>
      <div className="map-status"><span className="live-dot" /> LIVE TERRAIN SYNC</div>
    </div>
  );
}

function ScrollReveal({ children, className = "", delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          node.classList.add("in-view");
        }
      },
      { threshold: 0.15 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={`reveal-on-scroll ${delay ? `reveal-delay-${delay}` : ""} ${className}`}>
      {children}
    </div>
  );
}

function AnimatedMetric({ targetValue, label, delayIndex = 0 }: { targetValue: string; label: string; delayIndex?: number }) {
  const [displayValue, setDisplayValue] = useState("0");
  const [hasAnimated, setHasAnimated] = useState(false);
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = elementRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated) {
          setHasAnimated(true);
          node.classList.add("in-view");

          let startTimestamp: number | null = null;
          const duration = 1800;

          if (targetValue === "24/7") {
            const step = (timestamp: number) => {
              if (!startTimestamp) startTimestamp = timestamp;
              const progress = Math.min((timestamp - startTimestamp) / duration, 1);
              const num = Math.floor((1 - Math.pow(1 - progress, 3)) * 24);
              setDisplayValue(`${num}/7`);
              if (progress < 1) requestAnimationFrame(step);
            };
            requestAnimationFrame(step);
            return;
          }

          const numericPart = parseInt(targetValue.replace(/[^0-9]/g, ""), 10) || 0;
          const isK = targetValue.includes("K");
          const isPercent = targetValue.includes("%");
          const isPlus = targetValue.includes("+");

          const step = (timestamp: number) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            const easeProgress = 1 - Math.pow(1 - progress, 3);
            const currentNum = Math.floor(easeProgress * numericPart);

            let formatted = `${currentNum}`;
            if (isK) formatted += "K";
            if (isPercent) formatted += "%";
            if (isPlus) formatted += "+";

            setDisplayValue(formatted);
            if (progress < 1) requestAnimationFrame(step);
          };

          requestAnimationFrame(step);
        }
      },
      { threshold: 0.25 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [targetValue, hasAnimated]);

  return (
    <div
      ref={elementRef}
      className={`metric reveal-on-scroll reveal-delay-${delayIndex + 1}`}
    >
      <strong>{hasAnimated ? displayValue : "0"}</strong>
      <span>{label}</span>
    </div>
  );
}

function CoalGuard() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [mapMode, setMapMode] = useState("3D View");
  const [demoOpen, setDemoOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [navHidden, setNavHidden] = useState(false);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const onScroll = () => {
      const currentScrollY = window.scrollY;
      setScrolled(currentScrollY > 30);

      if (currentScrollY > 120 && currentScrollY > lastScrollY.current + 10) {
        setNavHidden(true);
      } else if (currentScrollY < lastScrollY.current - 8 || currentScrollY <= 60) {
        setNavHidden(false);
      }

      lastScrollY.current = currentScrollY;
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const headerClass = [
    "site-header",
    scrolled ? "header-scrolled" : "",
    navHidden && !menuOpen ? "header-hidden" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <main>
      <header className={headerClass}>
        <a className="brand" href="#home" aria-label="CoalGuard home"><BrandMark /><span>Coal<span>Guard</span></span></a>
        <nav className="desktop-nav" aria-label="Primary navigation">
          {navItems.map(([label, id]) => <a key={id} href={`#${id}`}>{label}</a>)}
          <Link to="/dashboard">Dashboard</Link>
        </nav>
        <div className="nav-actions">
          <Link to="/login" className="login-link">Login</Link>
          <Link to="/login" className="action-link action-primary">Open Dashboard <ArrowRight size={15} /></Link>
        </div>
        <button className="menu-button" aria-label="Toggle navigation" onClick={() => setMenuOpen((value) => !value)}>
          {menuOpen ? <X /> : <Menu />}
        </button>
        {menuOpen && (
          <nav className="mobile-nav" aria-label="Mobile navigation">
            {navItems.map(([label, id]) => <a key={id} href={`#${id}`} onClick={() => setMenuOpen(false)}>{label}</a>)}
            <Link to="/dashboard" onClick={() => setMenuOpen(false)}>Dashboard</Link>
            <Link to="/login" onClick={() => setMenuOpen(false)}>Login</Link>
          </nav>
        )}
      </header>

      <section id="home" className="hero">
        <div className="hero-background"><img src={heroMine} alt="Coal mine at dusk" width={1920} height={1080} /><div /></div>
        <div className="hero-grid">
          <div className="hero-copy">
            <span className="eyebrow"><span />AI-POWERED MINE INTELLIGENCE</span>
            <h1>Intelligence for<br /><strong>Safer Mines.</strong></h1>
            <p className="hero-tagline">AI-Driven Governance for a Smarter, Safer Future.</p>
            <p className="hero-description">CoalGuard combines Artificial Intelligence, Computer Vision, Geospatial Intelligence and Real-Time Field Intelligence to transform mine safety, compliance and operational governance.</p>
            <div className="hero-actions">
              <ActionLink>Explore CoalGuard <ArrowRight size={16} /></ActionLink>
              <button className="demo-button" onClick={() => setDemoOpen(true)}><span><Play size={14} fill="currentColor" /></span>Watch Intelligence Demo</button>
            </div>
            <div className="system-status"><span><i /> ALL SYSTEMS OPERATIONAL</span><span>DATA REFRESH · 2.4s</span></div>
          </div>

          <div className="hero-twin" aria-label="Live mine digital twin">
            <MineOverlay />
            <div className="hud-card risk-card"><span className="hud-label"><AlertTriangle size={13} /> AI RISK DETECTED</span><strong>Slope Instability</strong><small>RISK LEVEL <b>HIGH</b></small></div>
            <div className="hud-card live-card"><span className="hud-label"><Activity size={13} /> LIVE FIELD INTELLIGENCE</span><small>GPS · IMAGE · AI ANALYSIS</small><strong><i className="live-dot" /> LIVE</strong></div>
            <div className="hud-card compliance-card"><div className="progress-ring"><span>94.2<small>%</small></span></div><div><span className="hud-label">COMPLIANCE INTELLIGENCE</span><small>VISIBILITY INDEX</small></div></div>
            <div className="hud-card twin-card"><span className="hud-label"><Layers3 size={13} /> 3D DIGITAL TWIN</span><small>TERRAIN ANALYSIS<br />VOLUME ESTIMATION<br />RISK MAPPING</small></div>
          </div>
        </div>

        <div className="capability-strip">
          {capabilities.map(({ icon: Icon, title, text }, index) => (
            <ScrollReveal key={title} delay={index + 1} className="capability">
              <Icon /><div><strong>{title}</strong><span>{text}</span></div>
            </ScrollReveal>
          ))}
        </div>
      </section>

      <section id="impact" className="metrics-section">
        <ScrollReveal className="metrics-note"><Sparkles size={14} /> PLATFORM DEMONSTRATION METRICS</ScrollReveal>
        <div className="metrics-grid">
          {metrics.map(([value, label], idx) => (
            <AnimatedMetric key={label} targetValue={value} label={label} delayIndex={idx} />
          ))}
        </div>
      </section>

      <section id="platform" className="section why-section">
        <ScrollReveal>
          <SectionIntro eyebrow="THE OPERATING SHIFT" title="From Reactive Compliance to Predictive Intelligence." text="Replace disconnected, after-the-fact processes with one continuous intelligence loop." />
        </ScrollReveal>
        <div className="comparison-grid">
          <ScrollReveal delay={1} className="comparison legacy-panel">
            <div className="panel-heading"><span>01</span><div><small>TRADITIONAL GOVERNANCE</small><h3>Fragmented by default.</h3></div></div>
            {["Manual Reports", "Delayed Inspections", "Scattered Data", "Reactive Decisions"].map((item, index) => <div className="flow-item muted-flow" key={item}><span>{String(index + 1).padStart(2, "0")}</span>{item}{index < 3 && <ArrowDown />}</div>)}
          </ScrollReveal>
          <ScrollReveal delay={2} className="comparison future-panel">
            <div className="panel-glow" />
            <div className="panel-heading"><span><Zap /></span><div><small>COALGUARD INTELLIGENCE</small><h3>Connected by intelligence.</h3></div></div>
            {["AI Document Intelligence", "Real-Time Field Data", "Geospatial Intelligence", "Predictive Risk Analysis", "Actionable Decisions"].map((item, index) => <div className="flow-item active-flow" key={item}><Check />{item}{index < 4 && <ArrowDown />}</div>)}
          </ScrollReveal>
        </div>
      </section>

      <section id="ai-intelligence" className="section intelligence-section">
        <ScrollReveal>
          <SectionIntro eyebrow="COALGUARD AI CORE" title="One Intelligence Layer. Every Mine Signal." text="A connected decision engine turns unstructured evidence, field observations and regulation into operational clarity." />
        </ScrollReveal>
        <ScrollReveal delay={2} className="neural-stage">
          <div className="neural-lines" />
          <div className="core-orbit"><div className="orbit-line orbit-one" /><div className="orbit-line orbit-two" /><div className="core-node"><BrainCircuit /><strong>COALGUARD</strong><span>INTELLIGENCE CORE</span></div></div>
          <div className="ai-flow">
            {aiFlow.map((item, index) => <div className="ai-module" key={item}><span>{String(index + 1).padStart(2, "0")}</span><strong>{item}</strong><i />{index < aiFlow.length - 1 && <ChevronRight />}</div>)}
          </div>
          <div className="signal-tags"><span>OCR + DOCUMENT AI</span><span>RAG-POWERED KNOWLEDGE ENGINE</span><span>AI RISK ENGINE</span><span>AUTOMATED COMPLIANCE</span></div>
        </ScrollReveal>
      </section>

      <section id="digital-twin" className="section twin-section">
        <ScrollReveal className="section-heading-row">
          <SectionIntro eyebrow="GEOSPATIAL COMMAND" title="See Your Mine in a New Dimension." text="Navigate a living spatial model of terrain, equipment, inspections, environmental zones and emerging risk." />
          <div className="legend"><span><i className="legend-critical" /> High</span><span><i className="legend-warning" /> Medium</span><span><i className="legend-safe" /> Low</span></div>
        </ScrollReveal>
        <ScrollReveal delay={2} className="map-console">
          <div className="map-toolbar">
            {["2D View", "3D View", "Satellite", "Terrain", "Risk Heatmap"].map((mode) => <button key={mode} className={mapMode === mode ? "active" : ""} onClick={() => setMapMode(mode)}>{mode === "Satellite" && <Satellite />}{mode === "Terrain" && <Mountain />}{mode === "Risk Heatmap" && <Activity />}{mode}</button>)}
          </div>
          <MineOverlay expanded />
          <div className="map-side-panel">
            <div className="map-panel-title"><Crosshair /> LIVE LAYERS <span>7 ACTIVE</span></div>
            {["Terrain mesh", "Bench levels", "Haul roads", "Equipment fleet", "Risk zones", "Inspection points", "Environmental zones"].map((layer, i) => <div className="layer-row" key={layer}><span><i className={i === 4 ? "layer-warning" : ""} />{layer}</span><button aria-label={`Toggle ${layer}`} className={i === 6 ? "toggle" : "toggle enabled"}><i /></button></div>)}
            <div className="sync-card"><Radar /><div><strong>Spatial sync active</strong><span>Last updated 08 seconds ago</span></div></div>
          </div>
        </ScrollReveal>
      </section>

      <section id="compliance" className="section document-section">
        <div className="document-grid">
          <ScrollReveal delay={1}>
            <SectionIntro eyebrow="DOCUMENT INTELLIGENCE" title="Turn Mine Documents into Intelligence." text="CoalGuard reads complex mine records, matches regulatory obligations and surfaces action-ready findings in seconds." />
            <div className="process-line">
              {["PDF Upload", "OCR", "AI Extraction", "Regulation Matching", "Compliance Findings", "Risk Assessment"].map((item, index) => <div key={item}><span>{index + 1}</span><strong>{item}</strong>{index < 5 && <ChevronRight />}</div>)}
            </div>
          </ScrollReveal>
          <ScrollReveal delay={2} className="document-console">
            <div className="document-file">
              <div className="file-top"><span><FileScan /> PDF</span><small>PROCESSING COMPLETE</small></div>
              <div className="paper-lines"><i /><i /><i /><i /><i /><i /></div>
              <div className="scan-highlight"><ScanLine /> AI MATCH · SECTION 7.4</div>
              <div className="file-name">Safety Inspection Report.pdf <span>4.8 MB</span></div>
            </div>
            <div className="findings-panel">
              <span className="hud-label"><BrainCircuit /> AI FINDINGS</span>
              <div className="finding-alert"><AlertTriangle /><div><small>SAFETY ISSUE DETECTED</small><strong>Slope drainage obstruction</strong></div><b>HIGH</b></div>
              <dl><div><dt>Compliance status</dt><dd>Action Required</dd></div><div><dt>Matched regulation</dt><dd>CMR 2017 · Reg. 106</dd></div><div><dt>Confidence</dt><dd>96.8%</dd></div></dl>
              <div className="recommendation"><small>RECOMMENDED ACTION</small><p>Immediate inspection and corrective action. Restrict heavy vehicle movement within the identified zone.</p></div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      <section className="section field-section">
        <div className="field-grid">
          <ScrollReveal delay={1} className="phone-scene">
            <div className="phone">
              <div className="phone-top"><BrandMark /><span>FIELD OPS</span><i /></div>
              <div className="phone-map"><img src={twinMine} alt="Mobile mine inspection map" width={1600} height={1000} loading="lazy" /><div className="phone-target"><LocateFixed /></div><span>ZONE B · BENCH 04</span></div>
              <div className="phone-body"><small>NEW INSPECTION</small><h4>Slope condition check</h4><div className="evidence-row"><div><LocateFixed /><span>GPS locked<strong>23.7957° N</strong></span></div><div><Activity /><span>AI status<strong>Analyzing</strong></span></div></div><div className="capture"><ScanLine /><span>Image evidence captured</span><Check /></div><button>Submit Inspection <ArrowRight /></button></div>
            </div>
            <div className="field-float float-gps"><LocateFixed /><span>GPS VERIFIED<strong>± 1.8m accuracy</strong></span></div>
            <div className="field-float float-risk"><AlertTriangle /><span>RISK CLASSIFIED<strong>HIGH PRIORITY</strong></span></div>
          </ScrollReveal>
          <ScrollReveal delay={2}>
            <SectionIntro eyebrow="FIELD INTELLIGENCE" title="Intelligence Starts in the Field." text="Equip every inspector with guided workflows, automatic location capture and instant AI-assisted classification." />
            <div className="workflow-list">
              {["Select Mine", "Capture Photo", "GPS Automatically Captured", "AI Analysis", "Risk Classification", "Submit Inspection"].map((item, index) => <div key={item}><span>{String(index + 1).padStart(2, "0")}</span><strong>{item}</strong>{index < 5 && <i />}</div>)}
            </div>
            <div className="field-signals"><span><LocateFixed /> GPS coordinates</span><span><ScanLine /> Image evidence</span><span><BrainCircuit /> AI analysis</span><span><AlertTriangle /> Risk level</span><span><ClipboardCheck /> Compliance status</span></div>
          </ScrollReveal>
        </div>
      </section>

      <section className="section risk-section">
        <ScrollReveal>
          <SectionIntro eyebrow="PREDICTIVE RISK INTELLIGENCE" title="Predict Risk. Prevent Incidents." text="Focus teams where intervention matters most with continuously ranked zones, trends and alerts." />
        </ScrollReveal>
        <ScrollReveal delay={2} className="risk-dashboard">
          <div className="risk-map-card"><div className="card-title"><span><Map /> RISK HEATMAP</span><small>LIVE · MINE 04</small></div><div className="mini-map"><img src={twinMine} alt="Mine risk heatmap" width={1600} height={1000} loading="lazy" /><i className="heat heat-one" /><i className="heat heat-two" /><i className="heat heat-three" /><span className="map-grid-lines" /></div><div className="heat-legend"><span>LOW</span><i /><span>CRITICAL</span></div></div>
          <div className="risk-chart-card"><div className="card-title"><span><Activity /> INCIDENT PROBABILITY</span><small>30 DAYS</small></div><div className="chart-value"><strong>18.4%</strong><span>↓ 6.2% vs last period</span></div><div className="chart-bars">{[38,48,42,61,54,70,66,58,46,35,30,24].map((height, i) => <i key={i} style={{ "--bar-height": `${height}%` } as React.CSSProperties} />)}</div><div className="chart-axis"><span>01 SEP</span><span>15 SEP</span><span>30 SEP</span></div></div>
          <div className="alert-list-card"><div className="card-title"><span><AlertTriangle /> ACTIVE ALERTS</span><b>06</b></div>{([{ level: "HIGH", title: "Slope movement", meta: "North bench · 2m" }, { level: "MED", title: "Haul road visibility", meta: "Sector C · 8m" }, { level: "MED", title: "Water accumulation", meta: "Pit floor · 14m" }]).map(({ level, title, meta }) => <div className="alert-row" key={title}><span className={`severity severity-${level.toLowerCase()}`}>{level}</span><div><strong>{title}</strong><small>{meta}</small></div><ChevronRight /></div>)}</div>
          <div className="priority-card"><span className="hud-label">INSPECTION PRIORITY</span><strong>Zone N-04</strong><div><span>Urgency score</span><b>92 / 100</b></div><div className="priority-meter"><i /></div><small>Dispatch geotechnical team within 30 min</small></div>
        </ScrollReveal>
      </section>

      <section id="about" className="final-cta">
        <img src={heroMine} alt="Digitally connected coal mine" width={1920} height={1080} loading="lazy" />
        <div className="final-grid" />
        <div className="cta-radar"><Orbit /></div>
        <ScrollReveal className="final-content">
          <BrandMark /><span className="eyebrow"><span />THE INTELLIGENT MINE STARTS HERE</span><h2>Build Safer Mines<br /><strong>with Intelligence.</strong></h2><p>Connect field intelligence, AI, GIS and compliance into one intelligent mining ecosystem.</p><div><ActionLink>Explore CoalGuard <ArrowRight /></ActionLink><ActionLink secondary href="#digital-twin">View Platform</ActionLink></div>
        </ScrollReveal>
      </section>

      <footer><a className="brand" href="#home"><BrandMark /><span>Coal<span>Guard</span></span></a><p>AI-Powered Smart Governance, Safety & Compliance Monitoring System</p><span>SIH 2026 · TECHNOLOGY PROTOTYPE</span></footer>

      {demoOpen && <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="CoalGuard intelligence demo"><div className="demo-modal"><button aria-label="Close demo" onClick={() => setDemoOpen(false)}><X /></button><div className="demo-radar"><Radar /></div><span className="eyebrow"><span />INTELLIGENCE DEMO</span><h3>Mine intelligence,<br />in continuous motion.</h3><p>The interactive product demonstration is being prepared for the SIH 2026 showcase.</p><ActionLink href="#digital-twin">Explore the digital twin <ArrowRight /></ActionLink></div></div>}
    </main>
  );
}