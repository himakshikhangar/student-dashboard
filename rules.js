/* Test percent for one test. */
function percent(score, max) {
  return (score / max) * 100;
}

/* Mean of test percents, null when there are no tests. */
function average(tests) {
  if (!tests || tests.length === 0) {
    return null;
  }
  var total = 0;
  tests.forEach(function (t) {
    total += percent(t.score, t.max);
  });
  return total / tests.length;
}

/* Letter grade for an average, null when there is no average. */
function grade(avg) {
  if (avg === null || avg === undefined) {
    return null;
  }
  if (avg >= 90) {
    return "A";
  }
  if (avg >= 75) {
    return "B";
  }
  if (avg >= 60) {
    return "C";
  }
  if (avg >= 40) {
    return "D";
  }
  return "F";
}

/* Present days over marked days, null when nothing is marked. */
function attendancePercent(attendance) {
  var days = Object.keys(attendance || {});
  if (days.length === 0) {
    return null;
  }
  var present = 0;
  days.forEach(function (d) {
    if (attendance[d]) {
      present += 1;
    }
  });
  return (present / days.length) * 100;
}

/* Consecutive present days ending at the latest marked day. */
function streak(attendance) {
  var days = Object.keys(attendance || {}).sort();
  if (days.length === 0) {
    return 0;
  }
  var count = 0;
  for (var i = days.length - 1; i >= 0; i--) {
    if (attendance[days[i]]) {
      count += 1;
    } else {
      break;
    }
  }
  return count;
}

/* Copy of tests sorted by date. */
function byDate(tests) {
  return (tests || []).slice().sort(function (a, b) {
    return a.date < b.date ? -1 : 1;
  });
}

/* True when attendance is low, average is low, or recent tests drop. */
function needsAttention(student) {
  var att = attendancePercent(student.attendance);
  if (att !== null && att < 75) {
    return true;
  }
  var avg = average(student.tests);
  if (avg !== null && avg < 40) {
    return true;
  }
  var ordered = byDate(student.tests);
  if (ordered.length >= 4) {
    var last = ordered.slice(-2);
    var prev = ordered.slice(-4, -2);
    var meanLast = average(last);
    var meanPrev = average(prev);
    if (meanPrev - meanLast >= 10) {
      return true;
    }
  }
  return false;
}

/* Least-squares trend through test percents in date order. */
function trend(tests) {
  if (!tests || tests.length < 3) {
    return { status: "Not enough tests" };
  }
  var ordered = byDate(tests);
  var n = ordered.length;
  var sumX = 0;
  var sumY = 0;
  var sumXY = 0;
  var sumXX = 0;
  ordered.forEach(function (t, i) {
    var y = percent(t.score, t.max);
    sumX += i;
    sumY += y;
    sumXY += i * y;
    sumXX += i * i;
  });
  var denom = n * sumXX - sumX * sumX;
  var slope = denom === 0 ? 0 : (n * sumXY - sumX * sumY) / denom;
  var intercept = (sumY - slope * sumX) / n;
  var raw = slope * n + intercept;
  var prediction = Math.min(100, Math.max(0, raw));
  return { slope: slope, intercept: intercept, prediction: prediction };
}

/* Top students by gain of last 3 tests over the 3 before. */
function mostImproved(students, topN) {
  var limit = topN || 3;
  var rows = [];
  (students || []).forEach(function (s) {
    var ordered = byDate(s.tests);
    if (ordered.length >= 6) {
      var recent = average(ordered.slice(-3));
      var before = average(ordered.slice(-6, -3));
      rows.push({ id: s.id, name: s.name, gain: recent - before });
    }
  });
  rows.sort(function (a, b) {
    return b.gain - a.gain;
  });
  return rows.slice(0, limit);
}

/* Badge ids earned by one student. */
function badges(student) {
  var out = [];
  if (streak(student.attendance) >= 7) {
    out.push("streak7");
  }
  var ordered = byDate(student.tests);
  if (ordered.length >= 2) {
    var last = percent(ordered[ordered.length - 1].score, ordered[ordered.length - 1].max);
    var prev = percent(ordered[ordered.length - 2].score, ordered[ordered.length - 2].max);
    if (last - prev >= 20) {
      out.push("comeback");
    }
  }
  var hasPerfect = ordered.some(function (t) {
    return t.score === t.max;
  });
  if (hasPerfect) {
    out.push("perfect");
  }
  return out;
}

/* Name must be 1 to 40 chars. */
function validateName(name) {
  var v = (name || "").trim();
  if (v.length < 1) {
    return "Enter a name.";
  }
  if (v.length > 40) {
    return "Keep the name to 40 characters or fewer.";
  }
  return null;
}

/* Roll number must be present and unique; error names the clash. */
function validateRoll(rollNo, students, ignoreId) {
  var v = (rollNo || "").trim();
  if (!v) {
    return "Enter a roll number.";
  }
  var clash = null;
  (students || []).forEach(function (s) {
    if (s.rollNo === v && s.id !== ignoreId) {
      clash = s;
    }
  });
  if (clash) {
    return "Roll number " + v + " is already used by " + clash.name + ".";
  }
  return null;
}

/* Score must sit between 0 and max. */
function validateScore(score, max) {
  if (!(max > 0)) {
    return "Max must be greater than 0.";
  }
  if (!(score >= 0 && score <= max)) {
    return "Score must be between 0 and max.";
  }
  return null;
}

/* Record one PASS or FAIL for runChecks. */
function check(ok, name, failures) {
  if (!ok) {
    failures.push(name);
  }
  return ok ? 1 : 0;
}

/* Assert every rule from section 5 against the seed data. */
function runChecks(seed) {
  var data = seed || (typeof window !== "undefined" ? window.SEED : []);
  var failures = [];
  var passed = 0;
  passed += check(percent(42, 50) === 84, "percent 42/50", failures);
  passed += check(average([]) === null, "average empty null", failures);
  passed += check(Math.abs(average([{ score: 40, max: 50 }, { score: 30, max: 50 }]) - 70) < 0.001, "average mean", failures);
  passed += check(grade(null) === null && grade(95) === "A" && grade(90) === "A", "grade A", failures);
  passed += check(grade(75) === "B" && grade(60) === "C" && grade(40) === "D" && grade(39) === "F", "grade B/C/D/F", failures);
  passed += check(attendancePercent({}) === null, "attendance null", failures);
  passed += check(attendancePercent({ a: true, b: false }) === 50, "attendance half", failures);
  passed += check(streak({}) === 0 && streak({ a: true, b: true }) === 2, "streak basic", failures);
  passed += check(streak({ a: true, b: false }) === 0, "streak latest absent", failures);
  var diya = data.filter(function (s) { return s.name === "Diya Patel"; })[0];
  var aarav = data.filter(function (s) { return s.name === "Aarav Sharma"; })[0];
  var kabir = data.filter(function (s) { return s.name === "Kabir Singh"; })[0];
  passed += check(diya && needsAttention(diya) === true, "attention diya", failures);
  passed += check(aarav && needsAttention(aarav) === false, "attention aarav", failures);
  passed += check(trend([{ score: 1, max: 100, date: "2026-01-01" }]).status === "Not enough tests", "trend needs 3", failures);
  var tr = trend(aarav ? aarav.tests : []);
  passed += check(tr.prediction >= 0 && tr.prediction <= 100, "trend clamped", failures);
  var mi = mostImproved(data, 3);
  passed += check(mi.length > 0 && mi.length <= 3, "most improved top 3", failures);
  passed += check(kabir && badges(kabir).indexOf("perfect") !== -1, "badge perfect", failures);
  passed += check(aarav && badges(aarav).indexOf("streak7") !== -1, "badge streak7", failures);
  passed += check(validateName("") !== null && validateName("x") === null, "validate name", failures);
  passed += check(validateRoll("1", data, "other") !== null, "validate roll clash", failures);
  passed += check(validateScore(60, 50) !== null && validateScore(40, 50) === null, "validate score", failures);
  if (typeof console !== "undefined") {
    if (failures.length === 0) {
      console.log("runChecks: " + passed + " passed, no failures.");
    } else {
      failures.forEach(function (f) {
        console.log("FAIL: " + f);
      });
    }
  }
  return { passed: passed, failures: failures };
}

if (typeof module !== "undefined") {
  module.exports = { percent: percent, average: average, grade: grade, attendancePercent: attendancePercent, streak: streak, needsAttention: needsAttention, trend: trend, mostImproved: mostImproved, badges: badges, validateName: validateName, validateRoll: validateRoll, validateScore: validateScore, runChecks: runChecks };
}
