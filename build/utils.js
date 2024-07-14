import fs from "fs-extra";
import path from "path";
import progress from "cli-progress";
import childProcess from "child_process";

export async function wait(ms) {
  return new Promise((resolve) => {
    setTimeout(() => resolve(), ms);
  });
}

export function getFileSize(ph) {
  let buf = childProcess.execSync(`du -sb "${ph}"`, { encoding: "utf-8" });

  let match = buf.match(/^(\d+)/);
  return Number(match[0]);
}

/**
 * Does the copy file-to-file
 * @returns {Promise<number>}
 */
export async function do_copy(source_file, dest_file, copy_bar, bytes) {
  let bytesCopied = bytes;

  let file_stat = fs.statSync(source_file);

  let readStream = fs.createReadStream(source_file);
  let writeStream = fs.createWriteStream(dest_file, {
    mode: file_stat.mode,
  });

  let filename = path.basename(source_file);

  readStream.on("data", (buff) => {
    //console.log({
    //source_file,
    //prev: bytesCopied,
    //next: bytesCopied + buff.length,
    //});

    bytesCopied += buff.length;

    copy_bar.update(bytesCopied, { filename });
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
export async function iterateCopy(source, dest, copy_bar, bytes) {
  let bytesCopied = bytes;

  let stat = fs.statSync(source);
  if (!stat.isDirectory()) {
    let source_file = path.resolve(source);
    let dest_file = path.resolve(dest);
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
export async function makeCopy(source, dest) {
  if (!fs.pathExistsSync(source))
    throw new Error("Source does not exists: " + source);
  let source_size = getFileSize(source);

  let copy_bar = new progress.Bar(
    {
      format:
        "Progress |" +
        "\x1b[96m{bar}\x1b[0m" +
        "| {percentage}% || {value}/{total} || {filename}",
      stopOnComplete: true,
      clearOnComplete: true,
      hideCursor: true,
    },
    progress.Presets.shades_classic
  );
  copy_bar.start(source_size, 0, {
    filename: "N/A",
  });

  await iterateCopy(source, dest, copy_bar, 0);
}

export async function makeCopyFromTo(array) {
  let source_size = array.reduce((prev, curr) => {
    let size = getFileSize(curr.from);
    //console.log(curr.from, size);
    return prev + size;
  }, 0);
  //console.log(source_size);

  let copy_bar = new progress.Bar(
    {
      format:
        "Progress |" +
        "\x1b[96m{bar}\x1b[0m" +
        "| {percentage}% || {value}/{total} || {filename}",
      stopOnComplete: true,
      clearOnComplete: true,
      hideCursor: true,
    },
    progress.Presets.shades_classic
  );

  copy_bar.start(source_size, 0, {
    filename: "N/A",
  });

  let bytesCopied = 0;

  for (let i = 0; i < array.length; i++) {
    let source = array[i].from;
    let dest = array[i].to;
    bytesCopied = await iterateCopy(source, dest, copy_bar, bytesCopied);
  }
  copy_bar.stop();
}

/**
 * Patch a file
 * @param {string} file Original file path
 * @param {string} patch Patch file path
 */
export function patchFile(file, patch) {
  if (!fs.pathExistsSync(file) || !fs.pathExistsSync(patch)) {
    console.error("pat");
  }
  try {
    childProcess.execSync(`patch -bN ${file} ${patch}`, {
      enconding: "utf-8",
      stdio: "ignore",
    });
  } catch (err) {
    console.log(
      "Patch didn't succeeded, perhaps it was applied before. Ignoring."
    );
  }
}

/**
 * Get current Linux distro
 */
export function getLinuxDistro() {
  let os = "";
  try {
    os = fs.readFileSync("/etc/os-release", "utf8");
  } catch (err) {
    return "unknown";
  }
  const regex = /^ID="?(?<distro>\w+)"?/gim;

  const matched = regex.exec(os);
  if (!matched.groups) return "unknown";

  return matched.groups.distro;
}
