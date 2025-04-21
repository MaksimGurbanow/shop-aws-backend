import http from "http";
import dotenv from "dotenv";
import https from "https";
import { setHeaders } from "./utils";

dotenv.config();
const {
  IMPORT_API_URL: IMPORT = "",
  PRODUCT_API_URL: PRODUCT = "",
  PORT,
} = process.env;

interface CacheEntry {
  data: any;
  timestamp: number;
}

const cache: Record<string, CacheEntry> = {};
const CACHE_DURATION_MS = 2 * 60 * 1000;

const server = http.createServer((req, res) => {
  setHeaders(res);

  if (req.method === "OPTIONS") {
    res.writeHead(200);
    res.end();
    return;
  }

  const url =
    req.url?.replace("/import", IMPORT).replace("/product", PRODUCT) || "";

  console.log(url);
  if (!url) {
    res.writeHead(400, "Bad Request");
    res.end("Invalid URL");
    return;
  }

  if (!url.includes("/import") && !url.includes("/product")) {
    res.writeHead(400, "Bad Request");
    res.end("Invalid URL. Please use valid service endpoints.");
    return;
  }

  const parsedUrl = new URL(url);
  const isGetProductsList =
    req.method === "GET" &&
    url.includes(PRODUCT);

  const cacheKey = "productsListCacheKey";
  if (isGetProductsList) {
    const cachedEntry = cache[cacheKey];

    if (cachedEntry && Date.now() - cachedEntry.timestamp < CACHE_DURATION_MS) {
      console.log("[CACHE HIT] Products list found in cache");
      res.writeHead(200, "OK", { "Content-Type": "application/json" });
      res.end(cachedEntry.data);
      return;
    }
  }
  const lib = parsedUrl.protocol === "https:" ? https : http;

  if (url.includes("/import")) {
  }
  const proxyReq = lib.request(
    url,
    {
      method: req.method,
      headers: { ...req.headers, host: parsedUrl.host },
    },
    (proxyRes) => {
      let responseData = "";

      proxyRes.on("data", (chunk) => {
        responseData += chunk;
      });

      proxyRes.on("end", () => {
        res.writeHead(proxyRes.statusCode || 500, proxyRes.statusMessage || "");

        console.log(isGetProductsList, proxyRes.statusCode);
        if (isGetProductsList && proxyRes.statusCode === 200) {
          cache[cacheKey] = {
            data: responseData,
            timestamp: Date.now(),
          };
          console.log("[CACHE STORE] Saved products list to cache");
        }

        res.end(responseData);
      });
    }
  );

  proxyReq.on("error", (err) => {
    console.error("[Proxy Error]", err);
    res.writeHead(500);
    res.end("Internal Server Error");
  });

  req.pipe(proxyReq, { end: true });
});

server.listen(PORT, () => {
  console.log("Server is running on port ", PORT);
});

// console.log(IMPORT, PRODUCT, server);
