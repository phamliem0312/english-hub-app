import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GAPS, RECHECK_DAYS, addDays, todayStr, isDue, grade, scoreReading, dayNumber, dateOfDay, weekOf, isSunday, phaseOf, WEEKS, PHASES, tasksFor, dayDone, quizFor, pick, mcqScore, totalScore, weakParts, PASS, PHASE_TESTS, validListening } from './learning.js';

const phrase = (over = {}) => ({ text: 'Could you explain that again?', reviewCount: 0, nextReview: todayStr(), mastered: false, ...over });

test('Chưa nhớ: về bậc đầu, ôn lại ngày mai (kể cả khi đã ôn nhiều lần)', () => {
  const w = grade(phrase({ reviewCount: 3 }), false);
  assert.equal(w.reviewCount, 0);
  assert.equal(w.nextReview, addDays(1));
  assert.equal(w.mastered, false);
});

test('Đã nhớ: giãn dần theo GAPS rồi thành thạo, kiểm tra lại sau RECHECK_DAYS', () => {
  let w = phrase();
  for (let i = 1; i < GAPS.length; i++) {
    w = grade(w, true);
    assert.equal(w.nextReview, addDays(GAPS[i]));
    assert.equal(w.mastered, false);
  }
  w = grade(w, true);
  assert.equal(w.mastered, true);
  assert.equal(w.nextReview, addDays(RECHECK_DAYS));
});

test('Cụm thành thạo đến hạn kiểm tra lại thì vẫn được ôn; quên thì mất trạng thái thành thạo', () => {
  const w = phrase({ mastered: true, reviewCount: 5, nextReview: addDays(-1) });
  assert.equal(isDue(w), true);
  assert.equal(grade(w, false).mastered, false);
});

test('Chấm shadowing: đọc một phần thì điểm thấp; bỏ qua hoa/thường, dấu câu; tính thứ tự', () => {
  const r = scoreReading('Tell me about your experience please.', 'tell me');
  assert.equal(r.pct, 33);
  assert.deepEqual(r.missed, ['about', 'your', 'experience', 'please']);
  assert.equal(scoreReading("Hi, I'm Nam. Nice to meet you!", 'hi im nam nice to meet you').pct, 100);
  assert.equal(scoreReading('one two three four', 'four three two one').correct, 1);
  assert.equal(scoreReading('nice to meet you', 'the the nice to meet you you you').pct, 100);
});

test('Ngày học và tuần: ngày bắt đầu là ngày 1, qua tháng/năm, tối đa tuần 12', () => {
  assert.equal(dayNumber('2026-11-27', '2026-11-27'), 1);
  assert.equal(dayNumber('2026-11-27', '2026-12-03'), 7);
  assert.equal(dayNumber('2026-12-30', '2027-01-02'), 4);
  assert.equal(dayNumber('2026-03-28', '2026-03-30'), 3); // qua ngày đổi giờ mùa hè (ở nước có DST)
  assert.equal(dayNumber('2026-11-27', '2026-11-20'), 1); // ngày bắt đầu ở tương lai
  assert.deepEqual([1, 7, 8, 84, 200].map(weekOf), [1, 1, 2, 12, 12]);
  assert.equal(dateOfDay('2026-12-30', 4), '2027-01-02');
  for (const n of [1, 30, 84]) assert.equal(dayNumber('2026-03-01', dateOfDay('2026-03-01', n)), n);
  assert.equal(isSunday('2026-11-29'), true);
  assert.equal(isSunday('2026-11-27'), false);
});

test('Lộ trình: 12 tuần, 3 giai đoạn phủ đủ các tuần', () => {
  assert.equal(WEEKS.length, 12);
  WEEKS.forEach((w, i) => assert.equal(w.week, i + 1));
  assert.deepEqual(WEEKS.map((w) => phaseOf(w.week).n), [1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3]);
  assert.equal(PHASES.length, 3);
});

test('Lịch ngày: luôn 5 khối, tổng 60 phút; ngày 1 là Getting Started; nguồn nghe theo giai đoạn', () => {
  for (const d of [1, 2, 28, 29, 57, 84, 100]) {
    const t = tasksFor(d);
    assert.equal(t.length, 5);
    assert.equal(t.reduce((s, x) => s + x.min, 0), 60);
  }
  assert.equal(tasksFor(1)[0].id, 'test');
  assert.match(tasksFor(5)[1].title, /VOA.*Lesson 5/);
  assert.match(tasksFor(29)[1].title, /British Council/);
  assert.match(tasksFor(84)[1].title, /BBC/);
  assert.match(tasksFor(84)[3].title, /Client Communication/);
});

test('Kiểm tra cuối ngày: 3 câu chép + 2 câu hỏi của đúng tuần, đổi theo ngày', () => {
  WEEKS.forEach((w) => { assert.equal(w.lines.length, 4); assert.equal(w.qs.length, 4); });
  const q = quizFor(8);
  assert.equal(q.lines.length, 3);
  assert.equal(q.qs.length, 2);
  q.lines.forEach((l) => assert.ok(WEEKS[1].lines.includes(l)));
  assert.notDeepEqual(quizFor(8).lines, quizFor(9).lines);
  assert.deepEqual(pick(['a', 'b', 'c', 'd'], 3, 3), ['d', 'a', 'b']);
});

test('Chấm điểm: trắc nghiệm, điểm tổng bỏ qua phần null, phần yếu < PASS', () => {
  const qs = [{ answer: 0 }, { answer: 2 }, { answer: 1 }, { answer: 1 }];
  assert.equal(mcqScore(qs, [0, 2, 0, undefined]), 50);
  assert.equal(totalScore({ a: 80, b: null, c: 60 }), 70);
  assert.equal(totalScore({ a: null }), null);
  assert.deepEqual(weakParts({ a: 80, b: null, c: PASS - 1 }), ['c']);
});

test('Đánh giá giai đoạn: 3 bài, bài nghe dự phòng hợp lệ; validListening loại JSON sai dạng', () => {
  assert.deepEqual(PHASE_TESTS.map((p) => p.n), [1, 2, 3]);
  PHASE_TESTS.forEach((p) => { assert.equal(p.recall.length, 5); assert.ok(validListening(p.fallback)); });
  assert.equal(validListening(null), false);
  assert.equal(validListening({ lines: [], questions: [] }), false);
  const bad = structuredClone(PHASE_TESTS[0].fallback); bad.questions[0].answer = 9;
  assert.equal(validListening(bad), false);
});

test('Ngày xong khi đủ 5 khối', () => {
  assert.equal(dayDone({ d: [true, true, true, true, true] }, 'd'), true);
  assert.equal(dayDone({ d: [true, true, false, true, true] }, 'd'), false);
  assert.equal(dayDone({}, 'd'), false);
});
