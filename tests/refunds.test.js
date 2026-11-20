const { calculateRefund, refundRateForNoticeHours } = require('../src/utils/refunds');

describe('appointment refund policy', () => {
  test('refunds 100% when notice is more than 48 hours', () => {
    expect(calculateRefund(150, 48.01)).toBe(150);
  });

  test('refunds 50% at exactly 48 hours', () => {
    expect(calculateRefund(150, 48)).toBe(75);
  });

  test('refunds 50% between 24 and 48 hours', () => {
    expect(calculateRefund(150, 36)).toBe(75);
  });

  test('refunds 50% at exactly 24 hours', () => {
    expect(calculateRefund(150, 24)).toBe(75);
  });

  test('refunds nothing with less than 24 hours notice', () => {
    expect(calculateRefund(150, 23.99)).toBe(0);
  });

  test('rejects a negative notice period', () => {
    expect(() => refundRateForNoticeHours(-1)).toThrow('noticeHours');
  });
});
