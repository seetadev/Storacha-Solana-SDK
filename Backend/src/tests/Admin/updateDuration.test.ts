import dotenv from "dotenv";
import axios from "axios";
import { string } from "zod";
dotenv.config();

const BASE_URL = `http://localhost:${process.env.PORT}/api/admin`;
test("Update the Minimum Duration of the File Upload can be set by admin only", async () => {
  const response = await axios.post(
    `${BASE_URL}/updateMinDuration`,
    {
      duration: 30, // this should be in number of days
    },
    {
      headers: {
        "x-api-key": process.env.ADMIN_API_KEY, // Must match process.env.ADMIN_API_KEY
      },
    }
  );
  // expect(typeof response.data.message).toBe(string);
  expect(response.data.message).toBe(
    "Successfully updated the minimum Duration"
  );
});

test("Update the Rate for File Upload, can be set by admin only", async () => {
  const result = await axios.post(
    `${BASE_URL}/updateRate`,
    {
      rate: 40,
    },
    {
      headers: {
        "x-api-key": process.env.ADMIN_API_KEY, // Must match process.env.ADMIN_API_KEY
      },
    }
  );
  expect(result.data.message).toBe("Successfully updated the rate per file");
});
