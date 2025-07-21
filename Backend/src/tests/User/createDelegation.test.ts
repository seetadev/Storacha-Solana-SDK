/// __tests__/delegation.test.ts
import dotenv from "dotenv";
import axios from "axios";
import { string } from "zod";
dotenv.config();

const BASE_URL = `http://localhost:${process.env.PORT}/api/user`;

test("Create delegation on behalf of the user", async () => {
  const DelegationObject = {
    recipientDID:
      "did:key:z4MXj1wBzi9jUstyP6ZRFhxGBEZDEnxMvBGB1DREJC4Q1cPgcmtYgETAQHDXiJTKzGHT7rPnZuMn2ofNjDJ3mUUWAYt8mzFfmR6DBGt21eESHyeNqiY7nzGGkcX6kjaR8LaGX2i29Qf75hFpEHsbrKGHd87UwLY9Ut3UfeU4Z7uhj2eTnSC1qDWM3vzyGT1tRoxXkcbviw1pwu6mNKcN1VJngW52x2y6L7hGRbTRr81vLiwCnTVxJ4kHTUHbW2u3ijA64iVEEdYr4yqqbfnDLp6F1PYuB6kfMX16Gkd7Dyw3GBSVSe3ba2NaitqPpqMC4iHSpNMPZfwFg1hBEeCTWWgDGA3xjyzYeFDWmc39fov7qXUTTWMgt",
    deadline: 1753108795,
    notBefore: 1753107795,
    baseCapabilities: ["file/upload"],
    fileCID: "bafkreiahejox56s3d26zpojexilpwofks6yllrdfzye2tmuiu6kgzkuixi",
    proof: process.env.STORACHA_PROOF,
    storachaKey: process.env.STORACHA_KEY,
  };
  const result = await axios.post(
    `${BASE_URL}/createDelegation`,
    DelegationObject
  );
  // expect(typeof result.data.message).toBe(string);
  expect(result.data.message).toBe("Delegation created successfully");
});
