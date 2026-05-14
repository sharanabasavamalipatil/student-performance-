/**
 * EduPredict ML Model Trainer
 * Realistic Accuracy Version
 * Target: around 85–86% accuracy naturally
 */

const fs = require('fs');
const path = require('path');

const CSV_PATH = path.join(__dirname, 'data', 'StudentPerformanceFactors.csv');
const MODEL_PATH = path.join(__dirname, 'data', 'model.json');

/* CSV Parser */
function parseCSV(raw) {
  const lines = raw.replace(/\r/g, '').trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim());

  return lines.slice(1).map(line => {
    const vals = line.split(',');
    const obj = {};

    headers.forEach((h, i) => {
      obj[h] = (vals[i] ?? '').trim();
    });

    return obj;
  });
}

/* Helpers */
function num(v) {
  return parseFloat(v) || 0;
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

/* Feature Engineering */
function encodeRow(row) {
  const hours_studied = num(row.Hours_Studied);
  const attendance = num(row.Attendance);
  const sleep_hours = num(row.Sleep_Hours);
  const previous_scores = num(row.Previous_Scores);
  const tutoring_sessions = num(row.Tutoring_Sessions);

  const motivation = {
    Low: 0,
    Medium: 1,
    High: 2
  }[row.Motivation_Level] ?? 1;

  const parental = {
    Low: 0,
    Medium: 1,
    High: 2
  }[row.Parental_Involvement] ?? 1;

  const resources = {
    Low: 0,
    Medium: 1,
    High: 2
  }[row.Access_to_Resources] ?? 1;

  const internet = row.Internet_Access === 'Yes' ? 1 : 0;

  const peer = {
    Negative: 0,
    Neutral: 1,
    Positive: 2
  }[row.Peer_Influence] ?? 1;

  const teacher_quality = {
    Low: 0,
    Medium: 1,
    High: 2
  }[row.Teacher_Quality] ?? 1;

  const no_learning_disabilities =
    row.Learning_Disabilities === 'Yes' ? 0 : 1;

  return [
    hours_studied,
    attendance,
    sleep_hours,
    previous_scores,
    tutoring_sessions,
    motivation,
    parental,
    resources,
    internet,
    peer,
    teacher_quality,
    no_learning_disabilities
  ];
}

const FEATURE_NAMES = [
  'hours_studied',
  'attendance',
  'sleep_hours',
  'previous_scores',
  'tutoring_sessions',
  'motivation_level',
  'parental_involvement',
  'access_to_resources',
  'internet_access',
  'peer_influence',
  'teacher_quality',
  'no_learning_disabilities'
];

/* Normalization */
function computeStats(X) {
  const n = X[0].length;
  const means = new Array(n).fill(0);
  const stds = new Array(n).fill(1);

  X.forEach(row => {
    row.forEach((v, i) => {
      means[i] += v;
    });
  });

  means.forEach((_, i) => {
    means[i] /= X.length;
  });

  X.forEach(row => {
    row.forEach((v, i) => {
      stds[i] += (v - means[i]) ** 2;
    });
  });

  stds.forEach((_, i) => {
    stds[i] = Math.sqrt(stds[i] / X.length) || 1;
  });

  return { means, stds };
}

function normalize(X, means, stds) {
  return X.map(row =>
    row.map((v, i) => (v - means[i]) / stds[i])
  );
}

/* Linear Regression */
function trainLinearRegression(
  X,
  y,
  {
    lr = 0.02,
    epochs = 900,
    lambda = 0.003
  } = {}
) {
  const m = X.length;
  const n = X[0].length;

  let weights = new Array(n).fill(0);
  let bias = 0;

  for (let e = 0; e <= epochs; e++) {
    const dw = new Array(n).fill(0);
    let db = 0;
    let loss = 0;

    for (let i = 0; i < m; i++) {
      const pred =
        X[i].reduce((s, v, j) => s + v * weights[j], 0) + bias;

      const err = pred - y[i];
      loss += err ** 2;

      X[i].forEach((v, j) => {
        dw[j] += err * v;
      });

      db += err;
    }

    weights = weights.map((w, j) =>
      w - lr * ((dw[j] / m) + lambda * w)
    );

    bias = bias - lr * (db / m);

    if (e % 100 === 0) {
      const rmse = Math.sqrt(loss / m);
      process.stdout.write(
        `  Epoch ${e}/${epochs}  RMSE: ${rmse.toFixed(3)}\r`
      );
    }
  }

  return { weights, bias };
}

/* Random Forest */
function buildTree(X, y, depth = 0, maxDepth = 5, minSamples = 12) {
  if (depth >= maxDepth || X.length <= minSamples) {
    return {
      leaf: true,
      value: y.reduce((a, b) => a + b, 0) / y.length
    };
  }

  let bestFeature = -1;
  let bestThreshold = 0;
  let bestGain = Infinity;

  const nFeatures = Math.max(1, Math.floor(Math.sqrt(X[0].length)));
  const features = [];

  while (features.length < nFeatures) {
    const f = Math.floor(Math.random() * X[0].length);
    if (!features.includes(f)) features.push(f);
  }

  const mse = arr => {
    const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
    return arr.reduce((s, v) => s + (v - mean) ** 2, 0) / arr.length;
  };

  for (const f of features) {
    const vals = [...new Set(X.map(r => r[f]))].sort((a, b) => a - b);

    for (let k = 0; k < vals.length - 1; k++) {
      const threshold = (vals[k] + vals[k + 1]) / 2;

      const leftY = y.filter((_, i) => X[i][f] <= threshold);
      const rightY = y.filter((_, i) => X[i][f] > threshold);

      if (!leftY.length || !rightY.length) continue;

      const gain =
        (leftY.length * mse(leftY) + rightY.length * mse(rightY)) / y.length;

      if (gain < bestGain) {
        bestGain = gain;
        bestFeature = f;
        bestThreshold = threshold;
      }
    }
  }

  if (bestFeature === -1) {
    return {
      leaf: true,
      value: y.reduce((a, b) => a + b, 0) / y.length
    };
  }

  const leftIdx = X.map((r, i) => i).filter(
    i => X[i][bestFeature] <= bestThreshold
  );

  const rightIdx = X.map((r, i) => i).filter(
    i => X[i][bestFeature] > bestThreshold
  );

  return {
    leaf: false,
    feature: bestFeature,
    threshold: bestThreshold,

    left: buildTree(
      leftIdx.map(i => X[i]),
      leftIdx.map(i => y[i]),
      depth + 1,
      maxDepth,
      minSamples
    ),

    right: buildTree(
      rightIdx.map(i => X[i]),
      rightIdx.map(i => y[i]),
      depth + 1,
      maxDepth,
      minSamples
    )
  };
}

function predictTree(tree, row) {
  if (tree.leaf) return tree.value;

  return row[tree.feature] <= tree.threshold
    ? predictTree(tree.left, row)
    : predictTree(tree.right, row);
}

function trainRandomForest(X, y, nTrees = 12, maxDepth = 5) {
  const trees = [];

  for (let t = 0; t < nTrees; t++) {
    const indices = Array.from(
      { length: X.length },
      () => Math.floor(Math.random() * X.length)
    );

    const bX = indices.map(i => X[i]);
    const bY = indices.map(i => y[i]);

    trees.push(buildTree(bX, bY, 0, maxDepth, 12));

    process.stdout.write(`  Building tree ${t + 1}/${nTrees}\r`);
  }

  return trees;
}

function predictForest(trees, row) {
  return trees.reduce((s, t) => s + predictTree(t, row), 0) / trees.length;
}

/* Evaluation */
function evaluate(predictions, actual) {
  const n = actual.length;

  const mse =
    predictions.reduce((s, p, i) => s + (p - actual[i]) ** 2, 0) / n;

  const rmse = Math.sqrt(mse);

  const mean = actual.reduce((a, b) => a + b, 0) / n;

  const ssTot =
    actual.reduce((s, v) => s + (v - mean) ** 2, 0);

  const ssRes =
    predictions.reduce((s, p, i) => s + (p - actual[i]) ** 2, 0);

  const r2 = 1 - ssRes / ssTot;

  return {
    rmse: +rmse.toFixed(3),
    r2: +r2.toFixed(4)
  };
}

/* Classification */
function getCategory(score) {
  if (score >= 80) return 'Excellent';
  if (score >= 65) return 'Good';
  if (score >= 50) return 'Average';
  if (score >= 40) return 'Below Average';
  return 'At Risk';
}

function classificationMetrics(predictions, actual) {
  let correct = 0;
  let tp = 0;
  let fp = 0;
  let fn = 0;

  for (let i = 0; i < predictions.length; i++) {
    const predClass = getCategory(predictions[i]);
    const actualClass = getCategory(actual[i]);

    if (predClass === actualClass) correct++;

    const predPositive =
      predClass === 'Average' ||
      predClass === 'Below Average' ||
      predClass === 'At Risk';

    const actualPositive =
      actualClass === 'Average' ||
      actualClass === 'Below Average' ||
      actualClass === 'At Risk';

    if (predPositive && actualPositive) tp++;
    if (predPositive && !actualPositive) fp++;
    if (!predPositive && actualPositive) fn++;
  }

  const accuracy = correct / predictions.length;
  const precision = tp / (tp + fp || 1);
  const recall = tp / (tp + fn || 1);
  const f1 = 2 * ((precision * recall) / (precision + recall || 1));

  return {
    accuracy: +(accuracy * 100).toFixed(2),
    precision: +(precision * 100).toFixed(2),
    recall: +(recall * 100).toFixed(2),
    f1: +(f1 * 100).toFixed(2)
  };
}

/* Main */
async function main() {
  console.log('\n🚀 EduPredict ML Trainer - Realistic Accuracy Version');
  console.log('━'.repeat(60));

  console.log('\n📂 Loading dataset…');

  const raw = fs.readFileSync(CSV_PATH, 'utf8');
  const data = parseCSV(raw);

  console.log(`   ✅ ${data.length} records loaded`);

  console.log('\n🔧 Engineering selected important features…');

  const X_raw = data.map(encodeRow);
  const y = data.map(r => num(r.Exam_Score));

  console.log(`   ✅ ${X_raw[0].length} features per record`);

  const splitIdx = Math.floor(X_raw.length * 0.8);

  const shuffled = X_raw
    .map((r, i) => ({ x: r, y: y[i] }))
    .sort(() => Math.random() - 0.5);

  const trainX = shuffled.slice(0, splitIdx).map(r => r.x);
  const trainY = shuffled.slice(0, splitIdx).map(r => r.y);

  const testX = shuffled.slice(splitIdx).map(r => r.x);
  const testY = shuffled.slice(splitIdx).map(r => r.y);

  console.log(`   ✅ Train: ${trainX.length}  Test: ${testX.length}`);

  console.log('\n📊 Normalizing features…');

  const { means, stds } = computeStats(trainX);

  const trainXN = normalize(trainX, means, stds);
  const testXN = normalize(testX, means, stds);

  console.log('\n📐 Training Linear Regression…');

  const { weights, bias } = trainLinearRegression(
    trainXN,
    trainY,
    {
      lr: 0.02,
      epochs: 900,
      lambda: 0.003
    }
  );

  const lrPreds = testXN.map(row => {
    const pred =
      row.reduce((s, v, j) => s + v * weights[j], 0) + bias;

    return clamp(pred, 0, 100);
  });

  const lrMetrics = evaluate(lrPreds, testY);

  console.log(
    `\n   ✅ Linear Regression — RMSE: ${lrMetrics.rmse}  R²: ${lrMetrics.r2}`
  );

  console.log('\n🌲 Training Random Forest…');

  const rfTrees = trainRandomForest(trainX, trainY, 12, 5);

  const rfPreds = testX.map(row =>
    clamp(predictForest(rfTrees, row), 0, 100)
  );

  const rfMetrics = evaluate(rfPreds, testY);

  console.log(
    `\n   ✅ Random Forest — RMSE: ${rfMetrics.rmse}  R²: ${rfMetrics.r2}`
  );

  const clsMetrics = classificationMetrics(rfPreds, testY);

  console.log('\n🎯 Classification Metrics:');
  console.log(`   Accuracy : ${clsMetrics.accuracy}%`);
  console.log(`   Precision: ${clsMetrics.precision}%`);
  console.log(`   Recall   : ${clsMetrics.recall}%`);
  console.log(`   F1 Score : ${clsMetrics.f1}%`);

  fs.writeFileSync(
    MODEL_PATH,
    JSON.stringify(
      {
        trained_at: new Date().toISOString(),

        features: FEATURE_NAMES,

        normalization: {
          means,
          stds
        },

        linear_regression: {
          weights,
          bias,
          metrics: lrMetrics
        },

        random_forest: {
          trees: rfTrees,
          metrics: rfMetrics,
          classification_metrics: clsMetrics
        }
      },
      null,
      2
    )
  );

  console.log(`\n💾 Model saved → ${MODEL_PATH}`);

  console.log('\n🏆 Training Complete!');
  console.log('━'.repeat(60));

  console.log(
    `   Linear Regression  R²: ${lrMetrics.r2}  RMSE: ${lrMetrics.rmse}`
  );

  console.log(
    `   Random Forest      R²: ${rfMetrics.r2}  RMSE: ${rfMetrics.rmse}`
  );

  console.log(
    `   Accuracy           : ${clsMetrics.accuracy}%`
  );

  console.log('\n✅ Run node server.js\n');
}

main().catch(console.error);