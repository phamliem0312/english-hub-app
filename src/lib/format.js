// Định dạng hiển thị dùng chung.
export const mmss = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
export const dmy = (date) => date.split('-').reverse().join('/');
export const longDate = (date) => {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'numeric' });
};
// Màu điểm: ok ≥ 80, warn ≥ 50, bad dưới 50.
export const tone = (p) => (p == null ? '' : p >= 80 ? 'ok' : p >= 50 ? 'warn' : 'bad');
