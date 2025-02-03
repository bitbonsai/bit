import inquirer from 'inquirer';
import ora from 'ora';
import kleur from 'kleur';
import fs from 'fs/promises';
import path from 'path';
import net from 'net';
import { fileURLToPath } from 'url';
import { intro, outro, text, password, isCancel } from '@clack/prompts';
import fetch from 'node-fetch';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TEMPLATES_DIR = path.join(__dirname, '..', 'templates');

async function copyDir(src, dest, replacements = {}) {
  await fs.mkdir(dest, { recursive: true });
  const entries = await fs.readdir(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      await copyDir(srcPath, destPath, replacements);
    } else {
      let content = await fs.readFile(srcPath, 'utf-8');
      
      // Replace placeholders
      for (const [key, value] of Object.entries(replacements)) {
        content = content.replace(new RegExp(`{{${key}}}`, 'g'), value);
      }
      
      await fs.writeFile(destPath, content);
    }
  }
}

async function checkPort(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.unref();
    server.on('error', () => resolve(false));
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
  });
}

async function verifyDockerEnvironment() {
  const spinner = ora('Checking Docker environment...').start();
  
  try {
    const { execa } = await import('execa');
    
    // Check if Docker is installed
    try {
      await execa('docker', ['--version']);
    } catch (error) {
      spinner.fail(kleur.red('Docker is not installed'));
      console.log(kleur.yellow('\nPlease install Docker from https://www.docker.com/products/docker-desktop'));
      process.exit(1);
    }
    
    // Check if Docker daemon is running
    try {
      await execa('docker', ['info']);
    } catch (error) {
      spinner.fail(kleur.red('Docker daemon is not running'));
      console.log(kleur.yellow('\nPlease start Docker Desktop and try again'));
      process.exit(1);
    }
    
    // Check port availability
    const ports = [4321, 8090]; // Astro and PocketBase ports
    const busyPorts = [];
    
    for (const port of ports) {
      const available = await checkPort(port);
      if (!available) {
        busyPorts.push(port);
      }
    }
    
    if (busyPorts.length > 0) {
      spinner.fail(kleur.red(`The following ports are already in use: ${busyPorts.join(', ')}`));
      console.log(kleur.yellow('\nPlease free up these ports and try again:'));
      console.log(kleur.white('- 4321: Used by Astro development server'));
      console.log(kleur.white('- 8090: Used by PocketBase server'));
      console.log(kleur.yellow('\nTo find processes using these ports:'));
      console.log(kleur.white(`  lsof -i :${busyPorts.join(',')} # List processes`));
      console.log(kleur.yellow('\nTo stop Docker containers using these ports:'));
      console.log(kleur.white('  docker ps          # List running containers'));
      console.log(kleur.white('  docker stop <id>   # Stop a specific container'));
      process.exit(1);
    }
    
    spinner.succeed(kleur.blue('Docker environment ready'));
  } catch (error) {
    spinner.fail(kleur.red('Failed to verify Docker environment'));
    console.error(error.message);
    process.exit(1);
  }
}

async function validateProjectName(name) {
  if (!/^[a-z0-9-]+$/.test(name)) {
    throw new Error('Project name can only contain lowercase letters, numbers, and hyphens');
  }
  
  const projectPath = path.resolve(process.cwd(), name);
  
  try {
    const stats = await fs.stat(projectPath);
    
    if (stats.isDirectory()) {
      console.error(kleur.red(`\n❌ Error: Directory '${name}' already exists in the current directory.`));
      console.error(kleur.yellow('Please choose a different project name or remove the existing directory.\n'));
      process.exit(1);
    }
  } catch (error) {
    if (error.code === 'ENOENT') {
      // Directory does not exist, which is good
      return true;
    }
    // Rethrow any other unexpected errors
    throw error;
  }
}

function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email) ? undefined : 'Please enter a valid email address';
}

async function getPocketBaseCredentials() {
  try {
    // Try to read from config file first
    const homedir = (await import('os')).homedir();
    const configPath = path.join(homedir, '.bit-conf.json');
    
    try {
      const config = JSON.parse(await fs.readFile(configPath, 'utf-8'));
      if (config.pocketbase?.admin?.email && config.pocketbase?.admin?.password) {
        console.log(kleur.cyan('\n🔐  Using PocketBase admin credentials from ~/.bit-conf.json'));
        return {
          email: config.pocketbase.admin.email,
          pass: config.pocketbase.admin.password
        };
      }
    } catch (err) {
      // Config file doesn't exist or is invalid, continue with prompts
    }

    // If no config file, prompt for credentials
    console.log(kleur.cyan('\n🔐  PocketBase Admin Setup'));
    console.log(kleur.white('These credentials will be used to access the PocketBase Admin UI'));
    console.log(kleur.white('where you can manage your database, collections and files.\n'));

    const email = await text({
      message: 'Enter admin email:',
      validate: (value) => {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(value) ? undefined : 'Please enter a valid email address';
      },
    });

    if (isCancel(email)) {
      process.exit(1);
    }

    const pass = await password({
      message: 'Enter admin password:',
      validate: (value) => {
        if (value.length < 5) return 'Password must be at least 5 characters';
        return;
      },
    });

    if (isCancel(pass)) {
      process.exit(1);
    }

    return { email, pass };
  } catch (error) {
    console.error(kleur.red('Error getting PocketBase credentials:'), error);
    process.exit(1);
  }
}

async function createProjectStructure(projectPath, name, options, pbCreds) {
  console.log('Creating base directories...');
  // Create base directories
  await fs.mkdir(projectPath, { recursive: true });
  await fs.mkdir(path.join(projectPath, 'apps'), { recursive: true });
  
  console.log('Copying root files...');
  // Copy root level files
  const rootFiles = ['package.json', 'docker-compose.yml', 'README.md'];
  for (const file of rootFiles) {
    let content = await fs.readFile(path.join(TEMPLATES_DIR, file), 'utf-8');
    content = content.replace(/{{name}}/g, name);
    await fs.writeFile(path.join(projectPath, file), content);
  }

  console.log('Creating Astro project...');
  // Create and initialize Astro project
  const webPath = path.join(projectPath, 'apps/web');
  await fs.mkdir(webPath, { recursive: true });
  
  // Initialize Astro project
  const { spawn } = await import('child_process');
  await new Promise((resolve, reject) => {
    const astroInit = spawn(
      "npm",
      [
        "create",
        "astro@latest",
        ".",
        "--",
        "--template=minimal",
        "--no-git",
        "--no-install",
        "--typescript"
      ],
      {
        cwd: webPath,
        stdio: "inherit"
      }
    );

    astroInit.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Astro initialization failed with code ${code}`));
      }
    });
    astroInit.on('error', reject);
  });

  // Get latest versions for all dependencies
  const versions = await getAllDependencyVersions();

  console.log('Copying template files...');
  // Copy our template files over the base Astro project
  await copyDir(
    path.join(TEMPLATES_DIR, 'web'),
    webPath,
    { name, ...versions }
  );

  console.log('Setting up PocketBase...');
  // Create and copy PocketBase files
  const pbPath = path.join(projectPath, 'apps/pb');
  await fs.mkdir(pbPath, { recursive: true });
  await copyDir(
    path.join(TEMPLATES_DIR, 'pb'),
    pbPath,
    { name, pbVersion: options.pb }
  );

  // Update docker-compose environment with provided credentials
  const envContent = `SUPERUSER_EMAIL=${pbCreds.email}\nSUPERUSER_PASSWORD=${pbCreds.pass}`;
  await fs.writeFile(path.join(projectPath, '.env'), envContent);

  console.log('Creating additional directories...');
  // Create essential directories (if they don't exist)
  const dirs = [
    'apps/web/src/components',
    'apps/web/src/css',
    'apps/web/src/layouts',
    'apps/web/src/lib',
    'apps/web/src/pages',
    'apps/web/public',
    'apps/pb/pb_data',
    'apps/pb/pb_migrations'
  ];

  for (const dir of dirs) {
    await fs.mkdir(path.join(projectPath, dir), { recursive: true });
  }
  console.log('Project structure creation complete.');
}

async function getLatestPackageVersion(packageName) {
  try {
    const response = await fetch(`https://registry.npmjs.org/${packageName}/latest`);
    const data = await response.json();
    return data.version;
  } catch (error) {
    console.warn(`Failed to fetch latest version for ${packageName}, using fallback version`);
    return null;
  }
}

async function getAllDependencyVersions() {
  const [astroVersion, astroNodeVersion, astroIconVersion, pocketbaseVersion] = await Promise.all([
    getLatestPackageVersion('astro'),
    getLatestPackageVersion('@astrojs/node'),
    getLatestPackageVersion('astro-icon'),
    getLatestPackageVersion('pocketbase')
  ]);

  return {
    astroVersion: astroVersion || '5.2.3',
    astroNodeVersion: astroNodeVersion || '9.0.2',
    astroIconVersion: astroIconVersion || '1.1.5',
    pocketbaseVersion: pocketbaseVersion || '0.25.1'  
  };
}

async function getLatestAstroVersion() {
  const version = await getLatestPackageVersion('astro');
  return version || '4.2.1';
}

async function getLatestPocketBaseVersion() {
  try {
    const response = await fetch('https://api.github.com/repos/pocketbase/pocketbase/releases/latest');
    const data = await response.json();
    return data.tag_name.replace('v', '');
  } catch (error) {
    console.warn('Failed to fetch latest PocketBase version, using fallback version');
    return '0.25.1';
  }
}

export function newCommand(program) {
  program
    .command('new <project-name>')
    .description('Create a new project')
    .option('--pb <version>', 'PocketBase version', async () => await getLatestPocketBaseVersion())
    .option('--astro <version>', 'Astro version', async () => await getLatestAstroVersion())
    .action(async (name, options) => {
      try {
        intro(kleur.cyan('🌱 Creating your new project...'));
        
        // Verify Docker environment before proceeding
        await verifyDockerEnvironment();
        
        await validateProjectName(name);
        const pbCreds = await getPocketBaseCredentials();
        
        console.log(kleur.yellow('\n⚠️  Please save these credentials, you\'ll need them to access the admin UI'));
        console.log(kleur.white(`Email: ${pbCreds.email}`));
        console.log(kleur.white(`Password: ${'*'.repeat(pbCreds.pass.length)}\n`));
        
        const projectPath = path.resolve(process.cwd(), name);
        
        // Create project structure
        const structureSpinner = ora('Creating project...').start();
        await createProjectStructure(projectPath, name, options, pbCreds);
        structureSpinner.succeed(kleur.blue('Project structure created'));
        
        // Create environment files
        const envSpinner = ora('Creating environment files...').start();
        
        // Root environment with PocketBase credentials
        await fs.writeFile(
          path.join(projectPath, '.env.development'),
          `SUPERUSER_EMAIL=${pbCreds.email}\nSUPERUSER_PASSWORD=${pbCreds.pass}\n`
        );
        
        envSpinner.succeed(kleur.blue('Environment files created'));
        
        outro(kleur.green('\n✨ Project created successfully!'));
        console.log(kleur.cyan().bold('Next steps:'));
        console.log('  ', kleur.gray('$'), kleur.white(`cd ${name}`));
        console.log('  ', kleur.gray('$'), kleur.white('bun run dev'), kleur.gray('# Start development environment'));
        console.log('  ', kleur.cyan().bold('\n📦 PocketBase admin UI will be available at:'));
        console.log(kleur.white('🔗  http://localhost:8090/_/'));
        
      } catch (error) {
        console.error(kleur.red('\nError:'), error.message);
        process.exit(1);
      }
    });
}
