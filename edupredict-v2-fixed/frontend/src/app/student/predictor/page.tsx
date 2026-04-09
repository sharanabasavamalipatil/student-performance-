'use client';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { mlAPI } from '@/lib/api';
import toast from 'react-hot-toast';
import { Chart as ChartJS, RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend, ArcElement } from 'chart.js';
import { Radar, Doughnut } from 'react-chartjs-2';

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend, ArcElement);

const schema = z.object({
  cgpa: z.number().min(0).max(10),
  attendance_percent: z.number().min(0).max(100),
  study_hours_per_day: z.number().min(0).max(24),
  sleep_hours_per_day: z.number().min(0).max(24),
  stress_level: z.number().min(1).max(5),
  backlogs: z.number().min(0),
  programming_score: z.number().min(0).max(100),
  math_score: z.number().min(0).max(100),
});
type FormData = z.infer<typeof schema>;

const PERF_COLORS: Record<string,string> = { Excellent:'#10b981',Good:'#38bdf8',Average:'#fbbf24','Below Average':'#fb923c','At Risk':'#f43f5e' };

export default function PredictorPage() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState:{errors} } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { cgpa:7.5,attendance_percent:80,study_hours_per_day:4,sleep_hours_per_day:7,stress_level:2,backlogs:0,programming_score:70,math_score:65 },
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const res = await mlAPI.predict(data);
      setResult(res.data);
      toast.success(`Prediction: ${res.data.prediction}`);
    } catch {
      // Demo result
      const cgpa = data.cgpa;
      const pred = cgpa>=8?'Excellent':cgpa>=7?'Good':cgpa>=6?'Average':cgpa>=5?'Below Average':'At Risk';
      setResult({ prediction:pred, confidence:82.5, probabilities:{'Excellent':15,'Good':25,'Average':30,'Below Average':20,'At Risk':10}, all_model_predictions:{random_forest:{prediction:pred,confidence:84},gradient_boosting:{prediction:pred,confidence:83},mlp:{prediction:pred,confidence:80}}, best_model_used:'gradient_boosting', risk_color: PERF_COLORS[pred] });
      toast('Using demo result (backend offline)');
    }
    setLoading(false);
  };

  const fields = [
    { key:'cgpa',                label:'CGPA',              min:0,max:10,  step:0.1,unit:'/10'  },
    { key:'attendance_percent',  label:'Attendance %',      min:0,max:100, step:1,  unit:'%'    },
    { key:'study_hours_per_day', label:'Study Hours/Day',   min:0,max:24,  step:0.5,unit:'hrs'  },
    { key:'sleep_hours_per_day', label:'Sleep Hours/Day',   min:0,max:24,  step:0.5,unit:'hrs'  },
    { key:'stress_level',        label:'Stress Level (1-5)',min:1,max:5,   step:1,  unit:'/5'   },
    { key:'backlogs',            label:'Active Backlogs',   min:0,max:20,  step:1,  unit:''     },
    { key:'programming_score',   label:'Programming Score', min:0,max:100, step:1,  unit:'/100' },
    { key:'math_score',          label:'Math Score',        min:0,max:100, step:1,  unit:'/100' },
  ];

  return (
    <div className="space-y-6">
      <div className="anim-fade-up">
        <h1 className="section-title text-2xl mb-1">🔮 Performance Predictor</h1>
        <p className="text-slate-400 text-sm">ML models: Random Forest · Gradient Boosting · MLP · Logistic Regression</p>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Form — React Hook Form + Zod */}
        <form onSubmit={handleSubmit(onSubmit)} className="card anim-fade-up space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="badge bg-indigo-500/20 text-indigo-300 font-mono text-[10px]">React Hook Form</span>
            <span className="badge bg-violet-500/20 text-violet-300 font-mono text-[10px]">Zod Validation</span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {fields.map(f => (
              <div key={f.key}>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 font-mono">{f.label}</label>
                <div className="relative">
                  <input type="number" step={f.step} min={f.min} max={f.max}
                    {...register(f.key as keyof FormData, { valueAsNumber:true })} className="input text-sm pr-12" />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs font-mono">{f.unit}</span>
                </div>
                {errors[f.key as keyof FormData] && <p className="text-rose-400 text-[10px] mt-1">{errors[f.key as keyof FormData]?.message}</p>}
              </div>
            ))}
          </div>
          <button type="submit" disabled={loading} className="w-full btn-primary flex items-center justify-center gap-2 py-3">
            {loading ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Predicting…</> : '🔮 Predict Performance'}
          </button>
        </form>

        {/* Results */}
        {result ? (
          <div className="space-y-4 anim-scale-in">
            <div className="card text-center" style={{ borderColor:`${result.risk_color}30` }}>
              <div className="text-5xl mb-2">
                {result.prediction==='Excellent'?'🏆':result.prediction==='Good'?'✅':result.prediction==='Average'?'📊':result.prediction==='Below Average'?'⚠️':'🚨'}
              </div>
              <div className="section-title text-3xl font-bold mb-1" style={{ color:result.risk_color }}>{result.prediction}</div>
              <div className="text-slate-400 text-sm mb-3">Confidence: <span className="text-white font-bold">{result.confidence}%</span></div>
              <div className="badge px-3 py-1.5 font-mono text-xs" style={{ background:`${result.risk_color}20`,color:result.risk_color }}>{result.best_model_used}</div>
            </div>

            {/* Probability doughnut — Chart.js */}
            <div className="card">
              <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">Probability Distribution <span className="badge bg-amber-500/20 text-amber-300 font-mono text-[10px]">Chart.js</span></h3>
              <div className="h-40">
                <Doughnut data={{
                  labels: Object.keys(result.probabilities),
                  datasets:[{ data:Object.values(result.probabilities), backgroundColor:Object.keys(result.probabilities).map(k=>PERF_COLORS[k]||'#6366f1'), borderWidth:0, hoverOffset:4 }],
                }} options={{ responsive:true, maintainAspectRatio:false, plugins:{ legend:{ position:'right', labels:{ color:'#94a3b8', font:{size:10}, boxWidth:10 } } }, cutout:'65%' }} />
              </div>
            </div>

            {/* Model comparison */}
            <div className="card">
              <h3 className="font-semibold text-sm mb-3">All Model Predictions</h3>
              <div className="space-y-2">
                {Object.entries(result.all_model_predictions||{}).map(([name,pred]:any) => (
                  <div key={name} className="flex items-center justify-between text-sm glass-sm rounded-lg px-3 py-2">
                    <span className="font-mono text-slate-400 text-xs">{name.replace(/_/g,' ')}</span>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold" style={{ color:PERF_COLORS[pred.prediction]||'#94a3b8' }}>{pred.prediction}</span>
                      <span className="text-slate-500 text-xs">{pred.confidence}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="card flex items-center justify-center anim-fade-up anim-delay-1">
            <div className="text-center text-slate-500">
              <div className="text-5xl mb-4">🔮</div>
              <p className="font-semibold text-slate-400">Fill in your details</p>
              <p className="text-sm mt-1">to get your performance prediction</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
