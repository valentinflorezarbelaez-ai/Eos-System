/**
 * @module RddReviewStance
 * @description ADR-0010 RDD: independent / adversarial review is INFORMATIONAL.
 * Review must not grant delivery, write, merge, release, or Fundacion authority.
 * Aligns with Constitution Article III write barrier and R-BOUNDARY-01.
 */

export const RDD_STANCE = Object.freeze({
  INFORMATIONAL: 'INFORMATIONAL'
});

export const RDD_DENIED_GRANTS = Object.freeze([
  'authorizes_delivery',
  'authorizes_write',
  'authorizes_merge',
  'authorizes_release',
  'authorizes_fundacion_write',
  'authorizes_external_write',
  'grants_write',
  'delivery_authorized'
]);

function reviewGrantsDelivery(review = {}) {
  if (review.decision === 'AUTHORIZE_DELIVERY' || review.decision === 'AUTHORIZE_WRITE') {
    return true;
  }
  return RDD_DENIED_GRANTS.some((field) => review[field] === true);
}

/**
 * Stamp a review as informational. Always clears delivery/write grants.
 */
export function stampRddReview(review = {}) {
  const cleared = { ...review };
  for (const field of RDD_DENIED_GRANTS) {
    cleared[field] = false;
  }
  return {
    ...cleared,
    stance: RDD_STANCE.INFORMATIONAL,
    authorizes_delivery: false,
    authorizes_write: false,
    authorizes_merge: false,
    authorizes_release: false,
    authorizes_fundacion_write: false,
    authorizes_external_write: false,
    delivery_authority: 'HUMAN_HITL_WRITE_BARRIER',
    rule_ids: ['R-RDD-01', 'R-BOUNDARY-01']
  };
}

/**
 * Fail-closed if a review object tries to grant delivery or write authority.
 */
export function assertRddDoesNotGrantDelivery(review = {}) {
  if (reviewGrantsDelivery(review)) {
    const err = new Error(
      'RDD_DELIVERY_DENIED: Independent review is INFORMATIONAL and does not authorize delivery, write, merge, release, or Fundacion mutation (ADR-0010 / Article III).'
    );
    err.code = 'RDD_DELIVERY_DENIED';
    throw err;
  }
  return stampRddReview(review);
}
