console.log('release template.')

const execa = require('execa');
const path = require('path');
const fs = require('fs');
const args = require('minimist')(process.argv.slice(2));
const semver = require('semver');
const chalk = require('chalk');
const { prompt } = require('enquirer');

const pkgDir = process.cwd();
const pkgPath = path.resolve(pkgDir, 'package.json');
/**
 * @type {{ name: string, version: string }}
 */
const pkg = require(pkgPath);
const pkgName = pkg.name;
const currentVersion = pkg.version;

/**
 * @type {import('semver').ReleaseType[]}
 */
const versionIncrements = ['patch', 'minor', 'major', 'prepatch', 'preminor', 'premajor', 'prerelease'];

/**
 * @param {import('semver').ReleaseType} i
 */
const inc = (i) => semver.inc(currentVersion, i);

/**
 * @param {string} bin
 * @param {string[]} args
 * @param {object} opts
 */
const run = (bin, args, opts = {}) => execa(bin, args, { stdio: 'inherit', ...opts });

/**
 * @param {string} msg
 */
const step = (msg) => console.log(chalk.cyan(msg));

async function main() {
  let targetVersion = args._[0];

  if (!targetVersion) {
    /**
     * @type {{ release: string }}
     */
    const { release } = await prompt({
      type: 'select',
      name: 'release',
      message: 'Select release type',
      choices: versionIncrements.map((i) => `${i} (${inc(i)})`).concat(['custom'])
    });

    if (release === 'custom') {
      /**
       * @type {{ version: string }}
       */
      const customVersion = await prompt({
        type: 'input',
        name: 'version',
        message: 'Input custom version',
        initial: currentVersion
      });
      targetVersion = customVersion.version;
    } else {
      targetVersion = release.match(/\((.*)\)/)[1];
    }
  }

  if (!semver.valid(targetVersion)) {
    throw new Error(`invalid target version: ${targetVersion}`);
  }

  const tag = `v${targetVersion}`;

  /**
   * @type {{ yes: boolean }}
   */
  const { yes } = await prompt({
    type: 'confirm',
    name: 'yes',
    message: `Releasing ${tag}. Confirm?`,
    initial: 'true'
  });

  if (!yes) {
    return;
  }

  step('\nUpdating package version...');
  updateVersion(targetVersion);

  const { stdout } = await run('git', ['diff'], { stdio: 'pipe' });
  if (stdout) {
    step('\nCommitting changes...');
    await run('git', ['add', '-A']);
    await run('git', ['commit', '-m', `release: ${tag}`]);
  } else {
    console.log('No changes to commit.');
  }

  step('\nPublishing package...');
  await publishPackage(targetVersion, run);

  step('\nPushing to GitHub...');
  await run('git', ['tag', tag]);
  await run('git', ['push', 'origin', `refs/tags/${tag}`]);
  await run('git', ['push']);

  console.log();
}

/**
 * @param {string} version
 */
function updateVersion(version) {
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
  pkg.version = version;
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
}

/**
 * @param {string} version
 * @param {Function} run
 */
async function publishPackage(version, run) {
  const publicArgs = ['publish', '--access', 'public'];
  if (args.tag) {
    publicArgs.push(`--tag`, args.tag);
  }
  try {
    await run('npm', publicArgs, {
      stdio: 'pipe'
    });
    console.log(chalk.green(`Successfully published ${pkgName}@${version}`));
  } catch (e) {
    if (e.stderr.match(/previously published/)) {
      console.log(chalk.red(`Skipping already published: ${pkgName}`));
    } else {
      throw e;
    }
  }
}

main().catch((err) => {
  console.error(err);
});
