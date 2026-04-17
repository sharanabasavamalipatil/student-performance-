'use client';
import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '@/store';

const DEMO_COURSES = [
  { id:'CS101', title:'Data Structures & Algorithms', provider:'Coursera', difficulty:'Intermediate', duration:'10 weeks', rating:4.8, branch:['Computer Science','Information Technology','Data Science'], skills:['DSA','Python','C++'] },
  { id:'CS102', title:'Machine Learning & AI', provider:'deeplearning.ai', difficulty:'Advanced', duration:'3 months', rating:4.9, branch:['Computer Science','Data Science'], skills:['ML','Python','Statistics'] },
  { id:'CS103', title:'Cloud Computing & DevOps', provider:'AWS', difficulty:'Intermediate', duration:'6 weeks', rating:4.7, branch:['Computer Science','Information Technology'], skills:['AWS','Docker','CI/CD'] },
  { id:'EC101', title:'VLSI Design & Verification', provider:'NPTEL', difficulty:'Advanced', duration:'8 weeks', rating:4.5, branch:['Electronics & Communication'], skills:['VLSI','Cadence','Verilog'] },
  { id:'ME101', title:'CAD/CAM & Product Design', provider:'Udemy', difficulty:'Intermediate', duration:'6 weeks', rating:4.6, branch:['Mechanical'], skills:['SolidWorks','CATIA','CAD'] },
  { id:'DS101', title:'Big Data Analytics & Spark', provider:'Coursera', difficulty:'Advanced', duration:'5 months', rating:4.8, branch:['Data Science','Computer Science'], skills:['Spark','Hadoop','Kafka'] },
  { id:'PRO101', title:'Technical Communication', provider:'Coursera', difficulty:'Beginner', duration:'4 weeks', rating:4.4, branch:['Computer Science','Data Science','Mechanical','Electronics & Communication','Information Technology'], skills:['Communication','Writing','Presentation'] },
  { id:'GEN102', title:'Python for Engineers', provider:'NPTEL', difficulty:'Beginner', duration:'8 weeks', rating:4.7, branch:['Computer Science','Data Science','Mechanical','Electronics & Communication','Information Technology'], skills:['Python','NumPy','Pandas'] },
];

const DIFF_COLOR: Record<string,string> = { Beginner:'#10b981', Intermediate:'#fbbf24', Advanced:'#f43f5e' };
type CourseStatus = 'none'|'enrolled'|'completed';
interface MyCourse { course_id:string; course_name:string; status:CourseStatus; certificate_id?:string; }

export default function CoursesPage() {
  const { user, token } = useAuthStore();
  const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  const hdrs = { 'Content-Type':'application/json', ...(token ? { Authorization:`Bearer ${token}` } : {}) };

  const [filter, setFilter]       = useState('all');
  const [search, setSearch]       = useState('');
  const [myCourses, setMyCourses] = useState<MyCourse[]>([]);
  const [loading, setLoading]     = useState<Record<string,string|boolean>>({});
  const [msg, setMsg]             = useState('');

  const fetchMyCourses = useCallback(async () => {
    try {
      const r = await fetch(`${BASE}/api/courses/my-courses`, { headers: hdrs });
      if (r.ok) { const d = await r.json(); setMyCourses(d.courses || []); }
    } catch {}
  }, [BASE, token]);

  useEffect(() => { fetchMyCourses(); }, [fetchMyCourses]);

  const getStatus = (id:string): CourseStatus => myCourses.find(c=>c.course_id===id)?.status || 'none';
  const getCertId = (id:string) => myCourses.find(c=>c.course_id===id)?.certificate_id;

  const flash = (m:string) => { setMsg(m); setTimeout(()=>setMsg(''),4000); };

  const enroll = async (c: typeof DEMO_COURSES[0]) => {
    setLoading(l=>({...l,[c.id]:'enroll'}));
    try {
      const r = await fetch(`${BASE}/api/courses/enroll`,{method:'POST',headers:hdrs,body:JSON.stringify({course_id:c.id,course_name:c.title})});
      if(r.ok){flash(`✅ Enrolled in "${c.title}"!`);await fetchMyCourses();}
      else flash('❌ Enroll failed. Is the backend running?');
    } catch { flash('❌ Backend not reachable. Run: uvicorn main:app --reload --port 8000'); }
    setLoading(l=>({...l,[c.id]:false}));
  };

  const complete = async (c: typeof DEMO_COURSES[0]) => {
    setLoading(l=>({...l,[c.id]:'complete'}));
    try {
      const r = await fetch(`${BASE}/api/courses/complete`,{method:'POST',headers:hdrs,body:JSON.stringify({course_id:c.id,course_name:c.title})});
      if(r.ok){const d=await r.json();flash(`🎓 Completed! +${d.points_awarded} pts. Certificate ready! 📜`);await fetchMyCourses();}
    } catch { flash('❌ Backend not reachable.'); }
    setLoading(l=>({...l,[c.id]:false}));
  };

  const download = async (certId:string, title:string) => {
    try {
      const r = await fetch(`${BASE}/api/certificates/${certId}/download`,{headers:hdrs});
      if(r.ok){const blob=await r.blob();const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`Certificate_${title.replace(/\s/g,'_')}.pdf`;a.click();URL.revokeObjectURL(url);}
    } catch { flash('❌ Could not download certificate.'); }
  };

  const filtered = DEMO_COURSES.filter(c=>{
    const matchF=filter==='all'||c.difficulty===filter||(filter==='my-branch'&&c.branch.includes(user?.branch||''))||(filter==='enrolled'&&getStatus(c.id)!=='none');
    const matchS=!search||c.title.toLowerCase().includes(search.toLowerCase())||c.skills.some(s=>s.toLowerCase().includes(search.toLowerCase()));
    return matchF&&matchS;
  });

  return (
    <div className="space-y-5">
      <div className="anim-fade-up">
        <h1 className="section-title text-2xl mb-1">📚 Courses & Certificates</h1>
        <p className="text-slate-400 text-sm">Enroll → Complete → Download your PDF certificate. +25 pts per completion!</p>
      </div>

      {msg&&<div className="bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-sm px-4 py-2 rounded-xl anim-fade-up">{msg}</div>}

      <div className="flex flex-wrap gap-2 anim-fade-up anim-delay-1">
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search courses or skills…" className="input text-sm flex-1 min-w-[160px]"/>
        {['all','my-branch','Beginner','Intermediate','Advanced','enrolled'].map(f=>(
          <button key={f} onClick={()=>setFilter(f)}
            className={`btn-ghost text-xs px-3 py-2 rounded-xl ${filter===f?'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40':''}`}>
            {f==='all'?'All':f==='my-branch'?'🎯 My Branch':f==='enrolled'?'📋 My Courses':f}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 anim-fade-up anim-delay-2">
        {filtered.map(c=>{
          const status=getStatus(c.id); const certId=getCertId(c.id); const ld=loading[c.id];
          return(
            <div key={c.id} className="card hover:border-indigo-500/30 transition-all hover:-translate-y-0.5 group flex flex-col">
              <div className="flex items-start justify-between mb-3">
                <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{background:`${DIFF_COLOR[c.difficulty]||'#94a3b8'}20`,color:DIFF_COLOR[c.difficulty]||'#94a3b8'}}>{c.difficulty}</span>
                <div className="flex items-center gap-2">
                  {status==='completed'&&<span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/30">✓ Done</span>}
                  {status==='enrolled'&&<span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full border border-blue-500/30">Enrolled</span>}
                  <span className="text-xs text-yellow-400">⭐ {c.rating}</span>
                </div>
              </div>
              <h3 className="font-semibold text-slate-100 mb-1 group-hover:text-indigo-300 transition-colors text-sm">{c.title}</h3>
              <p className="text-xs text-slate-500 mb-2">{c.provider} · {c.duration}</p>
              <div className="flex flex-wrap gap-1 mb-4">{c.skills.slice(0,3).map(s=><span key={s} className="text-[10px] px-2 py-0.5 bg-slate-800 text-slate-400 rounded-full">{s}</span>)}</div>
              <div className="mt-auto space-y-2">
                {status==='none'&&<button onClick={()=>enroll(c)} disabled={!!ld} className="btn-primary w-full text-xs py-2 disabled:opacity-50">{ld==='enroll'?'Enrolling…':'Enroll Now →'}</button>}
                {status==='enrolled'&&<button onClick={()=>complete(c)} disabled={!!ld} className="w-full text-xs py-2 rounded-xl font-medium border border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/10 transition-all disabled:opacity-50">{ld==='complete'?'Completing…':'✓ Mark as Completed'}</button>}
                {status==='completed'&&certId&&<button onClick={()=>download(certId,c.title)} className="w-full text-xs py-2 rounded-xl font-medium bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30 transition-all">📜 Download Certificate PDF</button>}
              </div>
            </div>
          );
        })}
      </div>
      {filtered.length===0&&<div className="text-center py-16 text-slate-500"><div className="text-5xl mb-3">📚</div><p>No courses found</p></div>}
    </div>
  );
}
