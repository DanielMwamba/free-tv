import assert from "node:assert/strict";
import test from "node:test";

import { filterPublicAddresses } from "./upstream";

test("refuse une résolution DNS qui contient une adresse privée", () => {
  assert.throws(() =>
    filterPublicAddresses([
      { address: "93.184.216.34", family: 4 },
      { address: "10.0.0.5", family: 4 },
    ]),
  );
  assert.throws(() => filterPublicAddresses([]));
  assert.equal(filterPublicAddresses([{ address: "1.1.1.1", family: 4 }]).length, 1);
});
