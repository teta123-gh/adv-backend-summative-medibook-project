function refundRateForNoticeHours(noticeHours) {
  if (!Number.isFinite(noticeHours) || noticeHours < 0) {
    throw new TypeError('noticeHours must be a non-negative number.');
  }
  if (noticeHours > 48) return 1;
  if (noticeHours >= 24) return 0.5;
  return 0;
}

function calculateRefund(amountPaid, noticeHours) {
  const amount = Number(amountPaid);
  if (!Number.isFinite(amount) || amount < 0) {
    throw new TypeError('amountPaid must be a non-negative number.');
  }
  return Math.round((amount * refundRateForNoticeHours(noticeHours) + Number.EPSILON) * 100) / 100;
}

module.exports = { refundRateForNoticeHours, calculateRefund };
