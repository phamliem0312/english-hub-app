import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GAPS, RECHECK_DAYS, addDays, todayStr, isDue, grade, scoreReading, ROADMAP, roadmapProgress } from './learning.js';

const word = (over = {}) => ({ word: 'cope', reviewCount: 0, nextReview: todayStr(), mastered: false, ...over });

test('Chưa nhớ: về bậc đầu, ôn lại ngày mai (kể cả khi đã ôn nhiều lần)', () => {
  const w = grade(word({ reviewCount: 3 }), false);
  assert.equal(w.reviewCount, 0);
  assert.equal(w.nextReview, addDays(1));
  assert.equal(w.mastered, false);
});

test('Đã nhớ: giãn dần theo GAPS rồi thành thạo, kiểm tra lại sau RECHECK_DAYS', () => {
  let w = word();
  for (let i = 1; i < GAPS.length; i++) {
    w = grade(w, true);
    assert.equal(w.nextReview, addDays(GAPS[i]));
    assert.equal(w.mastered, false);
  }
  w = grade(w, true);
  assert.equal(w.mastered, true);
  assert.equal(w.nextReview, addDays(RECHECK_DAYS));
});

test('Từ thành thạo đến hạn kiểm tra lại thì vẫn được ôn; quên thì mất trạng thái thành thạo', () => {
  const w = word({ mastered: true, reviewCount: 5, nextReview: addDays(-1) });
  assert.equal(isDue(w), true);
  assert.equal(grade(w, false).mastered, false);
});

test('Chấm đọc: chỉ đọc một phần thì điểm thấp', () => {
  const r = scoreReading('Tell me about your experience please.', 'tell me');
  assert.equal(r.total, 6);
  assert.equal(r.correct, 2);
  assert.equal(r.pct, 33);
  assert.deepEqual(r.missed, ['about', 'your', 'experience', 'please']);
});

test('Chấm đọc: bỏ qua hoa/thường, dấu câu, dấu nháy; tính cả thứ tự', () => {
  assert.equal(scoreReading("Hi, I'm Nam. Nice to meet you!", 'hi im nam nice to meet you').pct, 100);
  const rev = scoreReading('one two three four', 'four three two one');
  assert.equal(rev.correct, 1);
  const wrong = scoreReading('I deploy with Docker', 'I employ with Docker');
  assert.deepEqual(wrong.spoken.map((x) => x.ok), [true, false, true, true]);
  assert.deepEqual(wrong.missed, ['deploy']);
});

test('Chấm đọc: nói thừa từ không làm tăng điểm', () => {
  const r = scoreReading('nice to meet you', 'the the nice to meet you you you');
  assert.equal(r.pct, 100);
  assert.equal(r.spoken.filter((x) => !x.ok).length, 4);
});

test('Lộ trình: 30 ngày, mỗi ngày 5 từ, 150 từ không trùng', () => {
  assert.equal(ROADMAP.length, 30);
  ROADMAP.forEach((d, i) => { assert.equal(d.day, i + 1); assert.equal(d.words.length, 5); });
  const all = ROADMAP.flatMap((d) => d.words);
  assert.equal(new Set(all).size, 150);
  all.forEach((w) => assert.equal(w, w.toLowerCase()));
});

test('Tiến độ lộ trình: tính theo kho từ, không phân biệt hoa/thường', () => {
  const bank = ROADMAP[0].words.map((w) => ({ word: w.toUpperCase() }));
  const p = roadmapProgress(bank);
  assert.equal(p.done.has(1), true);
  assert.equal(p.current.day, 2);
  assert.equal(roadmapProgress(bank.slice(0, 4)).current.day, 1);
});
