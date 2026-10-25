'use strict';

// Older order records may contain contact information even while pending.
function toBuyerOrder(order) {
  const safe = { ...order };
  if (!['confirmed', 'completed'].includes(safe.status)) {
    delete safe.email;
    delete safe.phone;
    delete safe.sellername;
    delete safe.sellerPhone;
    delete safe.sellerEmail;
  }
  return safe;
}

module.exports = { toBuyerOrder };
