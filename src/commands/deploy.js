import fs from 'fs/promises';
import path from 'path';
import kleur from 'kleur';
import ora from 'ora';
import { execSync } from 'child_process';

async function checkFlyInstalled() {
  try {
    execSync('flyctl version', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

async function deployProject(target) {
  const spinner = ora('Preparing deployment...').start();

  try {
    // Check for Fly.io CLI
    if (!await checkFlyInstalled()) {
      spinner.fail(kleur.red('Fly.io CLI not found'));
      console.log(kleur.white('\nPlease install the Fly.io CLI:'));
      console.log(kleur.white('  curl -L https://fly.io/install.sh | sh\n'));
      return;
    }

    // Check for fly.toml files
    const webFlyConfig = path.join(process.cwd(), 'apps', 'web', 'fly.toml');
    const pbFlyConfig = path.join(process.cwd(), 'apps', 'pb', 'fly.toml');

    const hasWebConfig = await fs.access(webFlyConfig).then(() => true).catch(() => false);
    const hasPbConfig = await fs.access(pbFlyConfig).then(() => true).catch(() => false);

    // Deployment logic based on target
    switch (target) {
      case 'web':
        if (!hasWebConfig) {
          spinner.fail(kleur.red('No fly.toml found in apps/web'));
          return;
        }
        spinner.text = 'Deploying web app...';
        execSync('cd apps/web && flyctl deploy', { stdio: 'inherit' });
        break;

      case 'pb':
        if (!hasPbConfig) {
          spinner.fail(kleur.red('No fly.toml found in apps/pb'));
          return;
        }
        spinner.text = 'Deploying PocketBase...';
        execSync('cd apps/pb && flyctl deploy', { stdio: 'inherit' });
        break;

      default:
        // Default behavior: deploy both if configs exist
        if (hasPbConfig) {
          spinner.text = 'Deploying PocketBase...';
          execSync('cd apps/pb && flyctl deploy', { stdio: 'inherit' });
        }

        if (hasWebConfig) {
          spinner.text = 'Deploying web app...';
          execSync('cd apps/web && flyctl deploy', { stdio: 'inherit' });
        }

        if (!hasPbConfig && !hasWebConfig) {
          spinner.fail(kleur.red('No fly.toml found in apps/web or apps/pb'));
          return;
        }
    }

    spinner.succeed(kleur.green('Deployment completed successfully!'));
  } catch (error) {
    spinner.fail(kleur.red(`Deployment failed: ${error.message}`));
  }
}

export function deployCommand(program) {
  program
    .command('deploy')
    .description('Deploy the project to Fly.io')
    .option(':web', 'Deploy only web app')
    .option(':pb', 'Deploy only PocketBase')
    .action((options) => {
      const target = options.args[0]?.replace(':', '') || '';
      deployProject(target);
    });
}
