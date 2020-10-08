#!/usr/bin/env node
import fetch from "node-fetch";
import util from "util";
import fs from "fs";
import { pipeline } from "stream";
import Progress from "progress";
const streamPipeline = util.promisify(pipeline);

async function dl(link: string) {
  const res1 = await fetch(link);
  const text1 = await res1.text();
  const [, link1] = text1.match(/<a href="(.+?)">/) || [];
  //   console.log({ text1, link1 });
  if (!link1) return;

  const res2 = await fetch(link1);
  const text2 = await res2.text();
  const [, link2] =
    text2.match(/<a href="(https:\/\/firestorage.jp\/download\/.+?)">/) || [];
  //   console.log({ text2, link2 });
  if (!link2) return;

  const res3 = await fetch(link2);
  const text3 = await res3.text();
  const [, link3] = text3.match(/<a href="\/(download\/.+?)">/) || [];
  //   console.log({ text3, link3 });
  if (!link3) return;

  const res4 = await fetch(`https://firestorage.jp/${link3}`);
  const text4 = await res4.text();
  const [, link4, filename] =
    text4.match(
      /href="(https?:\/\/.+?\.firestorage\.jp\/download.+?)"[\s\S]+?>([\s\S]+?)</
    ) || [];
  //   console.log({ text4, link4, filename });
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
