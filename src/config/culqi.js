import axios from "axios";
import { CULQI_SECRET_KEY } from "./env.js";

const culqi = axios.create({
  baseURL: "https://api.culqi.com/v2",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${CULQI_SECRET_KEY}`,
  },
});

export default culqi;
