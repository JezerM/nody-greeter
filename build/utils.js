const fs = require("fs-extra");
const path = require("path");
const progress = require("cli-progress");
const child_process = require("child_process");

async function wait(ms) {
  return new Promise((resolve) => {
    setTimeout(() => resolve(), ms);
  });
}

function getFileSize(ph) {
  let buf = child_process.execSync("du -sb " + ph, { encoding: "utf-8" });

  let match = buf.match(/^(\d+)/);
  return Number(match[0]);
}

/**
 * Does the copy file-to-file
 * @returns {Promise<number>}
 */
async function do_copy(source_file, dest_file, copy_bar, bytes) {
  let bytesCopied = bytes;

  let file_stat = fs.statSync(source_file);

  let readStream = fs.createReadStream(source_file);
  let writeStream = fs.createWriteStream(dest_file, {
    mode: file_stat.mode,
  });

  readStream.on("data", (buff) => {
    //console.log({
    //source_file,
    //prev: bytesCopied,
    //next: bytesCopied + buff.length,
    //});

    bytesCopied += buff.length;

    copy_bar.update(bytesCopied);
    writeStream.write(buff);
  });

  let promise = new Promise((resolve) => {
    readStream.on("close", () => resolve(true));
    copy_bar.update(bytesCopied);
  });
  await promise;
  //await wait(500);
  return bytesCopied;
}

/**
 * Iterates and copy over a directory
 * @param {string} source Source directory
 * @param {string} dest Destination directory
 * @param {progress.Bar} copy_bar A cli-progress bar
 * @param {number} bytes The bytes copied
 * @returns {Promise<number>} The number of bytes written
 */
async function iterateCopy(source, dest, copy_bar, bytes) {
  let bytesCopied = bytes;

  let stat = fs.statSync(source);
  if (!stat.isDirectory()) {
    let source_file = source;
    let dest_file = dest;
    return await do_copy(source_file, dest_file, copy_bar, bytesCopied);
  }
  if (!fs.pathExistsSync(dest)) fs.mkdirSync(dest, { recursive: true });

  bytesCopied += stat.size;
  let dirs = fs.readdirSync(source, { withFileTypes: true });
  for (let i = 0; i < dirs.length; i++) {
    let dir = dirs[i];
    let source_file = path.resolve(source, dir.name);
    let dest_file = path.resolve(dest, dir.name);
    if (dir.isDirectory()) {
      bytesCopied = await iterateCopy(
        source_file,
        dest_file,
        copy_bar,
        bytesCopied
      );
    } else {
      bytesCopied = await do_copy(
        source_file,
        dest_file,
        copy_bar,
        bytesCopied
      );
    }
  }
  return bytesCopied;
}

/**
 * Copies a directory to dest
 * @param {string} source Source directory
 * @param {string} dest Destination directory
 * @returns {Promise<void>} A promise
 */
async function makeCopy(source, dest) {
  if (!fs.pathExistsSync(source))
    throw new Error("Source does not exists: " + source);
  let source_size = getFileSize(source);

  let copy_bar = new progress.Bar({
    stopOnComplete: true,
    clearOnComplete: true,
  });
  copy_bar.start(source_size, 0);

  await iterateCopy(source, dest, copy_bar, 0);
}

module.exports = { iterateCopy, makeCopy, getFileSize };
