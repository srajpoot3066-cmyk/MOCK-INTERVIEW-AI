import type { ResumeTemplate } from "@/lib/resume-templates";

export interface GeneratedResumeData {
  name: string;
  title: string;
  email: string;
  phone: string;
  location: string;
  linkedin: string;
  website: string;
  summary: string;
  experience: {
    title: string;
    company: string;
    location: string;
    dates: string;
    bullets: string[];
  }[];
  skills: string[];
  education: {
    degree: string;
    school: string;
    dates: string;
    gpa: string;
  };
  certifications: string[];
  languages: string[];
  keywords: string[];
}

interface GeneratedResumeProps {
  data: GeneratedResumeData;
  template: ResumeTemplate;
}

type LayoutId = 1 | 2 | 3 | 4;

const TEMPLATE_LAYOUT_MAP: Record<string, LayoutId> = {
  "modern-01": 1, "modern-02": 2, "modern-03": 3, "modern-04": 4, "modern-05": 1,
  "classic-01": 4, "classic-02": 4, "classic-03": 4, "classic-04": 4,
  "creative-01": 1, "creative-02": 2, "creative-03": 3, "creative-04": 1, "creative-05": 2,
  "minimal-01": 4, "minimal-02": 4, "minimal-03": 4, "minimal-04": 4, "minimal-05": 4,
  "exec-01": 2, "exec-02": 4, "exec-03": 2, "exec-04": 4,
  "tech-01": 1, "tech-02": 3, "tech-03": 4, "tech-04": 2, "tech-05": 1, "tech-06": 3,
  "health-01": 1, "health-02": 4, "health-03": 2, "health-04": 1,
  "fin-01": 4, "fin-02": 2, "fin-03": 4, "fin-04": 2,
  "mkt-01": 3, "mkt-02": 1, "mkt-03": 2, "mkt-04": 3,
  "edu-01": 4, "edu-02": 4, "edu-03": 2, "edu-04": 4,
  "entry-01": 4, "entry-02": 1, "entry-03": 2, "entry-04": 4,
  "ats-01": 4, "ats-02": 4, "ats-03": 4, "ats-04": 4, "ats-05": 4,
};

function withAlpha(hex: string, a: number): string {
  const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${a})`;
}

function darken(hex: string, amt: number): string {
  const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
  return `rgb(${Math.max(0, r - amt)},${Math.max(0, g - amt)},${Math.max(0, b - amt)})`;
}

function Initials({ name, c, size }: { name: string; c: string; size: number }) {
  const init = name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", backgroundColor: "#fff", display: "flex", alignItems: "center", justifyContent: "center", border: "3px solid rgba(255,255,255,0.4)", flexShrink: 0 }}>
      <span style={{ fontSize: size * 0.38, fontWeight: 700, color: c }}>{init}</span>
    </div>
  );
}

function SectionHead({ text, c, variant }: { text: string; c: string; variant: "bar" | "line" | "simple" }) {
  if (variant === "bar") return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
      <div style={{ width: 3, height: 18, backgroundColor: c, borderRadius: 2 }} />
      <span style={{ fontSize: 11, fontWeight: 700, color: "#222", textTransform: "uppercase", letterSpacing: 1.2 }}>{text}</span>
    </div>
  );
  if (variant === "line") return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: c, textTransform: "uppercase", letterSpacing: 1.5 }}>{text}</div>
      <div style={{ height: 2, backgroundColor: c, marginTop: 3, width: "100%" }} />
    </div>
  );
  return (
    <div style={{ fontSize: 11, fontWeight: 700, color: c, textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 10, borderBottom: `1.5px solid ${withAlpha(c, 0.3)}`, paddingBottom: 4 }}>
      {text}
    </div>
  );
}

function ExpEntry({ exp, c }: { exp: GeneratedResumeData["experience"][0]; c: string }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 4 }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: "#1a1a1a" }}>{exp.title}</span>
        <span style={{ fontSize: 8, color: "#888", fontWeight: 500 }}>{exp.dates}</span>
      </div>
      <div style={{ fontSize: 9, color: c, fontWeight: 600, marginBottom: 4 }}>{exp.company}{exp.location ? ` | ${exp.location}` : ""}</div>
      {exp.bullets.map((b, j) => (
        <div key={j} style={{ fontSize: 8.5, color: "#555", lineHeight: 1.55, paddingLeft: 12, position: "relative", marginBottom: 3 }}>
          <span style={{ position: "absolute", left: 0, color: c, fontWeight: 700 }}>{"\u2022"}</span>{b}
        </div>
      ))}
    </div>
  );
}

function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function SkillBar({ name, c, light, index }: { name: string; c: string; light?: boolean; index: number }) {
  const width = 70 + (hashCode(name + index) % 26);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
      <span style={{ fontSize: 8, fontWeight: 500, color: light ? "rgba(255,255,255,0.95)" : "#444", minWidth: 60 }}>{name}</span>
      <div style={{ flex: 1, height: 5, backgroundColor: light ? "rgba(255,255,255,0.2)" : withAlpha(c, 0.12), borderRadius: 3, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${width}%`, backgroundColor: light ? "rgba(255,255,255,0.85)" : c, borderRadius: 3 }} />
      </div>
    </div>
  );
}

function ContactLine({ icon, text, light }: { icon: string; text: string; light?: boolean }) {
  if (!text) return null;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 8, color: light ? "rgba(255,255,255,0.9)" : "#555", lineHeight: 1.4 }}>
      <span style={{ fontSize: 7, opacity: 0.7, flexShrink: 0 }}>{icon}</span>
      <span style={{ wordBreak: "break-all" }}>{text}</span>
    </div>
  );
}

function SidebarLayout({ data, c }: { data: GeneratedResumeData; c: string }) {
  const c2 = darken(c, 30);
  return (
    <div style={{ display: "flex", width: "100%", minHeight: "100%", fontFamily: "'Segoe UI', system-ui, sans-serif", backgroundColor: "#fff" }}>
      <div style={{ width: "34%", background: `linear-gradient(180deg, ${c}, ${c2})`, color: "#fff", padding: "28px 18px", display: "flex", flexDirection: "column", gap: 18 }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
          <Initials name={data.name} c={c} size={56} />
          <div style={{ fontSize: 16, fontWeight: 700, marginTop: 10, lineHeight: 1.2 }}>{data.name}</div>
          <div style={{ fontSize: 9, opacity: 0.85, marginTop: 4, letterSpacing: 1.2, textTransform: "uppercase", fontWeight: 300 }}>{data.title}</div>
        </div>
        <div style={{ height: 1, backgroundColor: "rgba(255,255,255,0.25)" }} />
        <div>
          <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 8, opacity: 0.9 }}>Contact</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <ContactLine icon={"\u2709"} text={data.email} light />
            <ContactLine icon={"\u260E"} text={data.phone} light />
            <ContactLine icon={"\u2302"} text={data.location} light />
            <ContactLine icon={"\u2295"} text={data.linkedin} light />
            {data.website && <ContactLine icon={"\u2739"} text={data.website} light />}
          </div>
        </div>
        <div style={{ height: 1, backgroundColor: "rgba(255,255,255,0.25)" }} />
        <div>
          <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 10, opacity: 0.9 }}>Skills</div>
          {data.skills.slice(0, 8).map((s, i) => <SkillBar key={i} name={s} c={c} light index={i} />)}
        </div>
        <div style={{ height: 1, backgroundColor: "rgba(255,255,255,0.25)" }} />
        <div>
          <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 8, opacity: 0.9 }}>Education</div>
          <div style={{ fontSize: 9, fontWeight: 600 }}>{data.education.degree}</div>
          <div style={{ fontSize: 8, opacity: 0.85, marginTop: 2 }}>{data.education.school}</div>
          <div style={{ fontSize: 7, opacity: 0.65, marginTop: 2 }}>{data.education.dates}{data.education.gpa ? ` | GPA: ${data.education.gpa}` : ""}</div>
        </div>
        {data.certifications.length > 0 && (
          <>
            <div style={{ height: 1, backgroundColor: "rgba(255,255,255,0.25)" }} />
            <div>
              <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 8, opacity: 0.9 }}>Certifications</div>
              {data.certifications.map((cert, i) => <div key={i} style={{ fontSize: 8, opacity: 0.85, marginBottom: 3 }}>{cert}</div>)}
            </div>
          </>
        )}
        {data.languages.length > 0 && (
          <>
            <div style={{ height: 1, backgroundColor: "rgba(255,255,255,0.25)" }} />
            <div>
              <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 8, opacity: 0.9 }}>Languages</div>
              {data.languages.map((l, i) => <div key={i} style={{ fontSize: 8, opacity: 0.85, marginBottom: 2 }}>{l}</div>)}
            </div>
          </>
        )}
      </div>
      <div style={{ width: "66%", padding: "28px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <SectionHead text="Professional Summary" c={c} variant="bar" />
          <div style={{ fontSize: 9, color: "#555", lineHeight: 1.65 }}>{data.summary}</div>
        </div>
        <div>
          <SectionHead text="Work Experience" c={c} variant="bar" />
          {data.experience.map((exp, i) => <ExpEntry key={i} exp={exp} c={c} />)}
        </div>
        {data.keywords.length > 0 && (
          <div>
            <SectionHead text="ATS Keywords" c={c} variant="bar" />
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {data.keywords.map((kw, i) => (
                <span key={i} style={{ fontSize: 7.5, padding: "2px 8px", backgroundColor: withAlpha(c, 0.08), border: `1px solid ${withAlpha(c, 0.2)}`, borderRadius: 12, color: "#444" }}>{kw}</span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function RightSidebarLayout({ data, c }: { data: GeneratedResumeData; c: string }) {
  return (
    <div style={{ display: "flex", width: "100%", minHeight: "100%", fontFamily: "'Segoe UI', system-ui, sans-serif", backgroundColor: "#fff" }}>
      <div style={{ width: "66%", padding: "28px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <div style={{ fontSize: 26, fontWeight: 800, color: "#1a1a1a", letterSpacing: -0.5 }}>{data.name}</div>
          <div style={{ fontSize: 11, color: c, fontWeight: 500, marginTop: 3, letterSpacing: 1.2, textTransform: "uppercase" }}>{data.title}</div>
        </div>
        <div style={{ height: 2, background: `linear-gradient(90deg, ${c}, transparent)` }} />
        <div>
          <SectionHead text="About Me" c={c} variant="line" />
          <div style={{ fontSize: 9, color: "#555", lineHeight: 1.65 }}>{data.summary}</div>
        </div>
        <div>
          <SectionHead text="Experience" c={c} variant="line" />
          {data.experience.map((exp, i) => <ExpEntry key={i} exp={exp} c={c} />)}
        </div>
        <div>
          <SectionHead text="Education" c={c} variant="line" />
          <div style={{ fontSize: 10, fontWeight: 600, color: "#222" }}>{data.education.degree}</div>
          <div style={{ fontSize: 9, color: c, fontWeight: 500 }}>{data.education.school}</div>
          <div style={{ fontSize: 8, color: "#888" }}>{data.education.dates}{data.education.gpa ? ` | GPA: ${data.education.gpa}` : ""}</div>
        </div>
      </div>
      <div style={{ width: "34%", backgroundColor: withAlpha(c, 0.06), borderLeft: `3px solid ${withAlpha(c, 0.15)}`, padding: "28px 18px", display: "flex", flexDirection: "column", gap: 18 }}>
        <div style={{ display: "flex", justifyContent: "center" }}>
          <Initials name={data.name} c={c} size={52} />
        </div>
        <div>
          <div style={{ fontSize: 9, fontWeight: 700, color: c, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 8 }}>Contact</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <ContactLine icon={"\u2709"} text={data.email} />
            <ContactLine icon={"\u260E"} text={data.phone} />
            <ContactLine icon={"\u2302"} text={data.location} />
            {data.linkedin && <ContactLine icon={"\u2295"} text={data.linkedin} />}
            {data.website && <ContactLine icon={"\u2739"} text={data.website} />}
          </div>
        </div>
        <div style={{ height: 1, backgroundColor: withAlpha(c, 0.15) }} />
        <div>
          <div style={{ fontSize: 9, fontWeight: 700, color: c, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 10 }}>Skills</div>
          {data.skills.slice(0, 8).map((s, i) => <SkillBar key={i} name={s} c={c} index={i} />)}
        </div>
        <div style={{ height: 1, backgroundColor: withAlpha(c, 0.15) }} />
        {data.certifications.length > 0 && (
          <div>
            <div style={{ fontSize: 9, fontWeight: 700, color: c, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 8 }}>Certifications</div>
            {data.certifications.map((cert, i) => (
              <div key={i} style={{ fontSize: 8, color: "#444", marginBottom: 3, paddingLeft: 10, position: "relative" }}>
                <span style={{ position: "absolute", left: 0, color: c }}>{"\u25B8"}</span>{cert}
              </div>
            ))}
          </div>
        )}
        {data.languages.length > 0 && (
          <div>
            <div style={{ fontSize: 9, fontWeight: 700, color: c, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 8 }}>Languages</div>
            {data.languages.map((l, i) => <div key={i} style={{ fontSize: 8, color: "#555", marginBottom: 2 }}>{l}</div>)}
          </div>
        )}
        {data.keywords.length > 0 && (
          <>
            <div style={{ height: 1, backgroundColor: withAlpha(c, 0.15) }} />
            <div>
              <div style={{ fontSize: 9, fontWeight: 700, color: c, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 8 }}>ATS Keywords</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
                {data.keywords.map((kw, i) => (
                  <span key={i} style={{ fontSize: 7, padding: "2px 6px", backgroundColor: withAlpha(c, 0.08), borderRadius: 10, color: "#444" }}>{kw}</span>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function HeaderLayout({ data, c }: { data: GeneratedResumeData; c: string }) {
  const c2 = darken(c, 30);
  return (
    <div style={{ fontFamily: "'Segoe UI', system-ui, sans-serif", minHeight: "100%", display: "flex", flexDirection: "column", backgroundColor: "#fff" }}>
      <div style={{ background: `linear-gradient(135deg, ${c}, ${c2})`, color: "#fff", padding: "22px 28px", display: "flex", alignItems: "center", gap: 18 }}>
        <Initials name={data.name} c={c} size={58} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: -0.3 }}>{data.name}</div>
          <div style={{ fontSize: 10, fontWeight: 300, opacity: 0.9, marginTop: 3, letterSpacing: 2, textTransform: "uppercase" }}>{data.title}</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 8, fontSize: 8, opacity: 0.85 }}>
            {data.email && <span>{"\u2709"} {data.email}</span>}
            {data.phone && <span>{"\u260E"} {data.phone}</span>}
            {data.location && <span>{"\u2302"} {data.location}</span>}
          </div>
        </div>
      </div>
      <div style={{ flex: 1, display: "flex" }}>
        <div style={{ width: "65%", padding: "18px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <SectionHead text="Profile" c={c} variant="line" />
            <div style={{ fontSize: 9, color: "#555", lineHeight: 1.65 }}>{data.summary}</div>
          </div>
          <div>
            <SectionHead text="Work Experience" c={c} variant="line" />
            {data.experience.map((exp, i) => <ExpEntry key={i} exp={exp} c={c} />)}
          </div>
        </div>
        <div style={{ width: "35%", backgroundColor: "#f8f9fa", padding: "18px 18px", display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <SectionHead text="Skills" c={c} variant="line" />
            {data.skills.slice(0, 8).map((s, i) => <SkillBar key={i} name={s} c={c} index={i} />)}
          </div>
          <div>
            <SectionHead text="Education" c={c} variant="line" />
            <div style={{ fontSize: 9, fontWeight: 700, color: "#222" }}>{data.education.degree}</div>
            <div style={{ fontSize: 8, color: c, fontWeight: 500 }}>{data.education.school}</div>
            <div style={{ fontSize: 7, color: "#888" }}>{data.education.dates}</div>
          </div>
          {data.certifications.length > 0 && (
            <div>
              <SectionHead text="Certifications" c={c} variant="line" />
              {data.certifications.map((cert, i) => <div key={i} style={{ fontSize: 8, color: "#444", marginBottom: 3 }}>{"\u25B9"} {cert}</div>)}
            </div>
          )}
          {data.languages.length > 0 && (
            <div>
              <SectionHead text="Languages" c={c} variant="line" />
              {data.languages.map((l, i) => <div key={i} style={{ fontSize: 8, color: "#555", marginBottom: 2 }}>{l}</div>)}
            </div>
          )}
          {data.keywords.length > 0 && (
            <div>
              <SectionHead text="ATS Keywords" c={c} variant="line" />
              <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
                {data.keywords.map((kw, i) => (
                  <span key={i} style={{ fontSize: 7, padding: "2px 6px", backgroundColor: withAlpha(c, 0.1), borderRadius: 10, color: "#444" }}>{kw}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SingleColumnLayout({ data, c }: { data: GeneratedResumeData; c: string }) {
  return (
    <div style={{ fontFamily: "'Segoe UI', system-ui, sans-serif", minHeight: "100%", display: "flex", backgroundColor: "#fff" }}>
      <div style={{ width: 5, background: `linear-gradient(180deg, ${c}, ${darken(c, 40)})`, flexShrink: 0 }} />
      <div style={{ flex: 1, padding: "24px 28px", display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <Initials name={data.name} c={c} size={52} />
          <div>
            <div style={{ fontSize: 24, fontWeight: 800, color: "#1a1a1a" }}>{data.name}</div>
            <div style={{ fontSize: 10, color: c, fontWeight: 500, marginTop: 2 }}>{data.title}</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 6, fontSize: 8, color: "#777" }}>
              {data.email && <span>{"\u2709"} {data.email}</span>}
              {data.phone && <span>| {"\u260E"} {data.phone}</span>}
              {data.location && <span>| {"\u2302"} {data.location}</span>}
              {data.linkedin && <span>| {data.linkedin}</span>}
            </div>
          </div>
        </div>
        <div style={{ height: 2, background: `linear-gradient(90deg, ${c}, ${withAlpha(c, 0.1)})` }} />
        <div>
          <SectionHead text="Professional Summary" c={c} variant="simple" />
          <div style={{ fontSize: 9, color: "#555", lineHeight: 1.65 }}>{data.summary}</div>
        </div>
        <div>
          <SectionHead text="Experience" c={c} variant="simple" />
          {data.experience.map((exp, i) => <ExpEntry key={i} exp={exp} c={c} />)}
        </div>
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 120 }}>
            <SectionHead text="Education" c={c} variant="simple" />
            <div style={{ fontSize: 10, fontWeight: 700, color: "#222" }}>{data.education.degree}</div>
            <div style={{ fontSize: 9, color: c, fontWeight: 500 }}>{data.education.school}</div>
            <div style={{ fontSize: 8, color: "#888" }}>{data.education.dates}{data.education.gpa ? ` | GPA: ${data.education.gpa}` : ""}</div>
          </div>
          <div style={{ flex: 1, minWidth: 120 }}>
            <SectionHead text="Skills" c={c} variant="simple" />
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {data.skills.map((s, i) => (
                <span key={i} style={{ fontSize: 8, padding: "3px 8px", backgroundColor: withAlpha(c, 0.08), border: `1px solid ${withAlpha(c, 0.2)}`, borderRadius: 12, color: "#444" }}>{s}</span>
              ))}
            </div>
          </div>
        </div>
        {(data.certifications.length > 0 || data.languages.length > 0) && (
          <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
            {data.certifications.length > 0 && (
              <div style={{ flex: 1, minWidth: 120 }}>
                <SectionHead text="Certifications" c={c} variant="simple" />
                {data.certifications.map((cert, i) => <div key={i} style={{ fontSize: 8.5, color: "#444", marginBottom: 3 }}>{"\u25B9"} {cert}</div>)}
              </div>
            )}
            {data.languages.length > 0 && (
              <div style={{ flex: 1, minWidth: 120 }}>
                <SectionHead text="Languages" c={c} variant="simple" />
                {data.languages.map((l, i) => <div key={i} style={{ fontSize: 8.5, color: "#555", marginBottom: 2 }}>{l}</div>)}
              </div>
            )}
          </div>
        )}
        {data.keywords.length > 0 && (
          <div>
            <SectionHead text="ATS Keywords" c={c} variant="simple" />
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {data.keywords.map((kw, i) => (
                <span key={i} style={{ fontSize: 7.5, padding: "2px 8px", backgroundColor: withAlpha(c, 0.06), borderRadius: 12, color: "#555" }}>{kw}</span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function GeneratedResume({ data, template }: GeneratedResumeProps) {
  const layoutId = TEMPLATE_LAYOUT_MAP[template.id] || 4;
  const c = template.colorAccent;

  switch (layoutId) {
    case 1: return <SidebarLayout data={data} c={c} />;
    case 2: return <RightSidebarLayout data={data} c={c} />;
    case 3: return <HeaderLayout data={data} c={c} />;
    case 4: return <SingleColumnLayout data={data} c={c} />;
    default: return <SingleColumnLayout data={data} c={c} />;
  }
}
