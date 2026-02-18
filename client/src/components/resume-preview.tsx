import type { ResumeTemplate } from "@/lib/resume-templates";

interface ResumePreviewProps {
  template: ResumeTemplate;
  fullSize?: boolean;
}

const S = {
  name: "Sarah Mitchell",
  initials: "SM",
  title: "Senior Software Engineer",
  email: "sarah.mitchell@email.com",
  phone: "(555) 842-9170",
  location: "San Francisco, CA",
  linkedin: "linkedin.com/in/sarahmitchell",
  website: "sarahmitchell.dev",
  summary: "Results-driven software engineer with 7+ years of experience building scalable web applications and leading cross-functional teams. Proven track record of designing microservices architecture, improving system performance by 40%, and mentoring junior developers.",
  experience: [
    { title: "Senior Software Engineer", company: "TechCorp Inc.", location: "San Francisco, CA", dates: "Jan 2021 – Present", bullets: ["Led migration of monolithic application to microservices, reducing deployment time by 60%", "Architected real-time data pipeline processing 2M+ events daily using Kafka and Redis", "Mentored team of 5 junior developers, improving code review turnaround by 35%"] },
    { title: "Software Engineer", company: "DataFlow Systems", location: "Austin, TX", dates: "Mar 2018 – Dec 2020", bullets: ["Built RESTful APIs serving 10K+ requests/min with 99.9% uptime SLA", "Implemented CI/CD pipeline reducing release cycles from 2 weeks to 2 days", "Optimized database queries resulting in 45% improvement in response times"] },
  ],
  education: { degree: "B.S. Computer Science", school: "University of California, Berkeley", dates: "2014 – 2018", gpa: "3.8/4.0" },
  skills: [
    { name: "TypeScript", level: 95 }, { name: "React", level: 90 }, { name: "Node.js", level: 88 },
    { name: "Python", level: 85 }, { name: "PostgreSQL", level: 82 }, { name: "AWS", level: 80 },
    { name: "Docker", level: 78 }, { name: "Kubernetes", level: 72 },
  ],
  softSkills: ["Leadership", "Communication", "Problem Solving", "Agile/Scrum"],
  certifications: ["AWS Solutions Architect – Associate", "Google Cloud Professional"],
  languages: ["English (Native)", "Spanish (Conversational)"],
};

type LayoutId = 1|2|3|4|5|6|7|8|9|10|11|12;

const TEMPLATE_LAYOUT_MAP: Record<string, LayoutId> = {
  "modern-01": 1, "modern-02": 2, "modern-03": 3, "modern-04": 4, "modern-05": 5,
  "classic-01": 6, "classic-02": 7, "classic-03": 6, "classic-04": 7,
  "creative-01": 8, "creative-02": 9, "creative-03": 10, "creative-04": 8, "creative-05": 9,
  "minimal-01": 11, "minimal-02": 12, "minimal-03": 11, "minimal-04": 12, "minimal-05": 11,
  "exec-01": 7, "exec-02": 6, "exec-03": 7, "exec-04": 6,
  "tech-01": 1, "tech-02": 3, "tech-03": 4, "tech-04": 2, "tech-05": 5, "tech-06": 1,
  "health-01": 5, "health-02": 4, "health-03": 2, "health-04": 5,
  "fin-01": 6, "fin-02": 7, "fin-03": 6, "fin-04": 7,
  "mkt-01": 8, "mkt-02": 9, "mkt-03": 10, "mkt-04": 8,
  "edu-01": 6, "edu-02": 7, "edu-03": 6, "edu-04": 7,
  "entry-01": 4, "entry-02": 5, "entry-03": 2, "entry-04": 4,
  "ats-01": 11, "ats-02": 12, "ats-03": 11, "ats-04": 12, "ats-05": 11,
};

interface LP { c: string; c2: string; }

function lighten(hex: string, amt: number): string {
  const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
  return `rgb(${Math.min(255,r+amt)},${Math.min(255,g+amt)},${Math.min(255,b+amt)})`;
}
function withAlpha(hex: string, a: number): string {
  const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
  return `rgba(${r},${g},${b},${a})`;
}

function ProfileCircle({ c, size, fs }: { c: string; size: number; fs: number }) {
  return (
    <div style={{ width: size*fs, height: size*fs, borderRadius: "50%", backgroundColor: "#fff", display: "flex", alignItems: "center", justifyContent: "center", border: `${3*fs}px solid rgba(255,255,255,0.4)`, flexShrink: 0 }}>
      <span style={{ fontSize: size*0.38*fs, fontWeight: 700, color: c }}>{S.initials}</span>
    </div>
  );
}

function SkillBars({ skills, c, fs, light }: { skills: typeof S.skills; c: string; fs: number; light?: boolean }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4*fs }}>
      {skills.map((s, i) => (
        <div key={i}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 1.5*fs }}>
            <span style={{ fontSize: 5.5*fs, fontWeight: 500, color: light ? "rgba(255,255,255,0.95)" : "#444" }}>{s.name}</span>
          </div>
          <div style={{ height: 4*fs, backgroundColor: light ? "rgba(255,255,255,0.2)" : withAlpha(c, 0.12), borderRadius: 3*fs, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${s.level}%`, backgroundColor: light ? "rgba(255,255,255,0.85)" : c, borderRadius: 3*fs }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function SkillDots({ skills, c, fs, light }: { skills: typeof S.skills; c: string; fs: number; light?: boolean }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5*fs }}>
      {skills.map((s, i) => {
        const filled = Math.round(s.level / 20);
        return (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 4*fs }}>
            <span style={{ fontSize: 5.5*fs, fontWeight: 500, color: light ? "rgba(255,255,255,0.9)" : "#444", minWidth: 44*fs }}>{s.name}</span>
            <div style={{ display: "flex", gap: 2.5*fs }}>
              {[1,2,3,4,5].map(d => (
                <div key={d} style={{ width: 5*fs, height: 5*fs, borderRadius: "50%", backgroundColor: d <= filled ? (light ? "#fff" : c) : (light ? "rgba(255,255,255,0.2)" : withAlpha(c, 0.15)) }} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ContactItem({ icon, text, fs, light }: { icon: string; text: string; fs: number; light?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4*fs, fontSize: 5.5*fs, color: light ? "rgba(255,255,255,0.9)" : "#555", lineHeight: 1.4 }}>
      <span style={{ fontSize: 4.5*fs, opacity: 0.7, flexShrink: 0, width: 7*fs, textAlign: "center" }}>{icon}</span>
      <span>{text}</span>
    </div>
  );
}

function SectionTitle({ text, c, fs, style: s }: { text: string; c: string; fs: number; style: "line"|"dot"|"bar"|"underline"|"plain" }) {
  if (s === "bar") return (
    <div style={{ display: "flex", alignItems: "center", gap: 6*fs, marginBottom: 6*fs }}>
      <div style={{ width: 3*fs, height: 14*fs, backgroundColor: c, borderRadius: 1*fs }} />
      <span style={{ fontSize: 8*fs, fontWeight: 700, color: "#222", textTransform: "uppercase", letterSpacing: 1*fs }}>{text}</span>
    </div>
  );
  if (s === "line") return (
    <div style={{ marginBottom: 6*fs }}>
      <div style={{ fontSize: 8*fs, fontWeight: 700, color: c, textTransform: "uppercase", letterSpacing: 1.5*fs }}>{text}</div>
      <div style={{ height: 1.5*fs, backgroundColor: c, marginTop: 2*fs, width: "100%" }} />
    </div>
  );
  if (s === "dot") return (
    <div style={{ display: "flex", alignItems: "center", gap: 5*fs, marginBottom: 6*fs }}>
      <div style={{ width: 7*fs, height: 7*fs, borderRadius: "50%", backgroundColor: c }} />
      <span style={{ fontSize: 8*fs, fontWeight: 700, color: "#222", textTransform: "uppercase", letterSpacing: 0.8*fs }}>{text}</span>
    </div>
  );
  if (s === "underline") return (
    <div style={{ marginBottom: 6*fs, borderBottom: `1.5px solid ${withAlpha(c, 0.3)}`, paddingBottom: 3*fs }}>
      <span style={{ fontSize: 8*fs, fontWeight: 700, color: "#333", textTransform: "uppercase", letterSpacing: 1*fs }}>{text}</span>
    </div>
  );
  return <div style={{ fontSize: 8*fs, fontWeight: 700, color: c, textTransform: "uppercase", letterSpacing: 1*fs, marginBottom: 6*fs }}>{text}</div>;
}

function ExpBlock({ exp, c, fs, timeline }: { exp: typeof S.experience[0]; c: string; fs: number; timeline?: boolean }) {
  return (
    <div style={{ marginBottom: 10*fs, paddingLeft: timeline ? 12*fs : 0, position: "relative" }}>
      {timeline && (
        <>
          <div style={{ position: "absolute", left: 0, top: 3*fs, width: 7*fs, height: 7*fs, borderRadius: "50%", backgroundColor: c, border: `2px solid #fff`, zIndex: 1 }} />
          <div style={{ position: "absolute", left: 3*fs, top: 10*fs, width: 1*fs, height: `calc(100% - ${6*fs}px)`, backgroundColor: withAlpha(c, 0.2) }} />
        </>
      )}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 4*fs }}>
        <span style={{ fontSize: 7*fs, fontWeight: 700, color: "#1a1a1a" }}>{exp.title}</span>
        <span style={{ fontSize: 5*fs, color: "#888", fontWeight: 500 }}>{exp.dates}</span>
      </div>
      <div style={{ fontSize: 5.5*fs, color: c, fontWeight: 600, marginBottom: 3*fs }}>{exp.company} | {exp.location}</div>
      {exp.bullets.map((b, j) => (
        <div key={j} style={{ fontSize: 5.5*fs, color: "#555", lineHeight: 1.55, paddingLeft: 8*fs, position: "relative", marginBottom: 2*fs }}>
          <span style={{ position: "absolute", left: 0, color: c, fontWeight: 700 }}>•</span>{b}
        </div>
      ))}
    </div>
  );
}

function Layout1({ c, c2 }: LP) {
  const fs = 1;
  return (
    <div style={{ display: "flex", width: "100%", height: "100%", fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      <div style={{ width: "34%", background: `linear-gradient(180deg, ${c}, ${c2})`, color: "#fff", padding: `${22*fs}px ${14*fs}px`, display: "flex", flexDirection: "column", gap: 14*fs }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
          <ProfileCircle c={c} size={50} fs={fs} />
          <div style={{ fontSize: 13*fs, fontWeight: 700, marginTop: 8*fs, lineHeight: 1.2 }}>{S.name}</div>
          <div style={{ fontSize: 6.5*fs, opacity: 0.85, marginTop: 3*fs, letterSpacing: 1*fs, textTransform: "uppercase", fontWeight: 300 }}>{S.title}</div>
        </div>
        <div style={{ height: 1, backgroundColor: "rgba(255,255,255,0.25)" }} />
        <div>
          <div style={{ fontSize: 7*fs, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.5*fs, marginBottom: 6*fs, opacity: 0.9 }}>Contact</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4*fs }}>
            <ContactItem icon="✉" text={S.email} fs={fs} light />
            <ContactItem icon="✆" text={S.phone} fs={fs} light />
            <ContactItem icon="⌂" text={S.location} fs={fs} light />
            <ContactItem icon="⊕" text={S.linkedin} fs={fs} light />
          </div>
        </div>
        <div style={{ height: 1, backgroundColor: "rgba(255,255,255,0.25)" }} />
        <div>
          <div style={{ fontSize: 7*fs, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.5*fs, marginBottom: 8*fs, opacity: 0.9 }}>Skills</div>
          <SkillBars skills={S.skills.slice(0,6)} c={c} fs={fs} light />
        </div>
        <div style={{ height: 1, backgroundColor: "rgba(255,255,255,0.25)" }} />
        <div>
          <div style={{ fontSize: 7*fs, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.5*fs, marginBottom: 6*fs, opacity: 0.9 }}>Education</div>
          <div style={{ fontSize: 6.5*fs, fontWeight: 600 }}>{S.education.degree}</div>
          <div style={{ fontSize: 5.5*fs, opacity: 0.85, marginTop: 1*fs }}>{S.education.school}</div>
          <div style={{ fontSize: 5*fs, opacity: 0.65, marginTop: 1*fs }}>{S.education.dates} | GPA: {S.education.gpa}</div>
        </div>
        <div>
          <div style={{ fontSize: 7*fs, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.5*fs, marginBottom: 6*fs, opacity: 0.9 }}>Languages</div>
          {S.languages.map((l,i) => <div key={i} style={{ fontSize: 5.5*fs, opacity: 0.85, marginBottom: 2*fs }}>{l}</div>)}
        </div>
      </div>
      <div style={{ width: "66%", padding: `${22*fs}px ${18*fs}px`, display: "flex", flexDirection: "column", gap: 12*fs }}>
        <div>
          <SectionTitle text="Profile" c={c} fs={fs} style="bar" />
          <div style={{ fontSize: 5.5*fs, color: "#555", lineHeight: 1.6 }}>{S.summary}</div>
        </div>
        <div>
          <SectionTitle text="Work Experience" c={c} fs={fs} style="bar" />
          {S.experience.map((exp, i) => <ExpBlock key={i} exp={exp} c={c} fs={fs} timeline />)}
        </div>
        <div>
          <SectionTitle text="Certifications" c={c} fs={fs} style="bar" />
          {S.certifications.map((cert, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 5*fs, marginBottom: 3*fs }}>
              <div style={{ width: 5*fs, height: 5*fs, borderRadius: "50%", backgroundColor: c }} />
              <span style={{ fontSize: 5.5*fs, color: "#444" }}>{cert}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Layout2({ c, c2 }: LP) {
  const fs = 1;
  return (
    <div style={{ display: "flex", width: "100%", height: "100%", fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      <div style={{ width: "66%", padding: `${22*fs}px ${18*fs}px`, display: "flex", flexDirection: "column", gap: 12*fs }}>
        <div>
          <div style={{ fontSize: 22*fs, fontWeight: 800, color: "#1a1a1a", letterSpacing: -0.5*fs }}>{S.name}</div>
          <div style={{ fontSize: 8*fs, color: c, fontWeight: 500, marginTop: 2*fs, letterSpacing: 1*fs, textTransform: "uppercase" }}>{S.title}</div>
        </div>
        <div style={{ height: 2*fs, background: `linear-gradient(90deg, ${c}, transparent)` }} />
        <div>
          <SectionTitle text="About Me" c={c} fs={fs} style="dot" />
          <div style={{ fontSize: 5.5*fs, color: "#555", lineHeight: 1.6 }}>{S.summary}</div>
        </div>
        <div>
          <SectionTitle text="Experience" c={c} fs={fs} style="dot" />
          {S.experience.map((exp, i) => <ExpBlock key={i} exp={exp} c={c} fs={fs} />)}
        </div>
        <div>
          <SectionTitle text="Education" c={c} fs={fs} style="dot" />
          <div style={{ fontSize: 7*fs, fontWeight: 600, color: "#222" }}>{S.education.degree}</div>
          <div style={{ fontSize: 5.5*fs, color: c, fontWeight: 500 }}>{S.education.school}</div>
          <div style={{ fontSize: 5*fs, color: "#888" }}>{S.education.dates} | GPA: {S.education.gpa}</div>
        </div>
      </div>
      <div style={{ width: "34%", backgroundColor: withAlpha(c, 0.06), borderLeft: `3px solid ${withAlpha(c, 0.15)}`, padding: `${22*fs}px ${14*fs}px`, display: "flex", flexDirection: "column", gap: 14*fs }}>
        <div style={{ display: "flex", justifyContent: "center" }}>
          <ProfileCircle c={c} size={48} fs={fs} />
        </div>
        <div>
          <div style={{ fontSize: 7*fs, fontWeight: 700, color: c, textTransform: "uppercase", letterSpacing: 1.5*fs, marginBottom: 6*fs }}>Contact</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4*fs }}>
            <ContactItem icon="✉" text={S.email} fs={fs} />
            <ContactItem icon="✆" text={S.phone} fs={fs} />
            <ContactItem icon="⌂" text={S.location} fs={fs} />
            <ContactItem icon="⊕" text={S.website} fs={fs} />
          </div>
        </div>
        <div style={{ height: 1, backgroundColor: withAlpha(c, 0.15) }} />
        <div>
          <div style={{ fontSize: 7*fs, fontWeight: 700, color: c, textTransform: "uppercase", letterSpacing: 1.5*fs, marginBottom: 8*fs }}>Skills</div>
          <SkillDots skills={S.skills.slice(0,6)} c={c} fs={fs} />
        </div>
        <div style={{ height: 1, backgroundColor: withAlpha(c, 0.15) }} />
        <div>
          <div style={{ fontSize: 7*fs, fontWeight: 700, color: c, textTransform: "uppercase", letterSpacing: 1.5*fs, marginBottom: 6*fs }}>Certifications</div>
          {S.certifications.map((cert, i) => (
            <div key={i} style={{ fontSize: 5.5*fs, color: "#444", marginBottom: 3*fs, paddingLeft: 8*fs, position: "relative" }}>
              <span style={{ position: "absolute", left: 0, color: c }}>▸</span>{cert}
            </div>
          ))}
        </div>
        <div>
          <div style={{ fontSize: 7*fs, fontWeight: 700, color: c, textTransform: "uppercase", letterSpacing: 1.5*fs, marginBottom: 6*fs }}>Languages</div>
          {S.languages.map((l,i) => <div key={i} style={{ fontSize: 5.5*fs, color: "#555", marginBottom: 2*fs }}>{l}</div>)}
        </div>
      </div>
    </div>
  );
}

function Layout3({ c, c2 }: LP) {
  const fs = 1;
  return (
    <div style={{ fontFamily: "'Segoe UI', system-ui, sans-serif", height: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{ background: `linear-gradient(135deg, ${c}, ${c2})`, color: "#fff", padding: `${18*fs}px ${20*fs}px`, display: "flex", alignItems: "center", gap: 14*fs }}>
        <ProfileCircle c={c} size={52} fs={fs} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 20*fs, fontWeight: 800, letterSpacing: -0.3*fs }}>{S.name}</div>
          <div style={{ fontSize: 7.5*fs, fontWeight: 300, opacity: 0.9, marginTop: 2*fs, letterSpacing: 2*fs, textTransform: "uppercase" }}>{S.title}</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6*fs, marginTop: 6*fs, fontSize: 5*fs, opacity: 0.85 }}>
            {[`✉ ${S.email}`, `✆ ${S.phone}`, `⌂ ${S.location}`].map((item, i) => (
              <span key={i}>{item}</span>
            ))}
          </div>
        </div>
      </div>
      <div style={{ flex: 1, display: "flex" }}>
        <div style={{ width: "65%", padding: `${14*fs}px ${18*fs}px`, display: "flex", flexDirection: "column", gap: 10*fs }}>
          <div>
            <SectionTitle text="Profile" c={c} fs={fs} style="line" />
            <div style={{ fontSize: 5.5*fs, color: "#555", lineHeight: 1.6 }}>{S.summary}</div>
          </div>
          <div>
            <SectionTitle text="Work Experience" c={c} fs={fs} style="line" />
            {S.experience.map((exp, i) => <ExpBlock key={i} exp={exp} c={c} fs={fs} timeline />)}
          </div>
        </div>
        <div style={{ width: "35%", backgroundColor: "#f8f9fa", padding: `${14*fs}px ${14*fs}px`, display: "flex", flexDirection: "column", gap: 12*fs }}>
          <div>
            <SectionTitle text="Skills" c={c} fs={fs} style="line" />
            <SkillBars skills={S.skills.slice(0,6)} c={c} fs={fs} />
          </div>
          <div>
            <SectionTitle text="Education" c={c} fs={fs} style="line" />
            <div style={{ fontSize: 6.5*fs, fontWeight: 700, color: "#222" }}>{S.education.degree}</div>
            <div style={{ fontSize: 5.5*fs, color: c, fontWeight: 500 }}>{S.education.school}</div>
            <div style={{ fontSize: 5*fs, color: "#888" }}>{S.education.dates}</div>
          </div>
          <div>
            <SectionTitle text="Certifications" c={c} fs={fs} style="line" />
            {S.certifications.map((cert,i) => <div key={i} style={{ fontSize: 5.5*fs, color: "#444", marginBottom: 3*fs }}>▹ {cert}</div>)}
          </div>
          <div>
            <SectionTitle text="Languages" c={c} fs={fs} style="line" />
            {S.languages.map((l,i) => <div key={i} style={{ fontSize: 5.5*fs, color: "#555", marginBottom: 2*fs }}>{l}</div>)}
          </div>
        </div>
      </div>
    </div>
  );
}

function Layout4({ c, c2 }: LP) {
  const fs = 1;
  return (
    <div style={{ fontFamily: "'Segoe UI', system-ui, sans-serif", height: "100%", display: "flex" }}>
      <div style={{ width: 5*fs, background: `linear-gradient(180deg, ${c}, ${c2})`, flexShrink: 0 }} />
      <div style={{ flex: 1, padding: `${20*fs}px ${18*fs}px`, display: "flex", flexDirection: "column", gap: 10*fs }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12*fs }}>
          <ProfileCircle c={c} size={46} fs={fs} />
          <div>
            <div style={{ fontSize: 20*fs, fontWeight: 800, color: "#1a1a1a" }}>{S.name}</div>
            <div style={{ fontSize: 7.5*fs, color: c, fontWeight: 500, marginTop: 1*fs }}>{S.title}</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6*fs, marginTop: 4*fs, fontSize: 5*fs, color: "#777" }}>
              {[S.email, S.phone, S.location].map((item, i) => (
                <span key={i}>{i > 0 && "| "}{item}</span>
              ))}
            </div>
          </div>
        </div>
        <div style={{ height: 1.5*fs, background: `linear-gradient(90deg, ${c}, ${withAlpha(c, 0.1)})` }} />
        <div>
          <SectionTitle text="Professional Summary" c={c} fs={fs} style="bar" />
          <div style={{ fontSize: 5.5*fs, color: "#555", lineHeight: 1.6 }}>{S.summary}</div>
        </div>
        <div>
          <SectionTitle text="Experience" c={c} fs={fs} style="bar" />
          {S.experience.map((exp, i) => <ExpBlock key={i} exp={exp} c={c} fs={fs} timeline />)}
        </div>
        <div style={{ display: "flex", gap: 16*fs, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 80*fs }}>
            <SectionTitle text="Education" c={c} fs={fs} style="bar" />
            <div style={{ fontSize: 6.5*fs, fontWeight: 700, color: "#222" }}>{S.education.degree}</div>
            <div style={{ fontSize: 5.5*fs, color: c, fontWeight: 500 }}>{S.education.school}</div>
            <div style={{ fontSize: 5*fs, color: "#888" }}>{S.education.dates}</div>
          </div>
          <div style={{ flex: 1, minWidth: 80*fs }}>
            <SectionTitle text="Skills" c={c} fs={fs} style="bar" />
            <div style={{ display: "flex", flexWrap: "wrap", gap: 3*fs }}>
              {S.skills.map((s, i) => (
                <span key={i} style={{ fontSize: 5*fs, padding: `${2*fs}px ${6*fs}px`, backgroundColor: withAlpha(c, 0.08), border: `1px solid ${withAlpha(c, 0.2)}`, borderRadius: 10*fs, color: "#444" }}>{s.name}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Layout5({ c, c2 }: LP) {
  const fs = 1;
  return (
    <div style={{ display: "flex", width: "100%", height: "100%", fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      <div style={{ width: "34%", backgroundColor: "#2d2d2d", color: "#fff", padding: `${22*fs}px ${14*fs}px`, display: "flex", flexDirection: "column", gap: 14*fs }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
          <div style={{ width: 50*fs, height: 50*fs, borderRadius: "50%", background: `linear-gradient(135deg, ${c}, ${c2})`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: 19*fs, fontWeight: 700, color: "#fff" }}>{S.initials}</span>
          </div>
          <div style={{ fontSize: 13*fs, fontWeight: 700, marginTop: 8*fs }}>{S.name}</div>
          <div style={{ fontSize: 6*fs, color: c, marginTop: 2*fs, letterSpacing: 1*fs, textTransform: "uppercase", fontWeight: 500 }}>{S.title}</div>
        </div>
        <div style={{ height: 1, backgroundColor: "rgba(255,255,255,0.12)" }} />
        <div>
          <div style={{ fontSize: 6.5*fs, fontWeight: 700, textTransform: "uppercase", letterSpacing: 2*fs, marginBottom: 6*fs, color: c }}>Contact</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4*fs }}>
            <ContactItem icon="✉" text={S.email} fs={fs} light />
            <ContactItem icon="✆" text={S.phone} fs={fs} light />
            <ContactItem icon="⌂" text={S.location} fs={fs} light />
            <ContactItem icon="⊕" text={S.linkedin} fs={fs} light />
          </div>
        </div>
        <div style={{ height: 1, backgroundColor: "rgba(255,255,255,0.12)" }} />
        <div>
          <div style={{ fontSize: 6.5*fs, fontWeight: 700, textTransform: "uppercase", letterSpacing: 2*fs, marginBottom: 8*fs, color: c }}>Expertise</div>
          <SkillBars skills={S.skills.slice(0,6)} c={c} fs={fs} light />
        </div>
        <div style={{ height: 1, backgroundColor: "rgba(255,255,255,0.12)" }} />
        <div>
          <div style={{ fontSize: 6.5*fs, fontWeight: 700, textTransform: "uppercase", letterSpacing: 2*fs, marginBottom: 6*fs, color: c }}>Languages</div>
          {S.languages.map((l,i) => <div key={i} style={{ fontSize: 5.5*fs, opacity: 0.85, marginBottom: 2*fs }}>{l}</div>)}
        </div>
      </div>
      <div style={{ width: "66%", padding: `${22*fs}px ${18*fs}px`, display: "flex", flexDirection: "column", gap: 12*fs }}>
        <div>
          <SectionTitle text="About Me" c={c} fs={fs} style="dot" />
          <div style={{ fontSize: 5.5*fs, color: "#555", lineHeight: 1.6 }}>{S.summary}</div>
        </div>
        <div>
          <SectionTitle text="Work Experience" c={c} fs={fs} style="dot" />
          {S.experience.map((exp, i) => <ExpBlock key={i} exp={exp} c={c} fs={fs} />)}
        </div>
        <div>
          <SectionTitle text="Education" c={c} fs={fs} style="dot" />
          <div style={{ fontSize: 7*fs, fontWeight: 700, color: "#222" }}>{S.education.degree}</div>
          <div style={{ fontSize: 5.5*fs, color: c, fontWeight: 500 }}>{S.education.school}</div>
          <div style={{ fontSize: 5*fs, color: "#888" }}>{S.education.dates} | GPA: {S.education.gpa}</div>
        </div>
        <div>
          <SectionTitle text="Certifications" c={c} fs={fs} style="dot" />
          {S.certifications.map((cert,i) => <div key={i} style={{ fontSize: 5.5*fs, color: "#444", marginBottom: 3*fs }}>◆ {cert}</div>)}
        </div>
      </div>
    </div>
  );
}

function Layout6({ c }: LP) {
  const fs = 1;
  return (
    <div style={{ padding: `${22*fs}px ${20*fs}px`, fontFamily: "'Georgia', 'Times New Roman', serif", display: "flex", flexDirection: "column", gap: 10*fs, height: "100%" }}>
      <div style={{ textAlign: "center", paddingBottom: 10*fs, borderBottom: `2.5px solid ${c}` }}>
        <div style={{ fontSize: 24*fs, fontWeight: 700, color: "#1a1a1a", letterSpacing: 2*fs }}>{S.name.toUpperCase()}</div>
        <div style={{ fontSize: 8*fs, color: c, marginTop: 3*fs, letterSpacing: 1.5*fs, fontWeight: 400 }}>{S.title}</div>
        <div style={{ fontSize: 5*fs, color: "#777", marginTop: 6*fs, display: "flex", justifyContent: "center", flexWrap: "wrap", gap: 4*fs }}>
          <span>{S.email}</span><span style={{ color: c }}>◆</span>
          <span>{S.phone}</span><span style={{ color: c }}>◆</span>
          <span>{S.location}</span><span style={{ color: c }}>◆</span>
          <span>{S.linkedin}</span>
        </div>
      </div>
      <div>
        <SectionTitle text="Professional Summary" c={c} fs={fs} style="underline" />
        <div style={{ fontSize: 5.5*fs, color: "#444", lineHeight: 1.65 }}>{S.summary}</div>
      </div>
      <div>
        <SectionTitle text="Professional Experience" c={c} fs={fs} style="underline" />
        {S.experience.map((exp, i) => (
          <div key={i} style={{ marginBottom: 9*fs }}>
            <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 4*fs }}>
              <div><span style={{ fontSize: 7*fs, fontWeight: 700, color: "#222" }}>{exp.title}</span></div>
              <span style={{ fontSize: 5*fs, color: "#888", fontStyle: "italic" }}>{exp.dates}</span>
            </div>
            <div style={{ fontSize: 6*fs, color: c, fontStyle: "italic", marginBottom: 3*fs }}>{exp.company}, {exp.location}</div>
            {exp.bullets.map((b, j) => (
              <div key={j} style={{ fontSize: 5.5*fs, color: "#444", lineHeight: 1.6, paddingLeft: 10*fs, position: "relative", marginBottom: 1.5*fs }}>
                <span style={{ position: "absolute", left: 2*fs }}>•</span>{b}
              </div>
            ))}
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 16*fs, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 80*fs }}>
          <SectionTitle text="Education" c={c} fs={fs} style="underline" />
          <div style={{ fontSize: 6.5*fs, fontWeight: 600 }}>{S.education.degree}</div>
          <div style={{ fontSize: 5.5*fs, color: c }}>{S.education.school}</div>
          <div style={{ fontSize: 5*fs, color: "#888", fontStyle: "italic" }}>{S.education.dates} — GPA: {S.education.gpa}</div>
        </div>
        <div style={{ flex: 1, minWidth: 80*fs }}>
          <SectionTitle text="Skills" c={c} fs={fs} style="underline" />
          <div style={{ display: "flex", flexWrap: "wrap", gap: 3*fs }}>
            {S.skills.map((s, i) => (
              <span key={i} style={{ fontSize: 5.5*fs, color: "#444" }}>{s.name}{i < S.skills.length-1 ? " · " : ""}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Layout7({ c }: LP) {
  const fs = 1;
  return (
    <div style={{ fontFamily: "'Cambria', 'Georgia', serif", height: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{ backgroundColor: withAlpha(c, 0.06), borderBottom: `3px solid ${c}`, padding: `${20*fs}px ${22*fs}px` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14*fs }}>
          <div style={{ width: 44*fs, height: 44*fs, borderRadius: "50%", backgroundColor: c, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <span style={{ fontSize: 17*fs, fontWeight: 700, color: "#fff" }}>{S.initials}</span>
          </div>
          <div>
            <div style={{ fontSize: 20*fs, fontWeight: 700, color: "#1a1a1a" }}>{S.name}</div>
            <div style={{ fontSize: 8*fs, color: c, fontWeight: 500, marginTop: 1*fs }}>{S.title}</div>
          </div>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6*fs, marginTop: 8*fs, fontSize: 5*fs, color: "#666" }}>
          <span>✉ {S.email}</span><span style={{ color: withAlpha(c, 0.4) }}>|</span>
          <span>✆ {S.phone}</span><span style={{ color: withAlpha(c, 0.4) }}>|</span>
          <span>⌂ {S.location}</span><span style={{ color: withAlpha(c, 0.4) }}>|</span>
          <span>⊕ {S.linkedin}</span>
        </div>
      </div>
      <div style={{ padding: `${14*fs}px ${22*fs}px`, display: "flex", flexDirection: "column", gap: 10*fs, flex: 1 }}>
        <div>
          <SectionTitle text="Executive Summary" c={c} fs={fs} style="underline" />
          <div style={{ fontSize: 5.5*fs, color: "#444", lineHeight: 1.6 }}>{S.summary}</div>
        </div>
        <div>
          <SectionTitle text="Professional Experience" c={c} fs={fs} style="underline" />
          {S.experience.map((exp, i) => (
            <div key={i} style={{ marginBottom: 9*fs }}>
              <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 4*fs }}>
                <span style={{ fontSize: 7*fs, fontWeight: 700, color: "#222" }}>{exp.title}</span>
                <span style={{ fontSize: 5*fs, color: c, fontWeight: 600 }}>{exp.dates}</span>
              </div>
              <div style={{ fontSize: 6*fs, color: "#555", fontStyle: "italic", marginBottom: 3*fs }}>{exp.company}, {exp.location}</div>
              {exp.bullets.map((b, j) => (
                <div key={j} style={{ fontSize: 5.5*fs, color: "#444", lineHeight: 1.55, paddingLeft: 8*fs, position: "relative", marginBottom: 1.5*fs }}>
                  <span style={{ position: "absolute", left: 0, color: c }}>▪</span>{b}
                </div>
              ))}
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 16*fs, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 80*fs }}>
            <SectionTitle text="Education" c={c} fs={fs} style="underline" />
            <div style={{ fontSize: 6.5*fs, fontWeight: 600 }}>{S.education.degree}</div>
            <div style={{ fontSize: 5.5*fs, color: "#555" }}>{S.education.school}</div>
            <div style={{ fontSize: 5*fs, color: "#888" }}>{S.education.dates} | GPA: {S.education.gpa}</div>
          </div>
          <div style={{ flex: 1, minWidth: 80*fs }}>
            <SectionTitle text="Core Competencies" c={c} fs={fs} style="underline" />
            <div style={{ display: "flex", flexWrap: "wrap", gap: 3*fs }}>
              {S.skills.map((s, i) => (
                <span key={i} style={{ fontSize: 5*fs, padding: `${1.5*fs}px ${5*fs}px`, border: `1px solid ${withAlpha(c, 0.25)}`, borderRadius: 2*fs, color: "#444" }}>{s.name}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Layout8({ c, c2 }: LP) {
  const fs = 1;
  return (
    <div style={{ fontFamily: "'Segoe UI', system-ui, sans-serif", height: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{ background: `linear-gradient(135deg, ${c}, ${c2})`, color: "#fff", padding: `${28*fs}px ${22*fs}px`, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", right: -20*fs, top: -20*fs, width: 80*fs, height: 80*fs, borderRadius: "50%", backgroundColor: "rgba(255,255,255,0.08)" }} />
        <div style={{ position: "absolute", right: 20*fs, bottom: -30*fs, width: 60*fs, height: 60*fs, borderRadius: "50%", backgroundColor: "rgba(255,255,255,0.05)" }} />
        <div style={{ fontSize: 24*fs, fontWeight: 800, letterSpacing: -0.5*fs }}>{S.name}</div>
        <div style={{ fontSize: 9*fs, fontWeight: 300, opacity: 0.9, marginTop: 3*fs, letterSpacing: 3*fs, textTransform: "uppercase" }}>{S.title}</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8*fs, marginTop: 10*fs, fontSize: 5*fs, opacity: 0.85 }}>
          {[`✉ ${S.email}`, `✆ ${S.phone}`, `⌂ ${S.location}`, `⊕ ${S.website}`].map((item, i) => (
            <span key={i} style={{ backgroundColor: "rgba(255,255,255,0.15)", padding: `${2*fs}px ${7*fs}px`, borderRadius: 10*fs }}>{item}</span>
          ))}
        </div>
      </div>
      <div style={{ flex: 1, padding: `${16*fs}px ${22*fs}px`, display: "flex", flexDirection: "column", gap: 10*fs }}>
        <div style={{ display: "flex", gap: 16*fs }}>
          <div style={{ flex: 2 }}>
            <SectionTitle text="About Me" c={c} fs={fs} style="bar" />
            <div style={{ fontSize: 5.5*fs, color: "#555", lineHeight: 1.6 }}>{S.summary}</div>
          </div>
          <div style={{ flex: 1 }}>
            <SectionTitle text="Skills" c={c} fs={fs} style="bar" />
            <div style={{ display: "flex", flexWrap: "wrap", gap: 3*fs }}>
              {S.skills.map((s, i) => (
                <span key={i} style={{ fontSize: 5*fs, backgroundColor: withAlpha(c, 0.1), color: c, fontWeight: 600, borderRadius: 10*fs, padding: `${2*fs}px ${7*fs}px` }}>{s.name}</span>
              ))}
            </div>
          </div>
        </div>
        <div>
          <SectionTitle text="Experience" c={c} fs={fs} style="bar" />
          {S.experience.map((exp, i) => <ExpBlock key={i} exp={exp} c={c} fs={fs} timeline />)}
        </div>
        <div style={{ display: "flex", gap: 16*fs, flexWrap: "wrap" }}>
          <div style={{ flex: 1 }}>
            <SectionTitle text="Education" c={c} fs={fs} style="bar" />
            <div style={{ fontSize: 6.5*fs, fontWeight: 700, color: "#222" }}>{S.education.degree}</div>
            <div style={{ fontSize: 5.5*fs, color: c, fontWeight: 500 }}>{S.education.school}</div>
            <div style={{ fontSize: 5*fs, color: "#888" }}>{S.education.dates}</div>
          </div>
          <div style={{ flex: 1 }}>
            <SectionTitle text="Certifications" c={c} fs={fs} style="bar" />
            {S.certifications.map((cert,i) => <div key={i} style={{ fontSize: 5.5*fs, color: "#444", marginBottom: 3*fs }}>✦ {cert}</div>)}
          </div>
        </div>
      </div>
    </div>
  );
}

function Layout9({ c, c2 }: LP) {
  const fs = 1;
  return (
    <div style={{ fontFamily: "'Segoe UI', system-ui, sans-serif", height: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "stretch" }}>
        <div style={{ width: "40%", background: `linear-gradient(135deg, ${c}, ${c2})`, padding: `${20*fs}px ${14*fs}px`, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" }}>
          <ProfileCircle c={c} size={56} fs={fs} />
        </div>
        <div style={{ width: "60%", padding: `${20*fs}px ${18*fs}px`, display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <div style={{ fontSize: 22*fs, fontWeight: 800, color: "#1a1a1a" }}>{S.name}</div>
          <div style={{ fontSize: 8*fs, color: c, fontWeight: 500, marginTop: 2*fs, letterSpacing: 1.5*fs, textTransform: "uppercase" }}>{S.title}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 2*fs, marginTop: 6*fs }}>
            <ContactItem icon="✉" text={S.email} fs={fs} />
            <ContactItem icon="✆" text={S.phone} fs={fs} />
            <ContactItem icon="⌂" text={S.location} fs={fs} />
          </div>
        </div>
      </div>
      <div style={{ flex: 1, display: "flex" }}>
        <div style={{ width: "40%", backgroundColor: withAlpha(c, 0.04), padding: `${14*fs}px ${14*fs}px`, display: "flex", flexDirection: "column", gap: 12*fs }}>
          <div>
            <SectionTitle text="Skills" c={c} fs={fs} style="plain" />
            <SkillBars skills={S.skills.slice(0,6)} c={c} fs={fs} />
          </div>
          <div>
            <SectionTitle text="Education" c={c} fs={fs} style="plain" />
            <div style={{ fontSize: 6.5*fs, fontWeight: 600, color: "#222" }}>{S.education.degree}</div>
            <div style={{ fontSize: 5.5*fs, color: "#555" }}>{S.education.school}</div>
            <div style={{ fontSize: 5*fs, color: "#888" }}>{S.education.dates}</div>
          </div>
          <div>
            <SectionTitle text="Languages" c={c} fs={fs} style="plain" />
            {S.languages.map((l,i) => <div key={i} style={{ fontSize: 5.5*fs, color: "#555", marginBottom: 2*fs }}>{l}</div>)}
          </div>
        </div>
        <div style={{ width: "60%", padding: `${14*fs}px ${18*fs}px`, display: "flex", flexDirection: "column", gap: 10*fs }}>
          <div>
            <SectionTitle text="About Me" c={c} fs={fs} style="bar" />
            <div style={{ fontSize: 5.5*fs, color: "#555", lineHeight: 1.6 }}>{S.summary}</div>
          </div>
          <div>
            <SectionTitle text="Experience" c={c} fs={fs} style="bar" />
            {S.experience.map((exp, i) => <ExpBlock key={i} exp={exp} c={c} fs={fs} />)}
          </div>
        </div>
      </div>
    </div>
  );
}

function Layout10({ c, c2 }: LP) {
  const fs = 1;
  return (
    <div style={{ fontFamily: "'Segoe UI', system-ui, sans-serif", height: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{ background: c, color: "#fff", padding: `${16*fs}px ${22*fs}px`, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8*fs }}>
        <div>
          <div style={{ fontSize: 20*fs, fontWeight: 800 }}>{S.name}</div>
          <div style={{ fontSize: 7*fs, opacity: 0.85, marginTop: 1*fs, letterSpacing: 2*fs, textTransform: "uppercase" }}>{S.title}</div>
        </div>
        <ProfileCircle c={c} size={42} fs={fs} />
      </div>
      <div style={{ backgroundColor: withAlpha(c, 0.08), padding: `${8*fs}px ${22*fs}px`, display: "flex", flexWrap: "wrap", gap: 8*fs, fontSize: 5*fs, color: "#555" }}>
        {[`✉ ${S.email}`, `✆ ${S.phone}`, `⌂ ${S.location}`, `⊕ ${S.website}`].map((item, i) => <span key={i}>{item}</span>)}
      </div>
      <div style={{ flex: 1, padding: `${14*fs}px ${22*fs}px`, display: "flex", gap: 16*fs }}>
        <div style={{ flex: 2, display: "flex", flexDirection: "column", gap: 10*fs }}>
          <div>
            <SectionTitle text="Profile" c={c} fs={fs} style="line" />
            <div style={{ fontSize: 5.5*fs, color: "#555", lineHeight: 1.6 }}>{S.summary}</div>
          </div>
          <div>
            <SectionTitle text="Experience" c={c} fs={fs} style="line" />
            {S.experience.map((exp, i) => <ExpBlock key={i} exp={exp} c={c} fs={fs} />)}
          </div>
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10*fs, borderLeft: `1px solid ${withAlpha(c, 0.15)}`, paddingLeft: 14*fs }}>
          <div>
            <SectionTitle text="Skills" c={c} fs={fs} style="line" />
            <SkillDots skills={S.skills.slice(0,5)} c={c} fs={fs} />
          </div>
          <div>
            <SectionTitle text="Education" c={c} fs={fs} style="line" />
            <div style={{ fontSize: 6.5*fs, fontWeight: 600, color: "#222" }}>{S.education.degree}</div>
            <div style={{ fontSize: 5.5*fs, color: "#555" }}>{S.education.school}</div>
            <div style={{ fontSize: 5*fs, color: "#888" }}>{S.education.dates}</div>
          </div>
          <div>
            <SectionTitle text="Certifications" c={c} fs={fs} style="line" />
            {S.certifications.map((cert,i) => <div key={i} style={{ fontSize: 5.5*fs, color: "#444", marginBottom: 3*fs }}>▹ {cert}</div>)}
          </div>
        </div>
      </div>
    </div>
  );
}

function Layout11({ c }: LP) {
  const fs = 1;
  return (
    <div style={{ padding: `${30*fs}px ${24*fs}px`, fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", display: "flex", flexDirection: "column", gap: 14*fs, height: "100%" }}>
      <div>
        <div style={{ fontSize: 26*fs, fontWeight: 300, color: "#1a1a1a", letterSpacing: -0.5*fs }}>{S.name}</div>
        <div style={{ fontSize: 7.5*fs, color: "#999", fontWeight: 300, marginTop: 2*fs, letterSpacing: 3*fs, textTransform: "uppercase" }}>{S.title}</div>
        <div style={{ fontSize: 5*fs, color: "#bbb", marginTop: 6*fs }}>
          {S.email} · {S.phone} · {S.location}
        </div>
      </div>
      <div style={{ width: 35*fs, height: 1.5*fs, backgroundColor: c }} />
      <div style={{ fontSize: 5.5*fs, color: "#777", lineHeight: 1.7, fontWeight: 300 }}>{S.summary}</div>
      <div>
        <div style={{ fontSize: 6*fs, fontWeight: 500, color: "#aaa", textTransform: "uppercase", letterSpacing: 3*fs, marginBottom: 8*fs }}>Experience</div>
        {S.experience.map((exp, i) => (
          <div key={i} style={{ marginBottom: 12*fs }}>
            <div style={{ fontSize: 7.5*fs, fontWeight: 500, color: "#333" }}>{exp.title}</div>
            <div style={{ fontSize: 5.5*fs, color: "#999", marginBottom: 4*fs }}>{exp.company} — {exp.dates}</div>
            {exp.bullets.map((b, j) => (
              <div key={j} style={{ fontSize: 5.5*fs, color: "#777", lineHeight: 1.7, fontWeight: 300, marginBottom: 1*fs }}>{b}</div>
            ))}
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 24*fs, flexWrap: "wrap" }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 6*fs, fontWeight: 500, color: "#aaa", textTransform: "uppercase", letterSpacing: 3*fs, marginBottom: 6*fs }}>Education</div>
          <div style={{ fontSize: 6.5*fs, fontWeight: 500, color: "#333" }}>{S.education.degree}</div>
          <div style={{ fontSize: 5*fs, color: "#999" }}>{S.education.school} · {S.education.dates}</div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 6*fs, fontWeight: 500, color: "#aaa", textTransform: "uppercase", letterSpacing: 3*fs, marginBottom: 6*fs }}>Skills</div>
          <div style={{ fontSize: 5.5*fs, color: "#777", lineHeight: 2, fontWeight: 300 }}>{S.skills.map(s => s.name).join("  ·  ")}</div>
        </div>
      </div>
    </div>
  );
}

function Layout12({ c }: LP) {
  const fs = 1;
  return (
    <div style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", height: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: `${24*fs}px ${24*fs}px ${16*fs}px`, borderBottom: `1px solid #eee` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 8*fs }}>
          <div>
            <div style={{ fontSize: 22*fs, fontWeight: 600, color: "#1a1a1a" }}>{S.name}</div>
            <div style={{ fontSize: 7*fs, color: c, fontWeight: 400, marginTop: 2*fs }}>{S.title}</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2*fs, fontSize: 5*fs, color: "#999" }}>
            <span>{S.email}</span>
            <span>{S.phone}</span>
            <span>{S.location}</span>
          </div>
        </div>
      </div>
      <div style={{ flex: 1, padding: `${14*fs}px ${24*fs}px`, display: "flex", flexDirection: "column", gap: 12*fs }}>
        <div style={{ fontSize: 5.5*fs, color: "#777", lineHeight: 1.65, fontWeight: 300, borderLeft: `2px solid ${c}`, paddingLeft: 10*fs }}>{S.summary}</div>
        <div>
          <div style={{ fontSize: 6*fs, fontWeight: 600, color: "#999", textTransform: "uppercase", letterSpacing: 2.5*fs, marginBottom: 8*fs }}>{`Experience`}</div>
          {S.experience.map((exp, i) => (
            <div key={i} style={{ marginBottom: 10*fs, display: "flex", gap: 12*fs }}>
              <div style={{ width: 55*fs, flexShrink: 0, fontSize: 5*fs, color: "#aaa", fontWeight: 400, lineHeight: 1.6 }}>
                <div>{exp.dates.split("–")[0].trim()}</div>
                <div>{exp.dates.includes("Present") ? "Present" : exp.dates.split("–")[1].trim()}</div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 7*fs, fontWeight: 600, color: "#222" }}>{exp.title}</div>
                <div style={{ fontSize: 5.5*fs, color: c, marginBottom: 3*fs }}>{exp.company}</div>
                {exp.bullets.map((b, j) => (
                  <div key={j} style={{ fontSize: 5.5*fs, color: "#666", lineHeight: 1.6, marginBottom: 1.5*fs }}>{b}</div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 20*fs, flexWrap: "wrap" }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 6*fs, fontWeight: 600, color: "#999", textTransform: "uppercase", letterSpacing: 2.5*fs, marginBottom: 6*fs }}>Education</div>
            <div style={{ fontSize: 6.5*fs, fontWeight: 500, color: "#333" }}>{S.education.degree}</div>
            <div style={{ fontSize: 5*fs, color: "#999" }}>{S.education.school}</div>
            <div style={{ fontSize: 5*fs, color: "#bbb" }}>{S.education.dates}</div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 6*fs, fontWeight: 600, color: "#999", textTransform: "uppercase", letterSpacing: 2.5*fs, marginBottom: 6*fs }}>Skills</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 3*fs }}>
              {S.skills.map((s, i) => (
                <span key={i} style={{ fontSize: 5*fs, padding: `${2*fs}px ${6*fs}px`, border: `1px solid #e5e5e5`, borderRadius: 10*fs, color: "#666" }}>{s.name}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const LAYOUTS: Record<LayoutId, (props: LP) => JSX.Element> = {
  1: Layout1, 2: Layout2, 3: Layout3, 4: Layout4, 5: Layout5, 6: Layout6,
  7: Layout7, 8: Layout8, 9: Layout9, 10: Layout10, 11: Layout11, 12: Layout12,
};

export function ResumePreview({ template, fullSize }: ResumePreviewProps) {
  const layoutId = TEMPLATE_LAYOUT_MAP[template.id] || 6;
  const LayoutComp = LAYOUTS[layoutId];
  const c = template.colorAccent;
  const c2 = lighten(c, 40);

  if (fullSize) {
    return (
      <div style={{ width: "100%", backgroundColor: "#fff", minHeight: "800px" }} data-testid={`preview-full-${template.id}`}>
        <LayoutComp c={c} c2={c2} />
      </div>
    );
  }

  return (
    <div className="w-full h-full select-none overflow-hidden" style={{ backgroundColor: "#fff" }} data-testid={`preview-${template.id}`}>
      <div style={{ transform: "scale(0.28)", transformOrigin: "top left", width: "357%", height: "357%" }}>
        <LayoutComp c={c} c2={c2} />
      </div>
    </div>
  );
}
