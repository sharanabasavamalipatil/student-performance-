/**
 * EduPredict ML Model Trainer
 * Trains a Linear Regression model on StudentPerformanceFactors.csv
 * Saves model weights to data/model.json
 */
const fs   = require('fs');
const path = require('path');

const CSV_PATH   = path.join(__dirname, 'data', 'StudentPerformanceFactors.csv');
const MODEL_PATH = path.join(__dirname, 'data', 'model.json');

/* ── Parse CSV ─────────────────────────────────────────────────────────────── */
function parseCSV(raw) {
  const lines = raw.replace(/\r/g, '').trim().split('\n');
  const headers = lines[0].split(',');
  return lines.slice(1).map(line => {
    const vals = line.split(',');
    const obj = {};
    headers.forEach((h, i) => {
      const v = vals[i] ?? '';
      obj[h.trim()] = v.trim();
    });
    return obj;
  });
}

/* ── Feature Engineering ────────────────────────────────────────────────────── */
function encodeRow(row) {
  // Numerical
  const hours_studied      = parseFloat(row.Hours_Studied)      || 0;
  const attendance         = parseFloat(row.Attendance)         || 0;
  const sleep_hours        = parseFloat(row.Sleep_Hours)        || 0;
  const previous_scores    = parseFloat(row.Previous_Scores)    || 0;
  const tutoring_sessions  = parseFloat(row.Tutoring_Sessions)  || 0;
  const physical_activity  = parseFloat(row.Physical_Activity)  || 0;

  // Categorical → numeric
  const motivation    = { Low:0, Medium:1, High:2 }[row.Motivation_Level]    ?? 1;
  const parental      = { Low:0, Medium:1, High:2 }[row.Parental_Involvement] ?? 1;
  const resources     = { Low:0, Medium:1, High:2 }[row.Access_to_Resources]  ?? 1;
  const internet      = row.Internet_Access === 'Yes' ? 1 : 0;
  const extracurr     = row.Extracurricular_Activities === 'Yes' ? 1 : 0;
  const peer          = { Negative:0, Neutral:1, Positive:2 }[row.Peer_Influence] ?? 1;
  const school_type   = row.School_Type === 'Private' ? 1 : 0;
  const disabilities  = row.Learning_Disabilities === 'Yes' ? 0 : 1;
  const family_income = { Low:0, Medium:1, High:2 }[row.Family_Income] ?? 1;
  const teacher_qual  = { Low:0, Medium:1, High:2 }[row.Teacher_Quality] ?? 1;
  const distance      = { Near:2, Moderate:1, Far:0 }[row.Distance_from_Home] ?? 1;
  const gender        = row.Gender === 'Male' ? 1 : 0;

  return [
    hours_studied, attendance, sleep_hours, previous_scores,
    tutoring_sessions, physical_activity, motivation, parental,
    resources, internet, extracurr, peer, school_type, disabilities,
    family_income, teacher_qual, distance, gender
  ];
}

const FEATURE_NAMES = [
  'hours_studied','attendance','sleep_hours','previous_scores',
  'tutoring_sessions','physical_activity','motivation_level','parental_involvement',
  'access_to_resources','internet_access','extracurricular','peer_influence',
  'school_type','no_learning_disabilities','family_income','teacher_quality',
  'distance_from_home','gender'
];

/* ── Normalize ──────────────────────────────────────────────────────────────── */
function computeStats(X) {
  const n = X[0].length;
  const means = new Array(n).fill(0);
  const stds  = new Array(n).fill(1);
  X.forEach(row => row.forEach((v, i) => { means[i] += v; }));
  means.forEach((_, i) => { means[i] /= X.length; });
  X.forEach(row => row.forEach((v, i) => { stds[i] += (v - means[i]) ** 2; }));
  stds.forEach((_, i) => { stds[i] = Math.sqrt(stds[i] / X.length) || 1; });
  return { means, stds };
}
function normalize(X, means, stds) {
  return X.map(row => row.map((v, i) => (v - means[i]) / stds[i]));
}

/* ── Linear Regression (Gradient Descent) ──────────────────────────────────── */
function trainLinearRegression(X, y, { lr = 0.01, epochs = 500, lambda = 0.001 } = {}) {
  const m = X.length;
  const n = X[0].length;
  let weights = new Array(n).fill(0);
  let bias    = 0;

  for (let e = 0; e < epochs; e++) {
    let dw = new Array(n).fill(0);
    let db = 0;
    let loss = 0;

    for (let i = 0; i < m; i++) {
      const pred = X[i].reduce((s, v, j) => s + v * weights[j], 0) + bias;
      const err  = pred - y[i];
      loss += err ** 2;
      X[i].forEach((v, j) => { dw[j] += err * v; });
      db += err;
    }

    // Update with L2 regularization
    weights = weights.map((w, j) => w - lr * (dw[j] / m + lambda * w));
    bias    = bias - lr * (db / m);

    if (e % 100 === 0) {
      const rmse = Math.sqrt(loss / m);
      process.stdout.write(`  Epoch ${e}/${epochs}  RMSE: ${rmse.toFixed(3)}\r`);
    }
  }
  return { weights, bias };
}

/* ── Random Forest (Decision Trees) ────────────────────────────────────────── */
function buildTree(X, y, depth = 0, maxDepth = 6, minSamples = 10) {
  if (depth >= maxDepth || X.length <= minSamples) {
    const mean = y.reduce((a, b) => a + b, 0) / y.length;
    return { leaf: true, value: mean, count: y.length };
  }

  let bestFeature = -1, bestThreshold = 0, bestGain = Infinity;

  // Try random subset of features
  const nFeatures = Math.floor(Math.sqrt(X[0].length));
  const features = [];
  while (features.length < nFeatures) {
    const f = Math.floor(Math.random() * X[0].length);
    if (!features.includes(f)) features.push(f);
  }

  for (const f of features) {
    const vals = [...new Set(X.map(r => r[f]))].sort((a, b) => a - b);
    for (let k = 0; k < vals.length - 1; k++) {
      const thresh = (vals[k] + vals[k + 1]) / 2;
      const leftY  = y.filter((_, i) => X[i][f] <= thresh);
      const rightY = y.filter((_, i) => X[i][f] > thresh);
      if (!leftY.length || !rightY.length) continue;
      const mse = (arr) => { const m = arr.reduce((a,b)=>a+b,0)/arr.length; return arr.reduce((s,v)=>s+(v-m)**2,0)/arr.length; };
      const gain = (leftY.length * mse(leftY) + rightY.length * mse(rightY)) / y.length;
      if (gain < bestGain) { bestGain = gain; bestFeature = f; bestThreshold = thresh; }
    }
  }

  if (bestFeature === -1) {
    return { leaf: true, value: y.reduce((a, b) => a + b, 0) / y.length, count: y.length };
  }

  const leftIdx  = X.map((r,i)=>i).filter(i => X[i][bestFeature] <= bestThreshold);
  const rightIdx = X.map((r,i)=>i).filter(i => X[i][bestFeature] >  bestThreshold);

  return {
    leaf: false,
    feature: bestFeature,
    threshold: bestThreshold,
    left:  buildTree(leftIdx.map(i=>X[i]),  leftIdx.map(i=>y[i]),  depth+1, maxDepth, minSamples),
    right: buildTree(rightIdx.map(i=>X[i]), rightIdx.map(i=>y[i]), depth+1, maxDepth, minSamples),
  };
}

function predictTree(tree, row) {
  if (tree.leaf) return tree.value;
  return row[tree.feature] <= tree.threshold
    ? predictTree(tree.left, row)
    : predictTree(tree.right, row);
}

function trainRandomForest(X, y, nTrees = 20, maxDepth = 6) {
  const trees = [];
  for (let t = 0; t < nTrees; t++) {
    // Bootstrap sample
    const indices = Array.from({ length: X.length }, () => Math.floor(Math.random() * X.length));
    const bX = indices.map(i => X[i]);
    const bY = indices.map(i => y[i]);
    trees.push(buildTree(bX, bY, 0, maxDepth, 8));
    process.stdout.write(`  Building tree ${t+1}/${nTrees}\r`);
  }
  return trees;
}

function predictForest(trees, row) {
  return trees.reduce((s, t) => s + predictTree(t, row), 0) / trees.length;
}

/* ── Evaluate ───────────────────────────────────────────────────────────────── */
function evaluate(predictions, actual) {
  const n    = actual.length;
  const mse  = predictions.reduce((s,p,i) => s + (p - actual[i])**2, 0) / n;
  const rmse = Math.sqrt(mse);
  const mean = actual.reduce((a,b)=>a+b,0) / n;
  const ss_tot = actual.reduce((s,v) => s + (v-mean)**2, 0);
  const ss_res = predictions.reduce((s,p,i) => s + (p-actual[i])**2, 0);
  const r2   = 1 - ss_res / ss_tot;
  return { rmse: +rmse.toFixed(3), r2: +r2.toFixed(4) };
}

/* ── MAIN ───────────────────────────────────────────────────────────────────── */
async function main() {
  console.log('\n🚀 EduPredict ML Model Trainer');
  console.log('━'.repeat(40));

  // Load data
  console.log('\n📂 Loading CSV dataset…');
  const raw  = fs.readFileSync(CSV_PATH, 'utf8');
  const data = parseCSV(raw);
  console.log(`   ✅ ${data.length} records loaded`);

  // Feature extraction
  console.log('\n🔧 Engineering features…');
  const X_raw = data.map(encodeRow);
  const y     = data.map(r => parseFloat(r.Exam_Score) || 0);
  console.log(`   ✅ ${X_raw[0].length} features per record`);

  // Train/test split (80/20)
  const splitIdx = Math.floor(X_raw.length * 0.8);
  const shuffled = X_raw.map((r, i) => ({ x: r, y: y[i] }))
    .sort(() => Math.random() - 0.5);
  const trainX = shuffled.slice(0, splitIdx).map(r => r.x);
  const trainY = shuffled.slice(0, splitIdx).map(r => r.y);
  const testX  = shuffled.slice(splitIdx).map(r => r.x);
  const testY  = shuffled.slice(splitIdx).map(r => r.y);
  console.log(`   ✅ Train: ${trainX.length}  Test: ${testX.length}`);

  // Normalize
  console.log('\n📊 Normalizing features…');
  const { means, stds } = computeStats(trainX);
  const trainXN = normalize(trainX, means, stds);
  const testXN  = normalize(testX,  means, stds);

  // Train Linear Regression
  console.log('\n📐 Training Linear Regression…');
  const { weights, bias } = trainLinearRegression(trainXN, trainY, {
    lr: 0.05, epochs: 800, lambda: 0.001
  });
  const lrPreds  = testXN.map(row => row.reduce((s,v,j) => s + v*weights[j], 0) + bias);
  const lrMetrics = evaluate(lrPreds, testY);
  console.log(`\n   ✅ Linear Regression — RMSE: ${lrMetrics.rmse}  R²: ${lrMetrics.r2}`);

  // Train Random Forest
  console.log('\n🌲 Training Random Forest (20 trees)…');
  const rfTrees   = trainRandomForest(trainX, trainY, 20, 7);
  const rfPreds   = testX.map(row => predictForest(rfTrees, row));
  const rfMetrics = evaluate(rfPreds, testY);
  console.log(`\n   ✅ Random Forest    — RMSE: ${rfMetrics.rmse}  R²: ${rfMetrics.r2}`);

  // Feature importances (variance of predictions per feature)
  const featureImportance = FEATURE_NAMES.map((name, fi) => {
    const preds = testX.map(row => {
      const mod = [...row]; mod[fi] = 0;
      return predictForest(rfTrees, mod);
    });
    const baseline = rfPreds.reduce((s,p,i)=>(s+(p-testY[i])**2),0)/testY.length;
    const permuted = preds.reduce((s,p,i)=>(s+(p-testY[i])**2),0)/testY.length;
    return { name, importance: Math.max(0, permuted - baseline) };
  }).sort((a,b)=>b.importance-a.importance);

  console.log('\n📈 Feature Importances:');
  featureImportance.slice(0,8).forEach(f =>
    console.log(`   ${f.name.padEnd(25)} ${(f.importance).toFixed(2)}`));

  // Score distribution
  const bands = { excellent:0, good:0, average:0, belowAvg:0, atRisk:0 };
  y.forEach(s => {
    if      (s >= 80) bands.excellent++;
    else if (s >= 65) bands.good++;
    else if (s >= 50) bands.average++;
    else if (s >= 40) bands.belowAvg++;
    else              bands.atRisk++;
  });

  // Save model
  const model = {
    version: '1.0',
    trained_at: new Date().toISOString(),
    dataset_size: data.length,
    features: FEATURE_NAMES,
    normalization: { means, stds },
    linear_regression: { weights, bias, metrics: lrMetrics },
    random_forest: {
      trees: rfTrees,
      metrics: rfMetrics,
      n_trees: rfTrees.length,
    },
    feature_importance: featureImportance,
    score_distribution: bands,
    dataset_stats: {
      mean_score: +(y.reduce((a,b)=>a+b,0)/y.length).toFixed(2),
      min_score:  Math.min(...y),
      max_score:  Math.max(...y),
    }
  };

  fs.writeFileSync(MODEL_PATH, JSON.stringify(model));
  console.log(`\n💾 Model saved → ${MODEL_PATH}`);
  console.log(`   File size: ${(fs.statSync(MODEL_PATH).size/1024).toFixed(1)} KB`);

  console.log('\n🏆 Training Complete!');
  console.log('━'.repeat(40));
  console.log(`   Linear Regression  R²: ${lrMetrics.r2}  RMSE: ${lrMetrics.rmse}`);
  console.log(`   Random Forest      R²: ${rfMetrics.r2}  RMSE: ${rfMetrics.rmse}`);
  console.log('\n✅ Run node server.js to serve predictions\n');
}

main().catch(console.error);
