#!/usr/bin/env node
import fetch from "node-fetch";
import util from "util";
import fs from "fs";
import { pipeline } from "stream";
import Progress from "progress";
const streamPipeline = util.promisify(pipeline);

async function fetchAndExtract(
  url: string,
  regex: RegExp
): Promise<RegExpMatchArray> {
  const res = await fetch(url);
  const text = await res.text();
  //   console.log({ text, link });
  return text.match(regex) || [];
}

async function dl(url: string) {
  const [, link1] = await fetchAndExtract(url, /<a href="(.+?)">/);
  if (!link1) return;

  const [, link2] = await fetchAndExtract(
    link1,
    /<a href="(https:\/\/firestorage.jp\/download\/.+?)">/
  );
  if (!link2) return;

  const [, link3] = await fetchAndExtract(
    link2,
    /<a href="\/(download\/.+?)">/
  );
  if (!link3) return;

  const [, link4, filename] = await fetchAndExtract(
    `https://firestorage.jp/${link3}`,
    /href="(https?:\/\/.+?\.firestorage\.jp\/download.+?)"[\s\S]+?>([\s\S]+?)</
  );
  if (!(link4 && filename)) return;
  const res5 = await fetch(link4);
  if (!res5.ok) return;
  const MB = 1024 * 1024;
  const total = parseInt(res5.headers.get("content-length") ?? "1", 10);
  const bar = new Progress("downloading [:bar] :percent Rest: :etas ", {
    total,
  });
  console.log(
    `Start downloading to ${process.cwd()}/${filename}. Total ${Math.round(
      total / MB
    )}MB`
  );
  res5.body.on("data", (chunk) => {
    bar.tick(chunk.length);
  });

  const timer = setInterval(() => {
    bar.tick();
    if (bar.complete) {
      clearInterval(timer);
    }
  }, 100);

  await streamPipeline(res5.body, fs.createWriteStream(`./${filename}`));
}

const [_, __, link] = process.argv;
if (!link) {
  console.log("please provide a link");
  process.exit();
}

dl(link);
