const { validateAppointmentDateTime } = require('../src/utils/appointment-rules');

describe('appointment date and slot validation', () => {
  const now = new Date('2026-11-20T08:00:00.000Z');

  test('accepts a future slot at opening time', () => {
    expect(validateAppointmentDateTime('2026-11-21T09:00:00Z', now).toISOString())
      .toBe('2026-11-21T09:00:00.000Z');
  });

  test('rejects a time that is not on a 30-minute boundary', () => {
    expect(() => validateAppointmentDateTime('2026-11-21T09:15:00Z', now))
      .toThrow('30-minute slot');
  });

  test('rejects 17:00 because no appointment can start at closing time', () => {
    expect(() => validateAppointmentDateTime('2026-11-21T17:00:00Z', now))
      .toThrow('30-minute slot');
  });

  test('rejects a malformed calendar date', () => {
    expect(() => validateAppointmentDateTime('2026-02-30T10:00:00Z', now))
      .toThrow('valid calendar date');
  });

  test('rejects a date that is not in the future', () => {
    expect(() => validateAppointmentDateTime('2026-11-20T08:00:00Z', now))
      .toThrow('future');
  });
});
