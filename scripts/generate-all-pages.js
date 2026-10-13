import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DATA_DIR = join(ROOT, 'public', 'data');
const DIST_DIR = join(ROOT, 'dist');

function loadJSON(filename) {
  return JSON.parse(readFileSync(join(DATA_DIR, filename), 'utf-8'));
}

function writePage(urlPath, content) {
  const fullPath = join(DIST_DIR, urlPath, 'index.html');
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, content, 'utf-8');
}

function escape(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/* ---------- Layout ---------- */

function layout({ title, description, canonical, jsonLd, bodyContent, redirectHash }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escape(title)}</title>
  <meta name="description" content="${escape(description)}" />
  <link rel="canonical" href="https://bodytoolkit.fit${canonical}" />
  <meta name="robots" content="index, follow" />
  ${jsonLd ? `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>` : ''}
  <style>
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f8fafc;color:#334155;line-height:1.6}
    a{color:#2563eb;text-decoration:none}
    a:hover{text-decoration:underline}
    .header{background:#fff;border-bottom:1px solid #e2e8f0;position:sticky;top:0;z-index:50}
    .header-inner{max-width:1280px;margin:0 auto;padding:0 24px;display:flex;align-items:center;height:64px;gap:12px}
    .header-logo{width:32px;height:32px;border-radius:8px}
    .header-title{font-size:18px;font-weight:500;color:#0f172a;text-decoration:none}
    .container{max-width:1280px;margin:0 auto;padding:32px 24px}
    .hero{border-radius:16px;padding:32px;margin-bottom:32px;color:#fff}
    .hero h1{font-size:30px;font-weight:700;margin-bottom:8px;color:#fff}
    .hero p{margin-bottom:12px;opacity:.9;color:rgba(255,255,255,.9);line-height:1.6}
    .hero .badge{background:rgba(255,255,255,.2);color:#fff}
    .hero-pattern{background:linear-gradient(135deg,#3b82f6,#4f46e5)}
    .hero-exercise{background:linear-gradient(135deg,#10b981,#0d9488)}
    .hero-assessment{background:linear-gradient(135deg,#8b5cf6,#7c3aed)}
    .hero-condition{background:linear-gradient(135deg,#f59e0b,#d97706)}
    .card{background:#fff;border-radius:12px;border:1px solid #e2e8f0;padding:24px;margin-bottom:24px}
    .card h2{font-size:18px;font-weight:600;color:#0f172a;margin-bottom:16px}
    .card p{color:#475569;line-height:1.7;margin-bottom:0}
    .card ul,.card ol{padding-left:0;list-style:none;margin-bottom:0}
    .card li{color:#475569;margin-bottom:8px;display:flex;align-items:flex-start;gap:8px;line-height:1.6}
    .card li::before{content:'';width:6px;height:6px;border-radius:50%;background:#cbd5e1;display:inline-block;margin-top:8px;flex-shrink:0}
    .card-green{background:linear-gradient(135deg,#ecfdf5,#f0fdfa);border-color:#a7f3d0}
    .card-red{border:1px solid #fecaca}
    .card-red h2{color:#dc2626}
    .badge{display:inline-block;padding:4px 12px;font-size:12px;font-weight:500;border-radius:999px;background:#dbeafe;color:#1e40af;margin-right:4px;margin-bottom:4px}
    .tag{display:inline-block;padding:3px 10px;font-size:11px;font-weight:500;border-radius:6px;background:#fef3c7;color:#92400e;border:1px solid #fde68a;margin-right:4px;margin-bottom:4px}
    .step-num{display:inline-flex;width:24px;height:24px;border-radius:50%;align-items:center;justify-content:center;font-size:12px;font-weight:600;flex-shrink:0;margin-right:8px}
    .step-blue{background:#dbeafe;color:#2563eb}
    .step-emerald{background:#d1fae5;color:#059669}
    .step-violet{background:#ede9fe;color:#7c3aed}
    .star{display:inline-block;font-size:12px;margin-right:4px}
    .source{border-left:4px solid #10b981;padding-left:16px;margin-bottom:16px}
    .source p{font-size:14px;margin-bottom:4px;color:#334155!important}
    .source-type{display:inline-block;font-size:11px;padding:2px 8px;background:#d1fae5;color:#065f46;border-radius:4px;margin-bottom:4px}
    .source-link{font-size:13px;color:#2563eb}
    .section-title{font-size:18px;font-weight:600;color:#0f172a;margin-bottom:16px;padding-left:12px;border-left:3px solid #3b82f6}
    .related-list{display:flex;flex-direction:column;gap:8px}
    .related-item{display:block;padding:10px 14px;border-radius:8px;font-size:14px;font-weight:500;color:#0f172a;text-decoration:none;transition:background .15s}
    .related-item:hover{text-decoration:none}
    .related-exercise{background:#eff6ff;border:1px solid #bfdbfe}
    .related-exercise:hover{background:#dbeafe}
    .related-assessment{background:#f5f3ff;border:1px solid #ddd6fe}
    .related-assessment:hover{background:#ede9fe}
    .footer{background:#0f172a;color:#94a3b8;text-align:center;padding:32px;margin-top:48px;font-size:14px}
    .footer a{color:#f57c00}
    .footer-inner{max-width:1280px;margin:0 auto}
    .btn{display:inline-block;padding:10px 20px;background:#f57c00;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;transition:background .15s}
    .btn:hover{background:#e06900;text-decoration:none}
    .tool-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px;margin-bottom:24px}
    .tool-card{background:#fff;border-radius:12px;padding:20px;border:1px solid #e2e8f0}
    .tool-card h3{font-size:16px;font-weight:600;color:#0f172a;margin-bottom:8px}
    .preview-box{text-align:center;margin-top:32px;padding:16px;background:#f1f5f9;border-radius:8px}
    .preview-box p{font-size:14px;color:#64748b;margin-bottom:8px}
  </style>
</head>
<body>
  <header class="header">
    <div class="header-inner">
      <img src="/images/logo.svg" alt="CET" class="header-logo" />
      <a href="/" class="header-title">Corrective Exercise Toolkit</a>
    </div>
  </header>
  <div class="container">
    ${bodyContent}
    <div class="preview-box">
      <p>This is a static preview.</p>
      <a class="btn" href="${escape(redirectHash)}">Open in Interactive Toolkit →</a>
    </div>
  </div>
  <footer class="footer">
    <div class="footer-inner">
      <p>Corrective Exercise Toolkit — <a href="/">bodytoolkit.fit</a></p>
    </div>
  </footer>
</body>
</html>`;
}

/* ---------- Renderers ---------- */

function renderPattern(p) {
  const canonical = `/learn/patterns/${p.id}/`;
  const parts = [];
  parts.push(`<div class="hero hero-pattern"><h1>${escape(p.name)}</h1><p>${escape(p.overview || '')}</p><span class="badge">${escape(p.category)}</span></div>`);
  parts.push(`<div class="card"><h2>Biomechanical Mechanism</h2><p>${escape(p.biomechanical_mechanism)}</p></div>`);
  parts.push(`<div class="card"><h2>Clinical Rationale</h2><p>${escape(p.clinical_rationale)}</p></div>`);
  if (p.practical_solution) parts.push(`<div class="card card-green"><h2>Practical Solution</h2><p>${escape(p.practical_solution)}</p></div>`);
  if (p.common_compensations?.length) {
    parts.push(`<div class="card"><h2>Common Compensations</h2><ul>${p.common_compensations.map(c => `<li>${escape(c)}</li>`).join('')}</ul></div>`);
  }
  if (p.progression?.length || p.regression?.length) {
    parts.push(`<div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:24px">`);
    if (p.progression?.length) {
      parts.push(`<div class="card"><h2>Progression</h2><ol style="padding-left:0;list-style:none">${p.progression.map((x,i) => `<li style="display:flex;align-items:flex-start;gap:8px;margin-bottom:8px"><span class="step-num step-emerald">${i+1}</span><span style="color:#475569">${escape(x)}</span></li>`).join('')}</ol></div>`);
    }
    if (p.regression?.length) {
      parts.push(`<div class="card"><h2>Regression</h2><ul style="padding-left:0;list-style:none">${p.regression.map(x => `<li style="display:flex;align-items:flex-start;gap:8px;margin-bottom:8px">${escape(x)}</li>`).join('')}</ul></div>`);
    }
    parts.push(`</div>`);
  }
  if (p.red_flags?.length) {
    parts.push(`<div class="card card-red"><h2>Red Flags</h2><ul style="padding-left:0;list-style:none">${p.red_flags.map(x => `<li style="display:flex;align-items:flex-start;gap:8px;color:#dc2626;margin-bottom:8px"><span style="display:inline-block;width:16px;height:16px;border-radius:50%;background:#fef2f2;border:2px solid #fecaca;flex-shrink:0;margin-top:3px"></span>${escape(x)}</li>`).join('')}</ul></div>`);
  }
  if (p.differential_diagnosis?.length) {
    parts.push(`<div class="card"><h2>Differential Diagnosis</h2><div style="display:flex;flex-wrap:wrap;gap:8px">${p.differential_diagnosis.map(d => `<span class="tag">${escape(d)}</span>`).join('')}</div></div>`);
  }
  if (p.assessment_ids?.length || p.exercise_ids?.length) {
    const related = [];
    if (p.assessment_ids?.length) {
      related.push(`<div style="margin-bottom:12px"><div style="font-size:14px;font-weight:600;color:#0f172a;margin-bottom:8px">Related Assessments</div><div class="related-list">${p.assessment_ids.map(id => `<span class="related-item related-assessment">${escape(id.replace('a__','').replace(/_/g,' '))}</span>`).join('')}</div></div>`);
    }
    if (p.exercise_ids?.length) {
      related.push(`<div><div style="font-size:14px;font-weight:600;color:#0f172a;margin-bottom:8px">Related Exercises</div><div class="related-list">${p.exercise_ids.map(id => `<span class="related-item related-exercise">${escape(id.replace('e__','').replace(/_/g,' '))}</span>`).join('')}</div></div>`);
    }
    parts.push(`<div class="card">${related.join('')}</div>`);
  }
  if (p.evidence) {
    parts.push(`<div class="card" style="border-color:#a7f3d0"><h2>Evidence</h2>`);
    if (p.evidence.level) parts.push(`<p style="margin-bottom:8px"><strong style="color:#065f46">Level:</strong> ${escape(p.evidence.level)}</p>`);
    if (p.evidence.summary) parts.push(`<p style="margin-bottom:12px">${escape(p.evidence.summary)}</p>`);
    if (p.evidence.sources?.length) {
      parts.push(`<div style="margin-top:12px">${p.evidence.sources.map(s => `<div class="source"><p>${escape(s.title)}</p>${s.type ? `<span class="source-type">${escape(s.type)}</span> ` : ''}${s.url ? `<a href="${escape(s.url)}" class="source-link">View source</a>` : ''}</div>`).join('')}</div>`);
    }
    parts.push(`</div>`);
  }
  const desc = (p.overview || `Learn about ${p.name} movement pattern`).slice(0, 160);
  return layout({ title: `${p.name} — Corrective Exercise Toolkit`, description: desc, canonical, jsonLd: { "@context": "https://schema.org", "@type": "Article", headline: `${p.name} — Corrective Exercise Toolkit`, description: desc, url: `https://bodytoolkit.fit${canonical}` }, bodyContent: parts.join(''), redirectHash: `/#/learn/patterns/${p.id}` });
}

function renderExercise(ex, category) {
  const canonical = `/exercises/${ex.id}/`;
  const parts = [];
  parts.push(`<div class="hero hero-exercise"><h1>${escape(ex.name)}</h1>${ex.description ? `<p>${escape(ex.description)}</p>` : ''}<span class="badge">${escape(category.replace(/_/g,' '))}</span>${ex.target ? ` <span class="badge">${escape(ex.target)}</span>` : ''}</div>`);
  if (ex.execution?.length) {
    parts.push(`<div class="card"><h2>Execution</h2><ol style="padding-left:0;list-style:none">${ex.execution.map((x,i) => `<li style="display:flex;align-items:flex-start;gap:8px;margin-bottom:8px"><span class="step-num step-emerald">${i+1}</span><span style="color:#475569">${escape(x)}</span></li>`).join('')}</ol></div>`);
  }
  if (ex.cues?.length) {
    parts.push(`<div class="card card-green"><h2>Cues</h2><ul style="padding-left:0;list-style:none">${ex.cues.map(x => `<li style="display:flex;align-items:flex-start;gap:8px;margin-bottom:8px"><span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:#10b981;margin-top:8px;flex-shrink:0"></span><span style="color:#475569">${escape(x)}</span></li>`).join('')}</ul></div>`);
  }
  if (ex.common_errors?.length) {
    parts.push(`<div class="card"><h2>Common Errors</h2><ul style="padding-left:0;list-style:none">${ex.common_errors.map(x => `<li>${escape(x)}</li>`).join('')}</ul></div>`);
  }
  if (ex.progressions?.length) {
    parts.push(`<div class="card"><h2>Progressions</h2><ol style="padding-left:0;list-style:none">${ex.progressions.map((x,i) => `<li style="display:flex;align-items:flex-start;gap:8px;margin-bottom:8px"><span class="step-num step-emerald">${i+1}</span><span style="color:#475569">${escape(x)}</span></li>`).join('')}</ol></div>`);
  }
  if (ex.pattern_ids?.length) {
    parts.push(`<div class="card"><div style="font-size:14px;font-weight:600;color:#0f172a;margin-bottom:8px">Related Patterns</div><div class="related-list">${ex.pattern_ids.map(id => `<span class="related-item related-exercise">${escape(id.replace('p__','').replace(/_/g,' '))}</span>`).join('')}</div></div>`);
  }
  const desc = (ex.description || `${ex.name} exercise`).slice(0, 160);
  return layout({ title: `${ex.name} — Corrective Exercise Toolkit`, description: desc, canonical, jsonLd: { "@context": "https://schema.org", "@type": "Article", headline: `${ex.name} — Corrective Exercise Toolkit`, description: desc, url: `https://bodytoolkit.fit${canonical}` }, bodyContent: parts.join(''), redirectHash: `/#/learn/exercises/${ex.id}` });
}

function renderAssessment(a) {
  const canonical = `/assessments/${a.id}/`;
  const parts = [];
  parts.push(`<div class="hero hero-assessment"><h1>${escape(a.name)}</h1><p>${escape(a.description || a.purpose || '')}</p><span class="badge">${escape(a.category)}</span></div>`);
  if (a.purpose) parts.push(`<div class="card"><h2>Purpose</h2><p>${escape(a.purpose)}</p></div>`);
  if (a.execution?.length) {
    parts.push(`<div class="card"><h2>Execution</h2><ol style="padding-left:0;list-style:none">${a.execution.map((x,i) => `<li style="display:flex;align-items:flex-start;gap:8px;margin-bottom:8px"><span class="step-num step-violet">${i+1}</span><span style="color:#475569">${escape(x)}</span></li>`).join('')}</ol></div>`);
  }
  if (a.key_observations?.length) {
    parts.push(`<div class="card"><h2>Key Observations</h2><ul style="padding-left:0;list-style:none">${a.key_observations.map(x => `<li><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#8b5cf6;flex-shrink:0;margin-top:7px"></span>${escape(x)}</li>`).join('')}</ul></div>`);
  }
  if (a.views?.length) {
    parts.push(`<div class="card"><h2>Views</h2><ul style="padding-left:0;list-style:none">${a.views.map(v => `<li>${escape(v)}</li>`).join('')}</ul></div>`);
  }
  if (a.protocol?.length) {
    parts.push(`<div class="card"><h2>Protocol</h2><ol style="padding-left:0;list-style:none">${a.protocol.map((x,i) => `<li style="display:flex;align-items:flex-start;gap:8px;margin-bottom:8px"><span class="step-num step-violet">${i+1}</span><span style="color:#475569">${escape(x)}</span></li>`).join('')}</ol></div>`);
  }
  if (a.reference) parts.push(`<div class="card" style="border-color:#ddd6fe"><h2>Reference</h2><p>${escape(a.reference)}</p></div>`);
  const desc = (a.description || a.purpose || `${a.name} assessment`).slice(0, 160);
  return layout({ title: `${a.name} — Corrective Exercise Toolkit`, description: desc, canonical, jsonLd: { "@context": "https://schema.org", "@type": "Article", headline: `${a.name} — Corrective Exercise Toolkit`, description: desc, url: `https://bodytoolkit.fit${canonical}` }, bodyContent: parts.join(''), redirectHash: `/#/learn/assessments/${a.id}` });
}

function renderCondition(c) {
  const canonical = `/conditions/${c.id}/`;
  const parts = [];
  parts.push(`<div class="hero hero-condition"><h1>${escape(c.name)}</h1>${c.overview ? `<p>${escape(c.overview)}</p>` : ''}<span class="badge">${escape(c.category)}</span></div>`);
  if (c.biomechanical_mechanism) parts.push(`<div class="card"><h2>Biomechanical Mechanism</h2><p>${escape(c.biomechanical_mechanism)}</p></div>`);
  if (c.clinical_rationale) parts.push(`<div class="card"><h2>Clinical Rationale</h2><p>${escape(c.clinical_rationale)}</p></div>`);
  if (c.practical_solution) parts.push(`<div class="card card-green"><h2>Practical Solution</h2><p>${escape(c.practical_solution)}</p></div>`);
  if (c.common_compensations?.length) {
    parts.push(`<div class="card"><h2>Common Compensations</h2><ul style="padding-left:0;list-style:none">${c.common_compensations.map(x => `<li>${escape(x)}</li>`).join('')}</ul></div>`);
  }
  if (c.correctives?.length) {
    parts.push(`<div class="card"><h2>Correctives</h2><ul style="padding-left:0;list-style:none">${c.correctives.map(x => `<li>${escape(x)}</li>`).join('')}</ul></div>`);
  }
  if (c.progression?.length || c.regression?.length) {
    parts.push(`<div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:24px">`);
    if (c.progression?.length) {
      parts.push(`<div class="card"><h2>Progression</h2><ol style="padding-left:0;list-style:none">${c.progression.map((x,i) => `<li style="display:flex;align-items:flex-start;gap:8px;margin-bottom:8px"><span class="step-num step-emerald">${i+1}</span><span style="color:#475569">${escape(x)}</span></li>`).join('')}</ol></div>`);
    }
    if (c.regression?.length) {
      parts.push(`<div class="card"><h2>Regression</h2><ul style="padding-left:0;list-style:none">${c.regression.map(x => `<li style="display:flex;align-items:flex-start;gap:8px;margin-bottom:8px">${escape(x)}</li>`).join('')}</ul></div>`);
    }
    parts.push(`</div>`);
  }
  if (c.red_flags?.length) {
    parts.push(`<div class="card card-red"><h2>Red Flags</h2><ul style="padding-left:0;list-style:none">${c.red_flags.map(x => `<li style="display:flex;align-items:flex-start;gap:8px;color:#dc2626;margin-bottom:8px"><span style="display:inline-block;width:16px;height:16px;border-radius:50%;background:#fef2f2;border:2px solid #fecaca;flex-shrink:0;margin-top:3px"></span>${escape(x)}</li>`).join('')}</ul></div>`);
  }
  if (c.differential_diagnosis?.length) {
    parts.push(`<div class="card"><h2>Differential Diagnosis</h2><div style="display:flex;flex-wrap:wrap;gap:8px">${c.differential_diagnosis.map(d => `<span class="tag">${escape(d)}</span>`).join('')}</div></div>`);
  }
  if (c.assessment_ids?.length || c.exercise_ids?.length) {
    const related = [];
    if (c.assessment_ids?.length) {
      related.push(`<div style="margin-bottom:12px"><div style="font-size:14px;font-weight:600;color:#0f172a;margin-bottom:8px">Related Assessments</div><div class="related-list">${c.assessment_ids.map(id => `<span class="related-item related-assessment">${escape(id.replace('a__','').replace(/_/g,' '))}</span>`).join('')}</div></div>`);
    }
    if (c.exercise_ids?.length) {
      related.push(`<div><div style="font-size:14px;font-weight:600;color:#0f172a;margin-bottom:8px">Related Exercises</div><div class="related-list">${c.exercise_ids.map(id => `<span class="related-item related-exercise">${escape(id.replace('e__','').replace(/_/g,' '))}</span>`).join('')}</div></div>`);
    }
    parts.push(`<div class="card">${related.join('')}</div>`);
  }
  const desc = (c.overview || `Learn about ${c.name}`).slice(0, 160);
  return layout({ title: `${c.name} — Corrective Exercise Toolkit`, description: desc, canonical, jsonLd: { "@context": "https://schema.org", "@type": "Article", headline: `${c.name} — Corrective Exercise Toolkit`, description: desc, url: `https://bodytoolkit.fit${canonical}` }, bodyContent: parts.join(''), redirectHash: `/#/learn/conditions/${c.id}` });
}

function renderAbout() {
  const body = `
    <div style="text-align:center;margin-bottom:32px"><h1 style="font-size:30px;font-weight:700;color:#0f172a;margin-bottom:8px">About This Project</h1><p style="font-size:18px;color:#475569">Making evidence-based movement education accessible to everyone.</p></div>
    <div class="card" style="background:linear-gradient(135deg,#eff6ff,#eef2ff);border-color:#bfdbfe">
      <h2>Mission</h2>
      <p>I created this platform to share knowledge and make the study of human movement accessible to everyone. During my own training as a movement professional, I found that valuable information existed across the internet, but it was fragmented, dispersed, and difficult to navigate efficiently.</p>
      <p>My goal is to compile this scattered knowledge into a cohesive, easy-to-access compendium. Whether you're a coach looking to improve your expertise, an exercise enthusiast wanting to understand your body better, or a movement professional seeking to review concepts and train more effectively — this platform is for you.</p>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:16px;margin-bottom:32px">
      <div class="card"><h3 style="font-size:16px;font-weight:600;color:#0f172a;margin-bottom:8px">Evidence-Based</h3><p style="font-size:14px">Every pattern, assessment, and exercise is grounded in peer-reviewed research.</p></div>
      <div class="card"><h3 style="font-size:16px;font-weight:600;color:#0f172a;margin-bottom:8px">Accessible</h3><p style="font-size:14px">Complex concepts presented clearly. Knowledge shouldn't be locked behind paywalls.</p></div>
      <div class="card"><h3 style="font-size:16px;font-weight:600;color:#0f172a;margin-bottom:8px">Practical</h3><p style="font-size:14px">Designed for real-world application with clear progressions and regressions.</p></div>
    </div>
    <div class="card">
      <h2>About the Creator</h2>
      <p style="font-size:24px;font-weight:700;color:#0f172a;margin-bottom:8px">Gonzalo Bellino</p>
      <p style="margin-bottom:16px">
        <span class="badge" style="background:#d1fae5;color:#065f46">ISSA CPT</span>
        <span class="badge" style="background:#d1fae5;color:#065f46">ISSA Corrective Exercise Specialist</span>
        <span class="badge" style="background:#d1fae5;color:#065f46">TPI Level 1</span>
        <span class="badge" style="background:#d1fae5;color:#065f46">TPI Fitness Level 2</span>
      </p>
      <p>I'm 52 years old and I've spent my whole life doing sports. Golf came later and hooked me for the same reason it's hard: it demands precision, mobility, power, and a mindset that doesn't quit. I became a coach for people who feel the same — who want to keep improving regardless of age, and who need someone who genuinely understands how their body moves.</p>
      <p>This toolkit is a direct extension of my coaching practice. Everything in it — the patterns, the assessments, the corrective progressions — reflects the methodology I apply daily with my clients.</p>
      <a href="https://golfstrength.coach?utm_source=corrective-toolkit&utm_medium=static&utm_campaign=referral&utm_content=about" class="btn" style="background:#059669">Visit golfstrength.coach →</a>
    </div>`;
  return layout({ title: 'About — Corrective Exercise Toolkit', description: 'Evidence-based movement toolkit for coaches and trainers. Created by Gonzalo Bellino, ISSA CPT & Corrective Exercise Specialist.', canonical: '/about/', jsonLd: { "@context": "https://schema.org", "@type": "Person", "name": "Gonzalo Bellino", "url": "https://bodytoolkit.fit", "jobTitle": "ISSA CPT & Corrective Exercise Specialist", "knowsAbout": ["Corrective Exercise","Movement Assessment","Golf Fitness","Biomechanics","Personal Training"], "sameAs": ["https://golfstrength.coach"] }, bodyContent: body, redirectHash: '/#/about' });
}

function renderField() {
  const tools = [
    { name:'Video Analysis', desc:'Record and analyze movement patterns with frame-by-frame playback, drawing tools, and angle measurements.', features:['Slow Motion','Goniometer','Drawing Tools','Side-by-Side Compare'], premium: false },
    { name:'Photo Analysis', desc:'Capture still images, mark anatomical landmarks, and measure postural alignment.', features:['Grid Overlay','Plumb Line','Drawing Tools','Goniometer'], premium: false },
    { name:'Visual Assessment', desc:'Mark dysfunction points on anatomical silhouettes to document and track client issues.', features:['Body Map','Pain Scale','Dysfunction Patterns'], premium: false },
    { name:'Client Questionnaires', desc:'Pre-session intake forms and physical activity readiness assessment.', features:['PAR-Q','Client Questionnaire','Send via Link/QR'], premium: false },
    { name:'Functional Evaluations', desc:'Functional movement assessments including LEFS and UEFI scales.', features:['LEFS','UEFI','Movement Analysis Forms','Send via Link/QR'], premium: false },
    { name:'Gait Analysis', desc:'AI-powered gait analysis with automatic phase detection and compensation identification.', features:['Phase Detection','Cadence Metrics','Symmetry Score','AI Compensation'], premium: true },
    { name:'Movement Analysis', desc:'Analyze symmetry, compare to normative data, and detect compensations in real-time.', features:['Bilateral Symmetry','Normative Comparison','Compensation Detection'], premium: true },
    { name:'Progress Tracking', desc:'Monitor client progress over time with charts, graphs, and comparative analysis.', features:['Timeline View','Before/After','Metrics Dashboard'], premium: false },
  ];
  const body = `
    <h1 style="font-size:30px;font-weight:700;color:#0f172a;margin-bottom:8px">Field Tools</h1>
    <p style="margin-bottom:24px;color:#475569">Professional tools for movement assessment and analysis. From video analysis to AI-powered gait analysis — everything you need for comprehensive client evaluations.</p>
    <div class="tool-grid">${tools.map(t => `
      <div class="tool-card">
        <h3>${escape(t.name)}</h3>
        <p style="margin-bottom:4px">${t.premium ? '<span style="display:inline-block;padding:2px 8px;font-size:11px;border-radius:4px;background:#fef3c7;color:#92400e">Premium</span>' : '<span style="display:inline-block;padding:2px 8px;font-size:11px;border-radius:4px;background:#d1fae5;color:#065f46">Free</span>'}</p>
        <p style="font-size:14px;color:#475569;margin-bottom:12px">${escape(t.desc)}</p>
        <div style="display:flex;flex-wrap:wrap;gap:4px">${t.features.map(f => `<span style="display:inline-block;padding:2px 8px;font-size:11px;border-radius:4px;background:#f1f5f9;color:#475569">${escape(f)}</span>`).join('')}</div>
      </div>`).join('')}
    </div>
    <h2 style="font-size:18px;font-weight:600;color:#0f172a;margin-bottom:12px">For Movement Professionals</h2>
    <p style="color:#475569">These tools are designed for coaches, trainers, physical therapists, and movement professionals. Use them to assess, document, and track client progress with objective measurements.</p>`;
  return layout({ title: 'Field Tools — Corrective Exercise Toolkit', description: 'Professional movement assessment tools: video analysis, photo analysis, gait analysis, questionnaires, and functional evaluations for coaches and trainers.', canonical: '/field/', jsonLd: { "@context": "https://schema.org", "@type": "CollectionPage", "name": "Field Tools — Corrective Exercise Toolkit", "description": "Professional movement assessment and analysis tools." }, bodyContent: body, redirectHash: '/#/field' });
}

/* ---------- Sitemap ---------- */

function generateSitemap(urls) {
  const chunks = urls.map(u =>
    `  <url>\n    <loc>https://bodytoolkit.fit${escape(u.loc)}</loc>\n    <lastmod>${u.lastmod || '2026-06-12'}</lastmod>\n    <changefreq>${u.changefreq || 'monthly'}</changefreq>\n    <priority>${u.priority || '0.6'}</priority>\n  </url>`
  );
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${chunks.join('\n')}\n</urlset>\n`;
}

/* ---------- Main ---------- */

console.log('Generating static pages...\n');

const today = new Date().toISOString().slice(0, 10);
const urlEntries = [];

// 1. Patterns
const patterns = loadJSON('patterns.json');
let count = 0;
for (const p of patterns) {
  writePage(`/learn/patterns/${p.id}`, renderPattern(p));
  urlEntries.push({ loc: `/learn/patterns/${p.id}/`, lastmod: today, changefreq: 'monthly', priority: '0.7' });
  count++;
}
console.log(`  Patterns: ${count}`);

// 2. Exercises
const exercisesByCat = loadJSON('exercises.json');
count = 0;
for (const [cat, exercises] of Object.entries(exercisesByCat)) {
  for (const ex of exercises) {
    writePage(`/exercises/${ex.id}`, renderExercise(ex, cat));
    urlEntries.push({ loc: `/exercises/${ex.id}/`, lastmod: today, changefreq: 'monthly', priority: '0.6' });
    count++;
  }
}
console.log(`  Exercises: ${count}`);

// 3. Assessments
const assessments = loadJSON('assessments.json');
count = 0;
for (const a of assessments) {
  writePage(`/assessments/${a.id}`, renderAssessment(a));
  urlEntries.push({ loc: `/assessments/${a.id}/`, lastmod: today, changefreq: 'monthly', priority: '0.6' });
  count++;
}
console.log(`  Assessments: ${count}`);

// 4. Conditions
const conditions = loadJSON('conditions.json');
count = 0;
for (const c of conditions) {
  writePage(`/conditions/${c.id}`, renderCondition(c));
  urlEntries.push({ loc: `/conditions/${c.id}/`, lastmod: today, changefreq: 'monthly', priority: '0.6' });
  count++;
}
console.log(`  Conditions: ${count}`);

// 5. About + Field
writePage('/about', renderAbout());
urlEntries.unshift({ loc: '/about/', lastmod: today, changefreq: 'monthly', priority: '0.5' });
console.log('  About: 1');

writePage('/field', renderField());
urlEntries.unshift({ loc: '/field/', lastmod: today, changefreq: 'monthly', priority: '0.5' });
console.log('  Field: 1');

// 6. Home (first in sitemap)
urlEntries.unshift({ loc: '/', lastmod: today, changefreq: 'weekly', priority: '1.0' });

// 7. Sitemap
const sitemap = generateSitemap(urlEntries);
writeFileSync(join(DIST_DIR, 'sitemap.xml'), sitemap, 'utf-8');
console.log(`\n  Sitemap: ${urlEntries.length} URLs → sitemap.xml`);

// 8. Update robots.txt if not already pointing to sitemap
const robotsPath = join(DIST_DIR, 'robots.txt');
if (existsSync(robotsPath)) {
  const robots = readFileSync(robotsPath, 'utf-8');
  if (!robots.includes('Sitemap:')) {
    writeFileSync(robotsPath, robots + '\nSitemap: https://bodytoolkit.fit/sitemap.xml\n', 'utf-8');
    console.log('  robots.txt: updated with Sitemap directive');
  } else {
    console.log('  robots.txt: already has Sitemap directive');
  }
}

console.log(`\nDone. ${urlEntries.length} total URLs generated in dist/.`);
